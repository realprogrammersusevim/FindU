from pydantic import BaseModel


class LatLng(BaseModel):
    lat: float
    lng: float


class Geofence(BaseModel):
    id: str
    name: str
    center: LatLng
    radius: float
    color: str
    icon: str
    description: str | None = None
