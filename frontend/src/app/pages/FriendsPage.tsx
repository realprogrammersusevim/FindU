import { useState } from 'react';
import { Search, Star, MapPin, Lock, Wifi, WifiOff, Eye, EyeOff, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import type { Friend } from '../types';
import { useNavigate } from 'react-router';

function FriendCard({ friend, onToggleFavorite }: { friend: Friend; onToggleFavorite: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    sharing: { color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500', label: 'Sharing' },
    private: { color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-400', label: 'Private' },
    offline: { color: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400', label: 'Offline' },
  }[friend.shareStatus];

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: friend.avatarColor }}
          >
            {friend.initials}
          </div>
          <div
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${statusConfig.dot}`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">{friend.name}</span>
            {friend.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
          </div>
          <p className="text-xs text-gray-500">
            {friend.major} · {friend.year}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            {friend.shareStatus === 'sharing' && friend.location && (
              <span className="text-[10px] text-gray-400">
                {friend.location.mode === 'binary' ? '· binary mode' : '· exact location'}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {friend.shareStatus === 'sharing' ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : friend.shareStatus === 'private' ? (
            <Lock className="w-4 h-4 text-amber-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-50">
              <div className="pt-3 space-y-3">
                {/* Location info */}
                {friend.shareStatus === 'sharing' && friend.location ? (
                  <div className="bg-indigo-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-semibold text-indigo-700">Current Location</span>
                    </div>
                    {friend.location.mode === 'exact' ? (
                      <p className="text-xs text-indigo-600">
                        Exact position shared · Updated {friend.location.lastUpdated}
                      </p>
                    ) : (
                      <p className="text-xs text-indigo-600">
                        Binary mode — location hidden, zone status only
                      </p>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {friend.location.withinFences.map((fid) => (
                        <span key={fid} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ {fid.replace('fence-', '').replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">
                      {friend.shareStatus === 'private'
                        ? '🔒 This friend has their location set to private right now.'
                        : '⚫ This friend is currently offline.'}
                    </p>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{friend.mutualFriends} mutual friends</span>
                  <span>·</span>
                  <span>
                    {friend.location?.mode === 'exact' ? (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Exact mode
                      </span>
                    ) : friend.location?.mode === 'binary' ? (
                      <span className="flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Binary mode
                      </span>
                    ) : null}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      friend.isFavorite
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${friend.isFavorite ? 'fill-amber-500' : ''}`} />
                    {friend.isFavorite ? 'Favorited' : 'Favorite'}
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-indigo-100 text-indigo-700 transition-colors">
                    <MapPin className="w-3.5 h-3.5" />
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FriendsPage() {
  const { friends, friendRequests, toggleFriendFavorite, acceptFriendRequest, declineFriendRequest } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'sharing' | 'private' | 'offline'>('all');
  const navigate = useNavigate();

  const filtered = friends.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.major.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || f.shareStatus === filter;
    return matchSearch && matchFilter;
  });

  const favorites = filtered.filter((f) => f.isFavorite);
  const others = filtered.filter((f) => !f.isFavorite);

  const counts = {
    all: friends.length,
    sharing: friends.filter((f) => f.shareStatus === 'sharing').length,
    private: friends.filter((f) => f.shareStatus === 'private').length,
    offline: friends.filter((f) => f.shareStatus === 'offline').length,
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Friends</h1>
            <p className="text-xs text-gray-500">{friends.length} connections</p>
          </div>
          <button
            onClick={() => navigate('/friends')}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'sharing', 'private', 'offline'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {favorites.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Favorites
              </span>
            </div>
            <div className="space-y-2">
              {favorites.map((f) => (
                <FriendCard key={f.id} friend={f} onToggleFavorite={() => toggleFriendFavorite(f.id)} />
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            {favorites.length > 0 && (
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                All Friends
              </span>
            )}
            <div className="space-y-2">
              {others.map((f) => (
                <FriendCard key={f.id} friend={f} onToggleFavorite={() => toggleFriendFavorite(f.id)} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm font-semibold text-gray-600">No friends found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
          </div>
        )}

        {/* Friend requests */}
        {friendRequests.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-indigo-800">Friend Requests</span>
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{friendRequests.length} new</span>
            </div>
            <div className="space-y-2">
              {friendRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: req.fromAvatarColor }}
                  >
                    {req.fromInitials}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">{req.fromName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => acceptFriendRequest(req.id)}
                      className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-semibold rounded-lg"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineFriendRequest(req.id)}
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-lg"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}