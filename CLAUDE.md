# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

SpaceNet is a LEO satellite constellation simulation and emulation platform (Virginia Tech, Dr. Kenyon's lab). It has three layers:

- **Phase 1** (`spacenet-backend/dynamic-topology-generator`, git submodule): orbit simulation — TLE ingestion, SGP4 propagation via Skyfield, PlusGrid ISL generation, GSL generation, Floyd-Warshall routing table generation per timestep.
- **Phase 2** (`spacenet-backend/constellation-simulator-main`, git submodule): network emulation — virtual Linux router nodes per satellite/ground station via Mininet, dynamic link updates, ping/iPerf performance measurement.
- **GUI** (`spacenet-gui/`, Next.js frontend + `spacenet-backend/`, Flask REST API): web interface for configuring experiments, running simulations/jobs, managing ground stations and TLE data, and viewing results.

This top-level repo is the orchestration layer: `docker-compose.yml` wires the frontend, backend, Postgres, Redis, and RQ workers together. `spacenet-gui` and `spacenet-backend` are themselves independent repos (see `.gitmodules` — the two Phase 1/2 simulators are nested submodules under `spacenet-backend`).

## Repo layout

```
VTSpaceNetApp/
├── docker-compose.yml          # all container definitions
├── .env                        # DB credentials / env vars (not committed content should stay out of code)
├── spacenet-gui/                # Next.js 14 frontend (has its own CLAUDE.md)
│   └── src/
│       ├── app/(app)/           # App Router pages: experiments, ground-stations, jobs, tles, about
│       ├── components/          # experiment, experiment-config, ui
│       ├── lib/                 # api.ts (fetch wrappers), yaml.ts, experiment-validation.ts
│       ├── mocks/                # MSW handlers used by Jest tests
│       └── types/                # experiment-config.ts, types.ts
└── spacenet-backend/             # Flask REST API + simulation submodules
    ├── app/                      # blueprints: experiments, configurations, jobs, gs, tles, gif, logs, outputs, utilities
    ├── dynamic-topology-generator/ # Phase 1 submodule (VTSpaceNetPhase1)
    ├── constellation-simulator-main/ # Phase 2 submodule (VTSpaceNetPhase2)
    ├── migrations/                # Flask-Migrate/Alembic migrations
    └── run.py                    # Flask entrypoint
```

## Common commands

### Full stack (Docker — the normal way to run this app)
```bash
git submodule update --init --recursive   # required after clone, and after submodule branch changes
docker compose up --build                 # first run / after dependency changes
docker compose up                         # daily start
docker compose down                       # stop (keeps data)
docker compose down -v                    # full reset — wipes DB volume
```
Services: `spacenet-gui` (:3000, Next dev server), `spacenet-backend` (:5000, Flask), `spacenet-db` (Postgres), `spacenet-redis`, `spacenet-worker` (RQ `default` queue — Phase 1/2 jobs), `spacenet-worker-plot` (RQ `plot` queue — GIF/visualization jobs). Backend API docs (Swagger) at `http://localhost:5000/apidocs`. Inside containers, the frontend must reach the backend at `http://backend:5000`, not `localhost:5000`.

### Frontend (`spacenet-gui/`) — pnpm only, never npm/yarn
```bash
pnpm install
pnpm dev              # next dev
pnpm build            # next build
pnpm test             # jest (all tests)
pnpm test -- ExperimentCard   # run a single test file/pattern
pnpm test:watch
pnpm lint             # next lint
```
CI (`.github/workflows/test.yml`) runs `pnpm install --frozen-lockfile --ignore-scripts` then `pnpm test` from `spacenet-gui/` on every push/PR.

### Backend (`spacenet-backend/`) — outside Docker
```bash
python3 -m venv env && source ./env/bin/activate
pip3 install -r requirements.txt
flask db upgrade                # apply migrations
python3 run.py                  # Flask app on :5000
rq worker default               # Phase 1/2 job queue (needs sudo — simulator scripts require it)
rq worker plot                  # GIF/plot job queue
```
`run-dev.sh` runs Flask + both RQ workers + a cloudflared tunnel together for convenience.

## Architecture notes

- **Job flow**: the GUI creates/edits an experiment config → hits a route in `app/experiments` or `app/configurations` → backend enqueues a job onto Redis via RQ (`app/jobs`) → `worker` container runs Phase 1 (topology generation) and/or Phase 2 (constellation simulation) as a subprocess/import against the submodules → `worker_plot` generates GIF/visualization output separately → GUI polls `/jobs` (3s interval) for status and reads results via `app/outputs`.
- **Backend blueprints** are organized by domain under `spacenet-backend/app/`, each with its own `routes.py` (+ `services.py` where logic is nontrivial): `experiments`, `configurations`, `jobs`, `gs` (ground stations), `tles`, `gif`, `logs`, `outputs`, `utilities`. Register new blueprints in `app/__init__.py`.
- **Frontend routing** uses the Next.js App Router under `src/app/(app)/` — all pages are client components. Routes: `/experiments`, `/experiments/new`, `/experiments/[id]/edit`, `/experiments/[id]/simulate`, `/ground-stations`, `/ground-stations/[id]`, `/jobs`, `/tles`, `/about`. The root `/` is an animated landing page (not a redirect).
- **Auth has been fully removed** from the GUI — no login pages, no Bearer/localStorage tokens; routes redirect straight to `/experiments`. Backend still has Flask-JWT-Extended in `requirements.txt` from before this change.
- **Mocking**: frontend tests and dev-mode API mocking go through MSW (`src/mocks/handlers.ts`, `src/mocks/browser.ts`) — add a handler here when adding a new API endpoint.
- **Config-driven simulation**: simulation parameters (orbits, satellites/orbit, timesteps, etc.) always come from the experiment config, never hardcoded. A reduced config (4 orbits, 6 sats/orbit, 3 timesteps) runs in ~5 min for local testing; the default Starlink-scale config (1584 satellites, 12 timesteps) takes hours.

## Key domain concepts

- **TLE**: Two-Line Element set encoding satellite orbital parameters.
- **SGP4**: orbit propagator (accounts for drag + Earth's zonal harmonics), via Skyfield.
- **Walker Delta**: idealized constellation pattern with evenly spaced satellites/planes.
- **PlusGrid**: ISL topology where each satellite links to 2 intra-plane + 2 cross-plane neighbors.
- **Fisher-Jenks**: clustering algorithm used to sort real Starlink satellites into orbital planes.
- **ISL / GSL**: Inter-Satellite Link / Ground-Station Link (GSL: each ground station connects to the 4 nearest visible satellites within FOV).
- **HIL**: Hardware-in-the-loop — physical RPi+SDR nodes bridged into the emulated Mininet network.

## Conventions

- TypeScript is strict — never use `any`. Python must be type-annotated and PEP 8 compliant.
- pnpm only for the frontend; GitHub only for remotes (this repo mirrors from an internal GitLab — do not push there).
- FormData uploads: never manually set the `Content-Type` header — the browser sets the multipart boundary automatically.
- On Windows/PowerShell, quote paths containing `(app)`, e.g. `"src/app/(app)/experiments/page.tsx"`.

## Existing submodule CLAUDE.md

`spacenet-gui/CLAUDE.md` has additional frontend-specific context (sitemap detail, current work-in-progress, known issues). It duplicates much of the architecture/commands info above and also carries transient state (specific PR numbers, named contributors' current tasks) — worth trimming to just the frontend-only conventions that aren't covered here, and pruning outdated "current active development" notes periodically since stale context there causes wrong suggestions.
