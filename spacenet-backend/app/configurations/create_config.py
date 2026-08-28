import yaml
from jsonschema import validate, ValidationError
from datetime import datetime, timedelta
import json
import os
import re

SAT_FILE = 'sat_config.yaml'
MAIN_FILE = 'main_config.yaml'
MAIN_MN_FILE = 'main_mn_config.yaml'
SAT_MN_FILE = 'sat_mn_config.yaml'

TLE_FILE_PATH = "dynamic-topology-generator/utils/"

# -----------------------------
# Creating the sat configuration
# -----------------------------

def add_sat_defaults(sat_config):
    sat_config["TLEFilePath"] = TLE_FILE_PATH
    return sat_config

def normalize_shell_keys(sat_config: dict) -> dict:
    """The simulators hardcode shellN keys ("shell1", …). Configs saved by
    older GUI builds keyed shells by array index ("0", "1", …) — re-key them
    here so every write path produces simulator-compatible names."""
    shells = sat_config.get("shells")
    if isinstance(shells, list):
        sat_config["shells"] = {f"shell{i + 1}": shell for i, shell in enumerate(shells)}
    elif isinstance(shells, dict) and any(
        not re.fullmatch(r"shell[0-9]+", str(key)) for key in shells
    ):
        sat_config["shells"] = {
            f"shell{i + 1}": shell for i, shell in enumerate(shells.values())
        }
    return sat_config

def create_sat_config(experiment_id, sat_config ):
    sat_config = normalize_shell_keys(sat_config)
    # sat_config = add_sat_defaults(sat_config)
    
    try:
      # This will raise ValueError if the date/time is invalid
      dt = datetime(
          year=sat_config["Sim_Date_Time"]["StartYear"],
          month=sat_config["Sim_Date_Time"]["StartMonth"],
          day=sat_config["Sim_Date_Time"]["StartDay"],
          hour=sat_config["Sim_Date_Time"]["StartHour"],
          minute=sat_config["Sim_Date_Time"]["StartMinute"],
          second=sat_config["Sim_Date_Time"]["StartSecond"]
      )
    except ValueError as e:
      raise ValidationError("Date is invalid: " + str(e))

    min_dt = dt - timedelta(days=2)
    max_dt = dt + timedelta(days=2)

    custom_tle_selected = sat_config.get('tle_id', -1) != -1
    if custom_tle_selected:
        # The user explicitly selected an uploaded real TLE. Preserve that
        # choice instead of falling back to the shell1-only synthetic generator.
        sat_config['generate_TLE'] = False
    else:
        sat_config['generate_TLE'] = True
        # Only auto-detect a real TLE by date when no specific custom TLE was
        # selected. The default utils/ path ships bundled real Starlink TLEs
        # whose dates can coincide with the simulation start date.
        if sat_config.get("TLEFilePath") != TLE_FILE_PATH:
            tles_dir = os.path.join(sat_config["TLEFilePath"], f"{sat_config['operator_name']}_tles")
            if os.path.isdir(tles_dir):
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
                        sat_config['generate_TLE'] = False

    if not validateConfig(sat_config, sat_config_schema):
        raise ValidationError("Satellite configuration is invalid")

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
    # consellation_name = f'{name}{total_sats}_{sat_config["Sim_Length"]["TimeStepDuration"]}_{sat_config["Sim_Length"]["TimeStepCount"]}'
    with open(f'local_workspace/{experiment_id}/{SAT_FILE}', 'w') as file:
        yaml.dump(sat_config, file, sort_keys=False)
    with open(f'local_workspace/{experiment_id}/{SAT_MN_FILE}', 'w') as file:
        yaml.dump(sat_mn_config, file, sort_keys=False)
    return True

# -----------------------------
# Creating the main configuration
# -----------------------------

CONSTELLATION_NAME = "sat_config"
GROUND_STATION_FILE =  "dynamic-topology-generator/utils/gs_files/gs_default.txt"
FALLBACK_GROUND_STATION_FILE = "default/gs_default.txt"

def resolve_ground_station_file():
    if os.path.exists(GROUND_STATION_FILE):
        return GROUND_STATION_FILE
    if os.path.exists(FALLBACK_GROUND_STATION_FILE):
        return FALLBACK_GROUND_STATION_FILE
    raise FileNotFoundError(
        f"Ground station file not found at {GROUND_STATION_FILE} or {FALLBACK_GROUND_STATION_FILE}"
    )

