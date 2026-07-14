import os
from app.configurations.create_config import create_default_configs, readd_file_paths, resolve_ground_station_file
import shutil

def ensure_experiment_folder_and_defaults(experiment_id: int):
    os.makedirs("local_workspace/" + str(experiment_id), exist_ok=True)
    create_default_configs(experiment_id)

def delete_experiment_folder(experiment_id: str) -> None:
    folder = f"local_workspace/{experiment_id}"
    if os.path.exists(folder):
        shutil.rmtree(folder)

def rename_experiment_folder(username, old_name, new_name):
    """
    Renames the experiment folder when the experiment name changes.
    If the old folder doesn't exist, it silently returns (no error).
    """
    base_path = os.path.join("users", username)  # adjust if different
    old_path = os.path.join(base_path, old_name)
    new_path = os.path.join(base_path, new_name)

    # If folder does not exist, nothing to rename — avoid errors
    if not os.path.exists(old_path):
        return

    # Make sure the target name doesn't already exist
    if os.path.exists(new_path):
        raise FileExistsError(f"Target folder '{new_path}' already exists")

    shutil.move(old_path, new_path)

    readd_file_paths(username, new_name)

CONFIG_FILES = [
    "main_config.yaml",
    "main_mn_config.yaml",
    "sat_config.yaml",
    "sat_mn_config.yaml",
]


def duplicate_experiment_folder(old_id, new_id):
    """
    Duplicate only YAML config files from one experiment to another.
    """
    src_folder = os.path.join('local_workspace', str(old_id))
    dst_folder = os.path.join('local_workspace', str(new_id))
    print(src_folder)
    if not os.path.exists(src_folder):
        raise FileNotFoundError(f"Source experiment not found: {src_folder}")

    os.makedirs(dst_folder, exist_ok=False)

    for filename in CONFIG_FILES:
        src = os.path.join(src_folder, filename)
        dst = os.path.join(dst_folder, filename)

        if not os.path.exists(src):
            raise FileNotFoundError(f"Missing config file in source: {filename}")

        shutil.copy(src, dst)

    readd_file_paths(new_id)

def add_main_default(main_config, experiment_id):
    main_config['OutputFilePath'] = f"local_workspace/{experiment_id}/output/"
    main_config['ConstellationName'] = "sat_config"
    return main_config

def add_main_mn_default(main_mn_config, experiment_id):
    main_mn_config['Phase1FilePath'] = f"local_workspace/{experiment_id}/output/"
    main_mn_config['ResultsFilePath'] = f"local_workspace/{experiment_id}/output_mn/"
    main_mn_config['ConstellationName'] = "sat_mn_config"
    return main_mn_config

def add_sat_config_default(sat_config):
    sat_config['TLEFilePath'] = 'dynamic-topology-generator/utils/'
    return sat_config

def create_sat_mn_config(sat_config):
    total_sats = 0
    # count amount of satelites
    for shell_name, shell in sat_config["shells"].items():
        shell_total = shell["orbits"] * shell["sat_per_orbit"]
        total_sats += shell_total

    ground_station_count = 0
    with open(resolve_ground_station_file(), "r") as f:
        for line in f:
            ground_station_count += 1
    
    sat_mn_config = {}
    sat_mn_config['TotalSatCnt'] = total_sats
    sat_mn_config['TotalGSCnt'] = ground_station_count
    sat_mn_config["SimLength"] = {}
    sat_mn_config["SimLength"]["TimeStepDuration"] = sat_config["Sim_Length"]["TimeStepDuration"]
    sat_mn_config["SimLength"]["TimeStepCount"] = sat_config["Sim_Length"]["TimeStepCount"]
    sat_mn_config["Sim_Date_Time"] = {}
    sat_mn_config["Sim_Date_Time"]["StartYear"] = sat_config["Sim_Date_Time"]["StartYear"]
    sat_mn_config["Sim_Date_Time"]["StartMonth"] = sat_config["Sim_Date_Time"]["StartMonth"]
    sat_mn_config["Sim_Date_Time"]["StartDay"] = sat_config["Sim_Date_Time"]["StartDay"]
    sat_mn_config["Sim_Date_Time"]["StartHour"] = sat_config["Sim_Date_Time"]["StartHour"]
    sat_mn_config["Sim_Date_Time"]["StartMinute"] = sat_config["Sim_Date_Time"]["StartMinute"]
    sat_mn_config["Sim_Date_Time"]["StartSecond"] = sat_config["Sim_Date_Time"]["StartSecond"]
    return sat_mn_config