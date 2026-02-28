import { useState } from 'react';
import { Bell, Lock, Radio, ChevronUp, ChevronDown, Eye, Filter } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation } from 'react-router';
import { CampusMap } from '../components/map/CampusMap';
import { useApp } from '../store/AppContext';

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

  const getFenceNames = (friend: (typeof friends)[0]) => {
    if (!friend.location) return '';
    return friend.location.withinFences
      .map((fid) => geofences.find((f) => f.id === fid)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="h-full flex flex-col relative bg-gray-100">
      {/* Floating Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-3 pt-3">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${currentUser.currentMode === 'sharing' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
            />
            <div>
              <span className="text-sm font-semibold text-gray-800">
                {currentUser.currentMode === 'sharing' ? 'Sharing' : 'Hidden'}
              </span>
              <span className="text-xs text-gray-400 ml-1.5">
                · {sharingFriends.length} friends visible
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePrivacyMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentUser.currentMode === 'sharing'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              {currentUser.currentMode === 'sharing' ? (
                <Radio className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              {currentUser.currentMode === 'sharing' ? 'Live' : 'Private'}
            </button>
            <button
              onClick={() => {
                const next = !showNotifications;
                setShowNotifications(next);
                if (next) markNotificationsRead();
              }}
              className="relative p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Bell className="w-4 h-4 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Location status banner */}
        {(locationStatus === 'denied' || locationStatus === 'unavailable' || locationStatus === 'acquiring' || locationStatus === 'insecure') && (
          <div className={`mt-2 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-start gap-2 shadow ${
            locationStatus === 'denied' || locationStatus === 'insecure'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : locationStatus === 'unavailable'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>
            {locationStatus === 'acquiring' && (
              <>
                <div className="w-3 h-3 mt-0.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
                Requesting your location…
              </>
            )}
            {locationStatus === 'denied' && (
              <>
                <span className="flex-shrink-0 mt-0.5">📍</span>
                <span>
                  Location access denied.{' '}
                  <span className="font-normal">
                    On iPhone: go to <strong>Settings → Privacy &amp; Security → Location Services → Safari Websites</strong> and set to <em>While Using</em>. Then reload this page.
                    If already enabled there, tap the <strong>AA</strong> icon in Safari&apos;s address bar → Website Settings → Location → Allow.
                  </span>
                </span>
              </>
            )}
            {locationStatus === 'insecure' && (
              <>
                <span className="flex-shrink-0 mt-0.5">🔒</span>
                <span>
                  Location requires a secure connection.{' '}
                  <span className="font-normal">Open this page over <strong>HTTPS</strong> or use <strong>localhost</strong> instead of an IP address.</span>
                </span>
              </>
            )}
            {locationStatus === 'unavailable' && (
              <>
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                Location unavailable — your device may not support GPS or the request timed out.
              </>
            )}
          </div>
        )}

        {/* Notifications panel */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="mt-2 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                <span className="text-xs text-indigo-500 font-medium">All read</span>
              </div>
              {notifications.slice(0, 5).map((notif) => (
                <div key={notif.id} className="px-4 py-2.5 border-b border-gray-50 flex gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      notif.type === 'entered_fence'
                        ? 'bg-green-100'
                        : notif.type === 'left_fence'
                          ? 'bg-amber-100'
                          : notif.type === 'group_invite'
                            ? 'bg-indigo-100'
                            : 'bg-gray-100'
                    }`}
                  >
                    {notif.type === 'entered_fence'
                      ? '📍'
                      : notif.type === 'left_fence'
                        ? '🚶'
                        : notif.type === 'group_invite'
                          ? '👥'
                          : '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{notif.timestamp}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Geofence Filter Pills */}
      <div className="absolute left-0 right-0 z-[999]" style={{ bottom: '140px' }}>
        <div
          className="flex gap-2 px-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => setFenceFilter(null)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
              !fenceFilter ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            <Filter className="w-3 h-3" />
            All
          </button>
          {geofences.map((fence) => (
            <button
              key={fence.id}
              onClick={() => setFenceFilter(fence.id === fenceFilter ? null : fence.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                fenceFilter === fence.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {fence.icon} {fence.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Friends Sheet */}
      <div className="absolute left-0 right-0 bottom-0 z-[999]">
        <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-100">
          <button
            onClick={() => setBottomOpen(!bottomOpen)}
            className="w-full flex items-center justify-between px-5 py-3"
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-2 w-8 h-1 bg-gray-200 rounded-full" />
            <div className="flex items-center gap-2 mt-1">
              <Eye className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-800">
                {sharingFriends.length} friends sharing
              </span>
            </div>
            {bottomOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-400 mt-1" />
            )}
          </button>

          <AnimatePresence>
            {bottomOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="px-4 pb-4 space-y-2 overflow-y-auto"
                  style={{ maxHeight: '200px' }}
                >
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: friend.avatarColor }}
                      >
                        {friend.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{friend.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {friend.shareStatus === 'sharing' && friend.location
                            ? friend.location.mode === 'exact'
                              ? `📍 ${getFenceNames(friend) || 'On campus'}`
                              : `🔵 Within ${getFenceNames(friend)}`
                            : friend.shareStatus === 'private'
                              ? '🔒 Location hidden'
                              : '⚫ Offline'}
                        </p>
                      </div>
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          friend.shareStatus === 'sharing'
                            ? 'bg-green-500'
                            : friend.shareStatus === 'private'
                              ? 'bg-amber-400'
                              : 'bg-gray-300'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
