import io
import datetime
import json
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, defer
from sqlalchemy import func, or_, and_
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from ..database import get_db
from ..models import (
    User, 
    Admin, 
    AttendanceRecord, 
    AttendanceDaySession, 
    AttendanceAuditLog, 
    FestivalEventDate,
    WorkingCommitteeAttendance
)
from .working_committee_attendance import get_wc_members_query
from ..auth_deps import require_admin, require_superadmin, get_current_user
from ..utils.timezone import (
    IST,
    get_current_ist_datetime,
    get_current_ist_date_str,
    get_current_utc_datetime,
    format_to_ist_time,
    format_to_ist_datetime,
    iso_date_to_dmy,
    dmy_to_iso_date
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])

DEPARTMENT_GROUPS = [
    ("PROMOTIONS", ["promotions", "promotion", "promo"]),
    ("DECORATIONS", ["decorations", "decoration", "decor"]),
    ("SOCIAL MEDIA", ["social media", "socialmedia", "social_media", "social"]),
    ("LOGISTICS", ["logistics", "logistic"]),
    ("CULTURALS", ["culturals", "cultural", "culture"]),
    ("CONTENT", ["content"]),
    ("DEFENCE", ["defence", "defense", "security", "discipline"]),
    ("EMCEE", ["emcee", "anchor", "anchoring"]),
    ("MARKETING", ["marketing"]),
    ("TECHNICAL", ["technical", "tech", "audio", "sound"]),
    ("PHOTOGRAPHY", ["photography", "photo", "photographer"]),
    ("VIDEOGRAPHY", ["videography", "video", "videographer"]),
    ("HOSPITALITY", ["hospitality", "food", "guest"]),
    ("DEVELOPER", ["developer", "dev", "tech_dev"])
]

def normalize_domain_string(domain: Optional[str]) -> str:
    """Normalize domain strings for forgiving matching (strip suffixes, punctuation, plurals)."""
    if not domain:
        return ""
    d = domain.strip().lower()
    # Replace separators with spaces
    d = re.sub(r'[\-_/&,.]', ' ', d)
    # Remove common filler words
    d = re.sub(r'\b(domain|committee|team|dept|department|wing|group|cell|head|lead|coordinator|volunteers|volunteer)\b', ' ', d)
    # Singularize tokens
    tokens = [t.rstrip('s') for t in d.split() if len(t) > 1]
    return ' '.join(tokens)

def are_domains_matching(admin_domain: Optional[str], volunteer_domain: Optional[str], admin_role: str = "ADMIN") -> bool:
    """
    Checks if an admin's assigned domain matches a volunteer's registered domain flexibly.
    Handles 'Promotions' vs 'Promotions Domain', casing, pluralization, and common aliases.
    Superadmins and Universal / Working Committee admins can mark all domains.
    """
    if admin_role == "SUPERADMIN":
        return True

    if not admin_domain:
        return True

    admin_norm = normalize_domain_string(admin_domain)
    # Universal / overall roles can mark for any domain
    universal_keywords = ["all", "overall", "core", "working", "admin", "fest", "management", "general"]
    if any(k in admin_norm for k in universal_keywords) or admin_norm == "":
        return True

    if not volunteer_domain:
        # If volunteer has no specific domain, allow admin to mark attendance
        return True

    vol_norm = normalize_domain_string(volunteer_domain)
    if not vol_norm:
        return True

    # 1. Exact normalized match
    if admin_norm == vol_norm:
        return True

    # 2. Substring match
    if admin_norm in vol_norm or vol_norm in admin_norm:
        return True

    # 3. Known department group aliases
    admin_raw = admin_domain.strip().lower()
    vol_raw = volunteer_domain.strip().lower()

    for group_name, aliases in DEPARTMENT_GROUPS:
        admin_match = any(a in admin_raw or admin_raw in a or a in admin_norm for a in aliases)
        vol_match = any(a in vol_raw or vol_raw in a or a in vol_norm for a in aliases)
        if admin_match and vol_match:
            return True

    # 4. Token overlap
    admin_tokens = set(t for t in admin_norm.split() if len(t) >= 3)
    vol_tokens = set(t for t in vol_norm.split() if len(t) >= 3)
    if admin_tokens and vol_tokens and (admin_tokens & vol_tokens):
        return True

    return False

def get_domain_aliases(domain_name: Optional[str]) -> List[str]:
    """Returns aliases and matching tokens for a given domain name for SQL filtering."""
    if not domain_name:
        return []
    dom_raw = domain_name.strip().lower()
    norm = normalize_domain_string(domain_name)
    
    universal_keywords = ["all", "overall", "core", "working", "admin", "fest", "general"]
    if any(k in norm for k in universal_keywords):
        return []

    aliases = set()
    aliases.add(dom_raw)
    if norm:
        aliases.add(norm)
        for t in norm.split():
            if len(t) >= 3:
                aliases.add(t)

    for group_name, group_aliases in DEPARTMENT_GROUPS:
        if any(a in dom_raw or dom_raw in a or a in norm for a in group_aliases):
            aliases.update(group_aliases)
            break

    return list(aliases)

def attendance_units(check_in_at, check_out_at) -> float:
    """Convert completed attendance duration into full-day units (1 day if checked in and checked out)."""
    if not check_in_at or not check_out_at:
        return 0.0
    return 1.0


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class CheckInRequest(BaseModel):
    user_id: int = Field(..., description="Participant User ID")
    date: Optional[str] = Field(None, description="Event date YYYY-MM-DD (defaults to server IST date)")

class CheckOutRequest(BaseModel):
    user_id: int = Field(..., description="Participant User ID")
    date: Optional[str] = Field(None, description="Event date YYYY-MM-DD (defaults to server IST date)")
    force: Optional[bool] = Field(False, description="Superadmin override to force check-out without waiting 1 hour")

class AttendanceScanRequest(BaseModel):
    qr_data: str = Field(..., description="Scanned QR code data (raw text, AUID, USN, or JSON string)")
    date: Optional[str] = Field(None, description="Event date YYYY-MM-DD (defaults to server IST date)")

class SubmitAttendanceRequest(BaseModel):
    date: str = Field(..., description="Event date YYYY-MM-DD")
    notes: Optional[str] = None

class UnlockSessionRequest(BaseModel):
    date: str = Field(..., description="Event date YYYY-MM-DD")
    reason: str = Field(..., min_length=3, description="Superadmin reason for unlocking submitted attendance")

class EditAttendanceRequest(BaseModel):
    check_in_time: Optional[str] = Field(None, description="Time string (e.g. '10:03:25 AM' or ISO format)")
    check_out_time: Optional[str] = Field(None, description="Time string (e.g. '04:15:20 PM' or ISO format)")
    status: Optional[str] = Field(None, description="NOT_MARKED, CHECKED_IN, COMPLETED")
    reason: str = Field(..., min_length=3, description="Audit reason for modifying official attendance")

class ResetAttendanceRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason for resetting attendance")

class AddEventDateRequest(BaseModel):
    date: str = Field(..., description="Date YYYY-MM-DD")
    label: str = Field(..., description="Descriptive label for this date")

