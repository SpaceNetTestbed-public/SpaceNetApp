# SpaceNet Testbed: Local Development Setup

SpaceNet is a LEO satellite constellation simulation and emulation platform
developed at Virginia Tech by the Space Instrumentation and Systems Lab under the direction of Professor Samantha Kenyon. It simulates real-world and custom generated
satellite constellations, generates network topology and routing tables, and emulates network performance using Mininet.

## Prerequisites

- [Git](https://git-scm.com/install/) installed.
- [Docker Desktop](https://docs.docker.com/get-started/get-docker/) installed and running. On Windows, this requires WSL2 and a Linux distribution. To install WSL, open an administrator mode PowerShell or Command Prompt window and execute:
  ```powershell
  wsl --install
  ```
  This will activate WSL2 and install an Ubuntu distribution. For Linux or Mac, follow the instructions in the linked documentation.
- An SSH key added to your GitHub account and paired to your local machine (submodules clone over SSH) <!-- NOTE: Remove this when the public repo submodules are updated to HTTP -->
- 16GB RAM recommended (simulation is compute-heavy)

## First-Time Setup

Run these commands in order:

```bash
# 1. Clone this repo
git clone https://github.com/VTSpaceNetLab/VTSpaceNetApp.git
cd VTSpaceNetApp

# 2. Initialize submodules (Phase 1 + Phase 2 simulation engines)
git submodule update --init --recursive

# 3. Build and start all containers
docker compose up --build
```

The first build takes 5-10 minutes. Subsequent starts are much faster.

## Access the App

Once running, open your browser:

| Service | URL |
|---|---|
| SpaceNet GUI | http://localhost:3000 |
| Backend API docs | http://localhost:5000/apidocs |

The app opens directly to the Experiments page - no login required.

## Daily Usage

```bash
# Start the stack
docker compose up

# Stop the stack (keeps all data)
docker compose down
```

### Restarting the app (keeps your data)

```bash
docker compose down
docker compose up --build
```

### Full reset - permanently deletes all experiments, TLEs, and ground stations from the database (your `local_workspace/` files are NOT affected, but they will no longer show up in the app)

```bash
docker compose down -v
docker compose up --build
```

## What Each Container Does

| Container | Purpose |
|---|---|
| spacenet-gui | Next.js frontend (port 3000) |
| spacenet-backend | Flask REST API (port 5000) |
| spacenet-db | PostgreSQL database |
| spacenet-redis | Redis job queue broker |
| spacenet-worker | Runs simulation jobs (Phase 1 + 2) |
| spacenet-worker-plot | Runs visualization/GIF jobs |

## Running a Simulation

## Running a Simulation

1. Open http://localhost:3000
2. Click **New Experiment** and give it a name
3. Click **Create**
4. In the Experiment Configuration menu, enter desired parameters.
    - The default configuration (20 orbits, 15 satellites per orbit) is suitable for quick testing on a laptop.
5. Click **Run Simulation** → **Run Phase 1**
6. Monitor progress on the **Experiment Pipeline** or **Jobs** page
7. When Phase 1 completes, visualization output appears automatically.
8. After Phase 1 completes, click **Run Phase 2**.
9. View output either by downloading from the experiment pipeline page or navigating to the folder corresponding to your
experiment.

**Note:** Configurations with more satellites/orbits can take significantly longer and are CPU/memory-intensive - expect them to strain a laptop. Use the reduced configuration above for local testing.

## Common Issues

**Port already in use:**
```bash
netstat -ano | findstr :3000
taskkill /PID 12345 /F
```

**Submodule errors (including "Permission denied (publickey)"):**
Make sure your SSH key is added to your GitHub account and you have access
to `VTSpaceNetPhase1` and `VTSpaceNetPhase2`, then:
```bash
git submodule update --init --recursive
```

**Docker Desktop not running:** Open Docker Desktop from your Start menu
and wait for it to fully start before running `docker compose` commands.

**Database errors:**

### Restarting the app (keeps your data)

```bash
docker compose down
docker compose up --build
```

### Full reset - permanently deletes all experiments, TLEs, and ground stations from the database (your `local_workspace/` files are NOT affected, but they will no longer show up in the app)

```bash
docker compose down -v
docker compose up --build
```

**Simulation taking too long:** Reduce in Edit Config - Orbits: 4, Sat per
orbit: 6, TimeStepCount: 3.

## Repository Structure

```
VTSpaceNetApp/
├── docker-compose.yml              # All container definitions
├── .env                             # Database credentials
├── spacenet-gui/                    # Frontend (Next.js) - part of main repo
└── spacenet-backend/                 # Backend (Flask + workers)
    ├── dynamic-topology-generator/   # Submodule → VTSpaceNetPhase1 (orbit sim)
    └── constellation-simulator-main/ # Submodule → VTSpaceNetPhase2 (emulation)
```

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Flask (Python), PostgreSQL, Redis, RQ workers
- **Simulation:** Skyfield (SGP4), NetworkX (Floyd-Warshall)
- **Emulation:** Mininet v2.3.0

---
Virginia Tech, Aerospace & Ocean Engineering | Dr. Samantha Parry Kenyon