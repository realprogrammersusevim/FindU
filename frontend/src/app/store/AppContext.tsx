import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
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
  GroupType,
  UserSearchResult,
} from "../types";
import { apiFetch } from "../api";

const DEFAULT_USER: CurrentUser = {
  id: "",
  name: "",
  initials: "",
  avatarColor: "#6366F1",
  major: "",
  year: "",
  bio: "",
  position: { lat: 40.8207, lng: -96.7005 }, // Default to UNL Campus
  currentMode: "sharing",
  locationMode: "exact",
  activeGeofenceIds: [],
  scheduleSlots: [],
  exceptions: [],
  friendCount: 0,
  groupCount: 0,
};

export type LocationStatus =
  | "idle"
  | "acquiring"
  | "active"
  | "denied"
  | "unavailable"
  | "insecure";

interface AppContextType {
  profileLoaded: boolean;
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
  addScheduleSlot: (slot: Omit<ScheduleSlot, "id">) => void;
  removeScheduleSlot: (id: string) => void;
  updateScheduleSlot: (id: string, slot: Partial<ScheduleSlot>) => void;
  addException: (exc: Omit<ScheduleException, "id">) => void;
  removeException: (id: string) => void;
  toggleFriendFavorite: (friendId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  searchUsers: (q: string) => Promise<UserSearchResult[]>;
  sendFriendRequest: (userId: string) => Promise<void>;
  createGroup: (data: {
    name: string;
    type: GroupType;
    emoji?: string;
    description?: string;
    color?: string;
  }) => Promise<void>;
  updateProfile: (data: {
    name?: string;
    bio?: string;
    major?: string;
    year?: string;
  }) => Promise<void>;
  updateMemberRole: (
    groupId: string,
    userId: string,
    role: "admin" | "moderator" | "member"
  ) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  disbandGroup: (groupId: string) => Promise<void>;
  locationStatus: LocationStatus;
}

const AppContext = createContext<AppContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _mapProfile(data: any): Partial<CurrentUser> {
  return {
    id: data.id,
    name: data.name,
    initials: data.initials,
    avatarColor: data.avatarColor,
    major: data.major ?? "",
    year: data.year ?? "",
    bio: data.bio ?? "",
    position: data.position ?? DEFAULT_USER.position,
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
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? "s" : ""} ago`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token")
  );
  const isAuthenticated = !!authToken;

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadAll = useCallback(async () => {
    const [
      profileRes,
      schedRes,
      friendsRes,
      requestsRes,
      groupsRes,
      fencesRes,
      notifRes,
    ] = await Promise.all([
      apiFetch("/users/me"),
      apiFetch("/users/me/schedule"),
      apiFetch("/friends/"),
      apiFetch("/friends/requests"),
      apiFetch("/groups/"),
      apiFetch("/geofences/"),
      apiFetch("/notifications/"),
    ]);

    if (profileRes.ok) {
      const data = await profileRes.json();
      setCurrentUser((prev) => ({ ...prev, ..._mapProfile(data) }));
      setProfileLoaded(true);
    }
    if (schedRes.ok) {
      const { slots, exceptions } = await schedRes.json();
      setCurrentUser((prev) => ({ ...prev, scheduleSlots: slots, exceptions }));
    }
    if (friendsRes.ok) setFriends(await friendsRes.json());
    if (requestsRes.ok) setFriendRequests(await requestsRes.json());
    if (groupsRes.ok) setGroups(await groupsRes.json());
    if (fencesRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await fencesRes.json();
      setGeofences(
        data.map((f) => ({
          ...f,
          center: { lat: f.center.lat, lng: f.center.lng },
        }))
      );
    }
    if (notifRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await notifRes.json();
      setNotifications(
        data.map((n) => ({ ...n, timestamp: formatRelativeTime(n.timestamp) }))
      );
    }
  }, []);

  // Hydrate all state from backend when a token already exists
  useEffect(() => {
    if (!authToken) return;
    loadAll().catch(() => {
      /* ignore network errors on startup */
    });
  }, []); // run once on mount

  // Poll friend locations every 15 s so locationMode/position changes propagate
  useEffect(() => {
    if (!authToken) return;
    const id = setInterval(async () => {
      const res = await apiFetch("/friends/");
      if (res.ok) setFriends(await res.json());
    }, 15_000);
    return () => clearInterval(id);
  }, [authToken]);

  // GPS tracking state
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const watchIdRef = useRef<number | null>(null);
  const backendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstFixRef = useRef(true);

  useEffect(() => {
    // Stop watching if logged out
    if (!authToken) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLocationStatus("idle");
      return;
    }

    if (!window.isSecureContext) {
      // Geolocation requires HTTPS (or localhost). Accessing via http://IP will
      // always fail on modern browsers / iOS Safari regardless of permissions.
      setLocationStatus("insecure");
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    if (currentUser.currentMode !== "sharing") {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLocationStatus("idle");
      return;
    }

    // Already watching — don't register a second watcher
    if (watchIdRef.current !== null) return;

    setLocationStatus("acquiring");
    isFirstFixRef.current = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;

        setLocationStatus("active");
        setCurrentUser((prev) => ({ ...prev, position: { lat, lng } }));

        // Write first fix immediately; debounce subsequent ones to ~5 s
        if (isFirstFixRef.current) {
          isFirstFixRef.current = false;
          apiFetch("/users/me/location", {
            method: "PATCH",
            body: JSON.stringify({ lat, lng }),
          }).catch(() => {});
        } else {
          if (backendDebounceRef.current)
            clearTimeout(backendDebounceRef.current);
          backendDebounceRef.current = setTimeout(() => {
            apiFetch("/users/me/location", {
              method: "PATCH",
              body: JSON.stringify({ lat, lng }),
            }).catch(() => {});
          }, 5_000);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus("denied");
        } else {
          setLocationStatus("unavailable");
        }
        console.warn("Geolocation error:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (backendDebounceRef.current) clearTimeout(backendDebounceRef.current);
    };
  }, [authToken, currentUser.currentMode]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await apiFetch("/users/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Invalid email or password");
      }
      const { access_token } = await res.json();
      localStorage.setItem("auth_token", access_token);
      setAuthToken(access_token);
      await loadAll();
    },
    [loadAll]
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      const res = await apiFetch("/users/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Registration failed");
      }
      const { access_token } = await res.json();
      localStorage.setItem("auth_token", access_token);
      setAuthToken(access_token);
      await loadAll();
    },
    [loadAll]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setAuthToken(null);
    setFriends([]);
    setFriendRequests([]);
    setGroups([]);
    setNotifications([]);
    setCurrentUser(DEFAULT_USER);
  }, []);

  const togglePrivacyMode = useCallback(() => {
    const next = currentUser.currentMode === "sharing" ? "private" : "sharing";
    setCurrentUser((prev) => ({ ...prev, currentMode: next }));
    apiFetch("/users/me/privacy-mode", {
      method: "PATCH",
      body: JSON.stringify({ mode: next }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setCurrentUser((prev) => ({
            ...prev,
            currentMode: data.currentMode,
          }));
      })
      .catch((err) => {
        console.error("togglePrivacyMode failed", err);
        setCurrentUser((prev) => ({
          ...prev,
          currentMode: prev.currentMode === "sharing" ? "private" : "sharing",
        }));
      });
  }, [currentUser.currentMode]);

  const setPrivacyMode = useCallback((mode: PrivacyMode) => {
    setCurrentUser((prev) => ({ ...prev, currentMode: mode }));
    apiFetch("/users/me/privacy-mode", {
      method: "PATCH",
      body: JSON.stringify({ mode }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setCurrentUser((prev) => ({
            ...prev,
            currentMode: data.currentMode,
          }));
      })
      .catch((err) => console.error("setPrivacyMode failed", err));
  }, []);

  const setLocationMode = useCallback((mode: LocationMode) => {
    setCurrentUser((prev) => ({ ...prev, locationMode: mode }));
    apiFetch("/users/me/location-mode", {
      method: "PATCH",
      body: JSON.stringify({ mode }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setCurrentUser((prev) => ({
            ...prev,
            locationMode: data.locationMode,
          }));
      })
      .catch((err) => console.error("setLocationMode failed", err));
  }, []);

  const toggleGroupJoin = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      const wasJoined = group.isJoined;

      // Optimistic update
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                isJoined: !wasJoined,
                myRole: wasJoined ? "none" : "member",
              }
            : g
        )
      );

      const req = wasJoined
        ? apiFetch(`/groups/${groupId}/leave`, { method: "DELETE" })
        : apiFetch(`/groups/${groupId}/join`, { method: "POST" });

      req
        .then((r) => (r.ok ? apiFetch(`/groups/${groupId}`) : null))
        .then((r) => (r?.ok ? r.json() : null))
        .then((data) => {
          if (data)
            setGroups((prev) => prev.map((g) => (g.id === groupId ? data : g)));
        })
        .catch((err) => {
          console.error("toggleGroupJoin failed", err);
          // Revert optimistic update
          setGroups((prev) => prev.map((g) => (g.id === groupId ? group : g)));
        });
    },
    [groups]
  );

  const toggleGroupAlerts = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      const next = !group.alertsEnabled;

      // Optimistic update
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, alertsEnabled: next } : g))
      );

      apiFetch(`/groups/${groupId}/alerts`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data)
            setGroups((prev) =>
              prev.map((g) =>
                g.id === groupId
                  ? { ...g, alertsEnabled: data.alertsEnabled }
                  : g
              )
            );
        })
        .catch((err) => {
          console.error("toggleGroupAlerts failed", err);
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId ? { ...g, alertsEnabled: !next } : g
            )
          );
        });
    },
    [groups]
  );

  const updateGroupRules = useCallback(
    (groupId: string, rules: GroupRule[]) => {
      // Optimistic update
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, rules } : g))
      );

      apiFetch(`/groups/${groupId}/rules`, {
        method: "PUT",
        body: JSON.stringify({ rules }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data)
            setGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, rules: data } : g))
            );
        })
        .catch((err) => console.error("updateGroupRules failed", err));
    },
    []
  );

  const markNotificationsRead = useCallback(() => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    apiFetch("/notifications/read", {
      method: "POST",
      body: JSON.stringify({ ids: null }),
    }).catch((err) => console.error("markNotificationsRead failed", err));
  }, []);

  const addScheduleSlot = useCallback((slot: Omit<ScheduleSlot, "id">) => {
    const tempId = `slot-tmp-${Date.now()}`;
    const tempSlot: ScheduleSlot = { ...slot, id: tempId };

    // Optimistic add
    setCurrentUser((prev) => ({
      ...prev,
      scheduleSlots: [...prev.scheduleSlots, tempSlot],
    }));

    apiFetch("/users/me/schedule/slots", {
      method: "POST",
      body: JSON.stringify(slot),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        // Replace temp slot with real one from server
        setCurrentUser((prev) => ({
          ...prev,
          scheduleSlots: prev.scheduleSlots.map((s) =>
            s.id === tempId ? data : s
          ),
        }));
      })
      .catch((err) => {
        console.error("addScheduleSlot failed", err);
        // Remove temp slot on failure
        setCurrentUser((prev) => ({
          ...prev,
          scheduleSlots: prev.scheduleSlots.filter((s) => s.id !== tempId),
        }));
      });
  }, []);

  const removeScheduleSlot = useCallback((id: string) => {
    let removed: ScheduleSlot | undefined;
    setCurrentUser((prev) => {
      removed = prev.scheduleSlots.find((s) => s.id === id);
      return {
        ...prev,
        scheduleSlots: prev.scheduleSlots.filter((s) => s.id !== id),
      };
    });

    apiFetch(`/users/me/schedule/slots/${id}`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok) throw new Error("delete failed");
      })
      .catch((err) => {
        console.error("removeScheduleSlot failed", err);
        if (removed) {
          setCurrentUser((prev) => ({
            ...prev,
            scheduleSlots: [...prev.scheduleSlots, removed!],
          }));
        }
      });
  }, []);

  const updateScheduleSlot = useCallback(
    (id: string, update: Partial<ScheduleSlot>) => {
      // Optimistic patch
      setCurrentUser((prev) => ({
        ...prev,
        scheduleSlots: prev.scheduleSlots.map((s) =>
          s.id === id ? { ...s, ...update } : s
        ),
      }));

      apiFetch(`/users/me/schedule/slots/${id}`, {
        method: "PUT",
        body: JSON.stringify(update),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setCurrentUser((prev) => ({
              ...prev,
              scheduleSlots: prev.scheduleSlots.map((s) =>
                s.id === id ? data : s
              ),
            }));
          }
        })
        .catch((err) => console.error("updateScheduleSlot failed", err));
    },
    []
  );

  const addException = useCallback((exc: Omit<ScheduleException, "id">) => {
    const tempId = `exc-tmp-${Date.now()}`;
    const tempExc: ScheduleException = { ...exc, id: tempId };

    // Optimistic add
    setCurrentUser((prev) => ({
      ...prev,
      exceptions: [...prev.exceptions, tempExc],
    }));

    apiFetch("/users/me/schedule/exceptions", {
      method: "POST",
      body: JSON.stringify(exc),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        setCurrentUser((prev) => ({
          ...prev,
          exceptions: prev.exceptions.map((e) => (e.id === tempId ? data : e)),
        }));
      })
      .catch((err) => {
        console.error("addException failed", err);
        setCurrentUser((prev) => ({
          ...prev,
          exceptions: prev.exceptions.filter((e) => e.id !== tempId),
        }));
      });
  }, []);

  const removeException = useCallback((id: string) => {
    let removed: ScheduleException | undefined;
    setCurrentUser((prev) => {
      removed = prev.exceptions.find((e) => e.id === id);
      return {
        ...prev,
        exceptions: prev.exceptions.filter((e) => e.id !== id),
      };
    });

    apiFetch(`/users/me/schedule/exceptions/${id}`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok) throw new Error("delete failed");
      })
      .catch((err) => {
        console.error("removeException failed", err);
        if (removed) {
          setCurrentUser((prev) => ({
            ...prev,
            exceptions: [...prev.exceptions, removed!],
          }));
        }
      });
  }, []);

  const acceptFriendRequest = useCallback((requestId: string) => {
    // Optimistic: remove from requests list
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));

    apiFetch(`/friends/requests/${requestId}/accept`, { method: "POST" })
      .then((r) => (r.ok ? apiFetch("/friends/") : Promise.reject(r)))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFriends(data);
      })
      .catch((err) => {
        console.error("acceptFriendRequest failed", err);
        // Reload requests to restore accurate state
        apiFetch("/friends/requests")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data) setFriendRequests(data);
          });
      });
  }, []);

  const declineFriendRequest = useCallback(
    (requestId: string) => {
      const req = friendRequests.find((r) => r.id === requestId);
      // Optimistic: remove from list
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));

      if (!req) return;
      apiFetch(`/friends/${req.fromUserId}`, { method: "DELETE" }).catch(
        (err) => {
          console.error("declineFriendRequest failed", err);
          setFriendRequests((prev) => [...prev, req]);
        }
      );
    },
    [friendRequests]
  );

  const searchUsers = useCallback(
    async (q: string): Promise<UserSearchResult[]> => {
      const res = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      return res.json();
    },
    []
  );

  const sendFriendRequest = useCallback(
    async (userId: string): Promise<void> => {
      const res = await apiFetch("/friends/requests", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to send friend request");
      }
    },
    []
  );

  const createGroup = useCallback(
    async (data: {
      name: string;
      type: GroupType;
      emoji?: string;
      description?: string;
      color?: string;
    }): Promise<void> => {
      const res = await apiFetch("/groups/", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Failed to create group");
      }
      const newGroup: Group = await res.json();
      setGroups((prev) => [newGroup, ...prev]);
    },
    []
  );

  const updateProfile = useCallback(
    async (data: {
      name?: string;
      bio?: string;
      major?: string;
      year?: string;
    }): Promise<void> => {
      const res = await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Failed to update profile");
      }
      const updated = await res.json();
      setCurrentUser((prev) => ({ ...prev, ..._mapProfile(updated) }));
    },
    []
  );

  const updateMemberRole = useCallback(
    async (
      groupId: string,
      userId: string,
      role: "admin" | "moderator" | "member"
    ): Promise<void> => {
      // Optimistic update
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                members: g.members.map((m) =>
                  m.userId === userId ? { ...m, role } : m
                ),
              }
            : g
        )
      );
      const res = await apiFetch(`/groups/${groupId}/members/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        // Revert by reloading group
        apiFetch(`/groups/${groupId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data)
              setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? data : g))
              );
          });
      }
    },
    []
  );

  const removeMember = useCallback(
    async (groupId: string, userId: string): Promise<void> => {
      // Optimistic update
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                members: g.members.filter((m) => m.userId !== userId),
                memberCount: g.memberCount - 1,
              }
            : g
        )
      );
      const res = await apiFetch(`/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Revert
        apiFetch(`/groups/${groupId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data)
              setGroups((prev) =>
                prev.map((g) => (g.id === groupId ? data : g))
              );
          });
      }
    },
    []
  );

  const disbandGroup = useCallback(async (groupId: string): Promise<void> => {
    const res = await apiFetch(`/groups/${groupId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? "Failed to disband group");
    }
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const toggleFriendFavorite = useCallback(
    (friendId: string) => {
      const friend = friends.find((f) => f.id === friendId);
      if (!friend) return;
      const next = !friend.isFavorite;

      // Optimistic update
      setFriends((prev) =>
        prev.map((f) => (f.id === friendId ? { ...f, isFavorite: next } : f))
      );

      apiFetch(`/friends/${friendId}/favorite`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: next }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data)
            setFriends((prev) =>
              prev.map((f) =>
                f.id === friendId ? { ...f, isFavorite: data.isFavorite } : f
              )
            );
        })
        .catch((err) => {
          console.error("toggleFriendFavorite failed", err);
          setFriends((prev) =>
            prev.map((f) =>
              f.id === friendId ? { ...f, isFavorite: !next } : f
            )
          );
        });
    },
    [friends]
  );

  return (
    <AppContext.Provider
      value={{
        profileLoaded,
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
        searchUsers,
        sendFriendRequest,
        createGroup,
        updateProfile,
        updateMemberRole,
        removeMember,
        disbandGroup,
        locationStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
