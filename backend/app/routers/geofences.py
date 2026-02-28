from fastapi import APIRouter
from app.db import get_db
from app.models.geofence import Geofence, LatLng

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