T2T_DICT_OUTPUT_FILE = "dynamic-topology-generator/t2t/gateway_files/t2t_dict.json"
T2T_AZURE_ENDPOINT_LOCATION_FILE = "dynamic-topology-generator/t2t/azure/AzureDataCenterLocations.csv"
T2T_AZURE_ENDPOINT_LATENCY_URL = "https://learn.microsoft.com/en-us/azure/networking/azure-network-latency"
T2T_AZURE_DICT_OUTPUT_FILE = "dynamic-topology-generator/t2t/azure/t2t_azure_dict.json"
T2T_WONDERPROXY_ENDPOINT_LOCATION_FILE = "dynamic-topology-generator/t2t/wonderproxy/wonderproxy_servers-2020-07-19.csv"
T2T_WONDERPROXY_ENDPOINT_LATENCY_FILE = "dynamic-topology-generator/t2t/wonderproxy/wonderproxy_pings-2020-07-19-2020-07-20.csv"
T2T_WONDERPROXY_DICT_OUTPUT_FILE = "dynamic-topology-generator/t2t/wonderproxy/t2t_wonderproxy_dict.json"

def add_main_default(main_config):
    main_config["ConstellationName"] =  CONSTELLATION_NAME
    main_config["Gateways"]["t2t_dict_output_file"] = T2T_DICT_OUTPUT_FILE
    main_config["Azure"]["t2t_azure_endpoint_location_file"] = T2T_AZURE_ENDPOINT_LOCATION_FILE
    main_config["Azure"]["t2t_azure_endpoint_latency_url"] = T2T_AZURE_ENDPOINT_LATENCY_URL
    main_config["Azure"]["t2t_azure_dict_output_file"] = T2T_AZURE_DICT_OUTPUT_FILE
    main_config["WonderProxy"]["t2t_wonderproxy_endpoint_location_file"] = T2T_WONDERPROXY_ENDPOINT_LOCATION_FILE
    main_config["WonderProxy"]["t2t_wonderproxy_endpoint_latency_file"] = T2T_WONDERPROXY_ENDPOINT_LATENCY_FILE
    main_config["WonderProxy"]["t2t_wonderproxy_dict_output_file"] = T2T_WONDERPROXY_DICT_OUTPUT_FILE
    return main_config

def check_ground_station_nodes(experiment_id, main_config, isMn=False):
    total_sats = 0
    with open(f'local_workspace/{experiment_id}/{SAT_FILE}', 'r') as file:
        data_yaml = yaml.safe_load(file)
        for shell_name, shell in data_yaml["shells"].items():
            shell_total = shell["orbits"] * shell["sat_per_orbit"]
            total_sats += shell_total
    if isMn:
        source = main_config["SourceDeviceName"]
        dest = main_config["DestDeviceName"]
    else:
        source = main_config["SourceNode"]
        dest = main_config["DestNode"]
    sourceFound = False
    destFound = False
    with open(resolve_ground_station_file(), "r") as f:
        for line in f:
            parts = line.strip().split(",")
            value = parts[0]
            if source == int(value):
                sourceFound = True
            if dest == int(value):
                destFound = True
            if (sourceFound and destFound):
                return True
    return False

def create_main_config(experiment_id, main_config):
    main_config = add_main_default(main_config)
    main_config["OutputFilePath"] = "local_workspace/" + str(experiment_id) + "/" + "output/"
    if not check_ground_station_nodes(experiment_id, main_config): 
        raise ValidationError("source or dest node invalid")
    if not validateConfig(main_config, main_config_schema):
        print("Main configuration is invalid")
        raise ValidationError("Main configuration is invalid")
    with open(f'local_workspace/{experiment_id}/{MAIN_FILE}', 'w') as file:
        yaml.dump(main_config, file, sort_keys=False)
    return True

CONSTELLATION_MN_NAME = "sat_mn_config"

def create_main_mn_config(experiment_id, main_mn_config):
    main_mn_config["Phase1FilePath"] = "local_workspace/" + str(experiment_id) + "/" + "output/"
    main_mn_config["ResultsFilePath"] = "local_workspace/" + str(experiment_id) + "/" + "output_mn/"
    main_mn_config["ConstellationName"] =  CONSTELLATION_MN_NAME
    if not validateConfig(main_mn_config, main_mn_config_schema):
        print("Main configuration is invalid")
        raise ValidationError("Main mn configuration is invalid")
    with open(f'local_workspace/{experiment_id}/{MAIN_MN_FILE}', 'w') as file:
        yaml.dump(main_mn_config, file, sort_keys=False)
    return True

# -----------------------------
# Validate configuration against schema
# -----------------------------

def validateConfig(config, schema):
    try:
        validate(instance=config, schema=schema)
    except ValidationError as e:
        print(f"Validation error: {e.message}")
        return False
    return True

