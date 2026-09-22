from flask import Blueprint, jsonify, request, current_app
from app.extensions import rq, redis_client
from rq import Queue
from rq.job import Job
from rq.exceptions import NoSuchJobError
from rq.command import send_kill_horse_command
from rq.worker import Worker, WorkerStatus
from rq.registry import FinishedJobRegistry, FailedJobRegistry
try:
    # CanceledJobRegistry was added in RQ 1.10. Import defensively so the
    # backend still boots on older RQ versions used in some dev envs.
    from rq.registry import CanceledJobRegistry
except ImportError:
    CanceledJobRegistry = None
from app.jobs.services import process_config, process_config_phase_2, process_config_gif_maker  # top-level function RQ worker will import
import time
from matplotlib.colors import is_color_like
import yaml
import os
import shutil

from app.models.experiment import Experiment

# Cap how many terminal (finished / failed / canceled) jobs we return per
# registry so /jobs stays snappy even after a researcher has kicked off
# hundreds of runs. Frontend sorts what it gets — most recent surfaces last.
TERMINAL_JOB_LIMIT = 50

# Statuses eligible for history deletion. 'stopped' is what RQ assigns after
# a kill-horse cancel of a running job, and it lands in FailedJobRegistry.
TERMINAL_JOB_STATUSES = {"finished", "failed", "canceled", "stopped"}

# way to queue a task
# way to access whats in your queue (including the one that is running)
# way to cancel item in queue (including the one running)
# logs of jobs associated (maybe store it in database for future referenec)


bp = Blueprint("jobs", __name__, url_prefix="")

@bp.post("/experiments/<int:experiment_id>/phase-1")
def queue_task(experiment_id):
    """
    Queue a processing task for a experiment
    ---
    tags:
      - Jobs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: queued
      404:
        description: experiment not found
    """
    conn = redis_client.client
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    # --- 🔍 Check for existing queued or running jobs ---
    q = rq.get_queue('default')
    existing_jobs = q.jobs
    workers = Worker.all(connection=conn)

    for job in existing_jobs:
        if job.meta.get("experiment_id") == experiment_id and job.meta.get("phase") == "1":
            return jsonify({"error": "A job for this experiment is already queued."}), 400

    # Also check running jobs
    for worker in workers:
        current_job = worker.get_current_job()
        if current_job and current_job.meta.get("experiment_id") == experiment_id and current_job.meta.get('phase') == "1":
            return jsonify({"error": "A job for this experiment is currently running."}), 400

    q = rq.get_queue('default')
    job = q.enqueue(
    process_config,
        experiment_id=experiment_id,
    )

    job.meta["experiment_id"] = experiment_id
    job.meta["experiment_name"] = experiment.name
    job.meta["phase"] = "1"
    job.save_meta()

    return jsonify({
        "status": "queued",
        "job_id": job.id
    }), 200

@bp.post("/experiments/<int:experiment_id>/phase-2")
def queue_task_2(experiment_id):
    """
    Queue a processing task for a experiment
    ---
    tags:
      - Jobs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: queued
      404:
        description: experiment not found
    """
    conn = redis_client.client
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    # --- 🔍 Check for existing queued or running jobs ---
    q = rq.get_queue('default')
    existing_jobs = q.jobs
    workers = Worker.all(connection=conn)

    for job in existing_jobs:
        if job.meta.get("experiment_id") == experiment_id and job.meta.get("phase") == "2":
            return jsonify({"error": "A job for this experiment is already queued."}), 400

    # Also check running jobs
    for worker in workers:
        current_job = worker.get_current_job()
        if current_job and current_job.meta.get("experiment_id") == experiment_id and current_job.meta.get("phase") == "2":
            return jsonify({"error": "A job for this experiment is currently running."}), 400


    q = rq.get_queue('default')
    job = q.enqueue(
    process_config_phase_2,
        experiment_id=experiment_id,
    )

    job.meta["experiment_id"] = experiment_id
    job.meta["experiment_name"] = experiment.name
    job.meta["phase"] = "2"
    job.save_meta()

    return jsonify({
        "status": "queued",
        "job_id": job.id
    }), 200

