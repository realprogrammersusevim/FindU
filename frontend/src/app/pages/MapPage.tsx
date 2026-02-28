import { useState } from 'react';
import { useLocation } from 'react-router';
import { CampusMap } from '../components/map/CampusMap';
import { useApp } from '../store/AppContext';
import { MapTopBar } from '../components/map/MapTopBar';
import { LocationStatusBanner } from '../components/map/LocationStatusBanner';
import { NotificationsPanel } from '../components/map/NotificationsPanel';
import { MapBottomSheet } from '../components/map/MapBottomSheet';

export function MapPage() {
  const {
    profileLoaded,
    currentUser,
    friends,
    geofences,
    notifications,
    unreadCount,
    locationStatus,
    togglePrivacyMode,
    markNotificationsRead,
  } = useApp();

  const location = useLocation();
  const navState = location.state as { centerOn?: { lat: number; lng: number }; focusFriendId?: string } | null;

  const [showNotifications, setShowNotifications] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [fenceFilter, setFenceFilter] = useState<string | null>(null);

  const sharingFriends = friends.filter((f) => f.shareStatus === 'sharing');
  const activeIds = fenceFilter ? [fenceFilter] : geofences.map((f) => f.id);

  return (
    <div className="h-full flex flex-col relative bg-gray-100">
      {/* Floating Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-3 pt-3">
        <MapTopBar
          currentUser={currentUser}
          sharingFriendsCount={sharingFriends.length}
          togglePrivacyMode={togglePrivacyMode}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          unreadCount={unreadCount}
          markNotificationsRead={markNotificationsRead}
        />

        <LocationStatusBanner locationStatus={locationStatus} />

        <NotificationsPanel
          showNotifications={showNotifications}
          notifications={notifications}
        />
      </div>

      {/* Map */}
      <div className="flex-1 w-full h-full">
        <CampusMap
          geofences={geofences}
          friends={friends}
          currentUser={currentUser}
          profileLoaded={profileLoaded}
          activeGeofenceIds={activeIds}
          centerOverride={navState?.centerOn}
          zoomOverride={navState?.centerOn ? 17 : undefined}
          height="100%"
        />
      </div>

      <MapBottomSheet
        geofences={geofences}
        fenceFilter={fenceFilter}
        setFenceFilter={setFenceFilter}
        bottomOpen={bottomOpen}
        setBottomOpen={setBottomOpen}
        sharingFriendsCount={sharingFriends.length}
        friends={friends}
      />
    </div>
  );
}
