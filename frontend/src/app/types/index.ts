export interface LatLng {
  lat: number;
  lng: number;
}

export type LocationMode = "exact" | "binary";
export type PrivacyMode = "sharing" | "private";
export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type GroupType = "greek" | "club" | "class" | "sports" | "custom";
export type ShareStatus = "sharing" | "private" | "offline";

export interface Geofence {
  id: string;
  name: string;
  center: LatLng;
  radius: number;
  color: string;
  icon: string;
  description: string;
}

export interface FriendLocation {
  position: LatLng;
  withinFences: string[];
  mode: LocationMode;
  lastUpdated: string;
}

export interface Friend {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  major: string;
  year: string;
  shareStatus: ShareStatus;
  location: FriendLocation | null;
  isFavorite: boolean;
  mutualFriends: number;
}

export interface GroupMember {
  userId: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: "admin" | "moderator" | "member";
  isOnline: boolean;
  withinGeofence: boolean;
}

export interface GroupRule {
  id: string;
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
  locationMode: LocationMode;
  label: string;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  emoji: string;
  description: string;
  color: string;
  memberCount: number;
  activeCount: number;
  members: GroupMember[];
  geofenceIds: string[];
  rules: GroupRule[];
  isJoined: boolean;
  myRole: "admin" | "moderator" | "member" | "none";
  alertsEnabled: boolean;
}

export interface ScheduleSlot {
  id: string;
  days: DayOfWeek[];
  startTime: string;
  endTime: string;
  mode: PrivacyMode;
  label: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface ScheduleException {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: PrivacyMode;
  note: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  major: string;
  year: string;
  bio: string;
  position: LatLng;
  currentMode: PrivacyMode;
  locationMode: LocationMode;
  activeGeofenceIds: string[];
  scheduleSlots: ScheduleSlot[];
  exceptions: ScheduleException[];
  friendCount: number;
  groupCount: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromName: string;
  fromInitials: string;
  fromAvatarColor: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type:
    | "entered_fence"
    | "left_fence"
    | "friend_request"
    | "group_invite"
    | "alert";
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface UserSearchResult {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  major?: string;
  year?: string;
}
