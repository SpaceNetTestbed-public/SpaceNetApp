import os
import shutil
import math

def create_default_gs(gs_file_id):
    os.makedirs("local_workspace" + "/gs", exist_ok=True)
    

    source_path = "default/gs_default.txt"
    destination_path = f"local_workspace/gs/{gs_file_id}.txt"

    shutil.copy2(source_path, destination_path)
    pass

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
