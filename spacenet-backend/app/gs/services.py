import os
import shutil
import math

from app.configurations.create_config import resolve_ground_station_file


def parse_ground_stations_from_file(filepath):
    stations = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip() == "":
                continue
            parts = line.strip().split(",")
            try:
                stations.append({
                    "id": int(parts[0]),
                    "name": parts[1],
                    "lat": float(parts[2]),
                    "lon": float(parts[3]),
                })
            except (IndexError, ValueError):
                continue
    return stations


def create_default_gs(gs_file_id):
    os.makedirs("local_workspace/gs", exist_ok=True)
    source_path = resolve_ground_station_file()
    destination_path = f"local_workspace/gs/{gs_file_id}.txt"
    shutil.copy2(source_path, destination_path)

# WGS-84 constants
A = 6378137.0          # semi-major axis
E2 = 6.69437999014e-3  # eccentricity squared

def geodetic_to_ecef(lat_deg, lon_deg, h=0):
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)

    N = A / math.sqrt(1 - E2 * math.sin(lat)**2)

    x = (N + h) * math.cos(lat) * math.cos(lon)
    y = (N + h) * math.cos(lat) * math.sin(lon)
    z = (N * (1 - E2) + h) * math.sin(lat)

    return x, y, z
