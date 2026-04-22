import os
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from app.extensions import db
from app.db import get_db
from app.experiments.services import ensure_experiment_folder_and_defaults, delete_experiment_folder, rename_experiment_folder, duplicate_experiment_folder
from app.extensions import rq, redis_client
from rq.worker import Worker
from app.gs.services import create_default_gs, geodetic_to_ecef
from app.configurations.create_config import GROUND_STATION_FILE
from app.models.ground_station_file import GroundStationFile
from sqlalchemy.exc import IntegrityError

bp = Blueprint("ground_stations", __name__, url_prefix="")

@bp.get("/ground_station_file")
def get_ground_stations():
    """
    Get all ground stations
    ---
    tags:
      - Ground Stations
    security:
      - bearerAuth: []
    responses:
      200:
        description: Returns a list of ground stations
    """
    gs_files = GroundStationFile.query.filter_by().all()

    result = []
    for row in gs_files:
        filepath = f"local_workspace/gs/{row.id}.txt"
        count = 0
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        count += 1
        result.append({
            "id": row.id,
            "name": row.name,
            "station_count": count
        })

    return jsonify(result), 200

@bp.get("/ground_station_file/<int:gs_id>")
def get_ground_station(gs_id):
    """
    Get a ground station by ID
    ---
    tags:
      - Ground Stations
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: gs_id
        type: integer
        required: true
    responses:
      200:
        description: Returns a ground station
    """
    gs_file = GroundStationFile.query.filter_by(id=gs_id).first()

    if gs_file is None:
        return jsonify({"error": "Ground station not found"}), 404

    filepath = f"local_workspace/gs/{gs_id}.txt"

    if not os.path.exists(filepath):
        return jsonify({"error": "Ground station file not found"}), 404

    stations = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() == "":
                continue
            parts = line.strip().split(",")
            try:
                station = {
                    "id": int(parts[0]),
                    "name": parts[1],
                    "lat": float(parts[2]),
                    "lon": float(parts[3]),
                }
                stations.append(station)
            except (IndexError, ValueError):
                continue  # skip malformed lines

    return jsonify({"id": gs_file.id, "name": gs_file.name, "stations": stations}), 200

@bp.post("/ground_station_file")
def create_ground_station():
    """
    Create a ground station
    ---
    tags:
      - Ground Stations
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
    responses:
      201:
        description: Ground station created
    """
    data = request.get_json() or {}

    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400

    gs_file = GroundStationFile(
        name=name,
        
    )

    try:
        db.session.add(gs_file)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Failed to create ground station file"}), 400

    create_default_gs(gs_file.id)

    return jsonify({"message": "Ground station file created", "gs_file_id": gs_file.id}), 201


@bp.put("/ground_station_file/<int:gs_id>")
def replace_ground_station_file(gs_id):
    """
    Replace the entire ground station file using a JSON list of stations.
    This endpoint auto-generates:
      - ID (sequential index)
      - ECEF coordinates (x, y, z)
      - val1 = 0
      - flag = 0

    Validates:
      - latitude (-90 to 90)
      - longitude (-180 to 180)

    ---
    tags:
      - Ground Stations
    security:
      - bearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: path
        name: gs_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: array
          items:
            type: object
            required:
              - name
              - lat
              - lon
            properties:
              name:
                type: string
                description: Name of the ground station
              lat:
                type: number
                description: Latitude in degrees
              lon:
                type: number
                description: Longitude in degrees
    responses:
      200:
        description: Ground station file replaced
      400:
        description: Invalid input data
    """
    stations = request.get_json()

    gs_file = GroundStationFile.query.filter_by(
        id=gs_id
    ).first()

    if not gs_file:
        return jsonify({"error": "Station file doesn't exist"}), 404

    if not isinstance(stations, list):
        return jsonify({"error": "Expected a JSON array of ground stations"}), 400

    filepath = f"local_workspace/gs/{gs_id}.txt"

    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    lines = []

    if len(stations) < 2:
      return jsonify({"error": "Your gs file should have at least 2 statinos"}), 400

    for idx, station in enumerate(stations):
        # Validate required fields
        if "name" not in station:
            return jsonify({"error": f"Station {idx} missing 'name'"}), 400
        if "lat" not in station or "lon" not in station:
            return jsonify({"error": f"Station {idx} must include lat and lon"}), 400

        lat = float(station["lat"])
        lon = float(station["lon"])

        # Validate lat/lon
        if not (-90 <= lat <= 90):
            return jsonify({"error": f"Invalid latitude at index {idx}: {lat}"}), 400
        if not (-180 <= lon <= 180):
            return jsonify({"error": f"Invalid longitude at index {idx}: {lon}"}), 400

        # Auto-generate ECEF
        x, y, z = geodetic_to_ecef(lat, lon)

        # forced fields
        val1 = 0
        flag = 0

        # Auto-generate ID
        line = f"{idx},{station['name']},{lat},{lon},{val1},{x},{y},{z},{flag}"
        lines.append(line)

    # Write full file
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return jsonify({"message": "Ground station file replaced"}), 200

@bp.delete("/ground_station_file/<int:gs_id>")
def delete_ground_station_line(gs_id):
    """
    Delete a specific ground station file by ID
    ---
    tags:
      - Ground Stations
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: gs_id
        type: integer
        required: true
        description: ID of the ground station to delete
    responses:
      200:
        description: Ground station file deleted
      404:
        description: Ground station file not found
      400:
        description: Invalid request
    """    
    gs_file = GroundStationFile.query.filter_by(
        id=gs_id
    ).first()

    if not gs_file:
        return jsonify({"error": "Station file doesn't exist"}), 404 

    db.session.delete(gs_file)
    db.session.commit()

    filepath = f"local_workspace/gs/{gs_id}.txt"
    if os.path.exists(filepath):
        os.remove(filepath)
        
    return jsonify({"message": "Ground station file deleted"}), 200


@bp.get("/ground_station_file/default")
def get_ground_station_default():
    """
    Get default ground stations
    ---
    tags:
      - Ground Stations
    security:
      - bearerAuth: []
    responses:
      200:
        description: list
    """
    stations = []
    with open("dynamic-topology-generator/utils/gs_files/gs_default.txt", "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() == "":
                continue
            parts = line.strip().split(",")
            try:
                station = {
                    "id": int(parts[0]),
                    "name": parts[1],
                    "lat": float(parts[2]),
                    "lon": float(parts[3]),
                }
                stations.append(station)
            except (IndexError, ValueError):
                continue  # skip malformed lines

    return jsonify({"id": -1, "name": "default", "stations": stations}), 200