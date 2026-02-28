import uuid
from fastapi import APIRouter, HTTPException
from app.db import get_db, compute_within_fences
from app.models.user import (
    UserProfile,
    UpdateProfileBody,
    UpdateLocationBody,
    UpdatePrivacyModeBody,
    UpdateLocationModeBody,
)
from app.models.geofence import LatLng
from app.models.schedule import (
    ScheduleSlot,
    ScheduleException,
    ScheduleResponse,
    CreateSlotBody,
    UpdateSlotBody,
    CreateExceptionBody,
)

router = APIRouter()

CURRENT_USER = "me"


async def _fetch_geofences(db):
    async with db.execute("SELECT id, center_lat, center_lng, radius FROM geofences") as cur:
        return [dict(r) for r in await cur.fetchall()]


async def _get_user_row(db, user_id: str):
    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row


async def _build_user_profile(db, user_id: str) -> UserProfile:
    row = await _get_user_row(db, user_id)
    fences = await _fetch_geofences(db)
    within = compute_within_fences(row["lat"], row["lng"], fences)

    async with db.execute(
        "SELECT COUNT(*) FROM friendships WHERE user_id = ? AND status = 'accepted'",
        (user_id,),
    ) as cur:
        friend_count = (await cur.fetchone())[0]

    async with db.execute(
        "SELECT COUNT(*) FROM group_members WHERE user_id = ?",
        (user_id,),
    ) as cur:
        group_count = (await cur.fetchone())[0]

    position = LatLng(lat=row["lat"], lng=row["lng"]) if row["lat"] is not None else None

    return UserProfile(
        id=row["id"],
        name=row["name"],
        initials=row["initials"],
        avatarColor=row["avatar_color"],
        major=row["major"],
        year=row["year"],
        bio=row["bio"],
        position=position,
        currentMode=row["current_mode"],
        locationMode=row["location_mode"],
        activeGeofenceIds=within,
        friendCount=friend_count,
        groupCount=group_count,
    )


# ---------------------------------------------------------------------------
# /users/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserProfile)
async def get_current_user():
    db = await get_db()
    try:
        return await _build_user_profile(db, CURRENT_USER)
    finally:
        await db.close()


@router.put("/me", response_model=UserProfile)
async def update_profile(body: UpdateProfileBody):
    db = await get_db()
    try:
        fields = {k: v for k, v in body.model_dump().items() if v is not None}
        if fields:
            col_map = {"name": "name", "bio": "bio", "major": "major", "year": "year"}
            sets = ", ".join(f"{col_map[k]} = ?" for k in fields)
            await db.execute(
                f"UPDATE users SET {sets} WHERE id = ?",
                (*fields.values(), CURRENT_USER),
            )
            await db.commit()
        return await _build_user_profile(db, CURRENT_USER)
    finally:
        await db.close()


@router.patch("/me/location", response_model=UserProfile)
async def update_location(body: UpdateLocationBody):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE users SET lat = ?, lng = ? WHERE id = ?",
            (body.lat, body.lng, CURRENT_USER),
        )
        await db.commit()
        return await _build_user_profile(db, CURRENT_USER)
    finally:
        await db.close()


@router.patch("/me/privacy-mode", response_model=UserProfile)
async def update_privacy_mode(body: UpdatePrivacyModeBody):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE users SET current_mode = ? WHERE id = ?",
            (body.mode, CURRENT_USER),
        )
        await db.commit()
        return await _build_user_profile(db, CURRENT_USER)
    finally:
        await db.close()


@router.patch("/me/location-mode", response_model=UserProfile)
async def update_location_mode(body: UpdateLocationModeBody):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE users SET location_mode = ? WHERE id = ?",
            (body.mode, CURRENT_USER),
        )
        await db.commit()
        return await _build_user_profile(db, CURRENT_USER)
    finally:
        await db.close()


# ---------------------------------------------------------------------------
# /users/me/schedule
# ---------------------------------------------------------------------------

async def _fetch_slots(db, user_id: str) -> list[ScheduleSlot]:
    import json
    async with db.execute(
        "SELECT * FROM schedule_slots WHERE user_id = ? ORDER BY rowid",
        (user_id,),
    ) as cur:
        rows = await cur.fetchall()
    return [
        ScheduleSlot(
            id=r["id"],
            days=json.loads(r["days"]),
            startTime=r["start_time"],
            endTime=r["end_time"],
            mode=r["mode"],
            label=r["label"],
            isDefault=bool(r["is_default"]),
            isActive=bool(r["is_active"]),
        )
        for r in rows
    ]


