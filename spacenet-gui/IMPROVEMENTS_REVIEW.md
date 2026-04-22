# SpaceNet GUI – Improvement Review

**Goal:** Finish all **frontend** items first (step-by-step by priority). Handle **backend/API** items later with your partner.

---

## How to use this doc

1. **Work through "Frontend — Your action list"** in order (Critical → High → Medium → Low). Check off or note progress as you go.
2. **Leave "Backend / API — With partner"** until you sit down together; those touch `lib/api.ts` or API contracts.
3. **"Resolved"** is for reference only; no action needed.

---

# Part 1 — Frontend: Your action list

Do these in order. One priority at a time.

---

## Critical (frontend)

*None left — all critical frontend items are resolved. See Part 3.*

---

## High (frontend)

*None left — all high-priority frontend items are resolved. See Part 3.*

---

## Medium (frontend)

*None left — all medium frontend items are resolved. See Part 3.*

---

## Low (frontend)

| # | Item | Files | What to do |
|---|------|-------|------------|
| 21 | **Constants** | Multiple files | Move magic numbers and repeated strings into a shared constants module. |
| 18 | **Form input sanitization** | Forms | Sanitize/escape if needed (React escapes by default; document or add where it matters). |
| 19 | **Keyboard navigation** | Modals, dropdowns | Ensure focus management and key handlers (Enter, Escape, Tab) work for dialogs and menus. |

---

# Part 2 — Backend / API: With partner

Do these when you sit down with your partner. They involve `lib/api.ts` or API contracts.

| Priority | # | Item | File(s) | What to do |
|----------|---|------|---------|------------|
| Critical | 2 | **`any` in API layer** | `lib/api.ts` | Replace `any` with proper types or generics; coordinate so frontend and backend agree on shapes. |
| Medium | 11 | **API response type safety** | `lib/api.ts` | e.g. `apiFetch<T>(...)` and typed responses. |
| Low | 17 | **Env validation** | `lib/api.ts` | Validate `API_URL` (or show clear error) when missing. |
| Low | 22 | **React Query** | `Providers.tsx`, data fetching | Either use React Query for lists/detail or remove it. |
| Low | 23 | **API type definitions** | `types/`, API call sites | Shared TypeScript interfaces for all API request/response shapes. |

---

# Part 3 — Resolved (reference only)

No action needed. Kept for history and context.

---

## Critical — Resolved

- **#1 – alert/confirm → UI**  
  Replaced with `ConfirmDialog` and toasts in `ExperimentCard.tsx`, `ground-stations/page.tsx`, `simulate/page.tsx`. No `alert()` left.

- **#2 – TypeScript: Replace `any` types (frontend)**  
  Added shared types in `types/types.ts` (CreateExperimentBody, CreateExperimentResponse, GroundStationFileSummary, StationOption). Replaced `any` in `experiments/page.tsx`, `ground-stations/[id]/page.tsx`, `MainConfigForm.tsx`, `ShellEditor.tsx`, `jobs/page.tsx`. Fixed `SatConfigForm.tsx` (shells as array) and `data/experiments.ts` (hasPhase1/hasPhase2 on mocks). `lib/api.ts` unchanged (backend/partner).

- **#4 – Loose equality**  
  Replaced `==` / `!=` with `===` / `!==` in `ExperimentCard.tsx`, `MainConfigForm.tsx`, `simulate/page.tsx`, `experiments/page.tsx`.

- **#3 – Duplicate header logic in api.ts**  
  Single shared `headers` object used for the request.

---

## High — Resolved

- **#5 – Form validation**  
  Required-field and email validation added in `login/page.tsx`, `create-account/page.tsx`.

- **#6 – Email in create account**  
  Email field wired to state and included in signup payload in `create-account/page.tsx`.

- **#7 – Show real API error messages**  
  Added `getApiErrorMessage()` and updated request catch blocks to surface backend `detail` / `message` / `error` in toasts (with stable toast IDs to prevent duplicate toasts).

- **#8 – Loading states**  
  Added missing loading/disabled states on async actions (save config, save station set, job logs/cancel) to prevent double-submits and provide clear user feedback.

- **#9 – useEffect dependencies**  
  `experiment.hasPhase1` and `experiment.hasPhase2` added to dependency array in `ExperimentCard.tsx`.

- **#10 – Hardcoded values**  
  Run simulation enabled from phase output flags in `ExperimentCard.tsx`.

---

## Medium — Resolved

- **#14 – Consistent error handling**  
  Added `toast.error(getApiErrorMessage(...))` to all remaining catch blocks that only had `console.error` (simulate: check status, SAT config, GIF; MainConfigForm: GS files, stations; TopNav: user info). No `alert`/`confirm` left; toasts used for user-facing errors.

- **#15 – Input validation**  
  Experiment/ground-station forms: numeric min/max and clear messages before submit. Ground stations: lat -90–90, lon -180–180 with helper text and toast on invalid Save. Experiment edit: validate shells (altitude 200–2000 km, inclination 0–180°, orbits/sat_per_orbit/ipp ≥ 1), Sim_Length (duration 1–86400, count 1–1M), min_elevation_angle 0–90°; toast with specific message on failure. ShellEditor/SatConfigForm/MainConfigForm: added max and helper text for ranges.

- **#12 – Accessibility: ARIA**  
  Added `aria-label` to all icon-only controls: TopNav user menu (with `aria-haspopup="menu"`), ground-station delete per station, ShellEditor remove shell, DocsDrawer close, experiment edit/new “Back to experiments” (X) buttons. Ground-station form: `id`/`htmlFor` on name, latitude, longitude inputs for proper label association. Existing aria-labels retained (password toggles, Edit/Delete file, theme toggle, docs button, experiment actions).

- **#13 – YAML duplication**  
  Shared YAML generators moved to `src/lib/yaml.ts`.

- **#16 – OrbitalLoader unused**  
  Unused `OrbitalLoader` component removed.

- **#20 – Split large components**  
  Extracted components from `experiments/[id]/edit/page.tsx`: `ExperimentEditHeader`, `ExperimentMetadataForm`, `ExperimentEditFooter` (in `components/experiment/`), and `useExperimentSave` hook (in `hooks/`). Extracted from `experiments/[id]/simulate/page.tsx`: `PhaseCard`, `VisualizationPanel`, `LogsModal`, `GifModal` (in `components/experiment/`). Validation logic moved to `lib/experiment-validation.ts`. Edit page reduced from 482 to ~220 lines; simulate page reduced from 529 to ~330 lines.

---

## Summary checklist (frontend only)

Use this to track your progress. Backend/API items are in Part 2.

- [x] **Critical:** Replace `any` in frontend files (not `lib/api.ts`)
- [x] **High:** Finish loading states
- [x] **Medium:** Finish ARIA
- [ ] **Low:** Split large components; constants; sanitization; keyboard nav

When all frontend items are done, use **Part 2** with your partner for backend/API work.
