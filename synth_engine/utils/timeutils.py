from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def parse_iso(ts: str) -> datetime:
    # Accept "Z"
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    return datetime.fromisoformat(ts)

def localize_birth(date_yyyy_mm_dd: str, time_hh_mm_ss: str, tz_name: str) -> datetime:
    # Returns aware datetime in UTC, but created with local tz first.
    tz = ZoneInfo(tz_name)
    dt_local = datetime.fromisoformat(f"{date_yyyy_mm_dd}T{time_hh_mm_ss}").replace(tzinfo=tz)
    return dt_local.astimezone(timezone.utc)
