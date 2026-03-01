import { AnimatePresence, motion } from "motion/react";
import { AppNotification } from "../../types";

interface NotificationsPanelProps {
  showNotifications: boolean;
  notifications: AppNotification[];
}

export function NotificationsPanel({
  showNotifications,
  notifications,
}: NotificationsPanelProps) {
  return (
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
            <span className="text-sm font-semibold text-gray-800">
              Notifications
            </span>
            <span className="text-xs text-indigo-500 font-medium">
              All read
            </span>
          </div>
          {notifications.slice(0, 5).map((notif) => (
            <div
              key={notif.id}
              className="px-4 py-2.5 border-b border-gray-50 flex gap-3"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  notif.type === "entered_fence"
                    ? "bg-green-100"
                    : notif.type === "left_fence"
                      ? "bg-amber-100"
                      : notif.type === "group_invite"
                        ? "bg-indigo-100"
                        : "bg-gray-100"
                }`}
              >
                {notif.type === "entered_fence"
                  ? "📍"
                  : notif.type === "left_fence"
                    ? "🚶"
                    : notif.type === "group_invite"
                      ? "👥"
                      : "🔔"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700">{notif.message}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {notif.timestamp}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
