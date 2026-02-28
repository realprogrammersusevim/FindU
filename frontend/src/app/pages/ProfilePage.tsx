import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Info,
  ChevronRight,
  Radio,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Users,
  MapPin,
  Settings,
  LogOut,
  Edit3,
} from 'lucide-react';
import { Link } from 'react-router';
import { useApp } from '../store/AppContext';
import { AnimatePresence, motion } from 'motion/react';

export function ProfilePage() {
  const { currentUser, friends, groups, notifications, unreadCount, togglePrivacyMode, markNotificationsRead, logout } = useApp();
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const myGroups = groups.filter((g) => g.isJoined);
  const sharingFriends = friends.filter((f) => f.shareStatus === 'sharing');

  const settingsSections = [
    {
      title: 'Location & Privacy',
      items: [
        {
          icon: currentUser.currentMode === 'sharing' ? Radio : Lock,
          label: 'Location Status',
          value: currentUser.currentMode === 'sharing' ? 'Sharing' : 'Private',
          valueColor: currentUser.currentMode === 'sharing' ? 'text-green-600' : 'text-amber-600',
          action: togglePrivacyMode,
        },
        {
          icon: currentUser.locationMode === 'exact' ? Eye : EyeOff,
          label: 'Location Precision',
          value: currentUser.locationMode === 'exact' ? 'Exact' : 'Binary / Zone only',
          link: '/privacy',
        },
        {
          icon: MapPin,
          label: 'Geofences & Schedules',
          value: `${currentUser.scheduleSlots.length} schedules`,
          link: '/privacy',
        },
      ],
    },
    {
      title: 'Social',
      items: [
        {
          icon: Users,
          label: 'Friends',
          value: `${currentUser.friendCount} connected`,
          link: '/friends',
        },
        {
          icon: Users,
          label: 'My Groups',
          value: `${myGroups.length} joined`,
          link: '/groups',
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Alerts',
          value: `${unreadCount} unread`,
          valueColor: unreadCount > 0 ? 'text-red-500' : 'text-gray-400',
          action: () => {
            setShowNotifPanel(true);
            markNotificationsRead();
          },
        },
        {
          icon: Shield,
          label: 'Geofence Alerts',
          value: 'On',
          valueColor: 'text-green-600',
        },
      ],
    },
    {
      title: 'App',
      items: [
        {
          icon: Settings,
          label: 'App Settings',
          value: '',
        },
        {
          icon: Info,
          label: 'About GeoShare',
          value: 'v1.0.0',
        },
        {
          icon: LogOut,
          label: 'Sign Out',
          value: '',
          danger: true,
          action: logout,
        },
      ],
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 px-5 pt-6 pb-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-10 -translate-x-6" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold border-2 border-white/30"
                  style={{ backgroundColor: `${currentUser.avatarColor}cc` }}
                >
                  {currentUser.initials}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                    currentUser.currentMode === 'sharing' ? 'bg-green-500' : 'bg-amber-400'
                  }`}
                >
                  {currentUser.currentMode === 'sharing' ? (
                    <Radio className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <Lock className="w-2.5 h-2.5 text-white" />
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{currentUser.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs text-white/80">
                    {currentUser.major} · {currentUser.year}
                  </span>
                </div>
              </div>
            </div>
            <button className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors">
              <Edit3 className="w-4 h-4 text-white" />
            </button>
          </div>

          <p className="text-xs text-white/70 mb-4">{currentUser.bio}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Friends', value: currentUser.friendCount, sub: `${sharingFriends.length} active` },
              { label: 'Groups', value: myGroups.length, sub: 'joined' },
              { label: 'Zones', value: currentUser.activeGeofenceIds.length, sub: 'active' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/15 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/80 font-semibold">{stat.label}</p>
                <p className="text-[9px] text-white/60">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                const isLast = idx === section.items.length - 1;

                const content = (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${
                      !isLast ? 'border-b border-gray-50' : ''
                    } ${(item as { danger?: boolean }).danger ? 'text-red-500' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        (item as { danger?: boolean }).danger ? 'bg-red-50' : 'bg-gray-100'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${(item as { danger?: boolean }).danger ? 'text-red-500' : 'text-gray-500'}`}
                      />
                    </div>
                    <span
                      className={`flex-1 text-sm font-medium ${(item as { danger?: boolean }).danger ? 'text-red-600' : 'text-gray-800'}`}
                    >
                      {item.label}
                    </span>
                    {item.value && (
                      <span
                        className={`text-xs font-medium mr-1 ${(item as { valueColor?: string }).valueColor || 'text-gray-400'}`}
                      >
                        {item.value}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                );

                if ((item as { link?: string }).link) {
                  return (
                    <Link key={item.label} to={(item as { link: string }).link} className="block">
                      {content}
                    </Link>
                  );
                }
                return content;
              })}
            </div>
          </div>
        ))}

        {/* Notification panel */}
        <AnimatePresence>
          {showNotifPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
              onClick={() => setShowNotifPanel(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-white rounded-t-3xl w-full max-w-[430px] max-h-[70vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">All Notifications</h3>
                  <button onClick={() => setShowNotifPanel(false)} className="text-gray-400 text-xl">×</button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                  {notifications.map((n) => (
                    <div key={n.id} className="px-5 py-3 border-b border-gray-50 flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                          n.type === 'entered_fence'
                            ? 'bg-green-100'
                            : n.type === 'left_fence'
                              ? 'bg-amber-100'
                              : n.type === 'group_invite'
                                ? 'bg-indigo-100'
                                : 'bg-gray-100'
                        }`}
                      >
                        {n.type === 'entered_fence' ? '📍' : n.type === 'left_fence' ? '🚶' : n.type === 'group_invite' ? '👥' : '🔔'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* App info */}
        <div className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-700">GeoShare</span>
          </div>
          <p className="text-xs text-gray-400">Campus-aware location sharing · v1.0.0</p>
          <p className="text-[10px] text-gray-300 mt-1">Westbrook University</p>
        </div>
      </div>
    </div>
  );
}
