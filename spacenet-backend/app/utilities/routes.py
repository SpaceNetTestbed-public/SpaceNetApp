import os
from flask import Blueprint, jsonify, request, current_app
from app.configurations.create_config import GROUND_STATION_FILE, TLE_FILE_PATH
from datetime import datetime, timedelta
from pathlib import Path
import re

bp = Blueprint("utilities", __name__, url_prefix="")

@bp.post("/has-tle")
def has_tle():
    """
    Check if TLE exists for operator near given datetime
    ---
    tags:
      - Utilities
    parameters:
      - in: body
        name: body
        schema:
          required:
            - datetime
            - operator
          properties:
            datetime:
              type: string
            operator:
              type: string
    responses:
      200:
        description: found or not
    """
    data = request.get_json() or {}
    datetime_str = data.get("datetime")
    operator = data.get("operator")

    if not datetime_str:
        return jsonify({"error": "Missing 'datetime' field"}), 400
    if not operator:
        return jsonify({"error": "Missing 'operator' field"}), 400

    date_obj = None
    try:
        date_obj = datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M:%S")
    except ValueError:
        return jsonify({
            "error": "Invalid datetime format. Use 'YYYY-MM-DDTHH:MM:SS' (ISO 8601)."
        }), 400

    min_dt = date_obj - timedelta(days=2)
    max_dt = date_obj + timedelta(days=2)

    tles_dir = os.path.join(TLE_FILE_PATH, f"{operator}_tles")
    if not os.path.isdir(tles_dir):
        return jsonify({"message": "not found", "has_tle": False})

    for filename in os.listdir(tles_dir):
        name, _ = os.path.splitext(filename)
        l = name.split('_')
        if len(l) < 2:
            continue
        if not l[1].isdigit():
            continue
        file_ts = int(l[1])
        file_dt = datetime.fromtimestamp(file_ts)
        if min_dt <= file_dt <= max_dt:
            return jsonify({"message": "success", "has_tle": True})

    return jsonify({"message": "not found", "has_tle": False})

TLE_FOLDER = Path("dynamic-topology-generator/utils/starlink_tles/")

# Regex to extract satellite ID from lines like:
# STARLINK-1000
SAT_REGEX = re.compile(r"starlink-(\d+)", re.IGNORECASE)


def extract_sat_number(line: str) -> int:
    """Extract the STARLINK satellite number."""
    match = SAT_REGEX.search(line.strip())
    if not match:
        raise ValueError(f"Could not extract satellite number from line: {line}")
    return int(match.group(1))


@bp.route("/tle-info", methods=["GET"])
def tle_info():
    """
    Returns TLE file information including:
    - Extracted datetime from filename
    - First and last satellite IDs
    - Total count of satellites

    ---
    tags:
      - Utilities
    responses:
      200:
        description: TLE info extracted successfully
        examples:
          application/json:
            tle_sets:
              - file: "starlink_1720288988"
                datetime: "2024-07-06T12:23:08Z"
                first_satellite: 1000
                last_satellite: 1099
                satellite_count: 100
    """
    results = []

    for file in TLE_FOLDER.iterdir():
        if not (file.is_file() and file.name.startswith("starlink_")):
            continue

        # Extract UNIX timestamp from filename
        timestamp = int(file.name.split("_")[1])
        dt = datetime.utcfromtimestamp(timestamp)

        # Read TLE content
        lines = file.read_text().strip().splitlines()

        # First and third-to-last lines contain STARLINK-XXXX identifiers
        first_sat = extract_sat_number(lines[0])
        last_sat = extract_sat_number(lines[-3])

        count = last_sat - first_sat + 1

        results.append({
            "file": file.name,
            "datetime": dt.isoformat() + "Z",
            "first_satellite": first_sat,
            "last_satellite": last_sat,
            "satellite_count": count
        })

    return jsonify({"tle_sets": results})