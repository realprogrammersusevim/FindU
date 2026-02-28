import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  CurrentUser,
  Friend,
  FriendRequest,
  Group,
  Geofence,
  AppNotification,
  ScheduleSlot,
  ScheduleException,
  PrivacyMode,
  LocationMode,
  GroupRule,
} from '../types';
import { initialCurrentUser } from '../data/mockData';
import { apiFetch } from '../api';

interface AppContextType {
  currentUser: CurrentUser;
  friends: Friend[];
  friendRequests: FriendRequest[];
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
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
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

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  );
  const isAuthenticated = !!authToken;

  const [currentUser, setCurrentUser] = useState<CurrentUser>(initialCurrentUser);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadAll = useCallback(async () => {
    const [profileRes, schedRes, friendsRes, requestsRes, groupsRes, fencesRes, notifRes] = await Promise.all([
      apiFetch('/users/me'),
      apiFetch('/users/me/schedule'),
      apiFetch('/friends/'),
      apiFetch('/friends/requests'),
      apiFetch('/groups/'),
      apiFetch('/geofences/'),
      apiFetch('/notifications/'),
    ]);

    if (profileRes.ok) {
      const data = await profileRes.json();
      setCurrentUser(prev => ({ ...prev, ..._mapProfile(data) }));
    }
    if (schedRes.ok) {
      const { slots, exceptions } = await schedRes.json();
      setCurrentUser(prev => ({ ...prev, scheduleSlots: slots, exceptions }));
    }
    if (friendsRes.ok) setFriends(await friendsRes.json());
    if (requestsRes.ok) setFriendRequests(await requestsRes.json());
    if (groupsRes.ok) setGroups(await groupsRes.json());
    if (fencesRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await fencesRes.json();
      setGeofences(data.map(f => ({ ...f, center: { lat: f.center.lat, lng: f.center.lng } })));
    }
    if (notifRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await notifRes.json();
      setNotifications(data.map(n => ({ ...n, timestamp: formatRelativeTime(n.timestamp) })));
    }
  }, []);

  // Hydrate all state from backend when a token already exists
  useEffect(() => {
    if (!authToken) return;
    loadAll().catch(() => {/* ignore network errors on startup */});
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
    await loadAll();
  }, [loadAll]);

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
    await loadAll();
  }, [loadAll]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setFriends([]);
    setFriendRequests([]);
    setGroups([]);
    setNotifications([]);
    setCurrentUser(initialCurrentUser);
  }, []);

  const togglePrivacyMode = useCallback(() => {
    const next = currentUser.currentMode === 'sharing' ? 'private' : 'sharing';
    setCurrentUser((prev) => ({ ...prev, currentMode: next }));
    apiFetch('/users/me/privacy-mode', {
      method: 'PATCH',
      body: JSON.stringify({ mode: next }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setCurrentUser(prev => ({ ...prev, currentMode: data.currentMode }));
      })
      .catch(err => {
        console.error('togglePrivacyMode failed', err);
        setCurrentUser(prev => ({ ...prev, currentMode: prev.currentMode === 'sharing' ? 'private' : 'sharing' }));
      });
  }, [currentUser.currentMode]);

  const setPrivacyMode = useCallback((mode: PrivacyMode) => {
    setCurrentUser((prev) => ({ ...prev, currentMode: mode }));
    apiFetch('/users/me/privacy-mode', {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setCurrentUser(prev => ({ ...prev, currentMode: data.currentMode }));
      })
      .catch(err => console.error('setPrivacyMode failed', err));
  }, []);

  const setLocationMode = useCallback((mode: LocationMode) => {
    setCurrentUser((prev) => ({ ...prev, locationMode: mode }));
    apiFetch('/users/me/location-mode', {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setCurrentUser(prev => ({ ...prev, locationMode: data.locationMode }));
      })
      .catch(err => console.error('setLocationMode failed', err));
  }, []);

  const toggleGroupJoin = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const wasJoined = group.isJoined;

    // Optimistic update
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? { ...g, isJoined: !wasJoined, myRole: wasJoined ? 'none' : 'member' }
          : g
      )
    );

    const req = wasJoined
      ? apiFetch(`/groups/${groupId}/leave`, { method: 'DELETE' })
      : apiFetch(`/groups/${groupId}/join`, { method: 'POST' });

    req
      .then(r => r.ok ? apiFetch(`/groups/${groupId}`) : null)
      .then(r => r?.ok ? r.json() : null)
      .then(data => {
        if (data) setGroups(prev => prev.map(g => g.id === groupId ? data : g));
      })
      .catch(err => {
        console.error('toggleGroupJoin failed', err);
        // Revert optimistic update
        setGroups(prev =>
          prev.map(g => g.id === groupId ? group : g)
        );
      });
  }, [groups]);

  const toggleGroupAlerts = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const next = !group.alertsEnabled;

    // Optimistic update
    setGroups(prev =>
      prev.map(g => g.id === groupId ? { ...g, alertsEnabled: next } : g)
    );

    apiFetch(`/groups/${groupId}/alerts`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: next }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setGroups(prev =>
          prev.map(g => g.id === groupId ? { ...g, alertsEnabled: data.alertsEnabled } : g)
        );
      })
      .catch(err => {
        console.error('toggleGroupAlerts failed', err);
        setGroups(prev =>
          prev.map(g => g.id === groupId ? { ...g, alertsEnabled: !next } : g)
        );
      });
  }, [groups]);

  const updateGroupRules = useCallback((groupId: string, rules: GroupRule[]) => {
    // Optimistic update
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, rules } : g));

    apiFetch(`/groups/${groupId}/rules`, {
      method: 'PUT',
      body: JSON.stringify({ rules }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setGroups(prev => prev.map(g => g.id === groupId ? { ...g, rules: data } : g));
      })
      .catch(err => console.error('updateGroupRules failed', err));
  }, []);

  const markNotificationsRead = useCallback(() => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    apiFetch('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids: null }),
    }).catch(err => console.error('markNotificationsRead failed', err));
  }, []);

  const addScheduleSlot = useCallback((slot: Omit<ScheduleSlot, 'id'>) => {
    const tempId = `slot-tmp-${Date.now()}`;
    const tempSlot: ScheduleSlot = { ...slot, id: tempId };

    // Optimistic add
    setCurrentUser(prev => ({
      ...prev,
      scheduleSlots: [...prev.scheduleSlots, tempSlot],
    }));

    apiFetch('/users/me/schedule/slots', {
      method: 'POST',
      body: JSON.stringify(slot),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        // Replace temp slot with real one from server
        setCurrentUser(prev => ({
          ...prev,
          scheduleSlots: prev.scheduleSlots.map(s => s.id === tempId ? data : s),
        }));
      })
      .catch(err => {
        console.error('addScheduleSlot failed', err);
        // Remove temp slot on failure
        setCurrentUser(prev => ({
          ...prev,
          scheduleSlots: prev.scheduleSlots.filter(s => s.id !== tempId),
        }));
      });
  }, []);

  const removeScheduleSlot = useCallback((id: string) => {
    let removed: ScheduleSlot | undefined;
    setCurrentUser(prev => {
      removed = prev.scheduleSlots.find(s => s.id === id);
      return { ...prev, scheduleSlots: prev.scheduleSlots.filter(s => s.id !== id) };
    });

    apiFetch(`/users/me/schedule/slots/${id}`, { method: 'DELETE' })
      .then(r => {
        if (!r.ok) throw new Error('delete failed');
      })
      .catch(err => {
        console.error('removeScheduleSlot failed', err);
        if (removed) {
          setCurrentUser(prev => ({
            ...prev,
            scheduleSlots: [...prev.scheduleSlots, removed!],
          }));
        }
      });
  }, []);

  const updateScheduleSlot = useCallback((id: string, update: Partial<ScheduleSlot>) => {
    // Optimistic patch
    setCurrentUser(prev => ({
      ...prev,
      scheduleSlots: prev.scheduleSlots.map(s => s.id === id ? { ...s, ...update } : s),
    }));

    apiFetch(`/users/me/schedule/slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setCurrentUser(prev => ({
            ...prev,
            scheduleSlots: prev.scheduleSlots.map(s => s.id === id ? data : s),
          }));
        }
      })
      .catch(err => console.error('updateScheduleSlot failed', err));
  }, []);

  const addException = useCallback((exc: Omit<ScheduleException, 'id'>) => {
    const tempId = `exc-tmp-${Date.now()}`;
    const tempExc: ScheduleException = { ...exc, id: tempId };

    // Optimistic add
    setCurrentUser(prev => ({
      ...prev,
      exceptions: [...prev.exceptions, tempExc],
    }));

    apiFetch('/users/me/schedule/exceptions', {
      method: 'POST',
      body: JSON.stringify(exc),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        setCurrentUser(prev => ({
          ...prev,
          exceptions: prev.exceptions.map(e => e.id === tempId ? data : e),
        }));
      })
      .catch(err => {
        console.error('addException failed', err);
        setCurrentUser(prev => ({
          ...prev,
          exceptions: prev.exceptions.filter(e => e.id !== tempId),
        }));
      });
  }, []);

  const removeException = useCallback((id: string) => {
    let removed: ScheduleException | undefined;
    setCurrentUser(prev => {
      removed = prev.exceptions.find(e => e.id === id);
      return { ...prev, exceptions: prev.exceptions.filter(e => e.id !== id) };
    });

    apiFetch(`/users/me/schedule/exceptions/${id}`, { method: 'DELETE' })
      .then(r => {
        if (!r.ok) throw new Error('delete failed');
      })
      .catch(err => {
        console.error('removeException failed', err);
        if (removed) {
          setCurrentUser(prev => ({
            ...prev,
            exceptions: [...prev.exceptions, removed!],
          }));
        }
      });
  }, []);

  const acceptFriendRequest = useCallback((requestId: string) => {
    // Optimistic: remove from requests list
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));

    apiFetch(`/friends/requests/${requestId}/accept`, { method: 'POST' })
      .then(r => r.ok ? apiFetch('/friends/') : Promise.reject(r))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setFriends(data);
      })
      .catch(err => {
        console.error('acceptFriendRequest failed', err);
        // Reload requests to restore accurate state
        apiFetch('/friends/requests').then(r => r.ok ? r.json() : null).then(data => {
          if (data) setFriendRequests(data);
        });
      });
  }, []);

  const declineFriendRequest = useCallback((requestId: string) => {
    const req = friendRequests.find(r => r.id === requestId);
    // Optimistic: remove from list
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));

    if (!req) return;
    apiFetch(`/friends/${req.fromUserId}`, { method: 'DELETE' })
      .catch(err => {
        console.error('declineFriendRequest failed', err);
        setFriendRequests(prev => [...prev, req]);
      });
  }, [friendRequests]);

  const toggleFriendFavorite = useCallback((friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;
    const next = !friend.isFavorite;

    // Optimistic update
    setFriends(prev =>
      prev.map(f => f.id === friendId ? { ...f, isFavorite: next } : f)
    );

    apiFetch(`/friends/${friendId}/favorite`, {
      method: 'PATCH',
      body: JSON.stringify({ isFavorite: next }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setFriends(prev =>
          prev.map(f => f.id === friendId ? { ...f, isFavorite: data.isFavorite } : f)
        );
      })
      .catch(err => {
        console.error('toggleFriendFavorite failed', err);
        setFriends(prev =>
          prev.map(f => f.id === friendId ? { ...f, isFavorite: !next } : f)
        );
      });
  }, [friends]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        friends,
        friendRequests,
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
        acceptFriendRequest,
        declineFriendRequest,
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
