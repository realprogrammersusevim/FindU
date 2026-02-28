import { ChevronUp, ChevronDown, Eye, Filter } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Geofence, Friend } from '../../types';

interface MapBottomSheetProps {
  geofences: Geofence[];
  fenceFilter: string | null;
  setFenceFilter: (id: string | null) => void;
  bottomOpen: boolean;
  setBottomOpen: (open: boolean) => void;
  sharingFriendsCount: number;
  friends: Friend[];
}

export function MapBottomSheet({
  geofences,
  fenceFilter,
  setFenceFilter,
  bottomOpen,
  setBottomOpen,
  sharingFriendsCount,
  friends,
}: MapBottomSheetProps) {
  const getFenceNames = (friend: Friend) => {
    if (!friend.location) return '';
    return friend.location.withinFences
      .map((fid) => geofences.find((f) => f.id === fid)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="absolute left-0 right-0 bottom-0 z-[999]">
      <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-100">
        {/* Geofence Filter Pills */}
        <div
          className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => setFenceFilter(null)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
              !fenceFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
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
                fenceFilter === fence.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {fence.icon} {fence.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setBottomOpen(!bottomOpen)}
          className="w-full flex items-center justify-between px-5 py-3"
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-8 h-1 bg-gray-200 rounded-full" />
          <div className="flex items-center gap-2 mt-1">
            <Eye className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">
              {sharingFriendsCount} friends sharing
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
  );
}
