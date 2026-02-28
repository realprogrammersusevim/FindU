import uuid
from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user_id
import aiosqlite
from app.db import get_db, compute_within_fences
from app.models.friend import (
    Friend,
    FriendLocation,
    FriendRequest,
    SendFriendRequestBody,
    ToggleFavoriteBody,
)
from app.models.geofence import LatLng
from app.schedule_eval import compute_effective_mode

router = APIRouter()


async def _fetch_geofences(db):
    async with db.execute(
        "SELECT id, center_lat, center_lng, radius FROM geofences"
    ) as cur:
        return [dict(r) for r in await cur.fetchall()]


async def _share_status(db, user_row) -> str:
    effective_mode = await compute_effective_mode(db, user_row)
    if effective_mode == "private":
        return "private"
    if user_row["lat"] is None:
        return "offline"
    return "sharing"


async def _build_friend(
    db, friend_row, is_favorite: bool, fences: list, current_user_id: str
) -> Friend:
    status = await _share_status(db, friend_row)
    location = None
    if status == "sharing":
        within = compute_within_fences(friend_row["lat"], friend_row["lng"], fences)
        mode = friend_row["location_mode"]
        position = LatLng(lat=friend_row["lat"], lng=friend_row["lng"])
        location = FriendLocation(
            position=position,
            withinFences=within,
            mode=mode,
            lastUpdated="just now",
        )

    # Count mutual friends (shared friendships with current user)
    async with db.execute(
        """
        SELECT COUNT(*) FROM friendships f1
        JOIN friendships f2 ON f1.friend_id = f2.friend_id
        WHERE f1.user_id = ? AND f2.user_id = ? AND f1.status='accepted' AND f2.status='accepted'
        """,
        (current_user_id, friend_row["id"]),
    ) as cur:
        mutual = (await cur.fetchone())[0]

    return Friend(
        id=friend_row["id"],
        name=friend_row["name"],
        initials=friend_row["initials"],
        avatarColor=friend_row["avatar_color"],
        major=friend_row["major"],
        year=friend_row["year"],
        shareStatus=status,
        location=location,
        isFavorite=is_favorite,
        mutualFriends=mutual,
    )


@router.get("/", response_model=list[Friend])
async def list_friends(
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    fences = await _fetch_geofences(db)
    async with db.execute(
        """
        SELECT u.*, f.is_favorite
        FROM friendships f
        JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = ? AND f.status = 'accepted'
        ORDER BY f.is_favorite DESC, u.name
        """,
        (current_user_id,),
    ) as cur:
        rows = await cur.fetchall()

    result = []
    for row in rows:
        friend = await _build_friend(
            db, row, bool(row["is_favorite"]), fences, current_user_id
        )
        result.append(friend)
    return result


@router.post("/requests")
async def send_friend_request(
    body: SendFriendRequestBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    req_id = f"fs-{uuid.uuid4().hex[:8]}"
    try:
        await db.execute(
            "INSERT INTO friendships VALUES (?,?,?,'pending',0,datetime('now'))",
            (req_id, current_user_id, body.userId),
        )
        await db.commit()
    except Exception:
        raise HTTPException(status_code=409, detail="Request already exists")

    # Notify the recipient
    async with db.execute(
        "SELECT name FROM users WHERE id = ?", (current_user_id,)
    ) as cur:
        sender = await cur.fetchone()
    if sender:
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        await db.execute(
            "INSERT INTO notifications VALUES (?,?,?,?,datetime('now'),0)",
            (
                notif_id,
                body.userId,
                "friend_request",
                f"{sender['name']} sent you a friend request",
            ),
        )
        await db.commit()

    return {"id": req_id, "ok": True}


@router.get("/requests", response_model=list[FriendRequest])
async def list_friend_requests(
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        """
        SELECT f.id, f.user_id, f.created_at, u.name, u.initials, u.avatar_color
        FROM friendships f
        JOIN users u ON u.id = f.user_id
        WHERE f.friend_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
        """,
        (current_user_id,),
    ) as cur:
        rows = await cur.fetchall()
    return [
        FriendRequest(
            id=r["id"],
            fromUserId=r["user_id"],
            fromName=r["name"],
            fromInitials=r["initials"],
            fromAvatarColor=r["avatar_color"],
            createdAt=r["created_at"],
        )
        for r in rows
    ]


@router.post("/requests/{request_id}/accept")
async def accept_friend_request(
    request_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = 'pending'",
        (request_id, current_user_id),
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.execute(
        "UPDATE friendships SET status = 'accepted' WHERE id = ?",
        (request_id,),
    )
    # Create reverse friendship edge
    reverse_id = f"fs-{uuid.uuid4().hex[:8]}"
    try:
        await db.execute(
            "INSERT INTO friendships VALUES (?,?,?,'accepted',0,datetime('now'))",
            (reverse_id, current_user_id, row["user_id"]),
        )
    except Exception:
        pass  # Reverse already exists
    await db.commit()
    return {"ok": True}


@router.delete("/{friend_id}")
async def remove_friend(
    friend_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
        (current_user_id, friend_id, friend_id, current_user_id),
    )
    await db.commit()
    return {"ok": True}


@router.patch("/{friend_id}/favorite")
async def toggle_favorite(
    friend_id: str,
    body: ToggleFavoriteBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "UPDATE friendships SET is_favorite = ? WHERE user_id = ? AND friend_id = ?",
        (int(body.isFavorite), current_user_id, friend_id),
    )
    await db.commit()
    return {"ok": True, "isFavorite": body.isFavorite}
