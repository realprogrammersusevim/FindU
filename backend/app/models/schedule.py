from typing import Literal
from pydantic import BaseModel


class ScheduleSlot(BaseModel):
    id: str
    days: list[str]
    startTime: str
    endTime: str
    mode: Literal["sharing", "private"]
    label: str | None = None
    isDefault: bool = False
    isActive: bool = True


class ScheduleException(BaseModel):
    id: str
    date: str
    startTime: str
    endTime: str
    mode: Literal["sharing", "private"]
    note: str | None = None


class ScheduleResponse(BaseModel):
    slots: list[ScheduleSlot]
    exceptions: list[ScheduleException]


class CreateSlotBody(BaseModel):
    days: list[str]
    startTime: str
    endTime: str
    mode: Literal["sharing", "private"]
    label: str | None = None
    isDefault: bool = False
    isActive: bool = True


class UpdateSlotBody(BaseModel):
    days: list[str] | None = None
    startTime: str | None = None
    endTime: str | None = None
    mode: Literal["sharing", "private"] | None = None
    label: str | None = None
    isActive: bool | None = None


class CreateExceptionBody(BaseModel):
    date: str
    startTime: str
    endTime: str
    mode: Literal["sharing", "private"]
    note: str | None = None
