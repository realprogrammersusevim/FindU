from typing import Literal
from pydantic import BaseModel
from .geofence import LatLng


class FriendLocation(BaseModel):
    position: LatLng
    withinFences: list[str]
    mode: Literal["exact", "binary"]
    lastUpdated: str


class Friend(BaseModel):
    id: str
    name: str
    initials: str
    avatarColor: str
    major: str | None = None
    year: str | None = None
    shareStatus: Literal["sharing", "private", "offline"]
    location: FriendLocation | None = None
    isFavorite: bool
    mutualFriends: int = 0


class SendFriendRequestBody(BaseModel):
    userId: str


class FriendRequest(BaseModel):
    id: str
    fromUserId: str
    fromName: str
    fromInitials: str
    fromAvatarColor: str
    createdAt: str


class ToggleFavoriteBody(BaseModel):
    isFavorite: bool
