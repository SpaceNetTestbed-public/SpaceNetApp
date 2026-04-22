import os
from app.configurations.create_config import create_default_configs, readd_file_paths
import shutil

def ensure_experiment_folder_and_defaults(experiment_id: int):
    os.makedirs("local_workspace/" + str(experiment_id), exist_ok=True)
    create_default_configs(experiment_id)

def delete_experiment_folder(experiment_id: str):
    # Keep behavior same as before; shell out removal (same as original)
    os.system(f"rm -rf local_workspace/{experiment_id}")

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