import { useState } from 'react';
import { Search, Plus, Clock, MapPin, Bell, BellOff, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import type { Group, GroupType } from '../types';

const typeConfig: Record<string, { label: string; emoji: string }> = {
  greek: { label: 'Greek Life', emoji: '🏛️' },
  club: { label: 'Club', emoji: '🎯' },
  class: { label: 'Class', emoji: '📚' },
  sports: { label: 'Sports', emoji: '🏆' },
  custom: { label: 'Custom', emoji: '⭐' },
};

const PRESET_COLORS = [
  '#6366F1', '#EC4899', '#3B82F6', '#10B981',
  '#F97316', '#8B5CF6', '#14B8A6', '#F59E0B',
];

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { createGroup } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('custom');
  const [emoji, setEmoji] = useState('⭐');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EMOJI_OPTIONS: Record<GroupType, string> = {
    greek: '🏛️',
    club: '🎯',
    class: '📚',
    sports: '🏆',
    custom: '⭐',
  };

  const handleTypeChange = (t: GroupType) => {
    setType(t);
    setEmoji(EMOJI_OPTIONS[t]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setError('');
    setLoading(true);
    try {
      await createGroup({ name: name.trim(), type, emoji, description: description.trim() || undefined, color });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
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
          <h3 className="font-bold text-gray-900">Create Group</h3>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: '75vh' }}>
          {/* Emoji + Name row */}
          <div className="flex gap-3 items-start">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer"
              style={{ backgroundColor: `${color}18` }}
            >
              {emoji}
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Group Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Study Squad"
                className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Type</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(typeConfig) as GroupType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-all ${
                    type === t ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className="text-lg">{typeConfig[t].emoji}</span>
                  {typeConfig[t].label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
              className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Preview */}
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${color}18` }}
            >
              {emoji}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{name || 'Group Name'}</p>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {typeConfig[type]?.label}
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Creating…' : 'Create Group'}
          </button>
        </div>
        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}

function GroupCard({ group, onToggleJoin, onToggleAlerts }: {
  group: Group;
  onToggleJoin: () => void;
  onToggleAlerts: () => void;
}) {
  const isAdmin = group.myRole === 'admin';
  const isMod = group.myRole === 'moderator';

  const activeRule = group.rules[0];

  return (
    <Link
      to={`/groups/${group.id}`}
      className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform"
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ backgroundColor: group.color }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: `${group.color}18` }}
          >
            {group.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{group.name}</span>
              {isAdmin && (
                <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Admin
                </span>
              )}
              {isMod && (
                <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Mod
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${group.color}20`, color: group.color }}
              >
                {typeConfig[group.type]?.label}
              </span>
              <span className="text-[10px] text-gray-400">
                {group.memberCount} members
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
        </div>

        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{group.description}</p>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              {group.members.slice(0, 3).map((m) => (
                <div
                  key={m.userId}
                  className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white text-[8px] font-bold"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {m.initials[0]}
                </div>
              ))}
            </div>
            {group.activeCount > 0 && (
              <span className="text-[10px] text-green-600 font-semibold ml-1">
                {group.activeCount} active
              </span>
            )}
          </div>

          {activeRule && (
            <div className="flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">
                {activeRule.startTime}–{activeRule.endTime}
              </span>
            </div>
          )}
        </div>

        {/* Geofence tags */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          <MapPin className="w-3 h-3 text-gray-400" />
          {group.geofenceIds.map((fid) => (
            <span key={fid} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {fid.replace('fence-', '').replace(/-/g, ' ')}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
          {group.isJoined ? (
            <>
              <button
                onClick={onToggleAlerts}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  group.alertsEnabled
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {group.alertsEnabled ? (
                  <Bell className="w-3 h-3" />
                ) : (
                  <BellOff className="w-3 h-3" />
                )}
                {group.alertsEnabled ? 'Alerts on' : 'Alerts off'}
              </button>
              <button
                onClick={onToggleJoin}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600"
              >
                Leave
              </button>
            </>
          ) : (
            <button
              onClick={onToggleJoin}
              className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: group.color }}
            >
              Join Group
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export function GroupsPage() {
  const { groups, toggleGroupJoin, toggleGroupAlerts } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tab, setTab] = useState<'mine' | 'discover'>('mine');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const myGroups = groups.filter((g) => g.isJoined);
  const discoverGroups = groups.filter((g) => !g.isJoined);

  const filterGroups = (list: Group[]) =>
    list.filter((g) => {
      const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || g.type === typeFilter;
      return matchSearch && matchType;
    });

  const displayed = tab === 'mine' ? filterGroups(myGroups) : filterGroups(discoverGroups);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Groups</h1>
            <p className="text-xs text-gray-500">{myGroups.length} joined</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none"
          />
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
          <button
            onClick={() => setTab('mine')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            My Groups ({myGroups.length})
          </button>
          <button
            onClick={() => setTab('discover')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'discover' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Discover ({discoverGroups.length})
          </button>
        </div>

        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {['all', 'greek', 'club', 'class', 'sports'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t === 'all' ? 'All' : typeConfig[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">{tab === 'mine' ? '👥' : '🔍'}</div>
            <p className="text-sm font-semibold text-gray-600">
              {tab === 'mine' ? 'No groups joined yet' : 'No groups found'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {tab === 'mine' ? 'Discover and join groups below' : 'Try different filters'}
            </p>
          </div>
        ) : (
          displayed.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onToggleJoin={() => toggleGroupJoin(g.id)}
              onToggleAlerts={() => toggleGroupAlerts(g.id)}
            />
          ))
        )}

        {tab === 'discover' && discoverGroups.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100 text-center">
            <p className="text-xs font-semibold text-indigo-800 mb-1">Can't find your group?</p>
            <p className="text-xs text-indigo-600 mb-3">
              Ask your group admin for an invite code to join a private group.
            </p>
            <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">
              Enter Invite Code
            </button>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
