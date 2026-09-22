import calendar
import os
import random
import string
import subprocess
import yaml
import zipfile
from datetime import datetime
from rq import get_current_job
from app.db import get_db
from flask import current_app
from app.extensions import rq
from app.extensions import db
import shutil

from app.models.job_log import JobLog

# -------------------------
# MAIN JOB ENTRY POINT
# -------------------------
@rq.job(timeout='24h')
def process_config(experiment_id):
    """
    RQ job for running phase_1 and saving logs to DB.
    """
    job = get_current_job()
    logs = f"--- Starting job for experiment {experiment_id} ---\n"

    from app import create_app  # Import your Flask app factory
    app = create_app()          # Create app instance

    with app.app_context():
        # Now get_db() works
        # db = get_db()

        try:
            clear_stale_generated_tles(experiment_id)
            zip = f'local_workspace/{experiment_id}/output.zip'
            folder = f'local_workspace/{experiment_id}/output'
            # Remove BOTH old artifacts (a successful run leaves zip AND
            # folder). A leftover folder makes the simulator ask
            # "overwrite? (y/[n])" on stdin, which EOFErrors in the worker.
            if os.path.isfile(zip):
                os.remove(zip)
            if os.path.isdir(folder):
                shutil.rmtree(folder)
            zip = f'local_workspace/{experiment_id}/gifs.zip'
            folder = f'local_workspace/{experiment_id}/gifs'
            # Includes each render directory and its sibling ZIP archive.
            if os.path.isfile(zip):
                os.remove(zip)
            if os.path.isdir(folder):
                shutil.rmtree(folder)
            phase_logs, return_code = run_phase_1(experiment_id)
            logs += phase_logs
            # The simulator can partially fail (e.g. a worker thread crashes)
            # yet still leave a half-populated output folder behind. If we
            # don't check the exit code here we'd zip that partial output and
            # wrongly report success — hiding the failure from the user.
            if return_code != 0:
                raise RuntimeError(
                    f"Phase 1 simulator exited with code {return_code}. "
                    f"The run did not complete — see the log above for the traceback."
                )

            zip_path = zip_folder(f"local_workspace/{experiment_id}/output")
            logs += f"✅ Folder zipped to: {zip_path}\n"

            logs += "--- Job completed successfully ---\n"

        except Exception as e:
            logs += f"❌ Error: {str(e)}\n"
            raise
        finally:
            # Store logs in DB
            existing = JobLog.query.filter_by(
                experiment_id=experiment_id,
                experiment_type=0
            ).first()

            if existing:
                # Update existing row
                existing.logs = logs
            else:
                # Insert new row
                new_log = JobLog(
                    experiment_id=experiment_id,
                    logs=logs,
                    experiment_type=0
                )
                db.session.add(new_log)

            db.session.commit()

        if job:
            job.meta["logs"] = logs
            job.save_meta()

@rq.job(timeout='24h')
def process_config_phase_2(experiment_id):
    """
    RQ job for running phase_2 and saving logs to DB.
    """
    job = get_current_job()
    logs = f"--- Starting job for experiment {experiment_id} ---\n"

    from app import create_app  # Import your Flask app factory
    app = create_app()          # Create app instance

    with app.app_context():
        # Now get_db() works
        # db = get_db()

        try:
            zip = f'local_workspace/{experiment_id}/output_mn.zip'

            # Note: We DO NOT delete the 'output' folder here, because
            # Phase 2 needs the output that Phase 1 just created! We also
            # DO NOT rmtree the 'output_mn' folder itself (unlike Phase 1's
            # equivalent cleanup above) — Phase 2's submodule has no
            # interactive overwrite prompt to guard against. Its app
            # manager (pingApp / iperfApp in
            # constellation-simulator-main/lib/spacenet_app_manager.py)
            # already deletes only its own known result files
            # (ping_results.txt, or iperf_server_results.txt /
            # iperf_client_results.txt) non-interactively before writing.
            # rmtree'ing the whole folder here would destroy results from a
            # different AppName run (e.g. wipe ping_results.txt when
            # re-running with AppName: Iperf) that this run never asked to
            # regenerate. Only the stale top-level zip is safe/necessary to
            # clear, since zip_folder() below rebuilds it fresh either way.
            if os.path.isfile(zip):
                os.remove(zip)

            phase_logs, return_code = run_phase_2(experiment_id)
            logs += phase_logs
            # Same contract as Phase 1: a crashed simulator can leave a
            # half-populated output_mn folder behind. Without this check the
            # job would zip the partial output and wrongly report success.
            if return_code != 0:
                raise RuntimeError(
                    f"Phase 2 simulator exited with code {return_code}. "
                    f"The run did not complete — see the log above for the traceback."
                )

            # Zip the 'output' folder, but explicitly name the new zip file 'output_mn.zip'
            zip_path = zip_folder(f"local_workspace/{experiment_id}/output_mn", zip)
            logs += f"✅ Folder zipped to: {zip_path}\n"

            logs += "--- Job completed successfully ---\n"

        except Exception as e:
            logs += f"❌ Error: {str(e)}\n"
            raise
        finally:
            # Store logs in DB
            existing = JobLog.query.filter_by(
                experiment_id=experiment_id,
                experiment_type=1
            ).first()

            if existing:
                # Update existing row
                existing.logs = logs
            else:
                # Insert new row
                new_log = JobLog(
                    experiment_id=experiment_id,
                    logs=logs,
                    experiment_type=1
                )
                db.session.add(new_log)

            db.session.commit()
        if job:
            job.meta["logs"] = logs
            job.save_meta()

