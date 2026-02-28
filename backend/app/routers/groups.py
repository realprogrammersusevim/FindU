import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user_id
import aiosqlite
from app.db import get_db, compute_within_fences
from app.models.group import (
    Group,
    GroupMember,
    GroupRule,
    CreateGroupBody,
    ToggleAlertsBody,
    ReplaceRulesBody,
    UpdateMemberRoleBody,
)
from app.schedule_eval import compute_effective_mode

router = APIRouter()


async def _fetch_geofences(db):
    async with db.execute(
        "SELECT id, center_lat, center_lng, radius FROM geofences"
    ) as cur:
        return [dict(r) for r in await cur.fetchall()]


async def _build_group(db, group_row, fences: list, current_user_id: str) -> Group:
    gid = group_row["id"]

    # Members
    async with db.execute(
        """
        SELECT gm.role, gm.alerts_enabled, u.id, u.name, u.initials, u.avatar_color, u.lat, u.lng, u.current_mode, u.mode_updated_at
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
        WHERE gm.group_id = ?
        ORDER BY CASE gm.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, u.name
        """,
        (gid,),
    ) as cur:
        member_rows = await cur.fetchall()

    members = []
    is_joined = False
    my_role = "none"
    alerts_enabled = False

    for mr in member_rows:
        within = compute_within_fences(mr["lat"], mr["lng"], fences)

        # A user is considered "within geofence" if inside any group geofence
        async with db.execute(
            "SELECT geofence_id FROM group_geofences WHERE group_id = ?", (gid,)
        ) as cur2:
            gf_ids = [r["geofence_id"] for r in await cur2.fetchall()]

        in_fence = any(fid in within for fid in gf_ids)
        effective_mode = await compute_effective_mode(db, mr)
        is_online = effective_mode == "sharing" and mr["lat"] is not None

        members.append(
            GroupMember(
                userId=mr["id"],
                name=mr["name"],
                initials=mr["initials"],
                avatarColor=mr["avatar_color"],
                role=mr["role"],
                isOnline=is_online,
                withinGeofence=in_fence,
            )
        )

        if mr["id"] == current_user_id:
            is_joined = True
            my_role = mr["role"]
            alerts_enabled = bool(mr["alerts_enabled"])

    # Geofence IDs
    async with db.execute(
        "SELECT geofence_id FROM group_geofences WHERE group_id = ?", (gid,)
    ) as cur:
        geofence_ids = [r["geofence_id"] for r in await cur.fetchall()]

    # Rules
    async with db.execute(
        "SELECT * FROM group_rules WHERE group_id = ? ORDER BY rowid", (gid,)
    ) as cur:
        rule_rows = await cur.fetchall()
    rules = [
        GroupRule(
            id=r["id"],
            days=json.loads(r["days"]),
            startTime=r["start_time"],
            endTime=r["end_time"],
            locationMode=r["location_mode"],
            label=r["label"],
        )
        for r in rule_rows
    ]

    # Counts
    member_count = len(member_rows)
    active_count = sum(1 for m in members if m.isOnline)

    return Group(
        id=gid,
        name=group_row["name"],
        type=group_row["type"],
        emoji=group_row["emoji"],
        description=group_row["description"],
        color=group_row["color"],
        memberCount=member_count,
        activeCount=active_count,
        members=members,
        geofenceIds=geofence_ids,
        rules=rules,
        isJoined=is_joined,
        myRole=my_role,
        alertsEnabled=alerts_enabled,
    )


