import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  CurrentUser,
  Friend,
  Group,
  Geofence,
  AppNotification,
  ScheduleSlot,
  ScheduleException,
  PrivacyMode,
  LocationMode,
  GroupRule,
} from '../types';
import {
  friends as initialFriends,
  groups as initialGroups,
  geofences as initialGeofences,
  initialCurrentUser,
  initialNotifications,
} from '../data/mockData';

interface AppContextType {
  currentUser: CurrentUser;
  friends: Friend[];
  groups: Group[];
  geofences: Geofence[];
  notifications: AppNotification[];
  unreadCount: number;
  togglePrivacyMode: () => void;
  setPrivacyMode: (mode: PrivacyMode) => void;
  setLocationMode: (mode: LocationMode) => void;
  toggleGroupJoin: (groupId: string) => void;
  toggleGroupAlerts: (groupId: string) => void;
  updateGroupRules: (groupId: string, rules: GroupRule[]) => void;
  markNotificationsRead: () => void;
  addScheduleSlot: (slot: Omit<ScheduleSlot, 'id'>) => void;
  removeScheduleSlot: (id: string) => void;
  updateScheduleSlot: (id: string, slot: Partial<ScheduleSlot>) => void;
  addException: (exc: Omit<ScheduleException, 'id'>) => void;
  removeException: (id: string) => void;
  toggleFriendFavorite: (friendId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(initialCurrentUser);
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [geofences] = useState<Geofence[]>(initialGeofences);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const togglePrivacyMode = useCallback(() => {
    setCurrentUser((prev) => ({
      ...prev,
      currentMode: prev.currentMode === 'sharing' ? 'private' : 'sharing',
    }));
  }, []);

  const setPrivacyMode = useCallback((mode: PrivacyMode) => {
    setCurrentUser((prev) => ({ ...prev, currentMode: mode }));
  }, []);

  const setLocationMode = useCallback((mode: LocationMode) => {
    setCurrentUser((prev) => ({ ...prev, locationMode: mode }));
  }, []);

  const toggleGroupJoin = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, isJoined: !g.isJoined, myRole: g.isJoined ? 'none' : 'member' }
          : g
      )
    );
  }, []);

  const toggleGroupAlerts = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, alertsEnabled: !g.alertsEnabled } : g))
    );
  }, []);

  const updateGroupRules = useCallback((groupId: string, rules: GroupRule[]) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, rules } : g)));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const addScheduleSlot = useCallback((slot: Omit<ScheduleSlot, 'id'>) => {
    const newSlot: ScheduleSlot = { ...slot, id: `slot-${Date.now()}` };
    setCurrentUser((prev) => ({
      ...prev,
      scheduleSlots: [...prev.scheduleSlots, newSlot],
    }));
  }, []);

  const removeScheduleSlot = useCallback((id: string) => {
    setCurrentUser((prev) => ({
      ...prev,
      scheduleSlots: prev.scheduleSlots.filter((s) => s.id !== id),
    }));
  }, []);

  const updateScheduleSlot = useCallback((id: string, update: Partial<ScheduleSlot>) => {
    setCurrentUser((prev) => ({
      ...prev,
      scheduleSlots: prev.scheduleSlots.map((s) => (s.id === id ? { ...s, ...update } : s)),
    }));
  }, []);

  const addException = useCallback((exc: Omit<ScheduleException, 'id'>) => {
    const newExc: ScheduleException = { ...exc, id: `exc-${Date.now()}` };
    setCurrentUser((prev) => ({
      ...prev,
      exceptions: [...prev.exceptions, newExc],
    }));
  }, []);

  const removeException = useCallback((id: string) => {
    setCurrentUser((prev) => ({
      ...prev,
      exceptions: prev.exceptions.filter((e) => e.id !== id),
    }));
  }, []);

  const toggleFriendFavorite = useCallback((friendId: string) => {
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, isFavorite: !f.isFavorite } : f))
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        friends,
        groups,
        geofences,
        notifications,
        unreadCount,
        togglePrivacyMode,
        setPrivacyMode,
        setLocationMode,
        toggleGroupJoin,
        toggleGroupAlerts,
        updateGroupRules,
        markNotificationsRead,
        addScheduleSlot,
        removeScheduleSlot,
        updateScheduleSlot,
        addException,
        removeException,
        toggleFriendFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
