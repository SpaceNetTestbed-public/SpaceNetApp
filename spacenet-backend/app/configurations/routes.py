from flask import Blueprint, jsonify, request, send_file
from app.db import get_db
import json
from jsonschema import ValidationError
import yaml
from app.configurations.create_config import GROUND_STATION_FILE, TLE_FILE_PATH
from app.experiments.services import ensure_experiment_folder_and_defaults
from app.configurations.services import create_sat_config_wrapper, create_main_config_wrapper, create_main_mn_config_wrapper
import os
from datetime import datetime
import shutil
import io
import os
from zipfile import ZipFile, ZIP_DEFLATED

from app.models.experiment import Experiment
from app.models.ground_station_file import GroundStationFile
from app.models.custom_tle import CustomTLE

bp = Blueprint("configurations", __name__, url_prefix="")

# Constants (same names as before)
SAT_FILE = 'sat_config.yaml'
MAIN_FILE = 'main_config.yaml'
MAIN_MN_FILE = 'main_mn_config.yaml'

@bp.put("/experiments/<int:experiment_id>/sat")
def update_sat(experiment_id):
    """
    Update sat config
    ---
    tags:
      - Configurations
    security:
      - bearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            Sim_Date_Time:
              type: object
              properties:
                StartDay:
                  type: integer
                  example: 27
                StartHour:
                  type: integer
                  example: 22
                StartMinute:
                  type: integer
                  example: 15
                StartMonth:
                  type: integer
                  example: 9
                StartSecond:
                  type: integer
                  example: 6
                StartYear:
                  type: integer
                  example: 2024
                Sim_Length:
                  type: object
                  properties:
                    TimeStepCount:
                      type: integer
                      example: 12
                    TimeStepDuration:
                      type: integer
                      example: 10
                operator_name:
                  type: string
                  example: "starlink"
                shells:
                  type: object
                tle_id:
                  type: integer
                  example: -1
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: The experiment ID to update
    responses:
      200:
        description: sat config updated
      400:
        description: bad request
      404:
        description: experiment not found
    """
    experiment = Experiment.query.filter_by(
        id=experiment_id,
    ).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    data = request.get_json() or {}

    try:
      # This will raise ValueError if the date/time is invalid
      dt = datetime(
          year=data["Sim_Date_Time"]["StartYear"],
          month=data["Sim_Date_Time"]["StartMonth"],
          day=data["Sim_Date_Time"]["StartDay"],
          hour=data["Sim_Date_Time"]["StartHour"],
          minute=data["Sim_Date_Time"]["StartMinute"],
          second=data["Sim_Date_Time"]["StartSecond"]
      )
    except ValueError as e:
      raise ValidationError("Date is invalid: " + str(e))

    if not 'tle_id' in data:
      data['tle_id'] = -1
    
    if data['tle_id'] == -1:
      data['TLEFilePath'] = TLE_FILE_PATH
    else:
      tle_file = CustomTLE.query.filter_by(
          id=data['tle_id']
      ).first()

      if not tle_file:
          return jsonify({"error": "TLE not found"}), 404

      source_filepath = f"local_workspace/tles/{tle_file.id}.txt"

      if not os.path.exists(source_filepath):
          return jsonify({"error": "TLE file not found"}), 404

      dest_folder = f"local_workspace/{experiment.id}/"
      dest_file = dest_folder + f"{data['operator_name']}_tles/{str(int(dt.timestamp()))}.txt"

      if os.path.exists(dest_folder + f"{data['operator_name']}_tles/"):
        shutil.rmtree(dest_folder + f"{data['operator_name']}_tles/")
      os.makedirs(dest_folder + f"{data['operator_name']}_tles/")

      shutil.copy(source_filepath, dest_file)
      data['TLEFilePath'] = dest_folder

    try:
        create_sat_config_wrapper(experiment_id, data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"message": "sat config updated"}), 200

