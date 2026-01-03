from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class NatalParsed:
    date: str
    time: Optional[str]
    time_precision: str
    lat: float
    lon: float
    birth_timezone: str

DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")
TIME_RE = re.compile(r"\b(\d{1,2}:\d{2}(?::\d{2})?)\b")
LATLON_RE = re.compile(r"(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)")
TZ_RE = re.compile(r"\b([A-Za-z_]+\/[A-Za-z_]+)\b")

def parse_natal_text(text: str) -> NatalParsed:
    t = text.strip()

    mdate = DATE_RE.search(t)
    if not mdate:
        raise ValueError("Could not parse date. Expected YYYY-MM-DD.")
    date = mdate.group(1)

    mlatlon = LATLON_RE.search(t)
    if not mlatlon:
        raise ValueError("Could not parse lat/lon. Expected like 34.0522,-118.2437.")
    lat = float(mlatlon.group(1))
    lon = float(mlatlon.group(2))

    mtime = TIME_RE.search(t)
    time = mtime.group(1) if mtime else None

    mtz = TZ_RE.search(t)
    birth_tz = mtz.group(1) if mtz else "UTC"

    if "unknown" in t.lower() or time is None:
        return NatalParsed(date=date, time=None, time_precision="unknown", lat=lat, lon=lon, birth_timezone=birth_tz)

    # normalize HH:MM:SS
    if len(time.split(":")) == 2:
        time = time + ":00"

    return NatalParsed(date=date, time=time, time_precision="exact", lat=lat, lon=lon, birth_timezone=birth_tz)