def create_default_configs(experiment_id):
    with open('default/sat_default.yaml', 'r') as file:
        sat_config = yaml.safe_load(file)
    with open('default/main_default.yaml', 'r') as file:
        main_config = yaml.safe_load(file)
    with open('default/main_mn_default.yaml', 'r') as file:
        main_mn_config = yaml.safe_load(file)
    
    create_sat_config(experiment_id, sat_config)
    create_main_config(experiment_id, main_config)
    create_main_mn_config(experiment_id, main_mn_config)

def readd_file_paths(experiment_id):
    with open(f'local_workspace/{experiment_id}/sat_config.yaml', 'r') as file:
        sat_config = yaml.safe_load(file)
    with open(f'local_workspace/{experiment_id}/main_config.yaml', 'r') as file:
        main_config = yaml.safe_load(file)
    with open(f'local_workspace/{experiment_id}/main_mn_config.yaml', 'r') as file:
        main_mn_config = yaml.safe_load(file)
    
    create_sat_config(experiment_id, sat_config)
    create_main_config(experiment_id, main_config)
    create_main_mn_config(experiment_id, main_mn_config)

# -----------------------------
# Configuration Schemas
# -----------------------------

sat_config_schema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Constellation Configuration Schema",
  "type": "object",
  "properties": {
    "operator_name": {
      "type": "string"
    },
    "Sim_Length": {
      "type": "object",
      "properties": {
        "TimeStepDuration": { "type": "integer", "minimum": 1 },
        "TimeStepCount": { "type": "integer", "minimum": 1 }
      },
      "required": ["TimeStepDuration", "TimeStepCount"]
    },
    "Sim_Date_Time": {
      "type": "object",
      "properties": {
        "StartYear": { "type": "integer" },
        "StartMonth": { "type": "integer", "minimum": 1, "maximum": 12 }, # need to handle date checker
        "StartDay": { "type": "integer", "minimum": 1, "maximum": 31 },
        "StartHour": { "type": "integer", "minimum": 0, "maximum": 23 },
        "StartMinute": { "type": "integer", "minimum": 0, "maximum": 59 },
        "StartSecond": { "type": "integer", "minimum": 0, "maximum": 59 }
      },
      "required": [ # check TLE's if in folder or not
        "StartYear",
        "StartMonth",
        "StartDay",
        "StartHour",
        "StartMinute",
        "StartSecond"
      ]
    },
    "generate_TLE": {
      "type": "boolean"
    },
    "shells": {
      "type": "object",
      "patternProperties": {
        "^shell[0-9]+$": { # not required if generate_TLE is false
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "orbits": { "type": "integer", "minimum": 1 },
            "sat_per_orbit": { "type": "integer", "minimum": 1 },
            "altitude": { "type": "number", "minimum": 0 },
            "inclination": { "type": "number", "minimum": 0, "maximum": 180 },
            "pattern": {
              "type": "string",
              "enum": ["walker_delta", "walker_star"]
            },
            "ipp_increment": { "type": "number", "minimum": 0 },
            "body": { "type": "string", "enum": ["Earth", "Moon"] },
            "perturber": { "type": "string", "enum": ["Earth", "Moon"] } # need to check this
          },
          "required": [
            "name",
            "orbits",
            "sat_per_orbit",
            "altitude",
            "inclination",
            "pattern",
            "ipp_increment",
            "body"
          ]
        }
      },
      "minProperties": 1
    },
    "TLEFilePath": {
      "type": "string" # path of TLEs to check every date
    }
  },
  "required": ["operator_name", "Sim_Length", "Sim_Date_Time", "generate_TLE", "shells", "TLEFilePath"]
}

