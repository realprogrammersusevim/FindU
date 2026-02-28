from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routers import users, friends, groups, geofences, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="FindU API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router,         prefix="/users",         tags=["users"])
app.include_router(friends.router,       prefix="/friends",       tags=["friends"])
app.include_router(groups.router,        prefix="/groups",        tags=["groups"])
app.include_router(geofences.router,     prefix="/geofences",     tags=["geofences"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])


@app.get("/health")
def health():
    return {"status": "ok"}
