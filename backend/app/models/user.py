from typing import Literal
from pydantic import BaseModel
from .geofence import LatLng


class UserProfile(BaseModel):
    id: str
    name: str
    initials: str
    avatarColor: str
    major: str | None = None
    year: str | None = None
    bio: str | None = None
    position: LatLng | None = None
    currentMode: Literal["sharing", "private"] = "sharing"
    locationMode: Literal["exact", "binary"] = "exact"
    activeGeofenceIds: list[str] = []
    friendCount: int = 0
    groupCount: int = 0


class UpdateProfileBody(BaseModel):
    name: str | None = None
    bio: str | None = None
    major: str | None = None
    year: str | None = None


class UpdateLocationBody(BaseModel):
    lat: float
    lng: float


class UpdatePrivacyModeBody(BaseModel):
    mode: Literal["sharing", "private"]


class UpdateLocationModeBody(BaseModel):
    mode: Literal["exact", "binary"]