@rq.job(timeout='24h')
def process_config_gif_maker(experiment_id, gif_name):
    """
    RQ job for running gif maker and saving logs to DB.
    """
    job = get_current_job()
    logs = f"--- Starting job for experiment {experiment_id} ---\n"

    from app import create_app  # Import your Flask app factory
    app = create_app()          # Create app instance

    with app.app_context():
        # Now get_db() works

        try:
            gif_logs, return_code = create_gif(experiment_id, gif_name)
            logs += gif_logs
            # A crashed plotter must mark the job failed — otherwise the GUI
            # polls forever for an output file that will never appear.
            if return_code != 0:
                raise RuntimeError(
                    f"Gif maker exited with code {return_code}. "
                    f"The render did not complete — see the log above for the traceback."
                )

            zip_path = zip_folder(f"local_workspace/{experiment_id}/gifs/{gif_name}")
            logs += f"✅ Folder zipped to: {zip_path}\n"

            logs += "--- Job completed successfully ---\n"

        except Exception as e:
            logs += f"❌ Error: {str(e)}\n"
            raise
        finally:
            existing = JobLog.query.filter_by(
                experiment_id=experiment_id,
                experiment_type=2
            ).first()

            if existing:
                # Update existing row
                existing.logs = logs
            else:
                # Insert new row
                new_log = JobLog(
                    experiment_id=experiment_id,
                    logs=logs,
                    experiment_type=2
                )
                db.session.add(new_log)

            db.session.commit()

        if job:
            job.meta["logs"] = logs
            job.save_meta()


def _looks_generated(tle_path: str) -> bool:
    """
    True only if every satellite name line looks generator-produced.

    generate_fake_TLE names satellites '<op_name>-<1000+n>' in lowercase
    ('starlink-1000'); Celestrak's real files use uppercase ('STARLINK-32423').
    Deleting a real bundled TLE is unrecoverable - they are gitignored, and a
    historical epoch cannot be re-fetched from Celestrak's current feed.
    """
    with open(tle_path, "r") as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped[0].isdigit():
                continue  # TLE data line 1/2, not a name line
            if not stripped.startswith("starlink-"):
                return False
    return True


def clear_stale_generated_tles(experiment_id: int) -> None:
    """The Phase 1 TLE generator APPENDS to <TLEFilePath>starlink_tles/starlink_<sim_ts>.
    If that file already exists (a previous run with the same sim date, or a
    bundled real-TLE file whose timestamp collides), the simulator ends up
    loading the old and new TLE sets together and crashes with a
    satellite-count mismatch (IndexError). Remove the target file before the
    generator runs so every generate_TLE run starts from a clean slate."""
    config_path = f"local_workspace/{experiment_id}/sat_config.yaml"
    try:
        with open(config_path, "r") as f:
            sat_config = yaml.safe_load(f)
    except OSError:
        return
    if not sat_config or not sat_config.get("generate_TLE"):
        return
    sdt = sat_config.get("Sim_Date_Time", {})
    try:
        # Mirrors generate_TLE_main's calendar.timegm-based filename.
        sim_ts = calendar.timegm((
            int(sdt["StartYear"]), int(sdt["StartMonth"]), int(sdt["StartDay"]),
            int(sdt["StartHour"]), int(sdt["StartMinute"]), int(sdt["StartSecond"]),
        ))
    except (KeyError, TypeError, ValueError):
        return
    # The generator hardcodes the starlink_tles/ subfolder and file prefix.
    stale_tle = os.path.join(
        sat_config.get("TLEFilePath", ""), "starlink_tles", f"starlink_{sim_ts}"
    )
    if os.path.isfile(stale_tle):
        # Guard beyond the original fix: experiments created before the default
        # sim date moved off 2024-09-27 22:15:06 still target starlink_1727475306,
        # which is a REAL bundled TLE. Deleting it would be unrecoverable.
        if not _looks_generated(stale_tle):
            raise RuntimeError(
                f"Refusing to delete {stale_tle}: it contains real TLE entries, so this "
                "experiment's simulation date collides with a bundled real TLE file. "
                "Move the sim date off that timestamp, or point TLEFilePath elsewhere."
            )
        os.remove(stale_tle)