@bp.get("/experiments/<int:experiment_id>/sat")
def get_sat_by_id(experiment_id):
    """
    Get satellite config
    ---
    tags:
      - Configurations
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: Satellite config
    """
    experiment = Experiment.query.filter_by(
        id=experiment_id
    ).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    sat_path = f'local_workspace/{experiment_id}/{SAT_FILE}'
    # TODO: maybe don't create a whole new experiment when you can't get the SAT id.
    if not os.path.exists(sat_path):
        try:
            ensure_experiment_folder_and_defaults(experiment_id)
        except Exception as e:
            return jsonify({"error": f"Satellite config not found: {e}"}), 404

    if not os.path.exists(sat_path):
        return jsonify({"error": "Satellite config not found"}), 404

    with open(sat_path, 'r') as file:
        data_yaml = yaml.safe_load(file)

    if not data_yaml:
        return jsonify({"error": "Satellite config is empty"}), 404

    if "tle_id" not in data_yaml:
        data_yaml["tle_id"] = -1

    return jsonify(data_yaml), 200

@bp.get("/experiments/<int:experiment_id>/main")
def get_main(experiment_id):
    """
    Get main config
    ---
    tags:
      - Configurations
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: Main config
    """
    experiment = Experiment.query.filter_by(
        id=experiment_id
    ).first()
    with open(f'local_workspace/{experiment_id}/{SAT_FILE}', 'r') as file:
        sat_config = yaml.safe_load(file)
    total_sats = 0
    # count amount of satelites
    for shell_name, shell in sat_config["shells"].items():
        shell_total = shell["orbits"] * shell["sat_per_orbit"]
        total_sats += shell_total
    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404
    with open(f'local_workspace/{experiment_id}/{MAIN_FILE}', 'r') as file:
        data_yaml = yaml.safe_load(file)
        # data_yaml['DestNode'] -= total_sats
        # data_yaml['SourceNode'] -= total_sats
    return jsonify(data_yaml), 200

@bp.put("/experiments/<int:experiment_id>/main")
def create_main(experiment_id):
    """
    Update main config
    ---
    tags:
      - Configurations
    security:
      - bearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            AssociationCritGSL:
              type: string
              example: "BASED_ON_DISTANCE_ONLY_MININET"
            Azure:
              type: object
              properties:
                t2t_use_azure:
                  type: boolean
                  example: true
            Debug:
              type: integer
              example: 1
            DestNode:
              type: integer
              example: 1815
            Gateways:
              type: object
              properties:
                t2t_gateway_kmz_path:
                  type: string
                t2t_gateway_kmz_type:
                  type: string
            MonitorResource:
              type: boolean
              example: false
            RouteWeight:
              type: string
              example: "latency"
            SourceNode:
              type: integer
              example: 1814
            TopoCrit:
              type: integer
              example: 0
            UseWeatherData:
              type: boolean
              example: false
            WonderProxy:
              type: object
              properties:
                t2t_use_wonderproxy:
                  type: boolean
                  example: true
            min_elevation_angle:
              type: integer
              example: 25
            gs_file_id:
              type: integer
              example: -1
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: The experiment ID to update

    responses:
      200:
        description: main config updated
      400:
        description: bad request
      404:
        description: profile not found
    """
    experiment = Experiment.query.filter_by(
        id=experiment_id
    ).first()
    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    data = request.get_json() or {}

    if not 'gs_file_id' in data:
      data['gs_file_id'] = -1
    
    if data['gs_file_id'] == -1:
      data['GroundStationFile'] = GROUND_STATION_FILE
    else:
      gs_file = GroundStationFile.query.filter_by(
          id=data['gs_file_id']
      ).first()

      if not gs_file:
          return jsonify({"error": "Ground station not found"}), 404

      filepath = f"local_workspace/gs/{gs_file.id}.txt"

      if not os.path.exists(filepath):
          return jsonify({"error": "Ground station file not found"}), 404

      data['GroundStationFile'] = filepath

    with open(f'local_workspace/{experiment_id}/{SAT_FILE}', 'r') as file:
        sat_config = yaml.safe_load(file)
    total_sats = 0
    # count amount of satelites
    for shell_name, shell in sat_config["shells"].items():
        shell_total = shell["orbits"] * shell["sat_per_orbit"]
        total_sats += shell_total

    # data['SourceNode'] += total_sats
    # data['DestNode'] += total_sats

    try:
        create_main_config_wrapper(experiment_id, data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"message": "main config updated"}), 200