@router.get("/", response_model=list[Group])
async def list_groups(
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    fences = await _fetch_geofences(db)
    async with db.execute("SELECT * FROM groups ORDER BY name") as cur:
        group_rows = await cur.fetchall()
    return [await _build_group(db, row, fences, current_user_id) for row in group_rows]


@router.get("/{group_id}", response_model=Group)
async def get_group(
    group_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Group not found")
    fences = await _fetch_geofences(db)
    return await _build_group(db, row, fences, current_user_id)


@router.post("/", response_model=Group)
async def create_group(
    body: CreateGroupBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    group_id = f"group-{uuid.uuid4().hex[:8]}"
    await db.execute(
        "INSERT INTO groups VALUES (?,?,?,?,?,?,datetime('now'))",
        (group_id, body.name, body.type, body.emoji, body.description, body.color),
    )
    # Creator becomes admin member
    member_id = f"gm-{uuid.uuid4().hex[:8]}"
    await db.execute(
        "INSERT INTO group_members VALUES (?,?,?,'admin',1,datetime('now'))",
        (member_id, group_id, current_user_id),
    )
    await db.commit()
    async with db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)) as cur:
        row = await cur.fetchone()
    fences = await _fetch_geofences(db)
    return await _build_group(db, row, fences, current_user_id)


@router.post("/{group_id}/join")
async def join_group(
    group_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute("SELECT id FROM groups WHERE id = ?", (group_id,)) as cur:
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Group not found")
    member_id = f"gm-{uuid.uuid4().hex[:8]}"
    try:
        await db.execute(
            "INSERT INTO group_members VALUES (?,?,?,'member',1,datetime('now'))",
            (member_id, group_id, current_user_id),
        )
        await db.commit()
    except Exception:
        raise HTTPException(status_code=409, detail="Already a member")
    return {"ok": True}


@router.delete("/{group_id}/leave")
async def leave_group(
    group_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user_id),
    )
    await db.commit()
    return {"ok": True}


@router.patch("/{group_id}/alerts")
async def toggle_alerts(
    group_id: str,
    body: ToggleAlertsBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    await db.execute(
        "UPDATE group_members SET alerts_enabled = ? WHERE group_id = ? AND user_id = ?",
        (int(body.enabled), group_id, current_user_id),
    )
    await db.commit()
    return {"ok": True, "alertsEnabled": body.enabled}


@router.patch("/{group_id}/members/{user_id}/role")
async def update_member_role(
    group_id: str,
    user_id: str,
    body: UpdateMemberRoleBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user_id),
    ) as cur:
        row = await cur.fetchone()
    if not row or row["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    await db.execute(
        "UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?",
        (body.role, group_id, user_id),
    )
    await db.commit()
    return {"ok": True, "role": body.role}


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: str,
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user_id),
    ) as cur:
        row = await cur.fetchone()
    if not row or row["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    await db.execute(
        "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
        (group_id, user_id),
    )
    await db.commit()
    return {"ok": True}


@router.delete("/{group_id}")
async def disband_group(
    group_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    async with db.execute(
        "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user_id),
    ) as cur:
        row = await cur.fetchone()
    if not row or row["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    await db.execute("DELETE FROM group_rules WHERE group_id = ?", (group_id,))
    await db.execute("DELETE FROM group_geofences WHERE group_id = ?", (group_id,))
    await db.execute("DELETE FROM group_members WHERE group_id = ?", (group_id,))
    await db.execute("DELETE FROM groups WHERE id = ?", (group_id,))
    await db.commit()
    return {"ok": True}


@router.put("/{group_id}/rules", response_model=list[GroupRule])
async def replace_rules(
    group_id: str,
    body: ReplaceRulesBody,
    current_user_id: str = Depends(get_current_user_id),
    db: aiosqlite.Connection = Depends(get_db),
):
    # Check caller is admin
    async with db.execute(
        "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
        (group_id, current_user_id),
    ) as cur:
        row = await cur.fetchone()
    if not row or row["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    await db.execute("DELETE FROM group_rules WHERE group_id = ?", (group_id,))
    for rule in body.rules:
        rid = rule.id or f"rule-{uuid.uuid4().hex[:8]}"
        await db.execute(
            "INSERT INTO group_rules VALUES (?,?,?,?,?,?,?)",
            (
                rid,
                group_id,
                json.dumps(rule.days),
                rule.startTime,
                rule.endTime,
                rule.locationMode,
                rule.label,
            ),
        )
    await db.commit()
    return body.rules
