# FindU

Student location-sharing mobile web app. Users share their campus location with
friends and groups, with granular privacy controls and geofence-based zones.

## Repo structure

```
FindU/
├── frontend/   React + TypeScript (Vite, pnpm)
└── backend/    Python FastAPI server (uv)
```

## Frontend

**Stack:** React 18, TypeScript, Vite 6, Tailwind CSS v4, React Router v7,
Leaflet

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
- `src/app/routes.tsx` — all routes, includes ProtectedRoute wrapper
- `src/app/api.ts` — typed fetch wrapper; injects Bearer token from localStorage
- `src/app/store/AppContext.tsx` — all app state (React context, no
  Redux/Zustand); includes login/register/logout + sync with backend
- `src/app/types/index.ts` — all shared TypeScript types
- `src/app/components/layout/MobileLayout.tsx` — phone-frame shell + bottom nav
- `src/app/components/map/` — Map-related components (CampusMap, LocationStatusBanner, MapBottomSheet, MapTopBar, NotificationsPanel)
- `src/app/components/ui/` — Radix UI wrappers (shadcn-style)
- `src/styles/` — global CSS, Tailwind config, theme tokens

**Routes:** `/login`, `/register`, `/map`, `/friends`, `/groups`,
`/groups/:groupId`, `/privacy`, `/profile`

All routes except `/login` and `/register` are protected — unauthenticated users
are redirected to `/login`.

**UI notes:**

- Renders as a 430px-wide phone frame centered on a gradient background
- Motion (Framer Motion successor) for animations — import from `motion/react`
- Tailwind v4 uses CSS `@theme` variables, not `tailwind.config.js`
- UI components use shadcn conventions with Radix primitives

**Auth:**

- JWT token stored in `localStorage` as `auth_token`
- On app load, AppContext hydrates user profile from `GET /users/me` if token
  exists
- Demo credentials: `alex@unl.edu` / `password`

## Backend

**Stack:** Python, FastAPI, Pydantic v2, Uvicorn, SQLite (aiosqlite), JWT
(python-jose), bcrypt

**Package manager:** uv (always use uv, never pip directly)

```bash
cd backend
uv venv                              # create .venv (first time only)
uv pip install -r requirements.txt   # install deps
uv run uvicorn main:app --reload     # dev server at http://localhost:8000
```

**Key files:**

- `backend/main.py` — FastAPI app, CORS config, router registration, lifespan (runs `init_db()`)
- `backend/requirements.txt` — pinned dependencies
- `backend/app/auth.py` — JWT creation/verification, bcrypt hashing, HTTPBearer dependency
- `backend/app/db.py` — SQLite schema (10 tables), `init_db()`, seed data, `compute_within_fences()` (Haversine)
- `backend/app/schedule_eval.py` — logic for calculating active privacy mode based on schedules
- `backend/app/models/` — Pydantic v2 request/response models (auth, user, friend, group, geofence, schedule, notification)
- `backend/app/routers/` — one file per resource

**API endpoints:**

