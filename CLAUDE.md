# FindU

Student location-sharing mobile web app. Users share their campus location with friends and groups, with granular privacy controls and geofence-based zones.

## Repo structure

```
FindU/
├── frontend/   React + TypeScript (Vite, pnpm)
└── backend/    Python FastAPI server (uv)
```

## Frontend

**Stack:** React 18, TypeScript, Vite 6, Tailwind CSS v4, React Router v7, Leaflet

**Package manager:** pnpm (always use pnpm, never npm or yarn)

```bash
cd frontend
pnpm install       # install deps
pnpm dev           # dev server at http://localhost:5173
pnpm build         # production build
```

**Key files:**
- `src/main.tsx` — entry point
- `src/app/App.tsx` — root component, wraps router + context
- `src/app/routes.tsx` — all routes
- `src/app/store/AppContext.tsx` — all app state (React context, no Redux/Zustand)
- `src/app/data/mockData.ts` — mock friends, groups, geofences, current user
- `src/app/types/index.ts` — all shared TypeScript types
- `src/app/components/layout/MobileLayout.tsx` — phone-frame shell + bottom nav
- `src/app/components/map/CampusMap.tsx` — Leaflet map component
- `src/app/components/ui/` — Radix UI wrappers (shadcn-style)
- `src/styles/` — global CSS, Tailwind config, theme tokens

**Routes:** `/map`, `/friends`, `/groups`, `/groups/:groupId`, `/privacy`, `/profile`

**UI notes:**
- Renders as a 430px-wide phone frame centered on a gradient background
- Motion (Framer Motion successor) for animations — import from `motion/react`
- Tailwind v4 uses CSS `@theme` variables, not `tailwind.config.js`
- UI components use shadcn conventions with Radix primitives

## Backend

**Stack:** Python, FastAPI, Pydantic v2, Uvicorn

**Package manager:** uv (always use uv, never pip directly)

```bash
cd backend
uv venv                              # create .venv (first time only)
uv pip install -r requirements.txt   # install deps
uv run uvicorn main:app --reload     # dev server at http://localhost:8000
```

**Key files:**
- `main.py` — FastAPI app, CORS config, router registration
- `requirements.txt` — pinned dependencies
- `app/routers/` — one file per resource (users, friends, groups)

**API:** `GET /health`, `GET /users/me`, `GET /friends/`, `GET /groups/`

**CORS:** configured to allow `http://localhost:5173` (Vite dev server)

**Docs:** FastAPI auto-generates interactive docs at `http://localhost:8000/docs`

## Data model

Core types defined in `frontend/src/app/types/index.ts` — mirror these in Pydantic models when adding backend endpoints:

- `Friend` — id, name, shareStatus (`sharing` | `private` | `offline`), location (exact or binary)
- `Group` — id, name, type (`greek` | `club` | `class` | `sports` | `custom`), members, geofenceIds, rules
- `Geofence` — id, name, center (lat/lng), radius (metres), color, icon
- `CurrentUser` — profile, privacyMode, locationMode, scheduleSlots, exceptions
- `LocationMode` — `exact` (pin on map) or `binary` (in-zone / not-in-zone only)
