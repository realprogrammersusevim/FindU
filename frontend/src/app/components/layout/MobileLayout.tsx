import { Link, Outlet, useLocation } from 'react-router';
import { Map, Users, Users2, Shield, User } from 'lucide-react';
import { useApp } from '../../store/AppContext';

const navItems = [
  { path: '/map', icon: Map, label: 'Map' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/groups', icon: Users2, label: 'Groups' },
  { path: '/privacy', icon: Shield, label: 'Privacy' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function MobileLayout() {
  const location = useLocation();
  const { unreadCount } = useApp();

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 flex items-center justify-center">
      <div
        className="relative flex flex-col bg-white overflow-hidden shadow-2xl"
        style={{ width: '430px', height: '100vh', maxHeight: '932px' }}
      >
        {/* Page content */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white border-t border-gray-100 px-2 py-1 flex-shrink-0">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive =
                item.path === '/groups'
                  ? location.pathname.startsWith('/groups')
                  : location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all relative"
                >
                  <div
                    className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-indigo-100' : ''}`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}
                    />
                    {item.label === 'Profile' && unreadCount > 0 && (
                      <span className="absolute top-1.5 right-2 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] transition-colors ${isActive ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
