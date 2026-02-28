import { useState, useEffect, useRef } from 'react';
import { Search, Star, MapPin, Lock, Wifi, WifiOff, Eye, EyeOff, UserPlus, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import type { Friend, UserSearchResult } from '../types';
import { useNavigate } from 'react-router';

function AddFriendModal({ onClose }: { onClose: () => void }) {
  const { searchUsers, sendFriendRequest } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchUsers(query.trim());
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchUsers]);

  const handleSend = async (userId: string) => {
    setError('');
    try {
      await sendFriendRequest(userId);
      setSent(prev => new Set(prev).add(userId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send request');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white rounded-t-3xl w-full max-w-[430px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Friend</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">No users found</div>
          )}
          {!loading && results.map(user => (
            <div key={user.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                {user.major && (
                  <p className="text-xs text-gray-400">{user.major} · {user.year}</p>
                )}
              </div>
              {sent.has(user.id) ? (
                <span className="text-xs font-semibold text-green-600 px-3 py-1.5 bg-green-50 rounded-xl">Sent ✓</span>
              ) : (
                <button
                  onClick={() => handleSend(user.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 px-3 py-1.5 rounded-xl"
                >
                  <UserPlus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>
          ))}
          {!loading && query.trim().length < 2 && (
            <div className="text-center py-8 text-xs text-gray-400">
              Type at least 2 characters to search
            </div>
          )}
        </div>
        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}

function FriendCard({ friend, onToggleFavorite, onViewOnMap }: {
  friend: Friend;
  onToggleFavorite: () => void;
  onViewOnMap: () => void;
}) {
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
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewOnMap(); }}
                    disabled={!friend.location}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      friend.location
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
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
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  const filtered = friends.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.major?.toLowerCase().includes(search.toLowerCase());
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

  const handleViewOnMap = (friend: Friend) => {
    if (!friend.location) return;
    navigate('/map', { state: { centerOn: friend.location.position, focusFriendId: friend.id } });
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
            onClick={() => setShowAddModal(true)}
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
                <FriendCard
                  key={f.id}
                  friend={f}
                  onToggleFavorite={() => toggleFriendFavorite(f.id)}
                  onViewOnMap={() => handleViewOnMap(f)}
                />
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
                <FriendCard
                  key={f.id}
                  friend={f}
                  onToggleFavorite={() => toggleFriendFavorite(f.id)}
                  onViewOnMap={() => handleViewOnMap(f)}
                />
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

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddModal && <AddFriendModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