@bp.post("/experiments/<int:experiment_id>/create-gif")
def create_gif(experiment_id):
    """
    Queue a processing task for a experiment
    ---
    tags:
      - Jobs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          required:
            - name
          properties:
            plot_in_3D:
              type: boolean
              required: true
            center_gif:
              type: boolean
              required: true
            lat:
              type: number
              required: false
            long:
              type: number
              required: false
            center_gif:
              type: boolean
              required: true
            plot_GSs:
              type: boolean
              required: true
              default: false
            plot_only_optimal:
              type: boolean
              required: true
              default: false
            plot_debug:
              type: boolean
              required: true
              default: false
            plot_optimal_orbits:
              type: boolean
              required: true
              default: false
            make_gif:
              type: boolean
              required: true
              default: false
            gif_name:
              type: string
              required: true
            time_step:
              type: number
              required: true
            shells:
              type: object
    responses:
      200:
        description: queued
      404:
        description: experiment not found
    """
    data = request.get_json() or {}
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    if 'plot_in_3D' not in data or 'gif_name' not in data or 'center_gif' not in data or not 'shells' in data or not 'make_gif' in data  or (
      'plot_GSs' not in data or 'plot_only_optimal' not in data or 'plot_debug' not in data or 'plot_optimal_orbits' not in data or not "time_step" in data):
        return jsonify({"error": "missing parameters"}), 400
    if data['center_gif'] == False and ('long' not in data or 'lat' not in data):
        return jsonify({"error": "missing lat long"}), 400

        
    with open(f'local_workspace/{experiment_id}/sat_config.yaml', "r") as f:
        data_sat = yaml.safe_load(f)

    shell_count = len(data_sat.get("shells", {}))

    if (len(data['shells']) < shell_count):
      return jsonify({"error": f"Expected {shell_count} shells, got {len(data['shells'])} shells"}), 400

    for shell in data['shells']:
      if not is_color_like(data['shells'][shell]):
        return jsonify({"error": f"{data['shells'][shell]} is not a color"}), 400

    zip = f'local_workspace/{experiment_id}/gifs/{data["gif_name"]}.zip'
    folder = f'local_workspace/{experiment_id}/gifs/{data["gif_name"]}'
    if os.path.isfile(zip):
        os.remove(zip)
    if os.path.isdir(folder):
        shutil.rmtree(folder)

    data['outputfolder_path'] = f'local_workspace/{experiment_id}/'
    os.makedirs(data['outputfolder_path'] + f"gifs/{data['gif_name']}/", exist_ok=True)
    with open(f'local_workspace/{experiment_id}/gifs/{data["gif_name"]}/gif_config.yaml', 'w') as file:
        yaml.dump(data, file, sort_keys=False)

    queue_name = 'default'
    if data['make_gif'] == False:
      queue_name = 'plot'


    q = rq.get_queue(queue_name)
    job = q.enqueue(
    process_config_gif_maker,
        experiment_id=experiment_id,
        gif_name=data["gif_name"],
    )

    job.meta["experiment_id"] = experiment_id
    job.meta["experiment_name"] = experiment.name
    job.meta["phase"] = 'gif'
    # Distinguishes the globe render ("output") from the animated GIF
    # ("output-gif") so the frontend can dedupe/cancel the right job.
    job.meta["gif_name"] = data["gif_name"]
    job.save_meta()

    return jsonify({
        "status": "queued",
        "job_id": job.id
    }), 200

from rq.worker import Worker, WorkerStatus
from app.extensions import redis_client