@bp.get("/experiments/<int:experiment_id>/main-mn")
def get_main_mn_by_id(experiment_id):
    """
    Get main mn config
    ---
    tags:
      - Configurations
    security:
      - bearerAuth: []
    parameters:
      - in: path
        name: experiment_id
        type: integer
        required: true
    responses:
      200:
        description: Main mn config
    """
    experiment = Experiment.query.filter_by(
        id=experiment_id
    ).first()
    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404
    if not os.path.exists(f'local_workspace/{experiment_id}/{MAIN_MN_FILE}'):
      return jsonify({"error": "Mininet main not found"}), 404 
    with open(f'local_workspace/{experiment_id}/{MAIN_MN_FILE}', 'r') as file:
        data_yaml = yaml.safe_load(file)
    return jsonify(data_yaml), 200

@bp.put("/experiments/<int:experiment_id>/main-mn")
def create_main_mn(experiment_id):
    """
    Update main mn config
    ---
    tags:
      - Configurations
    security:
      - bearerAuth: []
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            DeleteAppResults:
              type: boolean
              example: false
            Verbose:
              type: boolean
              example: true
            Optimize:
              type: boolean
              example: true
            MonitorResource:
              type: boolean
              example: false
            SimTimeMode:
              type: string
              example: "discrete"
            PrePing:
              type: boolean
              example: true
            R2Q:
              type: integer
              example: 1
            DynamicLinkQueueSize:
              type: boolean
              example: true
            AppName:
              type: string
              example: "Ping"
            SourceDeviceName:
              type: integer
              example: 1814
            DestDeviceName:
              type: integer
              example: 1815
            PauseAtIntervalChange:
              type: boolean
              example: true
            CLIStartInterval:
              type: integer
              example: 0
            CLIIntervalCount:
              type: integer
              example: 3
      - in: path
        name: experiment_id
        schema:
          type: integer
        required: true
        description: The experiment ID to update
    responses:
      200:
        description: main config updated
      400:
        description: bad request
      404:
        description: profile not found
    """
    experiment = Experiment.query.filter_by(
        id=experiment_id
).first()
    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    data = request.get_json() or {}

    with open(f'local_workspace/{experiment_id}/{SAT_FILE}', 'r') as file:
        sat_config = yaml.safe_load(file)
    total_sats = 0
    # count amount of satelites
    for shell_name, shell in sat_config["shells"].items():
        shell_total = shell["orbits"] * shell["sat_per_orbit"]
        total_sats += shell_total

    # data['SourceDeviceName'] += total_sats
    # data['DestDeviceName'] += total_sats

    try:
        create_main_mn_config_wrapper(experiment_id, data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"message": "main mn config updated"}), 200

@bp.get("/experiments/<int:experiment_id>/download-config")
def download_config_zip(experiment_id):
    """
    Download experiment configuration zip
    ---
    tags:
      - Configurations
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
        
    memory_file = io.BytesIO()

    with ZipFile(memory_file, mode='w', compression=ZIP_DEFLATED) as zf:
      zf.write(f"local_workspace/{experiment.id}/main_config.yaml", "main_config.yaml")
      zf.write(f"local_workspace/{experiment.id}/sat_config.yaml", "sat_config.yaml")
      zf.write(f"local_workspace/{experiment.id}/main_mn_config.yaml", "main_mn_config.yaml")

    memory_file.seek(0)

    return send_file(
        memory_file,
        as_attachment=True,
        mimetype="application/zip",
        download_name=f"configurations.zip")