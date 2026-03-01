import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import (
    get_current_user_id,
    hash_password,
    verify_password,
    create_access_token,
)
import aiosqlite
from app.db import get_db, compute_within_fences
from app.models.auth import LoginRequest, RegisterRequest, TokenResponse
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


async def _fetch_geofences(db):
    async with db.execute(
        "SELECT id, center_lat, center_lng, radius FROM geofences"
    ) as cur:
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

    position = (
        LatLng(lat=row["lat"], lng=row["lng"]) if row["lat"] is not None else None
    )

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
# User search
# ---------------------------------------------------------------------------


class UserSearchResult(BaseModel):
    id: str
    name: str
    initials: str
    avatarColor: str
    major: str | None = None
    year: str | None = None


@router.get("/search", response_model=list[UserSearchResult])
async def search_users(
    q: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Search users by name or email (excludes self and existing friends)."""
    pattern = f"%{q}%"
    async with db.execute(
        """
        SELECT u.id, u.name, u.initials, u.avatar_color, u.major, u.year
        FROM users u
        WHERE u.id != ?
          AND (u.name LIKE ? OR u.email LIKE ?)
          AND u.id NOT IN (
            SELECT friend_id FROM friendships
            WHERE user_id = ? AND status IN ('accepted', 'pending')
          )
        LIMIT 10
        """,
        (current_user_id, pattern, pattern, current_user_id),
    ) as cur:
        rows = await cur.fetchall()
    return [
        UserSearchResult(
            id=r["id"],
            name=r["name"],
            initials=r["initials"],
            avatarColor=r["avatar_color"],
            major=r["major"],
            year=r["year"],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Auth endpoints (unauthenticated)
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT * FROM users WHERE email = ?", (body.email,)) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(
            status_code=401,
            detail="No account found with this email. Please sign up.",
        )
    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_access_token(row["id"])
    return TokenResponse(access_token=token, user_id=row["id"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: aiosqlite.Connection = Depends(get_db)):
    user_id = f"user-{uuid.uuid4().hex[:12]}"
    parts = body.name.strip().split()
    if not parts:
        initials = "??"
    elif len(parts) == 1:
        initials = parts[0][:2].upper()
        if len(initials) == 1:
            initials += initials
    else:
        initials = (parts[0][0] + parts[-1][0]).upper()

    colors = [
        "#6366F1",
        "#EC4899",
        "#3B82F6",
        "#10B981",
        "#F97316",
        "#8B5CF6",
        "#14B8A6",
        "#F59E0B",
    ]
    avatar_color = colors[len(user_id) % len(colors)]
    pw_hash = hash_password(body.password)
    try:
        await db.execute(
            """
            INSERT INTO users (
                id, name, initials, avatar_color, email, password_hash, 
                major, year, current_mode, location_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                body.name,
                initials,
                avatar_color,
                body.email,
                pw_hash,
                body.major,
                body.year,
                "sharing",
                "exact",
            ),
        )
        await db.commit()
    except Exception as e:
        await db.rollback()
        if "UNIQUE constraint failed: users.email" in str(e):
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    token = create_access_token(user_id)
    return TokenResponse(access_token=token, user_id=user_id)