@bp.get("/jobs")
def list_jobs():
    """
    List jobs (queued, running, and recently finished / failed / canceled)
    ---
    tags:
      - Jobs
    responses:
      200:
        description: list of all jobs
    """
    # Globe/plot renders run on the separate 'plot' queue — include it so the
    # frontend can see, dedupe against, and cancel visualization jobs too.
    queue_names = ('default', 'plot')
    redis_conn = redis_client.client

    job_list = []
    job_count = 0
    # Dedupe so a job present in both a worker and a registry (rare edge case
    # during status transitions) doesn't get reported twice.
    seen_job_ids = set()

    def _append(job, position=0, running=False):
        if job is None or job.id in seen_job_ids:
            return
        seen_job_ids.add(job.id)
        job_list.append({
            "job_id": job.id,
            "experiment_id": job.meta.get("experiment_id"),
            "experiment_name": job.meta.get("experiment_name"),
            "status": job.get_status(),
            "args": job.args,
            "phase": job.meta.get("phase"),
            "gif_name": job.meta.get("gif_name"),
            "position": position,
            "created_at": job.enqueued_at.isoformat() if job.enqueued_at else None,
            "running": running,
        })

    # --- Enqueued jobs (per queue) ---
    for queue_name in queue_names:
        q = rq.get_queue(queue_name)
        for job in q.jobs:
            job_count += 1
            _append(job, position=job_count, running=False)

    # --- Currently running jobs ---
    # fetch_job resolves by job id via the shared Redis connection, so a
    # single queue handle works for jobs from any queue.
    fetch_q = rq.get_queue('default')
    workers = Worker.all(connection=redis_conn)
    for w in workers:
        current_job_id = w.get_current_job_id()
        if current_job_id:
            try:
                job = fetch_q.fetch_job(current_job_id)
                _append(job, position=0, running=True)
            except Exception:
                continue

    # --- Terminal jobs (finished / failed / canceled, per queue) ---
    # Without these, the frontend polls a running phase, then when the job
    # transitions to finished/failed the /jobs response no longer contains
    # it — the simulate page silently stops updating and the Jobs page
    # shows no history.
    for queue_name in queue_names:
        q = rq.get_queue(queue_name)
        registries = [
            FinishedJobRegistry(queue=q),
            FailedJobRegistry(queue=q),
        ]
        if CanceledJobRegistry is not None:
            registries.append(CanceledJobRegistry(queue=q))

        for registry in registries:
            try:
                # Registries are Redis sorted sets keyed by timestamp — take
                # the tail so we return the most recent N.
                job_ids = registry.get_job_ids()[-TERMINAL_JOB_LIMIT:]
            except Exception:
                continue
            for jid in job_ids:
                try:
                    job = q.fetch_job(jid)
                    _append(job, position=0, running=False)
                except Exception:
                    continue

    return jsonify(job_list), 200



@bp.get("/jobs/<job_id>/logs")
def get_job_logs(job_id):
    """
    Get logs for a job
    ---
    tags:
      - Jobs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: job_id
        type: string
        required: true
    responses:
      200:
        description: logs
      404:
        description: not found
    """
    try:
        job = Job.fetch(job_id, connection=rq.connection)
        logs = job.meta.get("logs", "")
        return jsonify({"job_id": job.id, "logs": logs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@bp.delete("/jobs/<job_id>")
def delete_job(job_id: str):
    """
    Delete a terminal (finished / failed / canceled) job from history
    ---
    tags:
      - Jobs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: job_id
        type: string
        required: true
    responses:
      200:
        description: Job deleted from history
      404:
        description: Job not found
      409:
        description: Job is still queued or running — cancel it first
    """
    conn = redis_client.client
    try:
        job = Job.fetch(job_id, connection=conn)
    except NoSuchJobError:
        return jsonify({"error": "Job not found"}), 404

    status = job.get_status()
    if status not in TERMINAL_JOB_STATUSES:
        return jsonify({
            "error": f"Job is '{status}' — only finished, failed, or canceled "
                     "jobs can be deleted. Cancel it first via "
                     "DELETE /jobs/<job_id>/cancel."
        }), 409

    try:
        # RQ's Job.delete() removes the job hash from Redis and pulls the id
        # out of whichever registry currently holds it (Finished / Failed /
        # Canceled), so the /jobs listing stops reporting it — no explicit
        # registry.remove() needed.
        job.delete()
    except Exception as e:
        current_app.logger.error(f"Error deleting job {job_id}: {e}")
        return jsonify({"error": str(e)}), 500

    return jsonify({"status": "deleted", "job_id": job_id}), 200


@bp.delete("/jobs/<job_id>/cancel")
def cancel_job(job_id):
    """
    Cancel a job (queued or currently running)
    ---
    tags:
      - Jobs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: job_id
        type: string
        required: true
    responses:
      200:
        description: Job cancelled
      403:
        description: Unauthorized
      404:
        description: Job not found
    """
    try:
        # Connect to Redis
        conn = redis_client.client
        job = Job.fetch(job_id, connection=conn)

        # Cancel the job in the queue
        job.cancel()

        # Check if job is currently running on any worker
        for worker in Worker.all(connection=conn):
            current_job = worker.get_current_job()
            if current_job and current_job.id == job_id:
                try:
                    # Attempt graceful stop first
                    if worker.state == WorkerStatus.BUSY:
                      send_kill_horse_command(conn, worker.name)
                    current_app.logger.info(f"Stopped active job {job_id} on worker {worker.name}")
                except Exception as e:
                    current_app.logger.warning(f"Failed to stop job {job_id} on worker {worker.name}: {e}")
                break

        return jsonify({"status": "cancelled", "job_id": job_id}), 200

    except NoSuchJobError:
        return jsonify({"error": "Job not found"}), 404
    except Exception as e:
        current_app.logger.error(f"Error cancelling job {job_id}: {e}")
        return jsonify({"error": str(e)}), 500