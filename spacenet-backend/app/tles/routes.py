import os
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from app.extensions import db
from app.db import get_db
from app.experiments.services import ensure_experiment_folder_and_defaults, delete_experiment_folder, rename_experiment_folder, duplicate_experiment_folder
from app.extensions import rq, redis_client
from rq.worker import Worker
from app.configurations.create_config import GROUND_STATION_FILE
from app.models.custom_tle import CustomTLE
from sqlalchemy.exc import IntegrityError

bp = Blueprint("tles", __name__, url_prefix="")

@bp.get("/tles")
def get_tles():
    """
    Get all tles
    ---
    tags:
      - TLES
    security:
      - bearerAuth: []
    responses:
      200:
        description: Returns a list of tles
    """
    tles = CustomTLE.query.all()

    result = []
    for row in tles:
        result.append({
            "id": row.id,
            "name": row.name,
            "description": row.description
        })

    return jsonify(result), 200

@bp.post("/tles")
def create_tle():
    """
    Create a tle
    ---
    tags:
      - TLES
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
            description:
              type: string
            tle_file:
              type: string
    responses:
      201:
        description: Experiment created
    """
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    tle_file = data.get("tle_file")
    description = data.get("description")

    if not name:
        return jsonify({"error": "Name is required"}), 400

    if not tle_file:
        return jsonify({"error": "TLE file is required"}), 400

    tle = CustomTLE(
       name=name,
       description=description,
    )

    try:
        db.session.add(tle)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Failed to create tle file"}), 400

    os.makedirs("local_workspace" + "/tles", exist_ok=True)
    with open(f"local_workspace/tles/{tle.id}.txt", "w") as f:
         f.write(tle_file)
    


    return jsonify({"message": "Custom TLE file created", "tle_id": tle.id}), 201

@bp.delete("/tles/<int:tle_id>")
def delete_tle(tle_id):
    """
    Delete a specific TLE file
    ---
    tags:
      - TLES
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: tle_id
        type: integer
        required: true
        description: ID of the tle to delete
    responses:
      200:
        description: TLE file deleted
      404:
        description: TLE file not found
      400:
        description: Invalid request
    """    
    tle_file = CustomTLE.query.filter_by(
        id=tle_id
    ).first()

    if not tle_file:
        return jsonify({"error": "TLE file doesn't exist"}), 404 

    db.session.delete(tle_file)
    db.session.commit()

    filepath = f"local_workspace/tles/{tle_id}.txt"
    if os.path.exists(filepath):
        os.remove(filepath)
        
    return jsonify({"message": "TLE file deleted"}), 200

@bp.get("/tles/<int:tle_id>")
def get_tle(tle_id):
    """
    Get a specific TLE file
    ---
    tags:
      - TLES
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: tle_id
        type: integer
        required: true
        description: ID of the tle to get
    responses:
      200:
        description: TLE file sent
      404:
        description: TLE file not found
      400:
        description: Invalid request
    """    
    tle_file = CustomTLE.query.filter_by(
        id=tle_id
    ).first()

    filepath = f"local_workspace/tles/{tle_id}.txt"
    if not tle_file or not os.path.exists(filepath):
        return jsonify({"error": "TLE file doesn't exist"}), 404 

    
    with open(filepath, "r") as f:
      file_contents = f.read()
        
    return jsonify({"message": file_contents}), 200