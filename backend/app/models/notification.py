from typing import Literal
from pydantic import BaseModel


class Notification(BaseModel):
    id: str
    type: Literal["entered_fence", "left_fence", "friend_request", "group_invite", "alert"]
    message: str
    timestamp: str
    isRead: bool


class MarkReadBody(BaseModel):
    ids: list[str] | None = None  # None means mark all
