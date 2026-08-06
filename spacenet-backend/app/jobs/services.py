import os
import random
import string
import subprocess
import zipfile
from datetime import datetime
from rq import get_current_job
from app.db import get_db
from flask import current_app
from app.extensions import rq
from app.extensions import db
import shutil

from app.models.job_log import JobLog


class PhaseFailedError(RuntimeError):
    """
    Raised when a phase subprocess exits non-zero.

    Carries the streamed logs so the caller can still persist them to JobLog -
    without this the traceback that explains the failure is lost, because the
    caller's `logs += run_phase_x(...)` never completes when the call raises.
    """

    def __init__(self, message, logs=""):
        super().__init__(message)
        self.logs = logs


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
            zip = f'local_workspace/{experiment_id}/output.zip'
            folder = f'local_workspace/{experiment_id}/output'
            if os.path.isfile(zip):
                os.remove(zip)
            elif os.path.isdir(folder):
                shutil.rmtree(folder)
            # Example: generate folder / run phase_1
            # logs += generate_random_text_folder(f"users/{username}/{experiment_name}/output/") + "\n"
            logs += run_phase_1(experiment_id)

            zip_path = zip_folder(f"local_workspace/{experiment_id}/output")
            logs += f"✅ Folder zipped to: {zip_path}\n"

            logs += "--- Job completed successfully ---\n"

        except PhaseFailedError as e:
            logs += e.logs
            logs += f"❌ Error: {str(e)}\n"
            raise
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
            
            # Note: We DO NOT delete the folder here, because Phase 2 needs 
            # the 'output' folder that Phase 1 just created!
            if os.path.isfile(zip):
                os.remove(zip)

            logs += run_phase_2(experiment_id)

            # Zip the 'output' folder, but explicitly name the new zip file 'output_mn.zip'
            zip_path = zip_folder(f"local_workspace/{experiment_id}/output_mn", zip)
            logs += f"✅ Folder zipped to: {zip_path}\n"

            logs += "--- Job completed successfully ---\n"

        except PhaseFailedError as e:
            logs += e.logs
            logs += f"❌ Error: {str(e)}\n"
            raise
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
            # Example: generate folder / run phase_1
            # logs += generate_random_text_folder(f"users/{username}/{experiment_name}/output/") + "\n"
            logs += create_gif(experiment_id, gif_name)

            zip_path = zip_folder(f"local_workspace/{experiment_id}/gifs/{gif_name}")
            logs += f"✅ Folder zipped to: {zip_path}\n"

            logs += "--- Job completed successfully ---\n"

        except PhaseFailedError as e:
            logs += e.logs
            logs += f"❌ Error: {str(e)}\n"
            raise
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
    if process.returncode != 0:
        raise PhaseFailedError(
            f"Phase 1 exited with code {process.returncode}", logs
        )
    return logs
    
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
    if process.returncode != 0:
        raise PhaseFailedError(
            f"Gif maker exited with code {process.returncode}", logs
        )
    return logs

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
    if process.returncode != 0:
        raise PhaseFailedError(
            f"Phase 2 exited with code {process.returncode}", logs
        )
    return logs


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
