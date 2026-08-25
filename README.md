# SpaceNet Testbed — Local Development Setup

SpaceNet is a LEO satellite constellation simulation and emulation platform 
developed at Virginia Tech, Dr. Kenyon's lab). It 
simulates real and custom satellite constellations, generates network 
topology and routing tables, and emulates network performance using Mininet.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 
  installed and running
- Git installed
- 16GB RAM recommended (simulation is compute-heavy)
- Windows, Mac, or Linux

---

## First-Time Setup

> NOTE: The `yoshwan-dev` branch is the most up-to-date version of the application, HIGHLY RECOMMENDED to follow the steps given below

Run these commands in order:

```bash
# 1. Clone this repo
git clone -b yoshwan-dev https://github.com/VTSpaceNetLab/VTSpaceNetApp.git
cd spacenet-local

# 2. Initialize all submodules (frontend + backend + nested)
git submodule update --init --recursive

# 3. Build and start all containers
docker compose up --build
```

The first build takes 5-10 minutes. Subsequent starts are much faster.

---

## Access the App

Once running, open your browser:

| Service | URL |
|---------|-----|
| SpaceNet GUI | http://localhost:3000 |
| Backend API docs | http://localhost:5000/apidocs |

The app opens directly to the Experiments page — no login required.

---

## Daily Usage

```bash
# Start the stack
docker compose up

# Stop the stack (keeps all data)
docker compose down

# Full reset — wipes database and starts clean
docker compose down -v
docker compose up --build
```

---

## What Each Container Does

| Container | Purpose |
|-----------|---------|
| spacenet-gui | Next.js frontend (port 3000) |
| spacenet-backend | Flask REST API (port 5000) |
| spacenet-db | PostgreSQL database |
| spacenet-redis | Redis job queue broker |
| spacenet-worker | Runs simulation jobs (Phase 1 + 2) |
| spacenet-worker-plot | Runs visualization/GIF jobs |

---

## Running a Simulation

1. Open http://localhost:3000
2. Click **New Experiment** and give it a name
3. Click **Edit Config** to configure the constellation
4. For quick testing, reduce the constellation:
   - Orbits: 4, Satellites per orbit: 6, Time steps: 3
   - This runs in ~5 minutes
5. Click **Run Simulation** → **Run Phase 1**
6. Monitor progress on the **Jobs** page
7. When Phase 1 completes, visualization output appears automatically

> **Note:** The default Starlink config (1584 satellites, 12 time steps)
> takes several hours on a laptop. Use the reduced config above for testing.

---

## Common Issues

**Port already in use:**
```bash
netstat -ano | findstr :3000
taskkill /PID 12345 /F
```

**Submodule errors:**
```bash
git submodule update --init --recursive
```

**Docker Desktop not running:**
Open Docker Desktop from your Start menu and wait for it to fully 
start before running docker compose commands.

**Database errors:**
```bash
docker compose down -v
docker compose up --build
```

**Simulation taking too long:**
Reduce in Edit Config — Orbits: 4, Sat per orbit: 6, TimeStepCount: 3

---

## Repository Structure

```
spacenet-local/
├── docker-compose.yml      # All container definitions
├── .env                    # Database credentials
├── spacenet-gui/           # Frontend submodule (Next.js)
└── spacenet-backend/       # Backend submodule (Flask + workers)
```

---

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Flask (Python), PostgreSQL, Redis, RQ workers
- **Simulation:** Skyfield (SGP4), NetworkX (Floyd-Warshall)
- **Emulation:** Mininet v2.3.0

---

*Virginia Tech — Aerospace & Ocean Engineering*
Dr. Samantha Parry Kenyon*
