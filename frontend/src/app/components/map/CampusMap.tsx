import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Geofence, Friend, CurrentUser } from "../../types";

function MapController({
  centerOverride,
  zoomOverride,
  currentUserPosition,
}: {
  centerOverride?: { lat: number; lng: number };
  zoomOverride?: number;
  currentUserPosition: { lat: number; lng: number };
}) {
  const map = useMap();
  const hasAutoCentered = useRef(false);

  // Handle explicit overrides (e.g. clicking a friend)
  useEffect(() => {
    if (centerOverride) {
      map.flyTo([centerOverride.lat, centerOverride.lng], zoomOverride ?? 17, {
        duration: 0.8,
      });
    }
  }, [map, centerOverride?.lat, centerOverride?.lng, zoomOverride]);

  // Handle initial auto-center on user's live position
  useEffect(() => {
    // If we have an override, we don't auto-center on the user.
    if (centerOverride) return;

    // We auto-center exactly once on the first non-default position we see.
    // (Default is Lincoln, NE: 40.8207, -96.7005)
    const isDefault =
      currentUserPosition.lat === 40.8207 &&
      currentUserPosition.lng === -96.7005;

    if (!hasAutoCentered.current && !isDefault) {
      map.setView(
        [currentUserPosition.lat, currentUserPosition.lng],
        zoomOverride ?? 17
      );
      hasAutoCentered.current = true;
    }
  }, [map, currentUserPosition, centerOverride, zoomOverride]);

  return null;
}

function createAvatarIcon(initials: string, color: string) {
  return L.divIcon({
    html: `<div style="
      width:38px;height:38px;border-radius:50%;
      background:${color};
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:13px;font-weight:700;
      border:3px solid white;
      box-shadow:0 2px 10px rgba(0,0,0,0.25);
      font-family:system-ui,sans-serif;
      position:relative;
    ">
      ${initials}
      <div style="
        position:absolute;bottom:1px;right:1px;
        width:10px;height:10px;border-radius:50%;
        background:#10B981;border:2px solid white;
      "></div>
    </div>`,
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
}

function createCurrentUserIcon(initials: string, color: string) {
  return L.divIcon({
    html: `<div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
      <div style="
        position:absolute;
        width:48px;height:48px;border-radius:50%;
        background:${color}30;
        animation:ripple 2s ease-out infinite;
      "></div>
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:${color};
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:14px;font-weight:700;
        border:3px solid white;
        box-shadow:0 2px 16px ${color}66;
        font-family:system-ui,sans-serif;
        position:relative;z-index:1;
      ">
        ${initials}
        <div style="
          position:absolute;bottom:0;right:0;
          width:12px;height:12px;border-radius:50%;
          background:#10B981;border:2px solid white;
        "></div>
      </div>
    </div>`,
    className: "",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -26],
  });
}

interface CampusMapProps {
  geofences: Geofence[];
  friends: Friend[];
  currentUser: CurrentUser;
  profileLoaded?: boolean;
  activeGeofenceIds?: string[];
  centerOverride?: { lat: number; lng: number };
  zoomOverride?: number;
  height?: string;
}

export function CampusMap({
  geofences,
  friends,
  currentUser,
  profileLoaded = false,
  activeGeofenceIds,
  centerOverride,
  zoomOverride,
  height = "100%",
}: CampusMapProps) {
  const initialCenter = currentUser.position;
  const initialZoom = 15;

  const displayGeofences = activeGeofenceIds
    ? geofences.filter((f) => activeGeofenceIds.includes(f.id))
    : geofences;

  const visibleFriends = friends.filter(
    (f) => f.shareStatus === "sharing" && f.location !== null
  );

  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={initialZoom}
      style={{ width: "100%", height }}
      zoomControl={false}
      attributionControl={false}
    >
      <MapController
        centerOverride={centerOverride}
        zoomOverride={zoomOverride}
        currentUserPosition={currentUser.position}
      />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      {/* Geofence circles */}
      {displayGeofences.map((fence) => (
        <Circle
          key={fence.id}
          center={[fence.center.lat, fence.center.lng]}
          radius={fence.radius}
          pathOptions={{
            color: fence.color,
            fillColor: fence.color,
            fillOpacity: 0.1,
            weight: 2.5,
            dashArray: "8 5",
          }}
        >
          <Popup>
            <div
              style={{
                fontFamily: "system-ui",
                fontSize: "13px",
                minWidth: "140px",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "2px" }}>
                {fence.icon} {fence.name}
              </div>
              <div style={{ color: "#6B7280", fontSize: "11px" }}>
                {fence.description}
              </div>
              <div
                style={{
                  color: fence.color,
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                Radius: {fence.radius}m
              </div>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Current user marker — only after real profile is loaded to avoid flashing mock "AC" */}
      {profileLoaded && currentUser.currentMode === "sharing" && (
        <Marker
          position={[currentUser.position.lat, currentUser.position.lng]}
          icon={createCurrentUserIcon(
            currentUser.initials,
            currentUser.avatarColor
          )}
        >
          <Popup>
            <div style={{ fontFamily: "system-ui", fontSize: "13px" }}>
              <div style={{ fontWeight: 700 }}>You ({currentUser.name})</div>
              <div style={{ color: "#10B981", fontSize: "11px" }}>
                ● Sharing live
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Friend markers */}
      {visibleFriends.map((friend) => {
        if (!friend.location) return null;
        if (friend.location.mode === "binary") return null;

        return (
          <Marker
            key={friend.id}
            position={[
              friend.location.position.lat,
              friend.location.position.lng,
            ]}
            icon={createAvatarIcon(friend.initials, friend.avatarColor)}
          >
            <Popup>
              <div
                style={{
                  fontFamily: "system-ui",
                  fontSize: "13px",
                  minWidth: "130px",
                }}
              >
                <div style={{ fontWeight: 700 }}>{friend.name}</div>
                <div style={{ color: "#6B7280", fontSize: "11px" }}>
                  {friend.major} · {friend.year}
                </div>
                <div
                  style={{
                    color: "#9CA3AF",
                    fontSize: "10px",
                    marginTop: "3px",
                  }}
                >
                  Updated {friend.location.lastUpdated}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
