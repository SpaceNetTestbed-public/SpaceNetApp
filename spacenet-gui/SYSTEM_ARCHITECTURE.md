# SpaceNet GUI - System Architecture Documentation

> **Project**: SpaceNet Testbed - LEO Satellite Constellation Simulation Platform  
> **Version**: 0.1.0 (from package.json)  
> **Documentation**: Generated from comprehensive codebase analysis

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Full Application Structure](#4-full-application-structure)
5. [Data Flow](#5-data-flow)
6. [Pages and Routes](#6-pages-and-routes)
7. [Component Inventory](#7-component-inventory)
8. [API Integration](#8-api-integration)
9. [State Management](#9-state-management)
10. [Styling and Theming](#10-styling-and-theming)
11. [Docker Setup](#11-docker-setup)
12. [Environment Variables](#12-environment-variables)
13. [Development Setup](#13-development-setup)
14. [Known Issues and Future Work](#14-known-issues-and-future-work)

---

## 1. Project Overview

### What is SpaceNet GUI?

SpaceNet GUI is a web-based frontend for the **Virginia Tech LEO satellite constellation simulation platform**. It enables researchers at Virginia Tech to:

- Create and manage satellite constellation experiments
- Configure YAML-based simulation parameters (Starlink, OneWeb, Amazon Kuiper, custom operators)
- Run Phase 1 and Phase 2 simulations
- Visualize results (3D Earth, output HTML, GIFs)
- Manage ground station files and job queues
- Download simulation outputs

### Who Uses It?

- **Researchers** at Virginia Tech Aerospace & Ocean Engineering – Hume Center Research Group
- **Academic use** – no authentication, no public deployment
- **Local or Docker research tool** – runs on localhost or inside Docker for internal simulation workflows

### Deployment Model

- **No authentication** – no login, no create-account, no Bearer tokens
- **No public deployment** – intended for local Docker or lab use
- Backend is a separate Python API (not in this repo)

---

## 2. Tech Stack

Exact versions from `package.json`:

| Category | Package | Version |
|----------|---------|---------|
| Framework | next | ^14.2.5 |
| UI | react | ^18.3.1 |
| UI | react-dom | ^18.3.1 |
| Language | TypeScript | ^5.5.4 |
| Styling | tailwindcss | ^3.4.7 |
| Styling | tailwindcss-animate | ^1.0.7 |
| Animation | framer-motion | ^12.23.25 |
| Icons | lucide-react | ^0.427.0 |
| Dropdowns | @radix-ui/react-dropdown-menu | ^2.1.16 |
| State/Data | @tanstack/react-query | ^5.56.2 |
| State/Data | @tanstack/react-query-devtools | ^5.56.2 |
| Themes | next-themes | ^0.4.4 |
| Toast | sonner | ^1.7.0 |
| Utilities | clsx | ^2.1.1 |
| Utilities | tailwind-merge | ^2.5.2 |
| Mocks | msw | ^2.4.9 |

**Dev**: autoprefixer, postcss, eslint, eslint-config-next, @types/node, @types/react, @types/react-dom

**Package manager**: `pnpm` (use `pnpm`, NOT npm)

---

## 3. System Architecture

### Frontend ↔ Backend Communication

- **API base URL**: `process.env.NEXT_PUBLIC_API_URL` (see [Environment Variables](#12-environment-variables))
- **Locally**: `http://localhost:5000` (from `.env`)
- **Inside Docker**: `http://backend:5000` (set via env at container runtime/build)
- **No auth tokens** – no Bearer headers, no auth headers, no cookie-based auth
- All requests use `Content-Type: application/json` only

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Next.js App (port 3000)                                   │ │
│  │  - App Router (/, /experiments, /jobs, /ground-stations)    │ │
│  │  - Components, lib/api.ts (apiFetch)                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ HTTP (no auth headers)             │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Python Backend (port 5000)                                │ │
│  │  - Experiments, jobs, ground stations, phases, logs, etc.   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Full Application Structure

```
spacenet-gui/
├── .dockerignore           # Excludes node_modules, .next, .git, .env*
├── .env                    # NEXT_PUBLIC_API_URL (git-ignored)
├── CLAUDE.md               # Project notes for AI assistants
├── Dockerfile              # Node 18, pnpm, build, CMD pnpm start
├── next.config.js         # reactStrictMode: true
├── package.json            # Dependencies and scripts
├── postcss.config.js       # tailwindcss, autoprefixer
├── tailwind.config.ts     # VT colors, maroon, light/dark theme
├── tsconfig.json           # Path alias @/* → ./src/*
├── next-env.d.ts           # Next.js types
├── public/
│   └── mockServiceWorker.js  # MSW worker (public/workerDirectory)
├── src/
│   ├── app/
│   │   ├── globals.css       # Tailwind, keyframes (orbit-slow, pulse-glow, scroll-bounce)
│   │   ├── layout.tsx        # Root layout: Inter font, Providers, ConditionalHeader, ToasterProvider
│   │   ├── page.tsx          # Home page (hero, about, how-it-works, researchers)
│   │   ├── home/
│   │   │   └── page.tsx      # Alternate home (simple centered layout)
│   │   ├── profiles/
│   │   │   └── page.tsx      # Redirects to /experiments
│   │   └── (app)/            # App layout group (TopNav, FloatingDocsButton)
│   │       ├── layout.tsx    # TopNav, main, FloatingDocsButton
│   │       ├── experiments/
│   │       │   ├── page.tsx  # Experiments list, create modal, groups by tags
│   │       │   ├── new/
│   │       │   │   └── page.tsx  # New experiment form (SAT/Main config) – TODO: backend save
│   │       │   └── [id]/
│   │       │       ├── edit/
│   │       │       │   └── page.tsx  # Edit experiment config
│   │       │       └── simulate/
│   │       │           └── page.tsx  # Phase 1/2, visualization, logs, GIF
│   │       ├── ground-stations/
│   │       │   ├── page.tsx  # Ground station files list, create, delete
│   │       │   └── [id]/
│   │       │       └── page.tsx  # Edit station set (name, stations lat/lon)
│   │       ├── jobs/
│   │       │   └── page.tsx  # Job queue, search, cancel, logs
│   │       └── about/
│   │           └── page.tsx  # About SpaceNet, features, tech stack
│   ├── components/
│   │   ├── ConditionalHeader.tsx   # Renders Header only on non-home, non-app routes
│   │   ├── DocsDrawer.tsx         # Slide-out docs panel (YAML ref, copy example)
│   │   ├── ExperimentCard.tsx      # Card: name, status, edit, run, duplicate, delete
│   │   ├── ExperimentGroup.tsx     # Collapsible group of ExperimentCards
│   │   ├── FloatingDocsButton.tsx  # Fixed bottom-right docs button
│   │   ├── Header.tsx              # Simple header (logo, theme toggle)
│   │   ├── HomeNavbar.tsx          # Home page navbar (scroll-aware)
│   │   ├── Providers.tsx           # ThemeProvider, QueryClientProvider, ReactQueryDevtools
│   │   ├── ThemeToggle.tsx         # Dark/light toggle (next-themes)
│   │   ├── TopNav.tsx              # App nav: Experiments, Jobs, Ground Stations, About
│   │   ├── ToasterProvider.tsx     # Sonner Toaster (top-center)
│   │   ├── experiment/
│   │   │   ├── ExperimentEditFooter.tsx  # Unsaved changes footer
│   │   │   ├── ExperimentEditHeader.tsx   # Back, Import/Export YAML, Save, Save & Run
│   │   │   ├── ExperimentMetadataForm.tsx  # Name, description, tags
│   │   │   ├── GifModal.tsx        # Modal for Phase 1 GIF
│   │   │   ├── LogsModal.tsx       # Modal for phase logs
│   │   │   ├── PhaseCard.tsx       # Phase 1/2 card (Run, Download, Logs, View GIF)
│   │   │   └── VisualizationPanel.tsx  # Time step, shell colors, iframe output, download
│   │   ├── experiment-config/
│   │   │   ├── MainConfigForm.tsx  # Debug, routing, GS file, ISTN, Azure, WonderProxy
│   │   │   ├── SatConfigForm.tsx   # Operator, Sim_Length, Sim_Date_Time, shells
│   │   │   └── ShellEditor.tsx     # Single shell: orbits, sat_per_orbit, altitude, inclination, etc.
│   │   └── ui/
│   │       ├── button.tsx          # Button (default, outline, ghost; sm, md, lg)
│   │       ├── confirm-dialog.tsx  # ConfirmDialog (danger, warning variants)
│   │       └── tabs.tsx            # Tabs, TabsList, TabsTrigger, TabsContent
│   ├── data/
│   │   ├── experiments.ts         # Mock experiments (TODO: replace with API)
│   │   └── runs.ts                # Mock runs (TODO: replace with API)
│   ├── hooks/
│   │   └── useExperimentSave.ts    # Save experiment config (sat, main, main-mn, metadata)
│   ├── lib/
│   │   ├── api.ts                 # apiFetch(), API_URL (no auth)
│   │   ├── constants.ts           # Lat/lon limits, altitude, inclination, sim limits
│   │   ├── experiment-validation.ts  # validateExperimentConfig()
│   │   ├── queryClient.ts         # getQueryClient() – React Query config
│   │   ├── utils.ts               # cn(), getApiErrorMessage()
│   │   └── yaml.ts                # generateSatYAML(), generateMainYAML()
│   ├── mocks/
│   │   ├── browser.ts             # MSW setupWorker
│   │   └── handlers.ts            # MSW handlers (e.g. /api/health)
│   └── types/
│       ├── experiment-config.ts   # SatConfig, MainConfig, ShellConfig, ExperimentConfig
│       └── types.ts               # Experiment, ExperimentGroup, CreateExperimentBody, etc.
```

---

## 5. Data Flow

### End-to-End: User Action → Backend → State → Re-render

1. **Component** – User clicks "Create Experiment" (modal submit)
2. **Handler** – `onClick` calls `apiFetch('/experiments', { method: 'POST', body: JSON.stringify(body) })`
3. **apiFetch** – `fetch(API_URL + endpoint, { headers: { 'Content-Type': 'application/json' }, ... })`
4. **Backend** – Python API processes request, returns JSON (e.g. `{ experiment_id: "..." }`)
5. **Response** – On success: `router.push(/experiments/${expId}/edit)`; on error: `throw new Error(text)`
6. **Error handling** – `catch` uses `getApiErrorMessage(err, fallback)` → `toast.error(...)`
7. **State update** – For list updates: `setExperiments(...)` or `removeExperiment(id)`
8. **Re-render** – React re-renders; `useMemo` recalculates filtered groups

### Key patterns

- **Direct fetch** – Most data uses `apiFetch()` or raw `fetch()` (for binary blobs)
- **useEffect** – Fetch on mount (e.g. `fetchExperiments`, `loadGSFiles`)
- **useState** – Local component state (experiments, loading, modal visibility)
- **useMemo** – Derived data (experimentGroups, filteredGroups, filteredJobs)
- **toast** – User feedback via Sonner (success/error)

---

## 6. Pages and Routes

**Current routes only. No /login, /create-account, or any auth routes.**

| Route | File | Description |
|-------|------|--------------|
| `/` | `app/page.tsx` | Home – hero, about, how-it-works, researchers |
| `/home` | `app/home/page.tsx` | Simple alternate home |
| `/profiles` | `app/profiles/page.tsx` | Redirects to `/experiments` |
| `/experiments` | `app/(app)/experiments/page.tsx` | Experiments list, create/duplicate modal |
| `/experiments/new` | `app/(app)/experiments/new/page.tsx` | New experiment form (SAT/Main config) |
| `/experiments/[id]/edit` | `app/(app)/experiments/[id]/edit/page.tsx` | Edit experiment configuration |
| `/experiments/[id]/simulate` | `app/(app)/experiments/[id]/simulate/page.tsx` | Run Phase 1/2, visualization, logs |
| `/ground-stations` | `app/(app)/ground-stations/page.tsx` | Ground station files list |
| `/ground-stations/[id]` | `app/(app)/ground-stations/[id]/page.tsx` | Edit ground station set |
| `/jobs` | `app/(app)/jobs/page.tsx` | Job queue |
| `/about` | `app/(app)/about/page.tsx` | About page |

App layout (`(app)`) provides TopNav and FloatingDocsButton for experiments, jobs, ground-stations, about. Home (`/`) and `/home` use their own layouts (HomeNavbar or none).

---

## 7. Component Inventory

| Component | Path | Description |
|-----------|------|-------------|
| ConditionalHeader | `components/ConditionalHeader.tsx` | Shows Header only when not on home or app routes |
| DocsDrawer | `components/DocsDrawer.tsx` | Slide-out documentation panel with YAML reference |
| ExperimentCard | `components/ExperimentCard.tsx` | Experiment card with edit, run, duplicate, delete |
| ExperimentGroup | `components/ExperimentGroup.tsx` | Collapsible group of experiment cards |
| FloatingDocsButton | `components/FloatingDocsButton.tsx` | Fixed docs button that opens DocsDrawer |
| Header | `components/Header.tsx` | Simple header with logo and theme toggle |
| HomeNavbar | `components/HomeNavbar.tsx` | Home page navbar (scroll-aware) |
| Providers | `components/Providers.tsx` | ThemeProvider, QueryClientProvider, ReactQueryDevtools |
| ThemeToggle | `components/ThemeToggle.tsx` | Dark/light mode toggle |
| TopNav | `components/TopNav.tsx` | App navbar: Experiments, Jobs, Ground Stations, About |
| ToasterProvider | `components/ToasterProvider.tsx` | Sonner toast container |
| ExperimentEditFooter | `components/experiment/ExperimentEditFooter.tsx` | Unsaved changes footer bar |
| ExperimentEditHeader | `components/experiment/ExperimentEditHeader.tsx` | Edit page header with actions |
| ExperimentMetadataForm | `components/experiment/ExperimentMetadataForm.tsx` | Experiment name, description, tags |
| GifModal | `components/experiment/GifModal.tsx` | Modal to view Phase 1 GIF |
| LogsModal | `components/experiment/LogsModal.tsx` | Modal for phase logs |
| PhaseCard | `components/experiment/PhaseCard.tsx` | Phase 1 or 2 card (Run, Download, Logs, View GIF) |
| VisualizationPanel | `components/experiment/VisualizationPanel.tsx` | Time step selector, shell colors, output iframe |
| MainConfigForm | `components/experiment-config/MainConfigForm.tsx` | Main config form (routing, GS, ISTN) |
| SatConfigForm | `components/experiment-config/SatConfigForm.tsx` | SAT config (operator, Sim_Length, shells) |
| ShellEditor | `components/experiment-config/ShellEditor.tsx` | Single orbital shell editor |
| Button | `components/ui/button.tsx` | Button (default, outline, ghost) |
| ConfirmDialog | `components/ui/confirm-dialog.tsx` | Confirmation modal (danger, warning) |
| Tabs | `components/ui/tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent |

---

## 8. API Integration

### apiFetch

```ts
// src/lib/api.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return res.json();
}
```

- **No Bearer headers**, no auth tokens
- On `!res.ok`: throws `Error(responseText)`
- Returns parsed JSON on success

### Endpoints Used

| Endpoint | Methods | Used In |
|----------|---------|---------|
| `/experiments` | GET, POST | experiments/page |
| `/experiments/:id` | GET, PUT, DELETE | edit, simulate, ExperimentCard |
| `/experiments/:id/sat` | GET, PUT | edit, simulate |
| `/experiments/:id/main` | GET, PUT | edit |
| `/experiments/:id/main-mn` | GET, PUT | edit |
| `/experiments/:id/has-phase-1` | GET | simulate |
| `/experiments/:id/has-phase-2` | GET | simulate |
| `/experiments/:id/phase-1` | POST | simulate |
| `/experiments/:id/phase-2` | POST | simulate |
| `/experiments/:id/create-gif` | POST | simulate |
| `/experiments/:id/logs/:phase` | GET | simulate |
| `/experiments/:id/duplicate` | POST | experiments/page |
| `/experiments/:id/download-output` | GET (blob) | simulate |
| `/experiments/:id/download-output-mn` | GET (blob) | simulate |
| `/experiments/:id/gifs/output-gif/file` | GET (blob) | simulate |
| `/experiments/:id/gifs/output/file` | GET (text) | simulate |
| `/experiments/:id/gifs/output/output` | GET (blob) | simulate |
| `/ground_station_file` | GET, POST | ground-stations, MainConfigForm |
| `/ground_station_file/:id` | GET, PUT, DELETE | ground-stations |
| `/ground_station_file/default` | GET | MainConfigForm |
| `/jobs` | GET | jobs/page |
| `/jobs/:id/logs` | GET | jobs/page |
| `/jobs/:id/cancel` | DELETE | jobs/page |

Binary/text responses use raw `fetch()` with `API_URL`; JSON responses use `apiFetch()`.

### Error Handling

- `getApiErrorMessage(err, fallback)` in `lib/utils.ts`:
  - Tries to parse `err.message` as JSON
  - Uses `detail`, `message`, or `error` if present
  - Falls back to raw message or fallback
- Call sites: `toast.error(getApiErrorMessage(err, 'Failed to ...'))`

---

## 9. State Management

### Patterns Used

- **useState** – Local UI and data (`experiments`, `loading`, `showModal`, `config`, etc.)
- **useEffect** – Fetch on mount or when `id` changes
- **useMemo** – Derived lists (`experimentGroups`, `filteredGroups`, `filteredJobs`)
- **useCallback** – `handleSave` in `useExperimentSave`
- **useParams** – Route params (e.g. experiment `id`)
- **useRouter** – `router.push()` for navigation
- **usePathname** – ConditionalHeader, TopNav
- **useTheme** – ThemeToggle (next-themes)

### React Query

- `QueryClientProvider` and `ReactQueryDevtools` in `Providers.tsx`
- `getQueryClient()` – `staleTime: 15000`, `refetchOnWindowFocus: false`
- Data fetching is done with `apiFetch` + `useState`/`useEffect`, not React Query hooks

---

## 10. Styling and Theming

### Tailwind Config (`tailwind.config.ts`)

- **darkMode**: `['class']` (next-themes)
- **Colors**:
  - `maroon`: `#861F41`, hover `#9A2A52`, pressed `#6E1733`
  - `accent`: `#F0A500`
  - `light`: bg `#F7F7F8`, surface `#FFFFFF`, text `#16181C`, border `#E6E6EA`
  - `dark`: bg `#0E0F12`, surface `#1A1C20`, text `#EAECEF`, subtext `#A9AFB8`, border `#2A2D33`
- **Shadows**: `card-2`, `modal-3`
- **Border radius**: `btn` 8px, `card` 12px
- **Font**: Inter via `next/font`

### Dark/Light Mode

- `ThemeProvider` (next-themes): `attribute="class"`, `defaultTheme="dark"`, `enableSystem`
- Body: `bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text`
- Components use `light-*` and `dark-*` utility classes

### globals.css

- Tailwind base, components, utilities
- Keyframes: `orbit-slow`, `pulse-glow`, `scroll-bounce`, `spin`
- Focus: `outline` uses `theme('colors.accent.DEFAULT')`

---

## 11. Docker Setup

### Dockerfile

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

- Node 18, pnpm, production build
- Container listens on port 3000

### .dockerignore

```
node_modules
.next
.git
.env
.env.local
.env*.local
```

### Backend Connection in Docker

- `.env` is excluded from the image
- Set `NEXT_PUBLIC_API_URL=http://backend:5000` at build or runtime when using Docker Compose
- Frontend calls backend at `http://backend:5000` when both run in the same Docker network

---

## 12. Environment Variables

| Variable | Where Set | Default | Purpose |
|----------|-----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `.env` | `http://localhost:5000` (from repo `.env`) | Backend API base URL |

- **Locally**: `.env` contains `NEXT_PUBLIC_API_URL=http://localhost:5000`
- **Docker**: Provide via `docker run -e` or docker-compose `environment`
- **Note**: `CLAUDE.md` mentions `NEXT_PUBLIC_API_BASE_URL`; the code uses `NEXT_PUBLIC_API_URL`

---

## 13. Development Setup

### Commands (use pnpm)

```bash
pnpm dev      # Start dev server (port 3000)
pnpm build    # Production build (runs TypeScript checks)
pnpm start    # Start production server
pnpm lint     # Run ESLint
```

### Requirements

- Node 18+
- pnpm
- Backend running at `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:5000`)

### Conventions (from CLAUDE.md)

- Use `===` (strict equality)
- Use toast (sonner) instead of `alert()`
- Use `ConfirmDialog` instead of `window.confirm()`
- Components use `'use client'` for client features

---

## 14. Known Issues and Future Work

### TODOs in Code

| File | TODO |
|------|------|
| `experiments/new/page.tsx` | Save to backend API; navigate after save; start simulation via API; YAML import |
| `experiments/[id]/edit/page.tsx` | Fetch from API (partially done); check if experiment has been run; start simulation via API |
| `data/experiments.ts` | Replace with API calls |
| `data/runs.ts` | Replace with API calls |

### Incomplete Features

- **`/experiments/new`**: Save/export/local only; no backend create. Use "New Experiment" modal on `/experiments` for real creation.
- **YAML import**: "YAML import coming soon" toast only
- **hasBeenRun**: Hardcoded `false`; should reflect actual run status for TLE lock

### Pre-existing TypeScript Issues (CLAUDE.md)

- `src/app/(app)/experiments/new/page.tsx`: `operatorType`, `tags` properties – known issue

### Improvement Backlog (IMPROVEMENTS_REVIEW.md)

- Constants for magic numbers
- Form input sanitization
- Keyboard navigation (modals, dropdowns)
- API layer: replace `any`, typed responses, env validation
- React Query usage or removal
- Shared API type definitions

---

*Document generated from codebase analysis. No auth routes exist; app is a local/Docker research tool.*