# ---------------------------------------------------------------------------
# /users/me
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserProfile)
async def get_current_user(
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    return await _build_user_profile(db, current_user_id)


@router.put("/me", response_model=UserProfile)
async def update_profile(
    body: UpdateProfileBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if fields:
        col_map = {"name": "name", "bio": "bio", "major": "major", "year": "year"}
        sets = ", ".join(f"{col_map[k]} = ?" for k in fields)
        await db.execute(
            f"UPDATE users SET {sets} WHERE id = ?",
            (*fields.values(), current_user_id),
        )
        await db.commit()
    return await _build_user_profile(db, current_user_id)


@router.patch("/me/location", response_model=UserProfile)
async def update_location(
    body: UpdateLocationBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "UPDATE users SET lat = ?, lng = ? WHERE id = ?",
        (body.lat, body.lng, current_user_id),
    )
    await db.commit()
    return await _build_user_profile(db, current_user_id)


@router.patch("/me/privacy-mode", response_model=UserProfile)
async def update_privacy_mode(
    body: UpdatePrivacyModeBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "UPDATE users SET current_mode = ?, mode_updated_at = datetime('now') WHERE id = ?",
        (body.mode, current_user_id),
    )
    await db.commit()
    return await _build_user_profile(db, current_user_id)


@router.patch("/me/location-mode", response_model=UserProfile)
async def update_location_mode(
    body: UpdateLocationModeBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "UPDATE users SET location_mode = ? WHERE id = ?",
        (body.mode, current_user_id),
    )
    await db.commit()
    return await _build_user_profile(db, current_user_id)


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
async def get_schedule(
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    slots = await _fetch_slots(db, current_user_id)
    exceptions = await _fetch_exceptions(db, current_user_id)
    return ScheduleResponse(slots=slots, exceptions=exceptions)


@router.post("/me/schedule/slots", response_model=ScheduleSlot)
async def create_slot(
    body: CreateSlotBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    import json

    slot_id = f"slot-{uuid.uuid4().hex[:8]}"
    await db.execute(
        "INSERT INTO schedule_slots VALUES (?,?,?,?,?,?,?,?,?)",
        (
            slot_id,
            current_user_id,
            json.dumps(body.days),
            body.startTime,
            body.endTime,
            body.mode,
            body.label,
            int(body.isDefault),
            int(body.isActive),
        ),
    )
    # Reset mode_updated_at so the new schedule takes effect immediately
    await db.execute(
        "UPDATE users SET mode_updated_at = '1970-01-01 00:00:00' WHERE id = ?",
        (current_user_id,)
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


@router.put("/me/schedule/slots/{slot_id}", response_model=ScheduleSlot)
async def update_slot(
    slot_id: str,
    body: UpdateSlotBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    import json

    async with db.execute(
        "SELECT * FROM schedule_slots WHERE id = ? AND user_id = ?",
        (slot_id, current_user_id),
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Slot not found")

    updates = body.model_dump(exclude_none=True)
    col_map = {
        "days": "days",
        "startTime": "start_time",
        "endTime": "end_time",
        "mode": "mode",
        "label": "label",
        "isActive": "is_active",
    }
    if updates:
        processed = {}
        for k, v in updates.items():
            processed[col_map[k]] = (
                json.dumps(v) if k == "days" else (int(v) if k == "isActive" else v)
            )
        sets = ", ".join(f"{col} = ?" for col in processed)
        await db.execute(
            f"UPDATE schedule_slots SET {sets} WHERE id = ?",
            (*processed.values(), slot_id),
        )
        
        # Reset mode_updated_at so the updated schedule takes effect immediately
        await db.execute(
            "UPDATE users SET mode_updated_at = '1970-01-01 00:00:00' WHERE id = ?",
            (current_user_id,)
        )
        await db.commit()

    async with db.execute(
        "SELECT * FROM schedule_slots WHERE id = ?", (slot_id,)
    ) as cur:
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


@router.delete("/me/schedule/slots/{slot_id}")
async def delete_slot(
    slot_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM schedule_slots WHERE id = ? AND user_id = ?",
        (slot_id, current_user_id),
    )
    # Reset mode_updated_at
    await db.execute(
        "UPDATE users SET mode_updated_at = '1970-01-01 00:00:00' WHERE id = ?",
        (current_user_id,)
    )
    await db.commit()
    return {"ok": True}


@router.post("/me/schedule/exceptions", response_model=ScheduleException)
async def create_exception(
    body: CreateExceptionBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    exc_id = f"exc-{uuid.uuid4().hex[:8]}"
    await db.execute(
        "INSERT INTO schedule_exceptions VALUES (?,?,?,?,?,?,?)",
        (
            exc_id,
            current_user_id,
            body.date,
            body.startTime,
            body.endTime,
            body.mode,
            body.note,
        ),
    )
    # Reset mode_updated_at
    await db.execute(
        "UPDATE users SET mode_updated_at = '1970-01-01 00:00:00' WHERE id = ?",
        (current_user_id,)
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


@router.delete("/me/schedule/exceptions/{exc_id}")
async def delete_exception(
    exc_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM schedule_exceptions WHERE id = ? AND user_id = ?",
        (exc_id, current_user_id),
    )
    # Reset mode_updated_at
    await db.execute(
        "UPDATE users SET mode_updated_at = '1970-01-01 00:00:00' WHERE id = ?",
        (current_user_id,)
    )
    await db.commit()
    return {"ok": True}
