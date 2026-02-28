from typing import Literal
from pydantic import BaseModel


class GroupMember(BaseModel):
    userId: str
    name: str
    initials: str
    avatarColor: str
    role: Literal["admin", "moderator", "member"]
    isOnline: bool
    withinGeofence: bool


class GroupRule(BaseModel):
    id: str
    days: list[str]
    startTime: str
    endTime: str
    locationMode: Literal["exact", "binary"]
    label: str | None = None


class Group(BaseModel):
    id: str
    name: str
    type: Literal["greek", "club", "class", "sports", "custom"]
    emoji: str | None = None
    description: str | None = None
    color: str | None = None
    memberCount: int
    activeCount: int
    members: list[GroupMember]
    geofenceIds: list[str]
    rules: list[GroupRule]
    isJoined: bool
    myRole: Literal["admin", "moderator", "member", "none"]
    alertsEnabled: bool


class CreateGroupBody(BaseModel):
    name: str
    type: Literal["greek", "club", "class", "sports", "custom"]
    emoji: str | None = None
    description: str | None = None
    color: str | None = None


class ToggleAlertsBody(BaseModel):
    enabled: bool


class ReplaceRulesBody(BaseModel):
    rules: list[GroupRule]


class UpdateMemberRoleBody(BaseModel):
    role: Literal["admin", "moderator", "member"]
