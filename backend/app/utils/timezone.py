import datetime
from zoneinfo import ZoneInfo
from typing import Optional

# Indian Standard Time (IST): UTC+05:30
try:
    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def get_current_ist_datetime() -> datetime.datetime:
    """Returns the current timezone-aware datetime in Indian Standard Time (Asia/Kolkata)."""
    return datetime.datetime.now(IST)

def get_current_ist_date_str() -> str:
    """Returns the current date string in YYYY-MM-DD format according to Asia/Kolkata."""
    return get_current_ist_datetime().strftime("%Y-%m-%d")

def get_current_utc_datetime() -> datetime.datetime:
    """Returns current UTC datetime without timezone info for standard database storage."""
    return datetime.datetime.utcnow()

def format_to_ist_time(dt) -> str:
    """
    Converts a UTC or naive datetime (or string ISO timestamp) to Indian Standard Time formatted string:
    e.g. '10:03:25 AM'
    """
    if not dt:
        return "--"
    if isinstance(dt, str):
        try:
            clean_str = dt.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str)
        except Exception:
            return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(IST).strftime("%I:%M:%S %p")

def format_to_ist_datetime(dt) -> str:
    """
    Converts a datetime (or string ISO timestamp) to readable IST string:
    e.g. '28/09/2026 10:03:25 AM'
    """
    if not dt:
        return "--"
    if isinstance(dt, str):
        try:
            clean_str = dt.replace("Z", "+00:00")
            dt = datetime.datetime.fromisoformat(clean_str)
        except Exception:
            return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(IST).strftime("%d/%m/%Y %I:%M:%S %p")

def iso_date_to_dmy(date_str: str) -> str:
    """Converts 'YYYY-MM-DD' to 'DD/MM/YYYY'."""
    if not date_str:
        return ""
    try:
        parts = date_str.strip().split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
    except Exception:
        pass
    return date_str

def dmy_to_iso_date(dmy_str: str) -> str:
    """Converts 'DD/MM/YYYY' to 'YYYY-MM-DD'."""
    if not dmy_str:
        return ""
    try:
        parts = dmy_str.strip().split("/")
        if len(parts) == 3:
            return f"{parts[2]}-{parts[1]}-{parts[0]}"
    except Exception:
        pass
    return dmy_str

def parse_ist_time_string_to_utc(time_str: Optional[str], date_str: Optional[str] = None) -> Optional[datetime.datetime]:
    """
    Parses a user-supplied time string (e.g. '09:35:22 AM', '9:35 AM', '16:42:17', '16:42', or ISO datetime string)
    and combines it with `date_str` (YYYY-MM-DD in IST), converting it to a naive UTC datetime suitable for database storage.
    """
    if not time_str or not str(time_str).strip() or str(time_str).strip() in ("--", "None", "null"):
        return None

    clean = str(time_str).strip()

    # Check if it's already an ISO datetime string
    if "T" in clean or (len(clean) >= 19 and clean[4] == "-" and clean[7] == "-"):
        try:
            dt = datetime.datetime.fromisoformat(clean.replace("Z", "+00:00"))
            if dt.tzinfo is not None:
                return dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
            return dt
        except Exception:
            pass

    # Extract or fallback to date
    ref_date = date_str if date_str else get_current_ist_date_str()
    try:
        d_parts = [int(p) for p in ref_date.split("-")]
        year, month, day = d_parts[0], d_parts[1], d_parts[2]
    except Exception:
        today_ist = get_current_ist_datetime()
        year, month, day = today_ist.year, today_ist.month, today_ist.day

    # Try common 12-hour and 24-hour time formats
    formats = [
        "%I:%M:%S %p",
        "%I:%M %p",
        "%H:%M:%S",
        "%H:%M"
    ]
    parsed_time = None
    for fmt in formats:
        try:
            parsed_time = datetime.datetime.strptime(clean, fmt).time()
            break
        except ValueError:
            continue

    if parsed_time is None:
        return get_current_utc_datetime()

    # Combine with date in IST timezone, then convert to naive UTC
    ist_dt = datetime.datetime(year, month, day, parsed_time.hour, parsed_time.minute, parsed_time.second, tzinfo=IST)
    utc_dt = ist_dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return utc_dt

