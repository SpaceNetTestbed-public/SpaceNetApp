import os
import zipfile
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from app.db import get_db
from app.experiments.services import ensure_experiment_folder_and_defaults, delete_experiment_folder, duplicate_experiment_folder, create_sat_mn_config, add_main_default, add_main_mn_default, add_sat_config_default
from app.extensions import rq, redis_client
from rq.worker import Worker
from app.extensions import db
from app.models.experiment import Experiment
from sqlalchemy.exc import IntegrityError
import yaml

SAT_FILE = 'sat_config.yaml'
SAT_MN_FILE = 'sat_mn_config.yaml'
MAIN_FILE = 'main_config.yaml'
MAIN_MN_FILE = 'main_mn_config.yaml'

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
          "is_custom": experiment.is_custom,
          "tags": experiment.tags or [],
          "description": experiment.description,
          "created_at": experiment.created_at.isoformat(),
      }

      # Phase checks
      base_path = f"local_workspace/{experiment.id}"
      exp["hasExperiment"] = os.path.exists(f"{base_path}")
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

    # Phase checks — mirrors the same os.path.exists checks in the list
    # endpoint (get_experiments) above. Without these, callers that fetch a
    # single experiment (e.g. the edit page) can't tell whether Phase 1/2
    # output already exists, so guards like "confirm before overriding
    # existing output" silently never trigger.
    base_path = f"local_workspace/{experiment.id}"
    has_experiment = os.path.exists(f"{base_path}")
    has_phase_1 = os.path.exists(f"{base_path}/output.zip")
    has_phase_2 = os.path.exists(f"{base_path}/output_mn.zip")

    return jsonify({
        "id": experiment.id,
        "name": experiment.name,
        "tags": experiment.tags,
        "description": experiment.description,
        "hasExperiment": has_experiment,
        "hasPhase1": has_phase_1,
        "hasPhase2": has_phase_2,
    }), 200

import os
import json
import zipfile
import yaml
import shutil
from flask import request, jsonify
from sqlalchemy.exc import IntegrityError
# Assuming db, Experiment, add_main_default, create_sat_mn_config, etc. are imported above

