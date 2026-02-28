import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.db import init_db
from app.routers import users, friends, groups, geofences, notifications

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="FindU API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(friends.router, prefix="/friends", tags=["friends"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(geofences.router, prefix="/geofences", tags=["geofences"])
app.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve compiled frontend assets (JS, CSS, images)
_assets_dir = os.path.join(FRONTEND_DIST, "assets")
if os.path.isdir(_assets_dir):
    app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")


# SPA catch-all: every other GET serves index.html so React Router works
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return {"error": "Frontend not built — run: cd frontend && pnpm build"}