# -------------------------
# PHASE 1 (External command)
# -------------------------
def run_phase_1(experiment_id):
    """
    Runs the external process and streams logs.
    Returns the combined logs as a string.
    """
    job = get_current_job()
    logs = f"--- Running phase_1 for {experiment_id} ---\n"
    print("RUNNING PHASE 1")
    # removed sudo from all subprocesses
    process = subprocess.Popen(
        ["python3", "-u", "./dynamic-topology-generator/main.py", f"local_workspace/{experiment_id}/", "main_config.yaml", ""],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    print("After phase 1")

    for line in process.stdout:
        print(line, end="")  # Live worker console output
        logs += line
        if job:
            job.meta["logs"] = logs
            job.save_meta()

    process.wait()
    logs += f"\n--- Phase_1 finished with code {process.returncode} ---\n"
    return logs, process.returncode
    
# -------------------------
# PHASE 1 output (External command)
# -------------------------
def create_gif(experiment_id, gif_name):
    """
    Runs the external process and streams logs.
    Returns the combined logs as a string.
    """
    job = get_current_job()
    logs = f"--- Running gif maker for {experiment_id} ---\n"

    process = subprocess.Popen(
        ["python3", "-u", "./dynamic-topology-generator/library/plotly_plotter.py", f"local_workspace/{experiment_id}/gifs/{gif_name}/gif_config.yaml"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    for line in process.stdout:
        print(line, end="")  # Live worker console output
        logs += line
        if job:
            job.meta["logs"] = logs
            job.save_meta()

    process.wait()
    logs += f"\n--- Gif Maker finished with code {process.returncode} ---\n"
    return logs, process.returncode

# -------------------------
# PHASE 2 (External command)
# -------------------------
def run_phase_2(experiment_id):
    """
    Runs the external process and streams logs.
    Returns the combined logs as a string.
    """
    job = get_current_job()
    logs = f"--- Running phase_2 for {experiment_id} ---\n"
    print("Going to run phase 2")
    process = subprocess.Popen(
        ["python3", "-u", "./constellation-simulator-main/main_mn.py", f"local_workspace/{experiment_id}/main_mn_config.yaml", ""],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    print("RUNNING PHASE 2")
    for line in process.stdout:
        print(line, end="")  # Live worker console output
        logs += line
        if job:
            job.meta["logs"] = logs
            job.save_meta()

    process.wait()
    logs += f"\n--- Phase_2 finished with code {process.returncode} ---\n"
    return logs, process.returncode


# -------------------------
# SUPPORT FUNCTIONS
# -------------------------
def generate_random_text_folder(folder_name, file_name="random_text.txt", text_length=500):
    """
    Creates a folder and writes a random text file.
    Returns a short status string.
    """
    os.makedirs(folder_name, exist_ok=True)
    random_text = ''.join(random.choices(string.ascii_letters + string.digits + " \n", k=text_length))
    file_path = os.path.join(folder_name, file_name)
    with open(file_path, "w") as f:
        f.write(random_text)
    return f"✅ Created folder: {folder_name} with file {file_path}"


def zip_folder(folder_path, zip_path=None):
    if not os.path.isdir(folder_path):
        raise ValueError(f"Folder does not exist: {folder_path}")

    if zip_path is None:
        zip_path = f"{folder_path.rstrip(os.sep)}.zip"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                arcname = os.path.relpath(os.path.join(root, file), start=folder_path)
                zipf.write(os.path.join(root, file), arcname)

    return zip_path
