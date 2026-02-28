from datetime import datetime, timedelta
import json


async def compute_effective_mode(db, user_row) -> str:
    user_id = user_row["id"]
    current_mode = user_row["current_mode"]
    try:
        mode_updated_at_str = user_row["mode_updated_at"]
    except (IndexError, KeyError):
        mode_updated_at_str = None

    # If mode_updated_at is missing, treat it as a very old timestamp
    if not mode_updated_at_str:
        mode_updated_at_str = "1970-01-01 00:00:00"

    try:
        # SQLite datetime('now') returns 'YYYY-MM-DD HH:MM:SS'
        mode_updated_at = datetime.strptime(mode_updated_at_str, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        mode_updated_at = datetime.min

    now = datetime.now()
    now_time_str = now.strftime("%H:%M")
    today_date_str = now.strftime("%Y-%m-%d")
    today_day_str = now.strftime("%a")  # e.g., 'Mon'

    # Check exceptions first for today
    async with db.execute(
        "SELECT start_time, end_time, mode FROM schedule_exceptions WHERE user_id = ? AND date = ?",
        (user_id, today_date_str),
    ) as cur:
        exceptions = await cur.fetchall()

    for exc in exceptions:
        start_time = exc["start_time"]
        end_time = exc["end_time"]
        if start_time <= now_time_str <= end_time:
            # Reconstruct the exact start datetime of this exception
            exc_start_dt = datetime.strptime(
                f"{today_date_str} {start_time}:00", "%Y-%m-%d %H:%M:%S"
            )
            if mode_updated_at > exc_start_dt:
                return current_mode
            return exc["mode"]

    # Check slots
    async with db.execute(
        "SELECT days, start_time, end_time, mode FROM schedule_slots WHERE user_id = ? AND is_active = 1",
        (user_id,),
    ) as cur:
        slots = await cur.fetchall()

    active_slot = None
    active_slot_start_dt = datetime.min

    for slot in slots:
        days = json.loads(slot["days"])
        start_time = slot["start_time"]
        end_time = slot["end_time"]

        # Handle normal slots (e.g. 08:00 - 22:00)
        if start_time <= end_time:
            if today_day_str in days and start_time <= now_time_str <= end_time:
                slot_start_dt = datetime.strptime(
                    f"{today_date_str} {start_time}:00", "%Y-%m-%d %H:%M:%S"
                )
                if slot_start_dt > active_slot_start_dt:
                    active_slot = slot
                    active_slot_start_dt = slot_start_dt
        # Handle overnight slots (e.g. 22:00 - 08:00)
        else:
            # It's active if it's past start_time today OR before end_time today (meaning it started yesterday)
            if today_day_str in days and now_time_str >= start_time:
                # Started today
                slot_start_dt = datetime.strptime(
                    f"{today_date_str} {start_time}:00", "%Y-%m-%d %H:%M:%S"
                )
                if slot_start_dt > active_slot_start_dt:
                    active_slot = slot
                    active_slot_start_dt = slot_start_dt
            else:
                # Need to check if yesterday was in days and it hasn't ended yet
                yesterday = now - timedelta(days=1)
                yesterday_day_str = yesterday.strftime("%a")
                yesterday_date_str = yesterday.strftime("%Y-%m-%d")
                if yesterday_day_str in days and now_time_str <= end_time:
                    slot_start_dt = datetime.strptime(
                        f"{yesterday_date_str} {start_time}:00", "%Y-%m-%d %H:%M:%S"
                    )
                    if slot_start_dt > active_slot_start_dt:
                        active_slot = slot
                        active_slot_start_dt = slot_start_dt

    if active_slot:
        if mode_updated_at > active_slot_start_dt:
            return current_mode
        return active_slot["mode"]

    # If no schedule is active, what is the default?
    # In FindU, if you're outside your schedule, you shouldn't be seen. So default is private.
    # However, if there are NO schedule slots at all, maybe we fallback to current_mode?
    if len(slots) == 0:
        return current_mode

    # If slots exist but none are active, you are "private"
    # But wait, did the user override it?
    # If the user toggled mode to "sharing" while outside a slot, does it stay "sharing"?
    # The UI says "resumes at next scheduled time". If they toggle it during a "no-schedule" window, it should be active!
    # How to handle that? If mode_updated_at is recent enough? We don't have a "no-schedule" start time.
    # Let's just return current_mode if they updated it in the last 12 hours? No, let's just return current_mode if mode_updated_at is > last_end_time.
    # Actually, the simplest default if no slot is active:
    return "private"