@bp.post("/experiments")
def create_experiment():
    """
    Create an experiment
    ---
    tags:
      - Experiments
    security:
      - bearerAuth: []
    consumes:
      - multipart/form-data
      - application/json
    parameters:
      - in: formData
        name: name
        type: string
        required: true
      - in: formData
        name: is_custom
        type: boolean
      - in: formData
        name: tags
        type: array
        items:
          type: string
      - in: formData
        name: description
        type: string
      - in: formData
        name: file
        type: file
      - in: formData
        name: sat_config
        type: string
        description: JSON string of sat config
      - in: formData
        name: main_config
        type: string
        description: JSON string of main config
      - in: formData
        name: main_mn_config
        type: string
        description: JSON string of main mn config
    responses:
      201:
        description: Experiment created
    """
    # 1. Safely Extract Data Based on Content-Type
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        print("HERE")
        name = request.form.get("name", "").strip()
        description = request.form.get("description")
        zip_file = request.files.get("experiment_payload")
        
        # --- ROBUST TAG PARSING ---
        raw_tags = request.form.getlist("tags")
        if not raw_tags:
            raw_tags = request.form.getlist("tags[]")

        tags = []
        for item in raw_tags:
            item = item.strip()
            if item.startswith('[') and item.endswith(']'):
                try:
                    parsed_list = json.loads(item)
                    if isinstance(parsed_list, list):
                        tags.extend([str(t).strip() for t in parsed_list])
                except json.JSONDecodeError:
                    tags.append(item)
            elif ',' in item:
                tags.extend([t.strip() for t in item.split(',') if t.strip()])
            elif item:
                tags.append(item)
        # --------------------------
        
        # Explicitly handle boolean from string
        is_custom = request.form.get("is_custom", "").lower() in ['true', '1', 'yes']
        
        # Safely parse JSON strings from form data
        def parse_json_field(field_name):
            val = request.form.get(field_name)
            return json.loads(val) if val else None

        try:
            sat_config = parse_json_field("sat_config")
            main_config = parse_json_field("main_config")
            main_mn_config = parse_json_field("main_mn_config")
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON format in config fields"}), 400

    else:
        print("HERE1")
        # Standard JSON request fallback
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        tags = data.get("tags", [])
        is_custom = data.get("is_custom", False)
        description = data.get("description")
        zip_file = None
        sat_config = data.get("sat_config")
        main_config = data.get("main_config")
        main_mn_config = data.get("main_mn_config")

    # 2. Input Validation
    if not name:
        return jsonify({"error": "Name is required"}), 400

    if is_custom and not zip_file:
        if not sat_config or not main_config:
            return jsonify({"error": "Custom main and sat config required"}), 400

    # 3. Database Initialization
    experiment = Experiment(
        name=name,
        tags=tags,
        is_custom=is_custom,
        description=description,
    )

    try:
        db.session.add(experiment)
        db.session.flush() # Generates experiment.id, keeps transaction open

        workspace_dir = os.path.join("local_workspace", str(experiment.id))

        # 4. File System Operations
        if not is_custom:
            ensure_experiment_folder_and_defaults(experiment.id)
            
        elif zip_file:
            os.makedirs(workspace_dir, exist_ok=True)
            include = {"gifs", "output", "output_mn", "starlink_tles", 'main_config.yaml',  'main_mn_config.yaml', 'output_mn.zip', 'output.zip', 'sat_config.yaml', 'sat_mn_config.yaml'}
            with zipfile.ZipFile(zip_file, "r") as zf:
                members = [
                    name for name in zf.namelist()
                    if name.rstrip("/").split("/")[0] in include
                ]
                zf.extractall(path=workspace_dir, members=members)
            
            with open(os.path.join(workspace_dir, SAT_FILE), 'r+') as file:
                sat_config = yaml.safe_load(file)
                if 'dynamic-topology-generator' not in sat_config['TLEFilePath']:
                    sat_config['TLEFilePath'] = f'local_workspace/{experiment.id}'
                yaml.dump(sat_config, file, sort_keys=False)
            with open(os.path.join(workspace_dir, MAIN_FILE), 'r+') as file:
                main_config = yaml.safe_load(file)
                main_w_def = add_main_default(main_config, experiment.id)
                yaml.dump(main_w_def, file, sort_keys=False)
            with open(os.path.join(workspace_dir, MAIN_MN_FILE), 'r+') as file:
                main_mn_config = yaml.safe_load(file)
                main_mn_def = add_main_mn_default(main_mn_config, experiment.id)
                yaml.dump(main_mn_def, file, sort_keys=False)
        else:
            os.makedirs(workspace_dir, exist_ok=True)
            
            # Process configs
            resolved_main_config = add_main_default(main_config, experiment.id)
            resolved_sat_config = add_sat_config_default(sat_config)
            sat_mn_config = create_sat_mn_config(resolved_sat_config)

            # Dump YAMLs using os.path.join for safety
            with open(os.path.join(workspace_dir, MAIN_FILE), 'w') as file:
                yaml.dump(resolved_main_config, file, sort_keys=False)
                
            with open(os.path.join(workspace_dir, SAT_FILE), 'w') as file:
                yaml.dump(resolved_sat_config, file, sort_keys=False)
                
            with open(os.path.join(workspace_dir, SAT_MN_FILE), 'w') as file:
                yaml.dump(sat_mn_config, file, sort_keys=False)
                
            if main_mn_config:
                resolved_main_mn_config = add_main_mn_default(main_mn_config, experiment.id)
                with open(os.path.join(workspace_dir, MAIN_MN_FILE), 'w') as file:
                    yaml.dump(resolved_main_mn_config, file, sort_keys=False)

        # 5. Finalize Transaction
        db.session.commit()
        return jsonify({"message": "Experiment created", "experiment_id": experiment.id}), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Database integrity error. Failed to create experiment."}), 400
        
    except Exception as e:
        db.session.rollback()
        # Clean up any partially created folders so they aren't orphaned
        if 'workspace_dir' in locals() and os.path.exists(workspace_dir):
            shutil.rmtree(workspace_dir, ignore_errors=True)
            
        return jsonify({"error": f"Failed to setup experiment files: {str(e)}"}), 500

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
    data = {}
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data["name"] = request.form.get("name", "").strip()
        data["description"] = request.form.get("description")
        
        # --- ROBUST TAG PARSING ---
        raw_tags = request.form.getlist("tags")
        if not raw_tags:
            raw_tags = request.form.getlist("tags[]")

        tags = []
        for item in raw_tags:
            item = item.strip()
            if item.startswith('[') and item.endswith(']'):
                try:
                    parsed_list = json.loads(item)
                    if isinstance(parsed_list, list):
                        tags.extend([str(t).strip() for t in parsed_list])
                except json.JSONDecodeError:
                    tags.append(item)
            elif ',' in item:
                tags.extend([t.strip() for t in item.split(',') if t.strip()])
            elif item:
                tags.append(item)
        
        if tags:
             data["tags"] = tags
        # --------------------------
        
        # Explicitly handle boolean from string
        is_custom_str = request.form.get("is_custom")
        if is_custom_str is not None:
             data["is_custom"] = is_custom_str.lower() in ['true', '1', 'yes']

        # Safely parse JSON strings from form data
        def parse_json_field(field_name):
            val = request.form.get(field_name)
            return json.loads(val) if val else None

        try:
            # Only add to 'data' if the field is actually present in the request
            if "sat_config" in request.form:
                 data["sat_config"] = parse_json_field("sat_config")
            if "main_config" in request.form:
                 data["main_config"] = parse_json_field("main_config")
            if "main_mn_config" in request.form:
                 data["main_mn_config"] = parse_json_field("main_mn_config")
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON format in config fields"}), 400
            
        zip_file = request.files.get("experiment_payload")

    else:
        # Standard JSON request fallback
        data = request.get_json() or {}
        zip_file = None


    # Fetch experiment and ensure ownership
    experiment = Experiment.query.filter_by(
        id=experiment_id
    ).first()

    if not experiment:
        return jsonify({"error": "Experiment not found"}), 404

    # Apply partial updates
    if "name" in data and data["name"]:
        experiment.name = data["name"]

    if "tags" in data:
        experiment.tags = data["tags"]

    if "description" in data:
        experiment.description = data["description"]
    
    # Optional: Update is_custom if your app allows changing type after creation
    if "is_custom" in data:
        experiment.is_custom = data["is_custom"]
    
    workspace_dir = os.path.join("local_workspace", str(experiment.id))
    
    if experiment.is_custom:
        # Handle ZIP File update if provided
        if zip_file:
            os.makedirs(workspace_dir, exist_ok=True)
            include = {"gifs", "output", "output_mn", "starlink_tles", 'main_config.yaml',  'main_mn_config.yaml', 'output_mn.zip', 'output.zip', 'sat_config.yaml', 'sat_mn_config.yaml'}
            with zipfile.ZipFile(zip_file, "r") as zf:
                members = [
                    name for name in zf.namelist()
                    if name.rstrip("/").split("/")[0] in include
                ]
                zf.extractall(path=workspace_dir, members=members)
            
            # Re-process configs extracted from the new zip
            try:
                with open(os.path.join(workspace_dir, SAT_FILE), 'r+') as file:
                    sat_config = yaml.safe_load(file)
                    if 'dynamic-topology-generator' not in sat_config.get('TLEFilePath', ''):
                        sat_config['TLEFilePath'] = f'local_workspace/{experiment.id}'
                    file.seek(0)
                    yaml.dump(sat_config, file, sort_keys=False)
                    file.truncate()
            except FileNotFoundError:
                pass # Or handle missing zip configs as needed

            try:
                with open(os.path.join(workspace_dir, MAIN_FILE), 'r+') as file:
                    main_config = yaml.safe_load(file)
                    main_w_def = add_main_default(main_config, experiment.id)
                    file.seek(0)
                    yaml.dump(main_w_def, file, sort_keys=False)
                    file.truncate()
            except FileNotFoundError:
                pass

            try:
                with open(os.path.join(workspace_dir, MAIN_MN_FILE), 'r+') as file:
                    main_mn_config = yaml.safe_load(file)
                    main_mn_def = add_main_mn_default(main_mn_config, experiment.id)
                    file.seek(0)
                    yaml.dump(main_mn_def, file, sort_keys=False)
                    file.truncate()
            except FileNotFoundError:
                pass
        
        # Handle specific YAML updates
        else:
            if "main_config" in data:
                data["main_config"] = add_main_default(data["main_config"], experiment.id)
                with open(f'local_workspace/{experiment.id}/{MAIN_FILE}', 'w') as file:
                    yaml.dump(data["main_config"], file, sort_keys=False)
            
            if "sat_config" in data:
                data["sat_config"] = add_sat_config_default(data["sat_config"])
                with open(f'local_workspace/{experiment.id}/{SAT_FILE}', 'w') as file:
                    yaml.dump(data["sat_config"], file, sort_keys=False)
                sat_mn_config = create_sat_mn_config(data["sat_config"])
                with open(f'local_workspace/{experiment.id}/{SAT_MN_FILE}', 'w') as file:
                    yaml.dump(sat_mn_config, file, sort_keys=False)
            
            if "main_mn_config" in data:
                if data['main_mn_config'] == {}:
                    mn_path = f"local_workspace/{experiment.id}/{MAIN_MN_FILE}"
                    if os.path.exists(mn_path):
                        os.remove(mn_path)
                else:
                    data["main_mn_config"] = add_main_mn_default(data["main_mn_config"], experiment.id)
                    with open(f'local_workspace/{experiment.id}/{MAIN_MN_FILE}', 'w') as file:
                        yaml.dump(data["main_mn_config"], file, sort_keys=False)

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

