from app.configurations.create_config import create_sat_config, create_main_config, create_main_mn_config

def create_sat_config_wrapper(experiment_id, data: dict):
    # wrapper to call your existing function (keeps behavior unchanged)
    return create_sat_config(experiment_id, data)

def create_main_config_wrapper(experiment_id, data: dict):
    return create_main_config(experiment_id, data)

def create_main_mn_config_wrapper(experiment_id, data: dict):
    return create_main_mn_config(experiment_id, data)