import { Bell, Lock, Radio } from 'lucide-react';
import { CurrentUser } from '../../types';

interface MapTopBarProps {
  currentUser: CurrentUser;
  sharingFriendsCount: number;
  togglePrivacyMode: () => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  unreadCount: number;
  markNotificationsRead: () => void;
}

export function MapTopBar({
  currentUser,
  sharingFriendsCount,
  togglePrivacyMode,
  showNotifications,
  setShowNotifications,
  unreadCount,
  markNotificationsRead,
}: MapTopBarProps) {
  return (
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
            · {sharingFriendsCount} friends visible
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
  );
}
