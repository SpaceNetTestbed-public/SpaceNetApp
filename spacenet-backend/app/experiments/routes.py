import os
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from app.db import get_db
from app.experiments.services import ensure_experiment_folder_and_defaults, delete_experiment_folder, duplicate_experiment_folder
from app.extensions import rq, redis_client
from rq.worker import Worker
from app.extensions import db
from app.models.experiment import Experiment
from sqlalchemy.exc import IntegrityError

bp = Blueprint("experiments", __name__, url_prefix="")

@bp.get("/experiments")
def get_experiments():
    """
    Get all experiments
    ---
    tags:
      - Experiments
    security:
      - bearerAuth: []
    responses:
      200:
        description: Returns a list of experiments
    """
    experiments = Experiment.query.filter_by().all()

    experiments_col = []
    for experiment in experiments:
      exp = {
          "id": experiment.id,
          "name": experiment.name,
          "tags": experiment.tags or [],
          "description": experiment.description,
          "created_at": experiment.created_at.isoformat(),
      }

      # Phase checks
      base_path = f"local_workspace/{experiment.id}"
      exp["hasPhase1"] = os.path.exists(f"{base_path}/output.zip")
      exp["hasPhase2"] = os.path.exists(f"{base_path}/output_mn.zip")

      experiments_col.append(exp)

    return jsonify(experiments_col), 200

@bp.get("/experiments/<int:experiment_id>")
def get_experiment(experiment_id):
    """
    Get experiment by id
    ---
    tags:
      - Experiments
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: Returns an experiment
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if experiment is None:
        return jsonify({"error": "Experiment not found"}), 404

    return jsonify({"id": experiment.id, "name": experiment.name, "tags": experiment.tags, "description": experiment.description}), 200

@bp.post("/experiments")
def create_experiment():
    """
    Create an experiment
    ---
    tags:
      - Experiments
    security:
      - bearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          required:
            - name
          properties:
            name:
              type: string
            tags:
              type: array
              items:
                type: string
            description:
              type: string
    responses:
      201:
        description: Experiment created
    """
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    tags = data.get("tags")
    description = data.get("description")

    if not name:
        return jsonify({"error": "Name is required"}), 400

    experiment = Experiment(
       name=name,
       tags=tags,
       description=description,
       
    )

    try:
        db.session.add(experiment)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Failed to create experiment"}), 400
    # ensure folder and default configs
    ensure_experiment_folder_and_defaults(experiment.id)
    return jsonify({"message": "Experiment created", "experiment_id": experiment.id}), 201

@bp.put("/experiments/<int:experiment_id>")
def update_experiment(experiment_id):
    """
    Update experiment name and/or tag
    ---
    tags:
      - Experiments
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
          properties:
            name:
              type: string
            tags:
              type: array
              items:
                type: string
            description:
              type: string
    responses:
      200:
        description: Experiment updated
    """
    data = request.get_json() or {}

    # Validate that at least one field is provided
    if not any(k in data for k in ("name", "tags", "description")):
        return jsonify({"error": "No update fields provided"}), 400

    # Fetch experiment and ensure ownership
    experiment = Experiment.query.filter_by(
        id=experiment_id
    ).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    # Apply partial updates
    if "name" in data:
        experiment.name = data["name"]

    if "tags" in data:
        experiment.tags = data["tags"]

    if "description" in data:
        experiment.description = data["description"]

    db.session.commit()

    return jsonify({"message": "Experiment updated"}), 200


@bp.delete("/experiments/<int:experiment_id>")
def delete_experiment(experiment_id):
    """
    Delete a experiment
    ---
    tags:
      - Experiments
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: Experiment deleted
    """
    experiment = Experiment.query.filter_by(
        id=experiment_id
    ).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    db.session.delete(experiment)
    db.session.commit()

    delete_experiment_folder(experiment_id)

    return jsonify({"message": "Experiment deleted"}), 200

@bp.get("/experiments/<int:experiment_id>/job")
def get_job_by_experiment(experiment_id):
    """
    Get the corresponding RQ job for a given experiment
    ---
    tags:
      - Experiments
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: Returns job info
      404:
        description: No job found for this experiment
    """
    conn = redis_client.client
    q = rq.get_queue()
    workers = Worker.all(connection=conn)

    # --- Search in queued jobs ---
    for job in q.jobs:
        if (
            job.meta.get("experiment_id") == experiment_id
        ):
            return jsonify({
                "job_id": job.id,
                "status": job.get_status(),
                "experiment_id": experiment_id,
                "experiment_name": job.meta.get("experiment_name"),
                "enqueued_at": job.enqueued_at,
            }), 200

    # --- Search in currently running jobs ---
    for worker in workers:
        current_job = worker.get_current_job()
        if (
            current_job and
            current_job.meta.get("experiment_id") == experiment_id
        ):
            return jsonify({
                "job_id": current_job.id,
                "status": current_job.get_status(),
                "experiment_id": experiment_id,
                "experiment_name": current_job.meta.get("experiment_name"),
                "started_at": current_job.started_at,
            }), 200

    # --- If not found ---
    return jsonify({"error": "No active or queued job found for this experiment"}), 404

@bp.post("/experiments/<int:experiment_id>/duplicate")
def duplicate_experiment(experiment_id):
    """
    Duplicate an experiment
    ---
    tags:
      - Experiments
    security:
      - bearerAuth: []
    parameters:
      - name: experiment_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              example: "experiment_copy"
            tags:
              type: array
              items:
                type: string
            description:
              type: string
              example: "desc"
    responses:
      201:
        description: Experiment duplicated
        schema:
          type: object
          properties:
            message:
              type: string
            experiment_id:
              type: integer
      400:
        description: Invalid input or conflict
      404:
        description: Experiment not found
    """
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    # Fetch original experiment (ownership enforced)
    original = Experiment.query.filter_by(
        id=experiment_id
    ).first()

    if not original:
        return jsonify({"error": "Experiment not found"}), 404

    # Create duplicated experiment
    new_experiment = Experiment(
        name=name,
        tags=data.get("tags", original.tags),
        description=data.get("description", original.description),
    )

    db.session.add(new_experiment)
    db.session.commit()  # needed to get new_experiment.id

    # Duplicate filesystem folder
    try:
        duplicate_experiment_folder(
            original.id,
            new_experiment.id
        )
    except Exception as e:
        # Roll back DB entry if filesystem fails
        db.session.delete(new_experiment)
        db.session.commit()
        return jsonify({"error": str(e)}), 400

    return jsonify({
        "message": "Experiment duplicated",
        "experiment_id": new_experiment.id
    }), 201