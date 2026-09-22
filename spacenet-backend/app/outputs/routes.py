import os
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from app.models.experiment import Experiment
from app.experiments.services import ensure_experiment_folder_and_defaults, delete_experiment_folder, rename_experiment_folder
from app.extensions import rq, redis_client
from rq.worker import Worker

bp = Blueprint("output", __name__, url_prefix="")

@bp.get("/experiments/<int:experiment_id>/download-output")
def download_zip(experiment_id):
    """
    Download experiment output zip
    ---
    tags:
      - Outputs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: file download
      404:
        description: not found
    """
    # instead of get_db (legacy), we are wiring the routes to postgress using SQLalchemy. same is done for all 4 routes below here.
    experiment = Experiment.query.filter_by(id=experiment_id).first()
    
    if experiment is None:
        return jsonify({"error": "Experiment not found"}), 404
        
    zip_path = f"local_workspace/{experiment.id}/output.zip"

    if not os.path.exists(zip_path):
        return abort(404, description="Zip file not found")

    return send_file(
        "../" + zip_path,
        as_attachment=True,
        download_name=f"{experiment.name}_output.zip"
    )

@bp.get("/experiments/<int:experiment_id>/download-output-mn")
def download_zip_mn(experiment_id):
    """
    Download experiment output mn zip
    ---
    tags:
      - Outputs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: file download
      404:
        description: not found
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()
    
    if experiment is None:
        return jsonify({"error": "Experiment not found"}), 404
        
    zip_path = f"local_workspace/{experiment.id}/output_mn.zip"

    if not os.path.exists(zip_path):
        return abort(404, description="Zip file not found")

    return send_file(
        "../" + zip_path,
        as_attachment=True,
        download_name=f"{experiment.name}_output_mn.zip"
    )

@bp.get("/experiments/<int:experiment_id>/has-phase-1")
def has_phase_1(experiment_id):
    """
    Has a phase 1 output
    ---
    tags:
      - Outputs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: file download
      404:
        description: not found
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()
    
    if experiment is None:
        return jsonify({"error": "Experiment not found"}), 404
        
    zip_path = f"local_workspace/{experiment.id}/output.zip"
    # A crashed Phase 1 run can leave a partial output.zip behind. The
    # optimal_routes folder is written by the final pipeline stage (and is
    # what the plotter and Phase 2 consume), so require it too before
    # reporting Phase 1 output as usable.
    optimal_routes_dir = f"local_workspace/{experiment.id}/output/optimal_routes"

    if not os.path.exists(zip_path) or not os.path.isdir(optimal_routes_dir):
        return jsonify({"data": False})

    return jsonify({"data": True})

@bp.get("/experiments/<int:experiment_id>/has-phase-2")
def has_phase_2(experiment_id):
    """
    Has a phase 2 output
    ---
    tags:
      - Outputs
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: file download
      404:
        description: not found
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()
    
    if experiment is None:
        return jsonify({"error": "Experiment not found"}), 404
        
    zip_path = f"local_workspace/{experiment.id}/output_mn.zip"

    if not os.path.exists(zip_path):
        return jsonify({"data": False})

    return jsonify({"data": True})