async def _fetch_exceptions(db, user_id: str) -> list[ScheduleException]:
    async with db.execute(
        "SELECT * FROM schedule_exceptions WHERE user_id = ? ORDER BY date, start_time",
        (user_id,),
    ) as cur:
        rows = await cur.fetchall()
    return [
        ScheduleException(
            id=r["id"],
            date=r["date"],
            startTime=r["start_time"],
            endTime=r["end_time"],
            mode=r["mode"],
            note=r["note"],
        )
        for r in rows
    ]


@router.get("/me/schedule", response_model=ScheduleResponse)
async def get_schedule():
    db = await get_db()
    try:
        slots = await _fetch_slots(db, CURRENT_USER)
        exceptions = await _fetch_exceptions(db, CURRENT_USER)
        return ScheduleResponse(slots=slots, exceptions=exceptions)
    finally:
        await db.close()


@router.post("/me/schedule/slots", response_model=ScheduleSlot)
async def create_slot(body: CreateSlotBody):
    import json
    slot_id = f"slot-{uuid.uuid4().hex[:8]}"
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO schedule_slots VALUES (?,?,?,?,?,?,?,?,?)",
            (
                slot_id, CURRENT_USER,
                json.dumps(body.days),
                body.startTime, body.endTime,
                body.mode, body.label,
                int(body.isDefault), int(body.isActive),
            ),
        )
        await db.commit()
        return ScheduleSlot(
            id=slot_id,
            days=body.days,
            startTime=body.startTime,
            endTime=body.endTime,
            mode=body.mode,
            label=body.label,
            isDefault=body.isDefault,
            isActive=body.isActive,
        )
    finally:
        await db.close()


@router.put("/me/schedule/slots/{slot_id}", response_model=ScheduleSlot)
async def update_slot(slot_id: str, body: UpdateSlotBody):
    import json
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM schedule_slots WHERE id = ? AND user_id = ?",
            (slot_id, CURRENT_USER),
        ) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Slot not found")

        updates = body.model_dump(exclude_none=True)
        col_map = {
            "days": "days", "startTime": "start_time", "endTime": "end_time",
            "mode": "mode", "label": "label", "isActive": "is_active",
        }
        if updates:
            processed = {}
            for k, v in updates.items():
                processed[col_map[k]] = json.dumps(v) if k == "days" else (int(v) if k == "isActive" else v)
            sets = ", ".join(f"{col} = ?" for col in processed)
            await db.execute(
                f"UPDATE schedule_slots SET {sets} WHERE id = ?",
                (*processed.values(), slot_id),
            )
            await db.commit()

        async with db.execute("SELECT * FROM schedule_slots WHERE id = ?", (slot_id,)) as cur:
            updated = await cur.fetchone()
        return ScheduleSlot(
            id=updated["id"],
            days=json.loads(updated["days"]),
            startTime=updated["start_time"],
            endTime=updated["end_time"],
            mode=updated["mode"],
            label=updated["label"],
            isDefault=bool(updated["is_default"]),
            isActive=bool(updated["is_active"]),
        )
    finally:
        await db.close()


@router.delete("/me/schedule/slots/{slot_id}")
async def delete_slot(slot_id: str):
    db = await get_db()
    try:
        await db.execute(
            "DELETE FROM schedule_slots WHERE id = ? AND user_id = ?",
            (slot_id, CURRENT_USER),
        )
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


@router.post("/me/schedule/exceptions", response_model=ScheduleException)
async def create_exception(body: CreateExceptionBody):
    exc_id = f"exc-{uuid.uuid4().hex[:8]}"
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO schedule_exceptions VALUES (?,?,?,?,?,?,?)",
            (exc_id, CURRENT_USER, body.date, body.startTime, body.endTime, body.mode, body.note),
        )
        await db.commit()
        return ScheduleException(
            id=exc_id,
            date=body.date,
            startTime=body.startTime,
            endTime=body.endTime,
            mode=body.mode,
            note=body.note,
        )
    finally:
        await db.close()


@router.delete("/me/schedule/exceptions/{exc_id}")
async def delete_exception(exc_id: str):
    db = await get_db()
    try:
        await db.execute(
            "DELETE FROM schedule_exceptions WHERE id = ? AND user_id = ?",
            (exc_id, CURRENT_USER),
        )
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
