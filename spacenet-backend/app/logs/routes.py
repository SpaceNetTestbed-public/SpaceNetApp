import os
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from app.db import get_db
from app.experiments.services import ensure_experiment_folder_and_defaults, delete_experiment_folder, rename_experiment_folder
from app.extensions import rq, redis_client
from rq.worker import Worker

from app.models.experiment import Experiment
from app.models.job_log import JobLog

bp = Blueprint("logs", __name__, url_prefix="")

@bp.get("/experiments/<int:experiment_id>/logs")
def get_experiment_logs(experiment_id):
    """
    Get all job logs for an experiment
    ---
    tags:
      - Logs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: ID of the experiment
    responses:
      200:
        description: Returns a list of job logs
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                  logs:
                    type: string
                  created_at:
                    type: string
                    format: date-time
      404:
        description: Experiment not found
      500:
        description: Server error
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    logs = JobLog.query.filter_by(experiment_id=experiment_id).all()

    log_condensed = []

    for log in logs:
        l = {
            "id": log.id,
            "experiment_type": log.experiment_type,
            "created_at": log.created_at
        }
        log_condensed.append(l)

    return jsonify(log_condensed), 200

@bp.get("/experiments/<int:experiment_id>/logs/<int:log_id>")
def get_single_log(experiment_id, log_id):
    """
    Get full log contents for a given log entry
    ---
    tags:
      - Logs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: ID of the experiment
      - in: path
        name: log_id
        schema:
          type: integer
        required: true
        description: ID of the log entry
    responses:
      200:
        description: Returns the full log text
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: integer
                created_at:
                  type: string
                logs:
                  type: string
      404:
        description: Log entry not found
      500:
        description: Server error
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404
    
    log = JobLog.query.filter_by(id=log_id, experiment_id=experiment_id).first()

    if not log:
        return jsonify({"error": "Log entry not found"}), 404

    return jsonify({
        "id": log.id,
        "logs": log.logs,
        "experiment_type": log.experiment_type,
        "created_at": log.created_at
    }), 200

@bp.get("/experiments/<int:experiment_id>/logs/1")
def get_single_log_phase_1(experiment_id):
    """
    Get full log contents for a given log entry
    ---
    tags:
      - Logs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: ID of the experiment
    responses:
      200:
        description: Returns the full log text
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: integer
                created_at:
                  type: string
                logs:
                  type: string
      404:
        description: Log entry not found
      500:
        description: Server error
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    log = JobLog.query.filter_by(experiment_type=0, experiment_id=experiment_id).first()

    if not log:
        return jsonify({"error": "Log entry not found"}), 404

    return jsonify({
        "id": log.id,
        "logs": log.logs,
        "experiment_type": log.experiment_type,
        "created_at": log.created_at
    }), 200

@bp.get("/experiments/<int:experiment_id>/logs/2")
def get_single_log_phase_2(experiment_id):
    """
    Get full log contents for a given log entry
    ---
    tags:
      - Logs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: ID of the experiment
    responses:
      200:
        description: Returns the full log text
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: integer
                created_at:
                  type: string
                logs:
                  type: string
      404:
        description: Log entry not found
      500:
        description: Server error
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    log = JobLog.query.filter_by(experiment_type=1, experiment_id=experiment_id).first()

    if not log:
        return jsonify({"error": "Log entry not found"}), 404

    return jsonify({
        "id": log.id,
        "logs": log.logs,
        "experiment_type": log.experiment_type,
        "created_at": log.created_at
    }), 200