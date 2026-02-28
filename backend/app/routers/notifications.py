from fastapi import APIRouter, Depends
from app.auth import get_current_user_id
import aiosqlite
from app.db import get_db
from app.models.notification import Notification, MarkReadBody

router = APIRouter()


@router.get("/", response_model=list[Notification])
async def list_notifications(
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC",
        (current_user_id,),
    ) as cur:
        rows = await cur.fetchall()
    return [
        Notification(
            id=r["id"],
            type=r["type"],
            message=r["message"],
            timestamp=r["timestamp"],
            isRead=bool(r["is_read"]),
        )
        for r in rows
    ]


@router.post("/read")
async def mark_read(
    body: MarkReadBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    if body.ids is None:
        await db.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
            (current_user_id,),
        )
    else:
        placeholders = ",".join("?" * len(body.ids))
        await db.execute(
            f"UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN ({placeholders})",
            (current_user_id, *body.ids),
        )
    await db.commit()
    return {"ok": True}
