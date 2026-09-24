import datetime
from zoneinfo import ZoneInfo
from typing import Optional

# Indian Standard Time (IST): UTC+05:30
IST = ZoneInfo("Asia/Kolkata")

def get_current_ist_datetime() -> datetime.datetime:
    """Returns the current timezone-aware datetime in Indian Standard Time (Asia/Kolkata)."""
    return datetime.datetime.now(IST)

def get_current_ist_date_str() -> str:
    """Returns the current date string in YYYY-MM-DD format according to Asia/Kolkata."""
    return get_current_ist_datetime().strftime("%Y-%m-%d")

def get_current_utc_datetime() -> datetime.datetime:
    """Returns current UTC datetime without timezone info for standard database storage."""
    return datetime.datetime.utcnow()

def format_to_ist_time(dt: Optional[datetime.datetime]) -> str:
    """
    Converts a UTC or naive datetime to Indian Standard Time formatted string:
    e.g. '10:03:25 AM'
    """
    if not dt:
        return "--"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(IST).strftime("%I:%M:%S %p")

def format_to_ist_datetime(dt: Optional[datetime.datetime]) -> str:
    """
    Converts a datetime to readable IST string:
    e.g. '28/09/2026 10:03:25 AM'
    """
    if not dt:
        return "--"
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
