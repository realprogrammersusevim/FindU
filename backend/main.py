from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import users, friends, groups

app = FastAPI(title="FindU API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(friends.router, prefix="/friends", tags=["friends"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])


@app.get("/health")
def health():
    return {"status": "ok"}
