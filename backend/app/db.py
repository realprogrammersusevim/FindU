import math
import aiosqlite

DB_PATH = "findu.db"


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    initials        TEXT NOT NULL,
    avatar_color    TEXT NOT NULL,
    major           TEXT,
    year            TEXT,
    bio             TEXT,
    lat             REAL,
    lng             REAL,
    current_mode    TEXT DEFAULT 'sharing',
    location_mode   TEXT DEFAULT 'exact',
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS friendships (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    friend_id   TEXT NOT NULL REFERENCES users(id),
    status      TEXT DEFAULT 'accepted',
    is_favorite INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS geofences (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    center_lat  REAL NOT NULL,
    center_lng  REAL NOT NULL,
    radius      REAL NOT NULL,
    color       TEXT NOT NULL,
    icon        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS groups (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    emoji       TEXT,
    description TEXT,
    color       TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
    id              TEXT PRIMARY KEY,
    group_id        TEXT NOT NULL REFERENCES groups(id),
    user_id         TEXT NOT NULL REFERENCES users(id),
    role            TEXT DEFAULT 'member',
    alerts_enabled  INTEGER DEFAULT 1,
    joined_at       TEXT DEFAULT (datetime('now')),
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_geofences (
    group_id    TEXT NOT NULL REFERENCES groups(id),
    geofence_id TEXT NOT NULL REFERENCES geofences(id),
    PRIMARY KEY (group_id, geofence_id)
);

CREATE TABLE IF NOT EXISTS group_rules (
    id            TEXT PRIMARY KEY,
    group_id      TEXT NOT NULL REFERENCES groups(id),
    days          TEXT NOT NULL,
    start_time    TEXT NOT NULL,
    end_time      TEXT NOT NULL,
    location_mode TEXT NOT NULL,
    label         TEXT
);

CREATE TABLE IF NOT EXISTS schedule_slots (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    days       TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    mode       TEXT NOT NULL,
    label      TEXT,
    is_default INTEGER DEFAULT 0,
    is_active  INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS schedule_exceptions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    date       TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    mode       TEXT NOT NULL,
    note       TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL REFERENCES users(id),
    type      TEXT NOT NULL,
    message   TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    is_read   INTEGER DEFAULT 0
);
"""


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def _point_in_circle(lat: float, lng: float, center_lat: float, center_lng: float, radius_m: float) -> bool:
    """Haversine distance check."""
    R = 6_371_000
    phi1 = math.radians(lat)
    phi2 = math.radians(center_lat)
    dphi = math.radians(center_lat - lat)
    dlam = math.radians(center_lng - lng)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)) <= radius_m


SEED_GEOFENCES = [
    ("fence-campus",    "Main Campus",          40.7282, -73.7949, 560,  "#6366F1", "🎓", "Westbrook University main campus boundary"),
    ("fence-north-dorm","North Dorm Complex",   40.7322, -73.7968, 160,  "#8B5CF6", "🏠", "North residential dormitory complex"),
    ("fence-library",   "University Library",   40.7268, -73.7960,  95,  "#EC4899", "📚", "Main university library building"),
    ("fence-athletic",  "Athletic Center",      40.7297, -73.7926, 115,  "#F59E0B", "🏋️", "Athletic and recreation center"),
]

SEED_USERS = [
    # (id, name, initials, avatar_color, major, year, bio, lat, lng, current_mode, location_mode)
    ("me",        "Alex Chen",     "AC", "#6366F1", "Computer Science",       "Junior",    "CS student at Westbrook University. Passionate about algorithms, coffee, and weekend soccer.", 40.7280, -73.7948, "sharing", "exact"),
    ("friend-1",  "Sarah Kim",     "SK", "#EC4899", "Computer Science",       "Junior",    None, 40.7278, -73.7942, "sharing", "exact"),
    ("friend-2",  "Jake Williams", "JW", "#3B82F6", "Mechanical Engineering", "Senior",    None, 40.7293, -73.7924, "sharing", "binary"),
    ("friend-3",  "Maya Patel",    "MP", "#10B981", "Biology",                "Sophomore", None, None,    None,     "private", "exact"),
    ("friend-4",  "Tyler Johnson", "TJ", "#F97316", "Psychology",             "Senior",    None, 40.7320, -73.7966, "sharing", "exact"),
    ("friend-5",  "Emma Davis",    "ED", "#8B5CF6", "Mathematics",            "Junior",    None, 40.7265, -73.7962, "sharing", "exact"),
    ("friend-6",  "Chris Park",    "CP", "#6B7280", "Fine Arts",              "Freshman",  None, None,    None,     "private", "exact"),
    ("friend-7",  "Lily Chen",     "LC", "#14B8A6", "Pre-Med",                "Sophomore", None, 40.7285, -73.7972, "sharing", "binary"),
]

SEED_FRIENDSHIPS = [
    # (id, user_id, friend_id, is_favorite)
    ("fs-me-1", "me", "friend-1", 1),
    ("fs-me-2", "me", "friend-2", 1),
    ("fs-me-3", "me", "friend-3", 0),
    ("fs-me-4", "me", "friend-4", 0),
    ("fs-me-5", "me", "friend-5", 1),
    ("fs-me-6", "me", "friend-6", 0),
    ("fs-me-7", "me", "friend-7", 0),
]

SEED_GROUPS = [
    ("group-1", "Alpha Phi Omega", "greek",  "🏛️", "National co-ed service fraternity. Weekly meetings, community service and campus events.", "#6366F1"),
    ("group-2", "Women in STEM",   "club",   "🔬", "Supporting and empowering women in science, technology, engineering, and mathematics.",      "#EC4899"),
    ("group-3", "Soccer Club",     "sports", "⚽", "Casual and competitive soccer for all skill levels. Practice 3x weekly at the athletic center.", "#10B981"),
    ("group-4", "CS 301 Study Group", "class","💻","Study group for Algorithm Design and Analysis. Meets in the library on study nights.",       "#F59E0B"),
    ("group-5", "Photography Club","club",   "📷", "Explore campus and beyond with your camera. All skill levels welcome.",                       "#8B5CF6"),
    ("group-6", "Delta Sigma Pi",  "greek",  "🔱", "Professional business fraternity fostering leadership and community involvement.",             "#0EA5E9"),
]

SEED_GROUP_MEMBERS = [
    # (id, group_id, user_id, role, alerts_enabled)
    ("gm-1-me",  "group-1", "me",       "admin",     1),
    ("gm-1-1",   "group-1", "friend-1", "member",    1),
    ("gm-1-2",   "group-1", "friend-2", "moderator", 1),
    ("gm-1-5",   "group-1", "friend-5", "member",    1),
    ("gm-1-7",   "group-1", "friend-7", "member",    1),

    ("gm-2-me",  "group-2", "me",       "member",    1),
    ("gm-2-1",   "group-2", "friend-1", "admin",     1),
    ("gm-2-3",   "group-2", "friend-3", "member",    1),
    ("gm-2-5",   "group-2", "friend-5", "moderator", 1),
    ("gm-2-7",   "group-2", "friend-7", "member",    1),

    ("gm-3-2",   "group-3", "friend-2", "admin",     1),
    ("gm-3-me",  "group-3", "me",       "member",    0),
    ("gm-3-4",   "group-3", "friend-4", "member",    0),
    ("gm-3-6",   "group-3", "friend-6", "member",    0),

    ("gm-4-me",  "group-4", "me",       "admin",     1),
    ("gm-4-1",   "group-4", "friend-1", "member",    1),
    ("gm-4-5",   "group-4", "friend-5", "member",    1),
    ("gm-4-3",   "group-4", "friend-3", "member",    1),
]

SEED_GROUP_GEOFENCES = [
    ("group-1", "fence-campus"),
    ("group-2", "fence-campus"), ("group-2", "fence-library"),
    ("group-3", "fence-campus"), ("group-3", "fence-athletic"),
    ("group-4", "fence-library"),
    ("group-5", "fence-campus"),
    ("group-6", "fence-campus"),
]

SEED_GROUP_RULES = [
    # (id, group_id, days_json, start, end, location_mode, label)
    ("rule-1", "group-1", '["Mon","Wed","Fri"]', "09:00", "21:00", "exact",  "Chapter Meeting Hours"),
    ("rule-2", "group-1", '["Sat","Sun"]',        "10:00", "18:00", "binary", "Weekend Events"),
    ("rule-3", "group-2", '["Tue","Thu"]',         "16:00", "19:00", "exact",  "Meeting Hours"),
    ("rule-4", "group-3", '["Mon","Wed","Fri"]',   "15:00", "17:30", "exact",  "Practice Hours"),
    ("rule-5", "group-4", '["Sun","Tue","Thu"]',   "18:00", "22:00", "binary", "Study Sessions"),
    ("rule-6", "group-5", '["Sat"]',               "09:00", "15:00", "binary", "Saturday Photo Walks"),
    ("rule-7", "group-6", '["Tue","Thu"]',          "18:00", "22:00", "exact",  "Chapter Hours"),
]

SEED_SCHEDULE_SLOTS = [
    # (id, user_id, days_json, start, end, mode, label, is_default, is_active)
    ("slot-1", "me", '["Mon","Tue","Wed","Thu","Fri"]', "08:00", "22:00", "sharing", "Weekday Active",  1, 1),
    ("slot-2", "me", '["Sat","Sun"]',                   "10:00", "20:00", "sharing", "Weekend Active",  1, 1),
    ("slot-3", "me", '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]', "22:00", "08:00", "private", "Night Privacy", 1, 1),
]

SEED_SCHEDULE_EXCEPTIONS = [
    # (id, user_id, date, start, end, mode, note)
    ("exc-1", "me", "2026-03-01", "20:00", "23:59", "sharing", "Greek life mixer event — staying visible"),
]

SEED_NOTIFICATIONS = [
    # (id, user_id, type, message, timestamp, is_read)
    ("notif-1", "me", "entered_fence", "Sarah Kim entered Main Campus",        "2026-02-28 10:58:00", 0),
    ("notif-2", "me", "entered_fence", "Jake Williams entered Athletic Center", "2026-02-28 10:55:00", 0),
    ("notif-3", "me", "group_invite",  "You've been invited to join Film Society", "2026-02-28 09:00:00", 1),
    ("notif-4", "me", "left_fence",    "Tyler Johnson left the Library",        "2026-02-28 08:00:00", 1),
    ("notif-5", "me", "entered_fence", "Emma Davis entered University Library", "2026-02-28 07:00:00", 1),
]


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.executescript(SCHEMA)
        await db.commit()

        # Only seed if empty
        async with db.execute("SELECT COUNT(*) FROM users") as cur:
            row = await cur.fetchone()
            if row[0] > 0:
                return

        await db.executemany(
            "INSERT INTO geofences VALUES (?,?,?,?,?,?,?,?)",
            SEED_GEOFENCES,
        )
        await db.executemany(
            "INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))",
            SEED_USERS,
        )
        await db.executemany(
            "INSERT INTO friendships VALUES (?,?,?,'accepted',?,datetime('now'))",
            SEED_FRIENDSHIPS,
        )
        await db.executemany(
            "INSERT INTO groups VALUES (?,?,?,?,?,?,datetime('now'))",
            SEED_GROUPS,
        )
        await db.executemany(
            "INSERT INTO group_members VALUES (?,?,?,?,?,datetime('now'))",
            SEED_GROUP_MEMBERS,
        )
        await db.executemany(
            "INSERT INTO group_geofences VALUES (?,?)",
            SEED_GROUP_GEOFENCES,
        )
        await db.executemany(
            "INSERT INTO group_rules VALUES (?,?,?,?,?,?,?)",
            SEED_GROUP_RULES,
        )
        await db.executemany(
            "INSERT INTO schedule_slots VALUES (?,?,?,?,?,?,?,?,?)",
            SEED_SCHEDULE_SLOTS,
        )
        await db.executemany(
            "INSERT INTO schedule_exceptions VALUES (?,?,?,?,?,?,?)",
            SEED_SCHEDULE_EXCEPTIONS,
        )
        await db.executemany(
            "INSERT INTO notifications VALUES (?,?,?,?,?,?)",
            SEED_NOTIFICATIONS,
        )
        await db.commit()


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def compute_within_fences(lat: float | None, lng: float | None, all_fences: list) -> list[str]:
    """Return list of geofence IDs the point falls inside."""
    if lat is None or lng is None:
        return []
    return [
        f["id"] for f in all_fences
        if _point_in_circle(lat, lng, f["center_lat"], f["center_lng"], f["radius"])
    ]
