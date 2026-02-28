import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
import { apiFetch } from '../api';

interface AppContextType {
  currentUser: CurrentUser;
  friends: Friend[];
  groups: Group[];
  geofences: Geofence[];
  notifications: AppNotification[];
  unreadCount: number;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _mapProfile(data: any): Partial<CurrentUser> {
  return {
    id: data.id,
    name: data.name,
    initials: data.initials,
    avatarColor: data.avatarColor,
    major: data.major ?? '',
    year: data.year ?? '',
    bio: data.bio ?? '',
    position: data.position ?? initialCurrentUser.position,
    currentMode: data.currentMode,
    locationMode: data.locationMode,
    activeGeofenceIds: data.activeGeofenceIds ?? [],
    friendCount: data.friendCount ?? 0,
    groupCount: data.groupCount ?? 0,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  );
  const isAuthenticated = !!authToken;

  const [currentUser, setCurrentUser] = useState<CurrentUser>(initialCurrentUser);
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [geofences] = useState<Geofence[]>(initialGeofences);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  // Hydrate currentUser from real backend when a token already exists
  useEffect(() => {
    if (!authToken) return;
    apiFetch('/users/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCurrentUser((prev) => ({ ...prev, ..._mapProfile(data) }));
      })
      .catch(() => {/* ignore network errors on startup */});
  }, []); // run once on mount

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await apiFetch('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? 'Invalid email or password');
    }
    const { access_token } = await res.json();
    localStorage.setItem('auth_token', access_token);
    setAuthToken(access_token);

    const profileRes = await apiFetch('/users/me');
    if (profileRes.ok) {
      const profile = await profileRes.json();
      setCurrentUser((prev) => ({ ...prev, ..._mapProfile(profile) }));
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    const res = await apiFetch('/users/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? 'Registration failed');
    }
    const { access_token } = await res.json();
    localStorage.setItem('auth_token', access_token);
    setAuthToken(access_token);

    const profileRes = await apiFetch('/users/me');
    if (profileRes.ok) {
      const profile = await profileRes.json();
      setCurrentUser((prev) => ({ ...prev, ..._mapProfile(profile) }));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setCurrentUser(initialCurrentUser);
  }, []);

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
        isAuthenticated,
        login,
        register,
        logout,
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
