import os
import re
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from app.db import get_db
from app.experiments.services import ensure_experiment_folder_and_defaults, delete_experiment_folder, rename_experiment_folder
from app.extensions import rq, redis_client
from rq.worker import Worker
import yaml
import shutil

from app.models.experiment import Experiment

bp = Blueprint("gifs", __name__, url_prefix="")

def _valid_path_name(value: object) -> bool:
    return (
        isinstance(value, str)
        and re.fullmatch(r"^[A-Za-z0-9_-]{1,64}$", value) is not None
    )


def _is_within_directory(path: str, parent: str) -> bool:
    parent = os.path.realpath(parent)
    return os.path.commonpath((parent, os.path.realpath(path))) == parent


@bp.get("/experiments/<int:experiment_id>/gifs")
def get_gifs(experiment_id):
    """
    Get GIF names from experiment
    ---
    tags:
      - GIFS
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: list of gif names
      404:
        description: not found
    """
    experiment = Experiment.query.filter_by(id=experiment_id).first()
    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404
    path = f"local_workspace/{experiment.id}/gifs"

    if not os.path.isdir(path):
        return jsonify([])

    try:
        gifs = [
            name for name in os.listdir(path)
            if os.path.isdir(os.path.join(path, name))
        ]
        return jsonify(gifs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.get("/experiments/<int:experiment_id>/gifs/<gif_name>/config")
def get_gif_config(experiment_id, gif_name):
    """
    Get YAML config for a specific GIF
    ---
    tags:
      - GIFS
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
      - in: path
        name: gif_name
        type: string
        required: true
    responses:
      200:
        description: YAML config loaded as JSON
      404:
        description: not found
    """
    if not _valid_path_name(gif_name):
        return jsonify({"error": "Invalid gif_name"}), 400

    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    # Path like: users/USERNAME/experimentName/gifs/gif_name/config.yaml
    base_path = f"local_workspace/{experiment.id}/gifs/{gif_name}"
    yaml_path = os.path.join(base_path, "gif_config.yaml")
    experiment_dir = f"local_workspace/{experiment.id}/"
    if not all(
        _is_within_directory(path, experiment_dir)
        for path in (base_path, yaml_path)
    ):
        return jsonify({"error": "Invalid gif_name"}), 400

    # Check directory
    if not os.path.isdir(base_path):
        return jsonify({"error": "GIF directory not found"}), 404

    # Check YAML file
    if not os.path.exists(yaml_path):
        return jsonify({"error": "gif_config.yaml not found"}), 404

    try:
        with open(yaml_path, "r") as f:
            data = yaml.safe_load(f)

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.get("/experiments/<int:experiment_id>/gifs/<gif_name>/file")
def view_gif(experiment_id, gif_name):
    """
    Stream a GIF for viewing on the frontend
    ---
    tags:
      - GIFS
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
        name: gif_name
        schema:
          type: string
        required: true
        description: Name of the GIF folder
    responses:
      200:
        description: The GIF image file streamed for inline display
        content:
          image/gif:
            schema:
              type: string
              format: binary
      404:
        description: Not found
      500:
        description: Server error
    """
    if not _valid_path_name(gif_name):
        return jsonify({"error": "Invalid gif_name"}), 400

    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    # Base directory for outputs
    gif_dir = f"local_workspace/{experiment.id}/gifs/{gif_name}"

    # File paths
    gif_file = os.path.join(gif_dir, "output_gif.gif")
    html_file = os.path.join(gif_dir, "interactive_plot.html")
    experiment_dir = f"local_workspace/{experiment.id}/"
    if not all(
        _is_within_directory(path, experiment_dir)
        for path in (gif_dir, gif_file, html_file)
    ):
        return jsonify({"error": "Invalid gif_name"}), 400

    try:
        # Prefer HTML if it exists
        if os.path.exists(html_file):
            return send_file(
                "../" + html_file,
                mimetype="text/html",
                as_attachment=False
            )

        # Otherwise serve GIF
        if os.path.exists(gif_file):
            return send_file(
                "../" + gif_file,
                mimetype="image/gif",
                as_attachment=False
            )

        # Nothing found
        return jsonify({"error": "No output file found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.get("/experiments/<int:experiment_id>/gifs/<gif_name>/output")
def download_gif_folder(experiment_id, gif_name):
    """
    Stream a GIF for viewing on the frontend
    ---
    tags:
      - GIFS
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
        name: gif_name
        schema:
          type: string
        required: true
        description: Name of the GIF folder
    responses:
      200:
        description: The GIF image file streamed for inline display
        content:
          image/gif:
            schema:
              type: string
              format: binary
      404:
        description: Not found
      500:
        description: Server error
    """
    if not _valid_path_name(gif_name):
        return jsonify({"error": "Invalid gif_name"}), 400

    experiment = Experiment.query.filter_by(id=experiment_id).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    # Locate GIF directory
    gif_dir = f"local_workspace/{experiment.id}/gifs/"
    gif_zip = os.path.join(gif_dir, f"{gif_name}.zip")
    experiment_dir = f"local_workspace/{experiment.id}/"
    if not _is_within_directory(gif_zip, experiment_dir):
        return jsonify({"error": "Invalid gif_name"}), 400

    if not os.path.exists(gif_zip):
        return jsonify({"error": "GIF output not found"}), 404

    try:
        # Stream inline (NOT as a download)
        return send_file(
            "../" + gif_zip,
            as_attachment=True
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.delete("/experiments/<int:experiment_id>/gifs/<gif_name>")
def delete_gif(experiment_id, gif_name):
    """
    Delete a GIF directory and all its contents
    ---
    tags:
      - GIFS
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: Experiment ID
      - in: path
        name: gif_name
        schema:
          type: string
        required: true
        description: The name of the GIF directory to delete
    responses:
      200:
        description: GIF directory deleted successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
      404:
        description: Experiment or GIF directory not found
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
      500:
        description: Server error
    """
    if not _valid_path_name(gif_name):
        return jsonify({"error": "Invalid gif_name"}), 400

    experiment = Experiment.query.filter_by(id=experiment_id).first()
    if experiment is None:
        return jsonify({"error": "Experiment not found"}), 404

    # Build GIF directory path
    gif_dir = f"local_workspace/{experiment.id}/gifs/{gif_name}/"
    gif_zip = f"local_workspace/{experiment.id}/gifs/{gif_name}.zip"
    experiment_dir = f"local_workspace/{experiment.id}/"
    if not all(
        _is_within_directory(path, experiment_dir)
        for path in (gif_dir, gif_zip)
    ):
        return jsonify({"error": "Invalid gif_name"}), 400

    if os.path.exists(gif_zip):
        os.remove(gif_zip)

    if not os.path.isdir(gif_dir):
        return jsonify({"error": "GIF directory not found"}), 404

    try:
        shutil.rmtree(gif_dir)  # Recursively delete directory
        return jsonify({"message": f"GIF '{gif_name}' deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500