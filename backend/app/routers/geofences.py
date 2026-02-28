import uuid
from fastapi import APIRouter, Depends
from app.auth import get_current_user_id
from app.db import get_db
from app.models.geofence import Geofence, LatLng, CreateGeofenceBody

router = APIRouter()


@router.get("/", response_model=list[Geofence])
async def list_geofences():
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM geofences") as cur:
            rows = await cur.fetchall()
        return [
            Geofence(
                id=r["id"],
                name=r["name"],
                center=LatLng(lat=r["center_lat"], lng=r["center_lng"]),
                radius=r["radius"],
                color=r["color"],
                icon=r["icon"],
                description=r["description"],
            )
            for r in rows
        ]
    finally:
        await db.close()


@router.post("/", response_model=Geofence)
async def create_geofence(
    body: CreateGeofenceBody,
    current_user_id: str = Depends(get_current_user_id),
):
    fence_id = f"fence-{uuid.uuid4().hex[:8]}"
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO geofences VALUES (?,?,?,?,?,?,?,?)",
            (
                fence_id, body.name,
                body.center.lat, body.center.lng,
                body.radius, body.color, body.icon,
                body.description,
            ),
        )
        await db.commit()
        return Geofence(
            id=fence_id,
            name=body.name,
            center=body.center,
            radius=body.radius,
            color=body.color,
            icon=body.icon,
            description=body.description,
        )
    finally:
        await db.close()