# Helper to verify lock state
def verify_session_not_locked(db: Session, date_str: str, current_user: User):
    """
    If attendance for this date has been submitted, only SUPERADMIN can make changes.
    Normal admins will be rejected with 403 Forbidden.
    """
    session = db.query(AttendanceDaySession).filter(AttendanceDaySession.attendance_date == date_str).first()
    if session and session.is_submitted:
        if current_user.role != "SUPERADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Attendance has been submitted and is locked. Only Superadmin can modify it."
            )
    return session

ATTENDANCE_DEADLINE_END_DATE = "2026-11-05"  # Active till 5/11/2026, then disabled

def verify_attendance_date_is_open(date_str: str):
    """Attendance can only be marked for today, never for a future date, and window closes after 2026-11-05."""
    today = get_current_ist_date_str()
    if today > ATTENDANCE_DEADLINE_END_DATE or date_str > ATTENDANCE_DEADLINE_END_DATE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance marking window closed on November 5, 2026 (05/11/2026). Further attendance marking is disabled."
        )
    if date_str > today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance cannot be marked before the selected date arrives."
        )


# ==============================================================================
# 1. CONFIGURED EVENT DATES (MULTI-DAY EVENT SUPPORT)
# ==============================================================================

@router.get("/config-dates")
def get_configured_dates(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns list of configured event dates for attendance, plus any dates that have records.
    """
    today_ist = get_current_ist_date_str()
    configured = db.query(FestivalEventDate).filter(FestivalEventDate.is_active == True).order_by(FestivalEventDate.date.asc()).all()
    
    # Also find any distinct dates present in department & working committee attendance records
    record_dates = [r[0] for r in db.query(AttendanceRecord.attendance_date).distinct().all()]
    wc_record_dates = [r[0] for r in db.query(WorkingCommitteeAttendance.attendance_date).distinct().all()]
    all_record_dates = set(record_dates + wc_record_dates)

    date_map = {}
    for c in configured:
        dmy_str = iso_date_to_dmy(c.date)
        date_map[c.date] = {
            "date": c.date,
            "label": c.label,
            "dmy": dmy_str,
            "date_dmy": dmy_str,
            "date_formatted": dmy_str,
            "is_today": (c.date == today_ist)
        }
    
    for rd in all_record_dates:
        if rd not in date_map:
            dmy_str = iso_date_to_dmy(rd)
            date_map[rd] = {
                "date": rd,
                "label": f"Event Day ({dmy_str})",
                "dmy": dmy_str,
                "date_dmy": dmy_str,
                "date_formatted": dmy_str,
                "is_today": (rd == today_ist)
            }
            
    # If today's date is not in list, add it
    if today_ist not in date_map:
        dmy_str = iso_date_to_dmy(today_ist)
        date_map[today_ist] = {
            "date": today_ist,
            "label": f"Today ({dmy_str})",
            "dmy": dmy_str,
            "date_dmy": dmy_str,
            "date_formatted": dmy_str,
            "is_today": True
        }

    sorted_list = sorted(date_map.values(), key=lambda x: x["date"])
    return {
        "success": True,
        "current_date": today_ist,
        "dates": sorted_list
    }

@router.post("/config-dates")
def add_configured_date(
    payload: AddEventDateRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """SuperAdmin can configure an additional event date."""
    clean_date = payload.date.strip()
    existing = db.query(FestivalEventDate).filter(FestivalEventDate.date == clean_date).first()
    if existing:
        existing.label = payload.label.strip()
        existing.is_active = True
    else:
        db.add(FestivalEventDate(date=clean_date, label=payload.label.strip(), is_active=True))
    db.commit()
    return {"success": True, "message": f"Event date {clean_date} configured successfully."}


# ==============================================================================
# 2. GET ATTENDANCE ROSTER & DASHBOARD METRICS
# ==============================================================================

@router.get("")
def get_attendance_roster(
    date: Optional[str] = Query(None, description="Event date YYYY-MM-DD (defaults to server IST date)"),
    search: Optional[str] = Query(None, description="Search by Name, AUID, Reg ID, Phone"),
    department: Optional[str] = Query(None, description="Filter by department"),
    institute: Optional[str] = Query(None, description="Filter by institute"),
    akv_dept: Optional[str] = Query(None, description="Filter by AKV Domain (volunteer_domain)"),
    role_filter: Optional[str] = Query(None, description="Filter by role: PARTICIPANT, VOLUNTEER, etc."),
    status_filter: Optional[str] = Query(None, description="NOT_MARKED, CHECKED_IN, COMPLETED"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns participant attendance roster for the selected date, along with session lock state
    and summary statistics.
    """
    target_date = date.strip() if date else get_current_ist_date_str()
    today_ist = get_current_ist_date_str()

    # 1. Check Day Session lock state
    session = db.query(AttendanceDaySession).filter(AttendanceDaySession.attendance_date == target_date).first()
    is_submitted = bool(session and session.is_submitted)
    submitted_by = session.submitted_by if session else None
    submitted_at_ist = format_to_ist_datetime(session.submitted_at) if session and session.submitted_at else None
    
    # Locked for normal admin if submitted
    locked_for_current_user = bool(is_submitted and current_user.role != "SUPERADMIN")

    # 2. Query participants (Students, Volunteers, Participants)
    # Defer heavy photo_url and password_hash to speed up query from disk & network
    user_query = db.query(User).options(defer(User.photo_url), defer(User.password_hash)).filter(
        User.role.in_(["PARTICIPANT", "VOLUNTEER", "STUDENT"])
    )

    if current_user.role == "ADMIN" and current_user.volunteer_domain:
        # Display admin's assigned AKV domain volunteers (unless universal/all)
        admin_aliases = get_domain_aliases(current_user.volunteer_domain)
        if admin_aliases:
            domain_filters = [func.lower(User.volunteer_domain).like(f"%{a}%") for a in admin_aliases]
            user_query = user_query.filter(
                User.volunteer_domain.isnot(None),
                or_(*domain_filters)
            )
    elif akv_dept and akv_dept != "all":
        domain_aliases = get_domain_aliases(akv_dept)
        if domain_aliases:
            domain_filters = [func.lower(User.volunteer_domain).like(f"%{a}%") for a in domain_aliases]
            user_query = user_query.filter(
                User.volunteer_domain.isnot(None),
                or_(*domain_filters)
            )

    if department and department != "all":
        user_query = user_query.filter(User.department == department)
    if institute and institute != "all":
        user_query = user_query.filter(User.institute == institute)
    if role_filter and role_filter != "all":
        user_query = user_query.filter(User.role == role_filter.upper())

    if search:
        s = f"%{search.strip().lower()}%"
        user_query = user_query.filter(
            or_(
                func.lower(User.name).like(s),
                func.lower(User.auid).like(s),
                func.lower(User.registration_id).like(s),
                func.lower(User.phone).like(s),
                func.lower(User.department).like(s)
            )
        )

    users = user_query.order_by(User.name.asc()).all()
    user_ids = [u.id for u in users]

    # 3. Query existing attendance records for this date
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.attendance_date == target_date,
        AttendanceRecord.user_id.in_(user_ids) if user_ids else False
    ).all()
    records_by_uid = {r.user_id: r for r in records}

    # 4. Statistics for this date (scoped to admin's domain if domain admin, otherwise all eligible participants)
    if current_user.role == "ADMIN" and current_user.volunteer_domain and get_domain_aliases(current_user.volunteer_domain):
        admin_aliases = get_domain_aliases(current_user.volunteer_domain)
        domain_filters = [func.lower(User.volunteer_domain).like(f"%{a}%") for a in admin_aliases]
        domain_match = and_(User.volunteer_domain.isnot(None), or_(*domain_filters))

        total_eligible = db.query(func.count(User.id)).filter(domain_match).scalar() or 0

        status_counts = dict(db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .join(User, AttendanceRecord.user_id == User.id)
            .filter(AttendanceRecord.attendance_date == target_date, domain_match)
            .group_by(AttendanceRecord.status).all())
    elif akv_dept and akv_dept != "all" and get_domain_aliases(akv_dept):
        domain_aliases = get_domain_aliases(akv_dept)
        domain_filters = [func.lower(User.volunteer_domain).like(f"%{a}%") for a in domain_aliases]
        domain_match = and_(User.volunteer_domain.isnot(None), or_(*domain_filters))

        total_eligible = db.query(func.count(User.id)).filter(domain_match).scalar() or 0

        status_counts = dict(db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .join(User, AttendanceRecord.user_id == User.id)
            .filter(AttendanceRecord.attendance_date == target_date, domain_match)
            .group_by(AttendanceRecord.status).all())
    else:
        eligible_roles = ["PARTICIPANT", "VOLUNTEER", "STUDENT"]
        total_eligible = db.query(func.count(User.id)).filter(User.role.in_(eligible_roles)).scalar() or 0

        status_counts = dict(db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .join(User, AttendanceRecord.user_id == User.id)
            .filter(AttendanceRecord.attendance_date == target_date, User.role.in_(eligible_roles))
            .group_by(AttendanceRecord.status).all())

    count_checked_in = status_counts.get("CHECKED_IN", 0)
    count_completed = status_counts.get("COMPLETED", 0)
    count_not_marked = total_eligible - (count_checked_in + count_completed)
    if count_not_marked < 0:
        count_not_marked = 0

    # 5. Build participant list
    now_utc_curr = get_current_utc_datetime()
    participants_output = []
    for u in users:
        rec = records_by_uid.get(u.id)
        current_status = rec.status if rec else "NOT_MARKED"
        
        # Apply status filter if provided
        if status_filter and status_filter != "all":
            if current_status != status_filter.upper():
                continue

        cin_time = format_to_ist_time(rec.check_in_at) if rec and rec.check_in_at else None
        cout_time = format_to_ist_time(rec.check_out_at) if rec and rec.check_out_at else None
        units = attendance_units(rec.check_in_at, rec.check_out_at) if rec else 0.0

        elapsed_sec = (now_utc_curr - rec.check_in_at).total_seconds() if (rec and rec.check_in_at) else 0
        check_out_available = bool(rec and rec.check_in_at and not rec.check_out_at and elapsed_sec >= 3600)
        lock_remaining_minutes = max(1, int((3600 - elapsed_sec + 59) // 60)) if (rec and rec.check_in_at and not rec.check_out_at and elapsed_sec < 3600) else 0

        participants_output.append({
            "id": rec.id if rec else None,
            "record_id": rec.id if rec else None,
            "user_id": u.id,
            "reg_id": u.registration_id,
            "name": u.name,
            "auid": u.auid,
            "institute": u.institute,
            "department": u.department,
            "akv_dept": u.volunteer_domain or "--",
            "volunteer_domain": u.volunteer_domain or "--",
            "contact": u.phone,
            "role": u.role,
            "photo_url": None,
            "check_in_time": cin_time,
            "check_out_time": cout_time,
            "check_out_available": check_out_available,
            "lock_remaining_minutes": lock_remaining_minutes,
            "attendance_units": units,
            "status": current_status,
            "submitted": is_submitted or (rec.submitted if rec else False),
            "submitted_by": rec.submitted_by if rec else submitted_by,
            "last_modified_by": rec.last_modified_by if rec else None,
            "can_mark": not locked_for_current_user and current_status != "COMPLETED"
        })

    return {
        "success": True,
        "date": target_date,
        "date_dmy": iso_date_to_dmy(target_date),
        "is_today": (target_date == today_ist),
        "session": {
            "is_submitted": is_submitted,
            "submitted_at": submitted_at_ist,
            "submitted_by": submitted_by,
            "locked_for_admin": locked_for_current_user
        },
        "summary": {
            "total_participants": total_eligible,
            "checked_in": count_checked_in,
            "completed": count_completed,
            "not_marked": count_not_marked,
            "is_submitted": is_submitted
        },
        "participants": participants_output
    }


# ==============================================================================
# 3. ATTENDANCE ACTIONS: CHECK-IN & CHECK-OUT
# ==============================================================================

@router.post("/check-in")
def mark_check_in(
    payload: CheckInRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    First attendance marking: CHECK-IN.
    Official server-side timestamp generated in IST.
    Protected against duplicate requests and locked dates.
    """
    target_date = payload.date.strip() if payload.date else get_current_ist_date_str()
    verify_attendance_date_is_open(target_date)
    
    # Check lock state
    verify_session_not_locked(db, target_date, current_user)

    user = db.query(User).options(defer(User.photo_url), defer(User.password_hash)).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Participant not found")
    if current_user.role == "ADMIN" and current_user.volunteer_domain:
        if not are_domains_matching(current_user.volunteer_domain, user.volunteer_domain, current_user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Volunteer '{user.name}' is registered under '{user.volunteer_domain or 'General'}' domain. You can only mark attendance for '{current_user.volunteer_domain}' domain."
            )

    now_utc = get_current_utc_datetime()

    # Query with row-level safety
    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == user.id,
        AttendanceRecord.attendance_date == target_date
    ).first()

    if rec:
        if rec.check_in_at is not None and rec.check_out_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance already completed for today."
            )
        if rec.check_in_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendance/check-in is already marked by {rec.last_modified_by or 'another admin'}."
            )
        # Update existing record
        rec.check_in_at = now_utc
        rec.status = "CHECKED_IN"
        rec.last_modified_by = current_user.name
        rec.last_modified_at = now_utc
    else:
        rec = AttendanceRecord(
            user_id=user.id,
            attendance_date=target_date,
            check_in_at=now_utc,
            status="CHECKED_IN",
            last_modified_by=current_user.name,
            last_modified_at=now_utc
        )
        db.add(rec)

    db.flush()

    # Log audit
    audit = AttendanceAuditLog(
        attendance_id=rec.id,
        user_id=user.id,
        participant_name=user.name,
        attendance_date=target_date,
        action="CHECK_IN",
        new_check_in=format_to_ist_time(rec.check_in_at),
        modified_by=current_user.name,
        modified_at=now_utc
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Check-In recorded for {user.name} at {format_to_ist_time(rec.check_in_at)}.",
        "record": {
            "id": rec.id,
            "user_id": user.id,
            "status": rec.status,
            "check_in_time": format_to_ist_time(rec.check_in_at),
            "check_out_time": None,
            "date": target_date
        }
    }


@router.post("/check-out")
def mark_check_out(
    payload: CheckOutRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Second attendance marking: CHECK-OUT.
    Official server-side timestamp generated in IST.
    Transitions status to COMPLETED. Subsequent attempts rejected.
    """
    target_date = payload.date.strip() if payload.date else get_current_ist_date_str()
    verify_attendance_date_is_open(target_date)
    
    # Check lock state
    verify_session_not_locked(db, target_date, current_user)

    user = db.query(User).options(defer(User.photo_url), defer(User.password_hash)).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Participant not found")
    if current_user.role == "ADMIN" and current_user.volunteer_domain:
        if not are_domains_matching(current_user.volunteer_domain, user.volunteer_domain, current_user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Volunteer '{user.name}' is registered under '{user.volunteer_domain or 'General'}' domain. You can only mark attendance for '{current_user.volunteer_domain}' domain."
            )

    now_utc = get_current_utc_datetime()

    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == user.id,
        AttendanceRecord.attendance_date == target_date
    ).first()

    if not rec or rec.check_in_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Participant has not checked in yet. Check-in is required before check-out."
        )

    if rec.check_out_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already completed for today."
        )

    elapsed = now_utc - rec.check_in_at
    if elapsed.total_seconds() < 3600 and not (current_user.role == "SUPERADMIN" or payload.force):
        remaining_minutes = max(1, 60 - int(elapsed.total_seconds() // 60))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-Out will be available after one hour of Check-In. Please wait {remaining_minutes} more minute(s)."
        )

    rec.check_out_at = now_utc
    rec.status = "COMPLETED"
    rec.last_modified_by = current_user.name
    rec.last_modified_at = now_utc

    # Log audit
    audit = AttendanceAuditLog(
        attendance_id=rec.id,
        user_id=user.id,
        participant_name=user.name,
        attendance_date=target_date,
        action="CHECK_OUT",
        old_check_in=format_to_ist_time(rec.check_in_at),
        new_check_out=format_to_ist_time(rec.check_out_at),
        modified_by=current_user.name,
        modified_at=now_utc
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "action": "CHECK_OUT",
        "message": "Checkout successful and attendance is submitted for today",
        "record": {
            "id": rec.id,
            "user_id": user.id,
            "status": rec.status,
            "check_in_time": format_to_ist_time(rec.check_in_at),
            "check_out_time": format_to_ist_time(rec.check_out_at),
            "date": target_date
        },
        "volunteer": {
            "user_id": user.id,
            "name": user.name,
            "auid": user.auid,
            "registration_id": user.registration_id,
            "domain": user.volunteer_domain or "--",
            "department": user.department or "--"
        },
        "check_in_time": format_to_ist_time(rec.check_in_at),
        "check_out_time": format_to_ist_time(rec.check_out_at),
        "duration_hours": round(elapsed.total_seconds() / 3600, 2),
        "date": target_date
    }


@router.post("/scan")
def scan_volunteer_attendance(
    payload: AttendanceScanRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Unified QR scan attendance marking endpoint.
    1. Resolves participant directly from the database by user_id, AUID, registration_id, or phone.
    2. Validates domain matching (flexible, forgiving of 'Domain' suffix, casing, plurals).
    3. If 1st scan: Marks Check-In and locks for 1 hour. Returns action: 'CHECK_IN'.
    4. If scanned within 1 hour: Rejects with action: 'LOCKED' and remaining minutes.
    5. If 2nd scan after 1 hour: Marks Check-Out and submits attendance for today. Returns action: 'CHECK_OUT'.
    6. If scanned again: Returns action: 'ALREADY_COMPLETED'.
    """
    target_date = payload.date.strip() if payload.date else get_current_ist_date_str()
    verify_attendance_date_is_open(target_date)
    verify_session_not_locked(db, target_date, current_user)

    qr_text = payload.qr_data.strip()
    target_user_id: Optional[int] = None
    target_auid: Optional[str] = None
    target_reg_id: Optional[str] = None

    try:
        parsed = json.loads(qr_text)
        if isinstance(parsed, dict):
            target_user_id = parsed.get("user_id") or parsed.get("id")
            target_auid = parsed.get("auid")
            target_reg_id = parsed.get("reg_id") or parsed.get("registration_id")
    except Exception:
        pass

    if not (target_user_id or target_auid or target_reg_id):
        if qr_text.isdigit():
            target_user_id = int(qr_text)
        target_auid = qr_text
        target_reg_id = qr_text

    user_query = db.query(User).options(defer(User.photo_url), defer(User.password_hash))
    filters = []
    if target_user_id:
        try:
            filters.append(User.id == int(target_user_id))
        except (ValueError, TypeError):
            pass
    if target_auid:
        filters.append(func.lower(User.auid) == target_auid.lower())
    if target_reg_id:
        filters.append(func.lower(User.registration_id) == target_reg_id.lower())
    filters.append(func.lower(User.phone) == qr_text.lower())

    user = user_query.filter(or_(*filters)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Volunteer pass not found in database. (Scanned: {qr_text[:30]})"
        )

    # Domain authorization check
    if current_user.role == "ADMIN" and current_user.volunteer_domain:
        if not are_domains_matching(current_user.volunteer_domain, user.volunteer_domain, current_user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Volunteer '{user.name}' is registered under '{user.volunteer_domain or 'General'}' domain. You can only mark attendance for '{current_user.volunteer_domain}' domain."
            )

    now_utc = get_current_utc_datetime()

    rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == user.id,
        AttendanceRecord.attendance_date == target_date
    ).first()

    # CASE 1: FIRST SCAN -> CHECK-IN & 1-HOUR LOCKOUT
    if not rec or rec.check_in_at is None:
        if not rec:
            rec = AttendanceRecord(
                user_id=user.id,
                attendance_date=target_date,
                check_in_at=now_utc,
                status="CHECKED_IN",
                last_modified_by=current_user.name,
                last_modified_at=now_utc
            )
            db.add(rec)
        else:
            rec.check_in_at = now_utc
            rec.status = "CHECKED_IN"
            rec.last_modified_by = current_user.name
            rec.last_modified_at = now_utc

        db.flush()

        audit = AttendanceAuditLog(
            attendance_id=rec.id,
            user_id=user.id,
            participant_name=user.name,
            attendance_date=target_date,
            action="CHECK_IN",
            new_check_in=format_to_ist_time(rec.check_in_at),
            modified_by=current_user.name,
            modified_at=now_utc,
            reason="QR Scan Check-In (1-Hour Lock Initiated)"
        )
        db.add(audit)
        db.commit()

        locked_until_dt = rec.check_in_at + datetime.timedelta(hours=1)
        check_in_time_str = format_to_ist_time(rec.check_in_at)
        locked_until_str = format_to_ist_time(locked_until_dt)

        return {
            "success": True,
            "action": "CHECK_IN",
            "status": "CHECKED_IN",
            "message": "Check in successful",
            "volunteer": {
                "user_id": user.id,
                "name": user.name,
                "auid": user.auid,
                "registration_id": user.registration_id,
                "domain": user.volunteer_domain or "--",
                "department": user.department or "--"
            },
            "record": {
                "id": rec.id,
                "user_id": user.id,
                "status": rec.status,
                "check_in_time": check_in_time_str,
                "check_out_time": None,
                "date": target_date
            },
            "check_in_time": check_in_time_str,
            "check_out_time": None,
            "lock_remaining_minutes": 60,
            "locked_until": locked_until_str,
            "date": target_date
        }

    # CASE 2: ALREADY COMPLETED (CHECK-IN AND CHECK-OUT DONE)
    if rec.check_out_at is not None:
        check_in_time_str = format_to_ist_time(rec.check_in_at)
        check_out_time_str = format_to_ist_time(rec.check_out_at)
        return {
            "success": True,
            "action": "ALREADY_COMPLETED",
            "status": "COMPLETED",
            "message": "Attendance is already completed for today",
            "volunteer": {
                "user_id": user.id,
                "name": user.name,
                "auid": user.auid,
                "registration_id": user.registration_id,
                "domain": user.volunteer_domain or "--",
                "department": user.department or "--"
            },
            "record": {
                "id": rec.id,
                "user_id": user.id,
                "status": rec.status,
                "check_in_time": check_in_time_str,
                "check_out_time": check_out_time_str,
                "date": target_date
            },
            "check_in_time": check_in_time_str,
            "check_out_time": check_out_time_str,
            "date": target_date
        }

    # CASE 3: HAS CHECK-IN, WAITING FOR CHECK-OUT
    elapsed_seconds = (now_utc - rec.check_in_at).total_seconds()
    check_in_time_str = format_to_ist_time(rec.check_in_at)
    locked_until_dt = rec.check_in_at + datetime.timedelta(hours=1)
    locked_until_str = format_to_ist_time(locked_until_dt)

    if elapsed_seconds < 3600:
        # LOCKED: LESS THAN 1 HOUR ELAPSED
        remaining_secs = 3600 - elapsed_seconds
        remaining_mins = max(1, int((remaining_secs + 59) // 60))

        return {
            "success": False,
            "action": "LOCKED",
            "status": "CHECKED_IN",
            "message": f"QR pass is locked for 1 hour after check-in.",
            "detail": f"Check-Out will be unlocked after 1 hour from Check-In. Please wait {remaining_mins} more minute(s) (Unlocks at {locked_until_str}).",
            "volunteer": {
                "user_id": user.id,
                "name": user.name,
                "auid": user.auid,
                "registration_id": user.registration_id,
                "domain": user.volunteer_domain or "--",
                "department": user.department or "--"
            },
            "record": {
                "id": rec.id,
                "user_id": user.id,
                "status": rec.status,
                "check_in_time": check_in_time_str,
                "check_out_time": None,
                "date": target_date
            },
            "check_in_time": check_in_time_str,
            "lock_remaining_minutes": remaining_mins,
            "locked_until": locked_until_str,
            "date": target_date
        }
    else:
        # SECOND SCAN (>= 1 HOUR ELAPSED) -> 1-Hour Lock Passed! Ready for Check-Out!
        # Do NOT auto-record check-out on scan. Return READY_FOR_CHECK_OUT so coordinator
        # can review volunteer details and manually confirm Check-Out.
        duration_hrs = round(elapsed_seconds / 3600, 2)
        check_out_preview = format_to_ist_time(now_utc)

        return {
            "success": True,
            "action": "READY_FOR_CHECK_OUT",
            "status": "CHECKED_IN",
            "message": "1-hour requirement satisfied. Ready for Check-Out.",
            "volunteer": {
                "user_id": user.id,
                "name": user.name,
                "auid": user.auid,
                "registration_id": user.registration_id,
                "domain": user.volunteer_domain or "--",
                "department": user.department or "--"
            },
            "record": {
                "id": rec.id,
                "user_id": user.id,
                "status": rec.status,
                "check_in_time": check_in_time_str,
                "check_out_time": None,
                "date": target_date
            },
            "check_in_time": check_in_time_str,
            "check_out_time_preview": check_out_preview,
            "duration_hours": duration_hrs,
            "lock_remaining_minutes": 0,
            "can_check_out": True,
            "date": target_date
        }


# ==============================================================================
# 4. SUBMIT ATTENDANCE & ADMIN LOCK
# ==============================================================================

@router.post("/submit")
def submit_attendance(
    payload: SubmitAttendanceRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Submits and finalizes attendance for the given date.
    Locks the date for normal admins immediately on backend.
    """
    target_date = payload.date.strip()
    now_utc = get_current_utc_datetime()

    session = db.query(AttendanceDaySession).filter(AttendanceDaySession.attendance_date == target_date).first()
    if session and session.is_submitted:
        if current_user.role != "SUPERADMIN":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance for this date has already been submitted and locked."
            )

    if not session:
        session = AttendanceDaySession(attendance_date=target_date)
        db.add(session)

    session.is_submitted = True
    session.submitted_at = now_utc
    session.submitted_by = current_user.name
    session.notes = payload.notes

    # Update all attendance records for this date to submitted = True
    records = db.query(AttendanceRecord).filter(AttendanceRecord.attendance_date == target_date).all()
    for r in records:
        r.submitted = True
        r.submitted_at = now_utc
        r.submitted_by = current_user.name

    # Audit log
    audit = AttendanceAuditLog(
        attendance_id=None,
        user_id=current_user.id,
        participant_name="ALL_PARTICIPANTS",
        attendance_date=target_date,
        action="ATTENDANCE_SUBMITTED",
        modified_by=current_user.name,
        modified_at=now_utc,
        reason=payload.notes or "Official Attendance Finalized"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Attendance for {iso_date_to_dmy(target_date)} submitted successfully. Records are now locked.",
        "submitted_at": format_to_ist_datetime(session.submitted_at),
        "submitted_by": session.submitted_by,
        "session": {
            "is_submitted": True,
            "submitted_at": format_to_ist_datetime(session.submitted_at),
            "submitted_by": session.submitted_by
        }
    }


# ==============================================================================
# 5. SUPERADMIN CONTROLS: UNLOCK, EDIT, RESET, AUDIT
# ==============================================================================

@router.post("/session/unlock")
def unlock_attendance_session(
    payload: UnlockSessionRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Unlocks submitted attendance for a date so admins can edit/mark again.
    """
    target_date = payload.date.strip()
    now_utc = get_current_utc_datetime()

    session = db.query(AttendanceDaySession).filter(AttendanceDaySession.attendance_date == target_date).first()
    if not session or not session.is_submitted:
        raise HTTPException(status_code=400, detail="Attendance for this date is not currently locked.")

    session.is_submitted = False
    session.unlocked_at = now_utc
    session.unlocked_by = current_user.name

    # Set records submitted to False
    records = db.query(AttendanceRecord).filter(AttendanceRecord.attendance_date == target_date).all()
    for r in records:
        r.submitted = False

    audit = AttendanceAuditLog(
        attendance_id=None,
        user_id=current_user.id,
        participant_name="ALL_PARTICIPANTS",
        attendance_date=target_date,
        action="SUPERADMIN_UNLOCK",
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason=payload.reason
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Attendance session for {iso_date_to_dmy(target_date)} unlocked successfully."
    }


@router.patch("/{attendance_id}")
def edit_attendance_record(
    attendance_id: int,
    payload: EditAttendanceRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Explicitly modify check-in time, check-out time, or status.
    Mandatory audit log is recorded.
    """
    rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_cin_str = format_to_ist_time(rec.check_in_at)
    old_cout_str = format_to_ist_time(rec.check_out_at)
    old_status = rec.status
    now_utc = get_current_utc_datetime()

    # Parse provided times if given
    if payload.check_in_time is not None:
        if payload.check_in_time.strip() == "" or payload.check_in_time.strip() == "--":
            rec.check_in_at = None
        else:
            try:
                # If ISO format
                rec.check_in_at = datetime.datetime.fromisoformat(payload.check_in_time.strip().replace("Z", "+00:00"))
            except Exception:
                # Keep existing or set to now
                rec.check_in_at = now_utc

    if payload.check_out_time is not None:
        if payload.check_out_time.strip() == "" or payload.check_out_time.strip() == "--":
            rec.check_out_at = None
        else:
            try:
                rec.check_out_at = datetime.datetime.fromisoformat(payload.check_out_time.strip().replace("Z", "+00:00"))
            except Exception:
                rec.check_out_at = now_utc

    # Update status appropriately
    if payload.status:
        rec.status = payload.status.upper()
    else:
        if rec.check_in_at and rec.check_out_at:
            rec.status = "COMPLETED"
        elif rec.check_in_at:
            rec.status = "CHECKED_IN"
        else:
            rec.status = "NOT_MARKED"

    rec.last_modified_by = f"{current_user.name} (Super Admin)"
    rec.last_modified_at = now_utc

    audit = AttendanceAuditLog(
        attendance_id=rec.id,
        user_id=rec.user_id,
        participant_name=rec.user.name if rec.user else f"User #{rec.user_id}",
        attendance_date=rec.attendance_date,
        old_check_in=old_cin_str,
        new_check_in=format_to_ist_time(rec.check_in_at),
        old_check_out=old_cout_str,
        new_check_out=format_to_ist_time(rec.check_out_at),
        action="SUPERADMIN_EDIT",
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason=payload.reason
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Attendance record #{rec.id} updated successfully.",
        "record": {
            "id": rec.id,
            "status": rec.status,
            "check_in_time": format_to_ist_time(rec.check_in_at),
            "check_out_time": format_to_ist_time(rec.check_out_at)
        }
    }


@router.post("/{attendance_id}/reset")
def reset_attendance_record(
    attendance_id: int,
    payload: ResetAttendanceRequest = ResetAttendanceRequest(),
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Resets a participant's attendance record for the day,
    allowing them to be marked anew.
    """
    rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_cin = format_to_ist_time(rec.check_in_at)
    old_cout = format_to_ist_time(rec.check_out_at)
    now_utc = get_current_utc_datetime()

    rec.check_in_at = None
    rec.check_out_at = None
    rec.status = "NOT_MARKED"
    rec.last_modified_by = f"{current_user.name} (Super Admin)"
    rec.last_modified_at = now_utc

    audit = AttendanceAuditLog(
        attendance_id=rec.id,
        user_id=rec.user_id,
        participant_name=rec.user.name if rec.user else f"User #{rec.user_id}",
        attendance_date=rec.attendance_date,
        old_check_in=old_cin,
        new_check_in="--",
        old_check_out=old_cout,
        new_check_out="--",
        action="SUPERADMIN_RESET",
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason=payload.reason or "Super Admin Attendance Reset"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Attendance record for {rec.user.name if rec.user else 'user'} reset to NOT MARKED."
    }


@router.delete("/{attendance_id}")
def delete_attendance_record(
    attendance_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Delete attendance record if absolutely necessary.
    """
    rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    user_name = rec.user.name if rec.user else "User"
    date_str = rec.attendance_date

    audit = AttendanceAuditLog(
        attendance_id=rec.id,
        user_id=rec.user_id,
        participant_name=user_name,
        attendance_date=date_str,
        action="SUPERADMIN_DELETE",
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=get_current_utc_datetime(),
        reason="Record permanently deleted by Super Admin"
    )
    db.add(audit)
    db.delete(rec)
    db.commit()

    return {"success": True, "message": f"Attendance record for {user_name} on {date_str} deleted."}


@router.get("/audit")
def get_attendance_audit_logs(
    date: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Retrieve immutable attendance audit logs.
    """
    query = db.query(AttendanceAuditLog)
    if date and date != "all":
        query = query.filter(AttendanceAuditLog.attendance_date == date)
    if user_id:
        query = query.filter(AttendanceAuditLog.user_id == user_id)

    logs = query.order_by(AttendanceAuditLog.modified_at.desc()).offset(offset).limit(limit).all()

    # Bulk fetch associated users to eliminate N+1 queries
    user_ids = {l.user_id for l in logs if l.user_id}
    users_map = {}
    if user_ids:
        found_users = db.query(User.id, User.volunteer_domain).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: (u.volunteer_domain or "--") for u in found_users}

    output = []
    for l in logs:
        akv_dept = users_map.get(l.user_id, "--")
        output.append({
            "id": l.id,
            "attendance_id": l.attendance_id,
            "user_id": l.user_id,
            "participant_name": l.participant_name,
            "akv_dept": akv_dept,
            "date": l.attendance_date,
            "date_dmy": iso_date_to_dmy(l.attendance_date),
            "old_check_in": l.old_check_in,
            "new_check_in": l.new_check_in,
            "old_check_out": l.old_check_out,
            "new_check_out": l.new_check_out,
            "action": l.action,
            "modified_by": l.modified_by,
            "modified_at_ist": format_to_ist_datetime(l.modified_at),
            "reason": l.reason or ""
        })

    return {"success": True, "total": len(output), "logs": output, "audit_logs": output}


# ==============================================================================
def populate_attendance_worksheet(
    ws,
    sheet_title: str,
    subtitle_text: str,
    headers: List[str],
    rows_data: List[List],
    col_widths_override: dict = None
):
    """
    Renders standard reference styling for an attendance sheet:
    - Merged title banner row (Karnataka red)
    - Subtitle banner with IST timestamp
    - Colored headers with freeze panes and auto filter
    - Data rows with borders and proper alignment
    - Auto column widths
    """
    header_fill = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")  # Karnataka Red
    summary_fill = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid") # Gold accent
    
    font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    font_data = Font(name="Calibri", size=10)
    font_bold_data = Font(name="Calibri", size=10, bold=True)
    font_title = Font(name="Calibri", size=14, bold=True, color="991B1B")
    font_sub = Font(name="Calibri", size=10, italic=True, color="475569")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")

    total_cols = len(headers)
    last_col_letter = get_column_letter(total_cols)

    # Row 1: Merged Title
    ws.merge_cells(f"A1:{last_col_letter}1")
    ws["A1"] = "ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026"
    ws["A1"].font = font_title
    ws["A1"].alignment = align_center

    # Row 2: Subtitle
    ws.merge_cells(f"A2:{last_col_letter}2")
    ws["A2"] = subtitle_text
    ws["A2"].font = font_sub
    ws["A2"].alignment = align_center

    # Row 3: Blank
    ws.append([])

    # Row 4: Header row
    header_row_idx = 4
    ws.append(headers)

    for col_idx in range(1, total_cols + 1):
        cell = ws.cell(row=header_row_idx, column=col_idx)
        cell.font = font_header
        cell.border = thin_border
        cell.alignment = align_center
        if headers[col_idx - 1] == "Total Days Present":
            cell.fill = summary_fill
            cell.font = Font(name="Calibri", size=11, bold=True, color="000000")
        else:
            cell.fill = header_fill

    # Row 5+: Data rows
    start_data_row = 5
    for r in rows_data:
        ws.append(r)

    end_data_row = ws.max_row
    for row_idx in range(start_data_row, end_data_row + 1):
        for col_idx in range(1, total_cols + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.font = font_data
            cell.border = thin_border
            col_name = headers[col_idx - 1]
            if col_name in ["Name", "Dept", "Institute", "AKV-Dept", "Working Committee Role", "AKV-Dept / Working Committee Role", "Managed By"]:
                cell.alignment = align_left
            else:
                cell.alignment = align_center

            if col_name == "Total Days Present":
                cell.font = font_bold_data
                cell.alignment = align_center
            elif col_name == "AUID":
                cell.number_format = "@"
                if cell.value is not None:
                    cell.value = str(cell.value)

    ws.freeze_panes = "A5"
    if end_data_row > header_row_idx:
        ws.auto_filter.ref = f"A{header_row_idx}:{last_col_letter}{end_data_row}"

    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            if cell.row in [1, 2, 3]:
                continue
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    if col_widths_override:
        for col_let, width in col_widths_override.items():
            ws.column_dimensions[col_let].width = width


@router.get("/export")
@router.get("/export/excel")
def export_attendance_excel(
    department: Optional[str] = Query(None, description="Filter by department"),
    institute: Optional[str] = Query(None, description="Filter by institute"),
    akv_dept: Optional[str] = Query(None, description="Filter by AKV Domain"),
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Generates and downloads the official Attendance Excel workbook.
    When exported by SUPERADMIN, contains exactly 16 sheets:
      - Sheet 1: PROMOTIONS
      - Sheet 2: DECORATIONS
      - Sheet 3: SOCIAL MEDIA
      - Sheet 4: LOGISTICS
      - Sheet 5: CULTURALS
      - Sheet 6: CONTENT
      - Sheet 7: DEFENCE
      - Sheet 8: EMCEE
      - Sheet 9: MARKETING
      - Sheet 10: TECHNICAL
      - Sheet 11: PHOTOGRAPHY
      - Sheet 12: VIDEOGRAPHY
      - Sheet 13: HOSPITALITY
      - Sheet 14: DEVELOPER
      - Sheet 15: WORKING COMMITTEE (strictly Working Committee members only)
      - Sheet 16: ALL (consolidated combination of Sheets 1–14 + Sheet 15)
    
    Timestamps in Indian Standard Time (Asia/Kolkata).
    Chronological event date columns across all sheets.
    Total Days Present calculated when both Check-In and Check-Out are recorded on that date.
    """
    # 1. Determine all event dates (from configuration and existing records)
    configured_dates = [d[0] for d in db.query(FestivalEventDate.date).filter(FestivalEventDate.is_active == True).all()]
    rec_dates_dept = [r[0] for r in db.query(AttendanceRecord.attendance_date).distinct().all()]
    rec_dates_wc = [r[0] for r in db.query(WorkingCommitteeAttendance.attendance_date).distinct().all()]
    all_dates = sorted(list(set(configured_dates + rec_dates_dept + rec_dates_wc)))

    if not all_dates:
        all_dates = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]

    # 2. Query all participants (Department Members)
    user_query = db.query(User).filter(
        User.role.in_(["PARTICIPANT", "VOLUNTEER", "STUDENT"])
    )
    if department and department != "all":
        user_query = user_query.filter(User.department == department)
    if institute and institute != "all":
        user_query = user_query.filter(User.institute == institute)
    if current_user.role == "ADMIN" and current_user.volunteer_domain:
        admin_aliases = get_domain_aliases(current_user.volunteer_domain)
        domain_filters = [func.lower(User.volunteer_domain).like(f"%{a}%") for a in admin_aliases]
        user_query = user_query.filter(User.volunteer_domain.isnot(None), or_(*domain_filters))
    elif akv_dept and akv_dept != "all":
        domain_aliases = get_domain_aliases(akv_dept)
        domain_filters = [func.lower(User.volunteer_domain).like(f"%{a}%") for a in domain_aliases]
        user_query = user_query.filter(User.volunteer_domain.isnot(None), or_(*domain_filters))

    all_participants = user_query.order_by(User.name.asc()).all()
    dept_user_ids = [p.id for p in all_participants]

    # Department attendance records lookup
    dept_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id.in_(dept_user_ids)
    ).all() if dept_user_ids else []
    dept_rec_lookup = {(r.user_id, r.attendance_date): r for r in dept_records}

    # 3. Query Working Committee members & records (SuperAdmin only)
    is_superadmin = (current_user.role == "SUPERADMIN")
    wc_members = []
    wc_rec_lookup = {}
    if is_superadmin:
        wc_members = get_wc_members_query(db).order_by(User.name.asc()).all()
        wc_member_ids = [m.id for m in wc_members]
        wc_records = db.query(WorkingCommitteeAttendance).filter(
            WorkingCommitteeAttendance.working_committee_member_id.in_(wc_member_ids)
        ).all() if wc_member_ids else []
        wc_rec_lookup = {(r.working_committee_member_id, r.attendance_date): r for r in wc_records}

    # 4. Initialize Workbook
    wb = openpyxl.Workbook()
    now_ist_str = get_current_ist_datetime().strftime("%d/%m/%Y %I:%M:%S %p IST")

    # Common Column Width Overrides
    common_col_widths = {
        "A": 16,  # Reg ID
        "B": 24,  # Name
        "C": 16,  # AUID
        "D": 28,  # Institute
        "E": 28,  # Dept
        "F": 22   # Domain / Role
    }

    # Date headers
    date_cols = []
    for d in all_dates:
        dmy = iso_date_to_dmy(d)
        date_cols.append(f"{dmy} Time In")
        date_cols.append(f"{dmy} Time Out")

    # Helper to build participant row values
    def make_dept_row(p, role_col_val):
        days_present = 0
        date_times = []
        managed_by_set = set()

        for d in all_dates:
            rec = dept_rec_lookup.get((p.id, d))
            time_in_str = format_to_ist_time(rec.check_in_at) if rec and rec.check_in_at else "--"
            time_out_str = format_to_ist_time(rec.check_out_at) if rec and rec.check_out_at else "--"
            date_times.append(time_in_str)
            date_times.append(time_out_str)

            if rec and rec.check_in_at and rec.check_out_at:
                days_present += 1

            if rec and rec.submitted_by:
                managed_by_set.add(rec.submitted_by)
            elif rec and rec.last_modified_by:
                managed_by_set.add(rec.last_modified_by)

        managed_by_str = ", ".join(list(managed_by_set)) if managed_by_set else (p.managed_by or current_user.name or "AKV Coordinator")
        row = [
            p.registration_id or f"AKVNT{p.id:04d}",
            p.name,
            (p.auid or "").strip().upper() or "--",
            p.institute or "Acharya Institute of Technology",
            p.department or "--",
            role_col_val
        ]
        row.extend(date_times)
        row.extend([
            days_present,
            p.phone or "--",
            managed_by_str
        ])
        return row, days_present

    # Helper to build participant row values
    def make_dept_row(p, role_col_val):
        days_present = 0
        date_times = []
        managed_by_set = set()

        for d in all_dates:
            rec = dept_rec_lookup.get((p.id, d))
            is_present = bool(rec and (
                rec.status in ["PRESENT", "COMPLETED"] or 
                (rec.check_in_at and rec.check_out_at) or 
                (rec.status != "ABSENT" and rec.check_in_at)
            ))
            time_in_str = format_to_ist_time(rec.check_in_at) if (rec and rec.check_in_at and rec.check_in_at != rec.check_out_at) else ("Present" if is_present else ("Absent" if rec and rec.status == "ABSENT" else "--"))
            time_out_str = format_to_ist_time(rec.check_out_at) if (rec and rec.check_out_at and rec.check_in_at != rec.check_out_at) else ("Present" if is_present else ("Absent" if rec and rec.status == "ABSENT" else "--"))
            date_times.append(time_in_str)
            date_times.append(time_out_str)

            if is_present:
                days_present += 1

            if rec and rec.submitted_by:
                managed_by_set.add(rec.submitted_by)
            elif rec and rec.last_modified_by:
                managed_by_set.add(rec.last_modified_by)

        managed_by_str = ", ".join(list(managed_by_set)) if managed_by_set else (p.managed_by or current_user.name or "AKV Coordinator")
        row = [
            p.registration_id or f"AKVNT{p.id:04d}",
            p.name,
            (p.auid or "").strip().upper() or "--",
            p.institute or "Acharya Institute of Technology",
            p.department or "--",
            role_col_val
        ]
        row.extend(date_times)
        row.extend([
            days_present,
            p.phone or "--",
            managed_by_str
        ])
        return row, days_present

    # Helper to build Working Committee row values
    def make_wc_row(m, role_col_val):
        days_present = 0
        date_times = []
        managed_by_set = set()

        for d in all_dates:
            rec = wc_rec_lookup.get((m.id, d))
            is_present = bool(rec and (
                rec.status in ["PRESENT", "COMPLETED"] or 
                (rec.check_in_at and rec.check_out_at) or 
                (rec.status != "ABSENT" and rec.check_in_at)
            ))
            time_in_str = format_to_ist_time(rec.check_in_at) if (rec and rec.check_in_at and rec.check_in_at != rec.check_out_at) else ("Present" if is_present else ("Absent" if rec and rec.status == "ABSENT" else "--"))
            time_out_str = format_to_ist_time(rec.check_out_at) if (rec and rec.check_out_at and rec.check_in_at != rec.check_out_at) else ("Present" if is_present else ("Absent" if rec and rec.status == "ABSENT" else "--"))
            date_times.append(time_in_str)
            date_times.append(time_out_str)

            if is_present:
                days_present += 1

            if rec and rec.submitted_by:
                managed_by_set.add(rec.submitted_by)
            elif rec and rec.last_modified_by:
                managed_by_set.add(rec.last_modified_by)

        managed_by_str = ", ".join(list(managed_by_set)) if managed_by_set else (m.managed_by or current_user.name or "AKV Superadmin")
        row = [
            m.registration_id or f"WC{m.id:03d}",
            m.name,
            (m.auid or "").strip().upper() or "--",
            m.institute or "Acharya Institute of Technology",
            m.department or "--",
            role_col_val
        ]
        row.extend(date_times)
        row.extend([
            days_present,
            m.phone or "--",
            managed_by_str
        ])
        return row, days_present

    # ==========================================================================
    # SHEETS 1 TO 13: INDIVIDUAL DEPARTMENT / DOMAIN GROUPS
    # ==========================================================================
    dept_headers = ["Reg ID", "Name", "AUID", "Institute", "Dept", "AKV-Dept"]
    dept_headers.extend(date_cols)
    dept_headers.extend(["Total Days Present", "Contact No.", "Managed By"])

    target_groups = DEPARTMENT_GROUPS
    if current_user.role == "ADMIN" and current_user.volunteer_domain:
        admin_aliases = get_domain_aliases(current_user.volunteer_domain)
        target_groups = [(g, a) for g, a in DEPARTMENT_GROUPS if any(x in admin_aliases for x in a)]
        if not target_groups:
            target_groups = [(current_user.volunteer_domain.upper(), admin_aliases)]

    for idx, (group_sheet_name, aliases) in enumerate(target_groups):
        if idx == 0:
            ws = wb.active
            ws.title = group_sheet_name
        else:
            ws = wb.create_sheet(title=group_sheet_name)

        # Filter members whose volunteer_domain matches alias
        group_members = [
            p for p in all_participants 
            if p.volunteer_domain and any(a in p.volunteer_domain.lower() for a in aliases)
        ]

        rows_data = []
        for p in group_members:
            r_vals, _ = make_dept_row(p, p.volunteer_domain or group_sheet_name)
            rows_data.append(r_vals)

        sub_text = f"Official Department Attendance Sheet • {group_sheet_name} • Generated: {now_ist_str} • Generated By: {current_user.name}"
        populate_attendance_worksheet(ws, group_sheet_name, sub_text, dept_headers, rows_data, common_col_widths)

    # ==========================================================================
    # SHEET 14: WORKING COMMITTEE
    # ==========================================================================
    ws_wc = wb.create_sheet(title="WORKING COMMITTEE")
    wc_headers = ["Reg ID", "Name", "AUID", "Institute", "Dept", "AKV_DOMAIN"]
    wc_headers.extend(date_cols)
    wc_headers.extend(["Total Days Present", "Contact No.", "Managed By"])

    wc_rows_data = []
    for m in wc_members:
        r_vals, _ = make_wc_row(m, m.volunteer_domain or m.department or m.working_committee_role or "Coordinator")
        wc_rows_data.append(r_vals)

    sub_text_wc = f"Official Working Committee Attendance • Generated: {now_ist_str} • Generated By: {current_user.name}"
    populate_attendance_worksheet(ws_wc, "WORKING COMMITTEE", sub_text_wc, wc_headers, wc_rows_data, common_col_widths)

    # ==========================================================================
    # SHEET 15: CONSOLIDATED (SHEETS 1–13 + WORKING COMMITTEE)
    # ==========================================================================
    ws_all = wb.create_sheet(title="CONSOLIDATED")
    all_headers = ["Reg ID", "Name", "AUID", "Institute", "Dept", "AKV_DOMAIN"]
    all_headers.extend(date_cols)
    all_headers.extend(["Total Days Present", "Contact No.", "Managed By", "Member Type"])

    all_rows_data = []
    seen_user_ids = set()

    # 1. Normal Department Participants
    for p in all_participants:
        # Check if this user is also a working committee member
        is_in_wc = any(m.id == p.id for m in wc_members)
        if not is_in_wc:
            r_vals, _ = make_dept_row(p, p.volunteer_domain or p.department or "--")
            r_vals.append("DEPARTMENT")
            all_rows_data.append(r_vals)
            seen_user_ids.add(p.id)

    # 2. Working Committee Members
    for m in wc_members:
        if m.id not in seen_user_ids:
            r_vals, _ = make_wc_row(m, m.volunteer_domain or m.department or m.working_committee_role or "Coordinator")
            r_vals.append("WORKING COMMITTEE")
            all_rows_data.append(r_vals)
            seen_user_ids.add(m.id)

    sub_text_all = f"Official Consolidated Attendance Sheet (All Departments + Working Committee) • Generated: {now_ist_str} • Generated By: {current_user.name}"
    populate_attendance_worksheet(ws_all, "CONSOLIDATED", sub_text_all, all_headers, all_rows_data, common_col_widths)

    # Save to BytesIO
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"AKV_NudiTaranga_Attendance_{get_current_ist_date_str()}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
