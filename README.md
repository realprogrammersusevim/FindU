# FindU

[App deployment link](https://genitourinary-ayleen-undetestably.ngrok-free.dev)

A student location-sharing mobile web app. Users share their campus location
with friends and groups, with granular privacy controls and geofence-based
zones.

The UI renders as a 430 px-wide phone frame centered on a gradient background,
designed around University of Nebraska-Lincoln's campus.

This is a fully functional application — real authentication, a persistent
database, live API, and working privacy/scheduling logic throughout. The seed
data and demo credentials exist to make it easy to explore, not to paper over
missing functionality.

---

## Prerequisites

| Tool         | Notes                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Node.js 18+  | Required by Vite/pnpm                                                                            |
| pnpm         | `npm install -g pnpm`                                                                            |
| Python 3.11+ | Backend runtime                                                                                  |
| uv           | `pip install uv` or via the [installer](https://docs.astral.sh/uv/getting-started/installation/) |

---

## Running locally

Run the backend and frontend in **separate terminals**.

### Backend

```bash
cd backend

# First time only
uv venv
uv pip install -r requirements.txt

# Start dev server (auto-reloads on changes)
uv run uvicorn main:app --reload
```

API available at **http://localhost:8000** — interactive docs at
**http://localhost:8000/docs**.

The SQLite database (`backend/findu.db`) is created and seeded automatically on
first startup.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

App available at **http://localhost:5173**. Make sure the backend is running
first.

---

## Demo credentials

```
Email:    alex@unl.edu
Password: password
```

Seven additional demo users are seeded in the database and discoverable via
friend search.

---

## Production

The FastAPI backend can serve the compiled frontend as a single deployment:

```bash
# Build the frontend
cd frontend && pnpm build

# Serve everything from the backend
cd ../backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

Visit **http://localhost:8000** — the backend serves the React SPA and handles
all API calls on the same origin.