| Method | Path                                        | Auth      | Description                        |
| ------ | ------------------------------------------- | --------- | ---------------------------------- |
| GET    | `/health`                                   | —         | Health check                       |
| POST   | `/users/login`                              | —         | Login, returns JWT                 |
| POST   | `/users/register`                           | —         | Register, returns JWT              |
| GET    | `/users/me`                                 | ✓         | Current user profile               |
| PUT    | `/users/me`                                 | ✓         | Update profile                     |
| PATCH  | `/users/me/location`                        | ✓         | Update lat/lng                     |
| PATCH  | `/users/me/privacy-mode`                    | ✓         | Toggle privacy mode                |
| PATCH  | `/users/me/location-mode`                   | ✓         | Toggle location mode               |
| GET    | `/users/me/schedule`                        | ✓         | Schedule slots + exceptions        |
| POST   | `/users/me/schedule/slots`                  | ✓         | Create schedule slot               |
| PUT    | `/users/me/schedule/slots/{id}`             | ✓         | Update schedule slot               |
| DELETE | `/users/me/schedule/slots/{id}`             | ✓         | Delete schedule slot               |
| POST   | `/users/me/schedule/exceptions`             | ✓         | Create schedule exception          |
| DELETE | `/users/me/schedule/exceptions/{id}`        | ✓         | Delete schedule exception          |
| GET    | `/users/search?q={query}`                   | ✓         | Search users by name/email         |
| GET    | `/friends/`                                 | ✓         | List friends                       |
| POST   | `/friends/requests`                         | ✓         | Send friend request                |
| GET    | `/friends/requests`                         | ✓         | List pending requests              |
| POST   | `/friends/requests/{id}/accept`             | ✓         | Accept friend request              |
| DELETE | `/friends/{id}`                             | ✓         | Remove friend                      |
| PATCH  | `/friends/{id}/favorite`                    | ✓         | Toggle favorite                    |
| GET    | `/groups/`                                  | ✓         | List all groups                    |
| GET    | `/groups/{id}`                              | ✓         | Group details                      |
| POST   | `/groups/`                                  | ✓         | Create group                       |
| POST   | `/groups/{id}/join`                         | ✓         | Join group                         |
| DELETE | `/groups/{id}/leave`                        | ✓         | Leave group                        |
| PATCH  | `/groups/{id}/alerts`                       | ✓         | Toggle group alerts                |
| PUT    | `/groups/{id}/rules`                        | ✓ (admin) | Replace group rules                |
| PATCH  | `/groups/{id}/members/{userId}/role`        | ✓ (admin) | Update member role                 |
| DELETE | `/groups/{id}/members/{userId}`             | ✓ (admin) | Remove member from group           |
| DELETE | `/groups/{id}`                              | ✓ (admin) | Disband group                      |
| GET    | `/geofences/`                               | —         | List geofences                     |
| POST   | `/geofences/`                               | ✓         | Create geofence                    |
| GET    | `/notifications/`                           | ✓         | List notifications                 |
| POST   | `/notifications/read`                       | ✓         | Mark notifications read            |

**CORS:** configured to allow all origins (`"*"`)

**Static serving:** In production, `main.py` serves the compiled frontend from
`frontend/dist/` with a SPA catch-all fallback for React Router.

**Docs:** FastAPI auto-generates interactive docs at
`http://localhost:8000/docs`

**Database:** SQLite at `backend/findu.db` (created on startup). Seed data
includes 8 demo users at University of Nebraska-Lincoln (UNL), 6 groups, 6
geofences, and sample friend relationships.

## Data model

Core types defined in `frontend/src/app/types/index.ts` — mirror these in
Pydantic models when adding backend endpoints:

- `Friend` — id, name, initials, avatarColor, major, year, shareStatus
  (`sharing` | `private` | `offline`), location (`FriendLocation | null`),
  isFavorite, mutualFriends
- `FriendLocation` — position (LatLng), withinFences (string[]), mode
  (LocationMode), lastUpdated
- `Group` — id, name, type (`greek` | `club` | `class` | `sports` | `custom`),
  emoji, description, color, memberCount, activeCount, members, geofenceIds,
  rules, isJoined, myRole (`admin` | `moderator` | `member` | `none`),
  alertsEnabled
- `GroupMember` — userId, name, initials, avatarColor, role, isOnline,
  withinGeofence
- `GroupRule` — id, days, startTime, endTime, locationMode, label
- `Geofence` — id, name, center (LatLng), radius (metres), color, icon,
  description
- `CurrentUser` — id, name, initials, avatarColor, major, year, bio, position
  (LatLng), currentMode (`sharing` | `private`), locationMode, activeGeofenceIds,
  scheduleSlots, exceptions, friendCount, groupCount
- `LocationMode` — `exact` (pin on map) or `binary` (in-zone / not-in-zone only)
- `ScheduleSlot` — id, days, startTime, endTime, mode (`sharing` | `private`),
  label, isDefault, isActive
- `ScheduleException` — id, date, startTime, endTime, mode, note
- `AppNotification` — id, type (`entered_fence` | `left_fence` |
  `friend_request` | `group_invite` | `alert`), message, timestamp, isRead
- `FriendRequest` — id, fromUserId, fromName, fromInitials, fromAvatarColor,
  createdAt
- `UserSearchResult` — id, name, initials, avatarColor, major?, year?
