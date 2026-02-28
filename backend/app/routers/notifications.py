from fastapi import APIRouter
from app.db import get_db
from app.models.notification import Notification, MarkReadBody

router = APIRouter()

CURRENT_USER = "me"


@router.get("/", response_model=list[Notification])
async def list_notifications():
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC",
            (CURRENT_USER,),
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
    finally:
        await db.close()


@router.post("/read")
async def mark_read(body: MarkReadBody):
    db = await get_db()
    try:
        if body.ids is None:
            await db.execute(
                "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
                (CURRENT_USER,),
            )
        else:
            placeholders = ",".join("?" * len(body.ids))
            await db.execute(
                f"UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN ({placeholders})",
                (CURRENT_USER, *body.ids),
            )
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()