main_config_schema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Phase 1 Simulation Configuration",
  "type": "object",
  "properties": {
    "ConstellationName": {
      "type": "string"
    },
    "Debug": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1
    },
    "OutputFilePath": {
      "type": "string"
    },
    "MonitorResource": {
      "type": "boolean"
    },
    "SourceNode": { # based on earth/moon nodes based on sat config
      "type": "integer",
      "minimum": 0
    },
    "DestNode": { # based on earth/moon nodes based on sat config
      "type": "integer",
      "minimum": 0
    },
    "RouteWeight": {
      "type": "string",
      "enum": ["hops", "latency", "distance", "capacity"]
    },
    "GroundStationFile": { # static
      "type": "string"
    },
    "min_elevation_angle": {
      "type": "integer",
      "minimum": 0,
      "maximum": 90
    },
    "AssociationCritGSL": { "type": "string", "enum": ["BASED_ON_DISTANCE_ONLY_MININET", "BASED_ON_DISTANCE_ONLY_MININET_ALAN", "BASED_ON_LONGEST_ASSOCIATION_TIME"] },
    "UseWeatherData": {
      "type": "boolean"
    },
    "TopoCrit": {
      "type": "integer",
      "enum": [0, 1, 2]
    },
    "Gateways": { # not required
      "type": "object",
      "properties": {
        "t2t_gateway_kmz_type": { "type": "string", "enum": ["local", "link"] },
        "t2t_gateway_kmz_path": { "type": "string" },
        "t2t_dict_output_file": { "type": "string" }
      },
      "required": ["t2t_gateway_kmz_type", "t2t_gateway_kmz_path", "t2t_dict_output_file"]
    },
    "Azure": { # not required
      "type": "object",
      "properties": {
        "t2t_use_azure": { "type": "boolean" },
        "t2t_azure_endpoint_location_file": { "type": "string" },
        "t2t_azure_endpoint_latency_url": { "type": "string", "format": "uri" },
        "t2t_azure_dict_output_file": { "type": "string" }
      },
      "required": [
        "t2t_use_azure",
        "t2t_azure_endpoint_location_file",
        "t2t_azure_endpoint_latency_url",
        "t2t_azure_dict_output_file"
      ]
    },
    "WonderProxy": { # not required
      "type": "object",
      "properties": {
        "t2t_use_wonderproxy": { "type": "boolean" },
        "t2t_wonderproxy_endpoint_location_file": { "type": "string" },
        "t2t_wonderproxy_endpoint_latency_file": { "type": "string" },
        "t2t_wonderproxy_dict_output_file": { "type": "string" }
      },
      "required": [
        "t2t_use_wonderproxy",
        "t2t_wonderproxy_endpoint_location_file",
        "t2t_wonderproxy_endpoint_latency_file",
        "t2t_wonderproxy_dict_output_file"
      ]
    }
  },
  "required": [
    "ConstellationName",
    "Debug",
    "OutputFilePath",
    "MonitorResource",
    "SourceNode",
    "DestNode",
    "RouteWeight",
    "GroundStationFile",
    "min_elevation_angle",
    "AssociationCritGSL",
    "UseWeatherData",
    "TopoCrit",
    "Gateways",
    "Azure",
    "WonderProxy"
  ]
}

main_mn_config_schema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SpaceNetSimulatorJWTConfig",
  "type": "object",
  "properties": {
    "ConstellationName": {
      "type": "string",
      "description": "Name must match constellation config file"
    },
    "ResultsFilePath": {
      "type": "string",
      "description": "Path to store results"
    },
    "Phase1FilePath": {
      "type": "string",
      "description": "Path for phase 1 input files"
    },
    "DeleteAppResults": {
      "type": "boolean",
      "description": "Delete previous app results before running"
    },
    "Verbose": {
      "type": "boolean",
      "description": "Enable verbose logging"
    },
    "Optimize": {
      "type": "boolean",
      "description": "Enable optimization mode"
    },
    "MonitorResource": {
      "type": "boolean",
      "description": "Enable resource monitoring"
    },
    "SimTimeMode": {
      "type": "string",
      "enum": ["discrete", "continuous"],
      "description": "Simulation time mode"
    },
    "PrePing": {
      "type": "boolean",
      "description": "Whether to ping neighbors before starting the app"
    },
    "R2Q": {
      "type": "integer",
      "description": "Rate to quantum ratio for network links"
    },
    "DynamicLinkQueueSize": {
      "type": "boolean",
      "description": "Allow dynamic packet queue sizing based on bandwidth-delay product"
    },
    "AppName": {
      "type": "string",
      "enum": ["Ping", "iPerf", "CLI"],
      "description": "Application name to run in simulation"
    },
    "SourceDeviceName": {
      "type": "integer",
      "description": "Source device ID or name reference"
    },
    "DestDeviceName": {
      "type": "integer",
      "description": "Destination device ID or name reference"
    },
    "PauseAtIntervalChange": {
      "type": "boolean",
      "description": "Pause application during link/route updates"
    },
    "CLIStartInterval": {
      "type": "integer",
      "description": "Starting interval for CLI execution"
    },
    "CLIIntervalCount": {
      "type": "integer",
      "description": "Number of intervals for CLI execution"
    }
  },
  "required": [
    "ConstellationName",
    "ResultsFilePath",
    "Phase1FilePath",
    "DeleteAppResults",
    "Verbose",
    "Optimize",
    "MonitorResource",
    "SimTimeMode",
    "PrePing",
    "R2Q",
    "DynamicLinkQueueSize",
    "AppName",
    "SourceDeviceName",
    "DestDeviceName",
    "PauseAtIntervalChange",
    "CLIStartInterval",
    "CLIIntervalCount"
  ]
}
