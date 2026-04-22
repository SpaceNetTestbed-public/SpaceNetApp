# SpaceNet GUI

Virginia Tech LEO satellite constellation simulation platform frontend.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript, React 18
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Notifications**: Sonner (toast)
- **UI Components**: Radix UI (dropdowns), custom components in `src/components/ui/`

## Commands

```bash
pnpm dev      # Start development server (port 3000)
pnpm build    # Production build (runs TypeScript checks)
pnpm lint     # Run ESLint
```

**Important**: Use `pnpm`, NOT `npm`.

## Project Structure

```
src/
├── app/(app)/           # Main app routes (experiments, ground-stations, about)
├── app/(auth)/          # Auth routes (login)
├── components/          # React components
│   ├── ui/              # Reusable UI components (button, confirm-dialog, etc.)
│   └── experiment-config/ # Experiment configuration forms
├── lib/                 # Utilities (api.ts, utils.ts)
├── types/               # TypeScript type definitions
└── data/                # Mock data and type exports
```

## Backend

- Separate Python backend (not in this repo)
- API base URL configured in `.env` as `NEXT_PUBLIC_API_BASE_URL`
- Default: `http://localhost:8000`

## Important Notes

1. **Do NOT modify `src/lib/api.ts`** without team discussion - shared API layer
2. **Do NOT commit `.env` files** - contains environment-specific config
3. **Pre-existing TypeScript errors** exist in `src/app/(app)/experiments/new/page.tsx` (operatorType, tags properties) - known issue
4. **Git remote**: code.vt.edu, main branch is `main`, current dev branch is `dev-anthony`

## Conventions

- Use `===` strict equality (not `==`)
- Use toast notifications (sonner) instead of `alert()`
- Use `ConfirmDialog` component instead of `window.confirm()`
- Components use `'use client'` directive for client-side features
