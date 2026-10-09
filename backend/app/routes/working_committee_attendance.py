import io
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, defer
from sqlalchemy import func, or_
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from ..database import get_db
from ..models import (
    User, 
    Admin, 
    AttendanceRecord,
    FestivalEventDate,
    WorkingCommitteeAttendance,
    WorkingCommitteeDaySession,
    WorkingCommitteeAuditLog
)
from ..auth_deps import require_wc_superadmin
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

router = APIRouter(prefix="/working-committee-attendance", tags=["Working Committee Attendance"])

def attendance_units(check_in_at, check_out_at) -> float:
    """Convert completed attendance duration into full-day units (1 day if checked in and checked out)."""
    if not check_in_at or not check_out_at:
        return 0.0
    return 1.0


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class WCMarkAttendanceRequest(BaseModel):
    user_id: Optional[int] = Field(None, description="Working Committee User ID")
    working_committee_member_id: Optional[int] = Field(None, description="Working Committee Member ID")
    date: Optional[str] = Field(None, description="Event date YYYY-MM-DD (defaults to server IST date)")
    status: str = Field(..., description="PRESENT or ABSENT")

class WCCheckInRequest(BaseModel):
    user_id: Optional[int] = Field(None, description="Working Committee User ID")
    working_committee_member_id: Optional[int] = Field(None, description="Working Committee Member ID")
    date: Optional[str] = Field(None, description="Event date YYYY-MM-DD (defaults to server IST date)")

class WCCheckOutRequest(BaseModel):
    user_id: Optional[int] = Field(None, description="Working Committee User ID")
    working_committee_member_id: Optional[int] = Field(None, description="Working Committee Member ID")
    date: Optional[str] = Field(None, description="Event date YYYY-MM-DD (defaults to server IST date)")

class WCSubmitAttendanceRequest(BaseModel):
    date: str = Field(..., description="Event date YYYY-MM-DD")
    notes: Optional[str] = None

class WCUnlockSessionRequest(BaseModel):
    date: str = Field(..., description="Event date YYYY-MM-DD")
    reason: str = Field(..., min_length=3, description="Superadmin reason for unlocking submitted attendance")

class WCEditAttendanceRequest(BaseModel):
    check_in_time: Optional[str] = Field(None, description="Time string (e.g. '09:30:22 AM' or ISO format)")
    check_out_time: Optional[str] = Field(None, description="Time string (e.g. '04:45:12 PM' or ISO format)")
    status: Optional[str] = Field(None, description="PRESENT, ABSENT, NOT_MARKED, COMPLETED, CHECKED_IN")
    reason: str = Field(..., min_length=3, description="Audit reason for modifying official attendance")

class WCResetAttendanceRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason for resetting attendance")

class AddWCMemberRequest(BaseModel):
    user_id: Optional[int] = Field(None, description="Existing user ID if assigning existing user")
    name: Optional[str] = Field(None, description="Full Name if creating a new member")
    email: Optional[str] = Field(None, description="Email address if creating new member")
    phone: Optional[str] = Field(None, description="Contact Number")
    auid: Optional[str] = Field(None, description="AUID")
    institute: Optional[str] = Field("Acharya Institute of Technology", description="Institute name")
    department: Optional[str] = Field(None, description="Academic department")
    working_committee_role: str = Field("Coordinator", description="Working Committee Role (e.g. Coordinator, Volunteer, Lead)")
    registration_id: Optional[str] = Field(None, description="Registration ID (e.g. WC001)")

class UpdateWCMemberRequest(BaseModel):
    working_committee_role: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    institute: Optional[str] = None
    managed_by: Optional[str] = None


# Helper to query all Working Committee member users
def get_wc_members_query(db: Session):
    """
    Returns query for users who are recognized as Working Committee members:
    - User.is_working_committee is True
    - OR User.admin_type == 'WORKING_COMMITTEE' and User.role in ['ADMIN', 'WORKING_COMMITTEE']
    - OR User.role == 'WORKING_COMMITTEE'
    - OR User.volunteer_domain == 'Working Committee'
    """
    return db.query(User).options(defer(User.photo_url), defer(User.password_hash)).filter(
        or_(
            User.is_working_committee == True,
            (User.admin_type == "WORKING_COMMITTEE") & (User.role.in_(["ADMIN", "WORKING_COMMITTEE"])),
            User.role == "WORKING_COMMITTEE",
            User.volunteer_domain == "Working Committee",
            User.working_committee_role.isnot(None)
        )
    )

ATTENDANCE_DEADLINE_END_DATE = "2026-11-05"  # Active till 5/11/2026, then disabled

def verify_wc_attendance_date_is_open(date_str: str):
    today = get_current_ist_date_str()
    if today > ATTENDANCE_DEADLINE_END_DATE or date_str > ATTENDANCE_DEADLINE_END_DATE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Working committee attendance marking closed on November 5, 2026 (05/11/2026). Further attendance marking is disabled."
        )
    if date_str > today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance cannot be marked before the selected date arrives."
        )


# ==============================================================================
# 1. GET WORKING COMMITTEE ATTENDANCE ROSTER & SUMMARY METRICS
# ==============================================================================

@router.get("")
def get_working_committee_attendance(
    date: Optional[str] = Query(None, description="Event date YYYY-MM-DD (defaults to server IST date)"),
    search: Optional[str] = Query(None, description="Search by Name, AUID, Reg ID, Phone"),
    role_filter: Optional[str] = Query(None, description="Filter by Working Committee Role: Coordinator, Volunteer, etc."),
    status_filter: Optional[str] = Query(None, description="NOT_MARKED, CHECKED_IN, COMPLETED"),
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY:
    Returns the Working Committee attendance roster for the selected date,
    including independent session submission/lock state and summary statistics.
    """
    target_date = date.strip() if date else get_current_ist_date_str()
    today_ist = get_current_ist_date_str()

    # 1. Day Session state
    session = db.query(WorkingCommitteeDaySession).filter(
        WorkingCommitteeDaySession.attendance_date == target_date
    ).first()
    is_submitted = bool(session and session.is_submitted)
    submitted_by = session.submitted_by if session else None
    submitted_at_ist = format_to_ist_datetime(session.submitted_at) if session and session.submitted_at else None

    # 2. Query Working Committee members
    member_query = get_wc_members_query(db)

    if role_filter and isinstance(role_filter, str) and role_filter != "all":
        member_query = member_query.filter(
            func.lower(User.working_committee_role) == role_filter.strip().lower()
        )

    if search and isinstance(search, str):
        s = f"%{search.strip().lower()}%"
        member_query = member_query.filter(
            or_(
                func.lower(User.name).like(s),
                func.lower(User.auid).like(s),
                func.lower(User.registration_id).like(s),
                func.lower(User.phone).like(s),
                func.lower(User.department).like(s),
                func.lower(User.working_committee_role).like(s)
            )
        )

    members = member_query.order_by(User.name.asc()).all()
    member_ids = [m.id for m in members]

    # 3. Query existing Working Committee attendance records for this date
    records = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.attendance_date == target_date,
        WorkingCommitteeAttendance.working_committee_member_id.in_(member_ids) if member_ids else False
    ).all()
    records_by_uid = {r.working_committee_member_id: r for r in records}

    # 4. Global statistics across ALL Working Committee members for this date
    wc_user_ids = get_wc_members_query(db).with_entities(User.id).subquery()
    total_wc_count = db.query(func.count()).select_from(wc_user_ids).scalar() or 0
    global_status_counts = dict(db.query(WorkingCommitteeAttendance.status, func.count(WorkingCommitteeAttendance.id))
        .join(wc_user_ids, wc_user_ids.c.id == WorkingCommitteeAttendance.working_committee_member_id)
        .filter(WorkingCommitteeAttendance.attendance_date == target_date)
        .group_by(WorkingCommitteeAttendance.status).all())

    count_present = (
        global_status_counts.get("PRESENT", 0) +
        global_status_counts.get("COMPLETED", 0) +
        global_status_counts.get("CHECKED_IN", 0)
    )
    count_absent = global_status_counts.get("ABSENT", 0)
    count_not_marked = total_wc_count - (count_present + count_absent)
    if count_not_marked < 0:
        count_not_marked = 0

    # 5. Build output roster
    output_members = []
    for m in members:
        rec = records_by_uid.get(m.id)
        raw_status = rec.status if rec else "NOT_MARKED"
        if raw_status in ["CHECKED_IN", "COMPLETED", "PRESENT"]:
            current_status = "PRESENT"
        elif raw_status == "ABSENT":
            current_status = "ABSENT"
        else:
            current_status = "NOT_MARKED"

        if status_filter and isinstance(status_filter, str) and status_filter != "all":
            sf = status_filter.strip().upper()
            if sf in ["CHECKED_IN", "COMPLETED", "PRESENT"] and current_status != "PRESENT":
                continue
            elif sf == "ABSENT" and current_status != "ABSENT":
                continue
            elif sf == "NOT_MARKED" and current_status != "NOT_MARKED":
                continue

        cin_time = format_to_ist_time(rec.check_in_at) if rec and rec.check_in_at else None
        cout_time = format_to_ist_time(rec.check_out_at) if rec and rec.check_out_at else None
        units = 1.0 if current_status == "PRESENT" else 0.0

        output_members.append({
            "id": rec.id if rec else None,
            "record_id": rec.id if rec else None,
            "user_id": m.id,
            "working_committee_member_id": m.id,
            "reg_id": m.registration_id or f"WC{m.id:03d}",
            "name": m.name,
            "akv_dept": m.volunteer_domain or "--",
            "auid": m.auid,
            "institute": m.institute,
            "department": m.department,
            "role": m.working_committee_role or "Coordinator",
            "contact": m.phone,
            "managed_by": m.managed_by or "Super Admin",
            "photo_url": m.photo_url,
            "check_in_time": cin_time,
            "check_out_time": cout_time,
            "attendance_units": units,
            "status": current_status,
            "is_present": (current_status == "PRESENT"),
            "is_absent": (current_status == "ABSENT"),
            "is_not_marked": (current_status == "NOT_MARKED"),
            "submitted": is_submitted or (rec.submitted if rec else False),
            "submitted_by": rec.submitted_by if rec else submitted_by,
            "last_modified_by": rec.last_modified_by if rec else None,
            "can_mark": not is_submitted
        })

    return {
        "success": True,
        "date": target_date,
        "date_dmy": iso_date_to_dmy(target_date),
        "is_today": (target_date == today_ist),
        "session": {
            "is_submitted": is_submitted,
            "submitted_at": submitted_at_ist,
            "submitted_by": submitted_by
        },
        "summary": {
            "total_members": total_wc_count,
            "present": count_present,
            "absent": count_absent,
            "count_present": count_present,
            "count_absent": count_absent,
            "count_not_marked": count_not_marked,
            "checked_in": count_present,
            "completed": count_present,
            "not_marked": count_not_marked,
            "is_submitted": is_submitted
        },
        "members": output_members
    }


# ==============================================================================
# 2. WORKING COMMITTEE ATTENDANCE MARKING: PRESENT & ABSENT
# ==============================================================================

@router.post("/mark")
def mark_wc_attendance(
    payload: WCMarkAttendanceRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    Mark Working Committee Attendance directly as PRESENT or ABSENT.
    Replaces check-in / check-out with clean single-tap Present/Absent state.
    SUPERADMIN ONLY.
    """
    target_uid = payload.working_committee_member_id or payload.user_id
    if not target_uid:
        raise HTTPException(status_code=400, detail="Missing user_id or working_committee_member_id")

    target_date = payload.date.strip() if payload.date else get_current_ist_date_str()
    verify_wc_attendance_date_is_open(target_date)

    norm_status = payload.status.strip().upper()
    if norm_status not in ["PRESENT", "ABSENT"]:
        raise HTTPException(status_code=400, detail="Status must be either PRESENT or ABSENT")

    # Verify session not locked
    session = db.query(WorkingCommitteeDaySession).filter(
        WorkingCommitteeDaySession.attendance_date == target_date
    ).first()
    if session and session.is_submitted and current_user.role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Working Committee attendance session is submitted and locked.")

    user = db.query(User).filter(User.id == target_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Working Committee member not found")

    now_utc = get_current_utc_datetime()

    rec = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.working_committee_member_id == user.id,
        WorkingCommitteeAttendance.attendance_date == target_date
    ).first()

    if rec:
        if norm_status == "PRESENT":
            rec.status = "PRESENT"
            if not rec.check_in_at:
                rec.check_in_at = now_utc
            if not rec.check_out_at:
                rec.check_out_at = now_utc
        else:
            rec.status = "ABSENT"
            rec.check_in_at = None
            rec.check_out_at = None
        rec.last_modified_by = f"{current_user.name} (Super Admin)"
        rec.last_modified_at = now_utc
    else:
        rec = WorkingCommitteeAttendance(
            working_committee_member_id=user.id,
            attendance_date=target_date,
            status=norm_status,
            check_in_at=now_utc if norm_status == "PRESENT" else None,
            check_out_at=now_utc if norm_status == "PRESENT" else None,
            last_modified_by=f"{current_user.name} (Super Admin)",
            last_modified_at=now_utc
        )
        db.add(rec)

    db.flush()

    audit = WorkingCommitteeAuditLog(
        attendance_id=rec.id,
        working_committee_member_id=user.id,
        member_name=user.name,
        attendance_date=target_date,
        action=f"MARK_{norm_status}",
        new_check_in=format_to_ist_time(rec.check_in_at) if rec.check_in_at else norm_status,
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason=f"Working Committee attendance marked {norm_status}"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"{user.name} marked {norm_status} for {iso_date_to_dmy(target_date)}.",
        "record": {
            "id": rec.id,
            "working_committee_member_id": user.id,
            "status": rec.status,
            "check_in_time": format_to_ist_time(rec.check_in_at) if rec.check_in_at else None,
            "check_out_time": format_to_ist_time(rec.check_out_at) if rec.check_out_at else None,
            "date": target_date
        }
    }


# Legacy Check-In & Check-Out Compatibility Endpoints
@router.post("/check-in")
def mark_wc_check_in(
    payload: WCCheckInRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    First marking for Working Committee: CHECK-IN.
    SUPERADMIN ONLY (enforced by require_wc_superadmin).
    Official server-side timestamp generated in IST.
    """
    target_uid = payload.working_committee_member_id or payload.user_id
    if not target_uid:
        raise HTTPException(status_code=400, detail="Missing user_id or working_committee_member_id")

    target_date = payload.date.strip() if payload.date else get_current_ist_date_str()
    verify_wc_attendance_date_is_open(target_date)

    user = db.query(User).filter(User.id == target_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Working Committee member not found")

    now_utc = get_current_utc_datetime()

    # Query existing record
    rec = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.working_committee_member_id == user.id,
        WorkingCommitteeAttendance.attendance_date == target_date
    ).first()

    if rec:
        if rec.check_in_at is not None and rec.check_out_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance already completed for today. No further markings allowed."
            )
        if rec.check_in_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Working Committee member is already checked in. Proceed to Check-Out."
            )
        rec.check_in_at = now_utc
        rec.status = "CHECKED_IN"
        rec.last_modified_by = f"{current_user.name} (Super Admin)"
        rec.last_modified_at = now_utc
    else:
        rec = WorkingCommitteeAttendance(
            working_committee_member_id=user.id,
            attendance_date=target_date,
            check_in_at=now_utc,
            status="CHECKED_IN",
            last_modified_by=f"{current_user.name} (Super Admin)",
            last_modified_at=now_utc
        )
        db.add(rec)

    db.flush()

    # Audit log
    audit = WorkingCommitteeAuditLog(
        attendance_id=rec.id,
        working_committee_member_id=user.id,
        member_name=user.name,
        attendance_date=target_date,
        action="CHECK_IN",
        new_check_in=format_to_ist_time(rec.check_in_at),
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason="Working Committee Check-In recorded"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Check-In recorded for {user.name} at {format_to_ist_time(rec.check_in_at)} IST.",
        "record": {
            "id": rec.id,
            "working_committee_member_id": user.id,
            "status": rec.status,
            "check_in_time": format_to_ist_time(rec.check_in_at),
            "check_out_time": None,
            "date": target_date
        }
    }


@router.post("/check-out")
def mark_wc_check_out(
    payload: WCCheckOutRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    Second marking for Working Committee: CHECK-OUT.
    SUPERADMIN ONLY (enforced by require_wc_superadmin).
    Transitions status to COMPLETED. Subsequent attempts rejected.
    """
    target_uid = payload.working_committee_member_id or payload.user_id
    if not target_uid:
        raise HTTPException(status_code=400, detail="Missing user_id or working_committee_member_id")

    target_date = payload.date.strip() if payload.date else get_current_ist_date_str()
    verify_wc_attendance_date_is_open(target_date)

    user = db.query(User).filter(User.id == target_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Working Committee member not found")

    now_utc = get_current_utc_datetime()

    rec = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.working_committee_member_id == user.id,
        WorkingCommitteeAttendance.attendance_date == target_date
    ).first()

    if not rec or rec.check_in_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member has not checked in yet. Check-in is required before check-out."
        )

    if rec.check_out_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already completed for today. No further markings allowed."
        )

    elapsed = now_utc - rec.check_in_at
    if elapsed.total_seconds() < 3600:
        remaining_minutes = max(1, 60 - int(elapsed.total_seconds() // 60))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-Out will be available after one hour of Check-In. Please wait {remaining_minutes} more minute(s)."
        )

    rec.check_out_at = now_utc
    rec.status = "COMPLETED"
    rec.last_modified_by = f"{current_user.name} (Super Admin)"
    rec.last_modified_at = now_utc

    audit = WorkingCommitteeAuditLog(
        attendance_id=rec.id,
        working_committee_member_id=user.id,
        member_name=user.name,
        attendance_date=target_date,
        action="CHECK_OUT",
        old_check_in=format_to_ist_time(rec.check_in_at),
        new_check_out=format_to_ist_time(rec.check_out_at),
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason="Working Committee Check-Out recorded"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Check-Out recorded for {user.name} at {format_to_ist_time(rec.check_out_at)} IST. Attendance Completed.",
        "record": {
            "id": rec.id,
            "working_committee_member_id": user.id,
            "status": rec.status,
            "check_in_time": format_to_ist_time(rec.check_in_at),
            "check_out_time": format_to_ist_time(rec.check_out_at),
            "date": target_date
        }
    }


# ==============================================================================
# 3. SUBMIT & LOCK WORKING COMMITTEE ATTENDANCE
# ==============================================================================

@router.post("/submit")
def submit_working_committee_attendance(
    payload: WCSubmitAttendanceRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Submits and locks Working Committee attendance for that date.
    Maintains independent lock state from normal department attendance.
    """
    target_date = payload.date.strip()
    now_utc = get_current_utc_datetime()

    session = db.query(WorkingCommitteeDaySession).filter(
        WorkingCommitteeDaySession.attendance_date == target_date
    ).first()

    if not session:
        session = WorkingCommitteeDaySession(attendance_date=target_date)
        db.add(session)

    session.is_submitted = True
    session.submitted_at = now_utc
    session.submitted_by = current_user.name
    session.notes = payload.notes

    # Update all Working Committee records for this date to submitted = True
    records = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.attendance_date == target_date
    ).all()
    for r in records:
        r.submitted = True
        r.submitted_at = now_utc
        r.submitted_by = current_user.name

    # Audit log
    audit = WorkingCommitteeAuditLog(
        attendance_id=None,
        working_committee_member_id=current_user.id,
        member_name="ALL_WORKING_COMMITTEE",
        attendance_date=target_date,
        action="SUBMIT_ATTENDANCE",
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason=payload.notes or "Official Working Committee Attendance Finalized"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Working Committee attendance for {iso_date_to_dmy(target_date)} submitted and locked.",
        "submitted_at": format_to_ist_datetime(session.submitted_at),
        "submitted_by": session.submitted_by,
        "session": {
            "is_submitted": True,
            "submitted_at": format_to_ist_datetime(session.submitted_at),
            "submitted_by": session.submitted_by
        }
    }


@router.post("/session/unlock")
def unlock_wc_session(
    payload: WCUnlockSessionRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Unlocks submitted Working Committee attendance session for a date.
    """
    target_date = payload.date.strip()
    now_utc = get_current_utc_datetime()

    session = db.query(WorkingCommitteeDaySession).filter(
        WorkingCommitteeDaySession.attendance_date == target_date
    ).first()

    if not session or not session.is_submitted:
        raise HTTPException(status_code=400, detail="Working Committee attendance for this date is not currently submitted.")

    session.is_submitted = False
    session.unlocked_at = now_utc
    session.unlocked_by = current_user.name

    records = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.attendance_date == target_date
    ).all()
    for r in records:
        r.submitted = False

    audit = WorkingCommitteeAuditLog(
        attendance_id=None,
        working_committee_member_id=current_user.id,
        member_name="ALL_WORKING_COMMITTEE",
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
        "message": f"Working Committee attendance session for {iso_date_to_dmy(target_date)} unlocked successfully."
    }


# ==============================================================================
# 4. SUPERADMIN OVERRIDE: EDIT & RESET
# ==============================================================================

@router.patch("/{attendance_id}")
def edit_wc_attendance_record(
    attendance_id: int,
    payload: WCEditAttendanceRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Edit Working Committee attendance timestamps and status.
    Mandatory audit log is recorded.
    """
    rec = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.id == attendance_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Working Committee attendance record not found")

    old_cin_str = format_to_ist_time(rec.check_in_at)
    old_cout_str = format_to_ist_time(rec.check_out_at)
    now_utc = get_current_utc_datetime()

    if payload.check_in_time is not None:
        clean = payload.check_in_time.strip()
        if clean == "" or clean == "--":
            rec.check_in_at = None
        else:
            try:
                rec.check_in_at = datetime.datetime.fromisoformat(clean.replace("Z", "+00:00"))
            except Exception:
                rec.check_in_at = now_utc

    if payload.check_out_time is not None:
        clean = payload.check_out_time.strip()
        if clean == "" or clean == "--":
            rec.check_out_at = None
        else:
            try:
                rec.check_out_at = datetime.datetime.fromisoformat(clean.replace("Z", "+00:00"))
            except Exception:
                rec.check_out_at = now_utc

    if payload.status:
        st = payload.status.upper()
        if st in ["PRESENT", "COMPLETED", "CHECKED_IN"]:
            rec.status = "PRESENT"
            if not rec.check_in_at:
                rec.check_in_at = now_utc
            if not rec.check_out_at:
                rec.check_out_at = now_utc
        elif st == "ABSENT":
            rec.status = "ABSENT"
            rec.check_in_at = None
            rec.check_out_at = None
        else:
            rec.status = "NOT_MARKED"
            rec.check_in_at = None
            rec.check_out_at = None
    else:
        if rec.check_in_at or rec.check_out_at:
            rec.status = "PRESENT"
        else:
            rec.status = "NOT_MARKED"

    rec.last_modified_by = f"{current_user.name} (Super Admin)"
    rec.last_modified_at = now_utc

    user_name = rec.user.name if rec.user else f"Member #{rec.working_committee_member_id}"

    audit = WorkingCommitteeAuditLog(
        attendance_id=rec.id,
        working_committee_member_id=rec.working_committee_member_id,
        member_name=user_name,
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
        "message": f"Working Committee attendance #{rec.id} updated successfully.",
        "record": {
            "id": rec.id,
            "status": rec.status,
            "check_in_time": format_to_ist_time(rec.check_in_at),
            "check_out_time": format_to_ist_time(rec.check_out_at)
        }
    }


@router.post("/{attendance_id}/reset")
def reset_wc_attendance_record(
    attendance_id: int,
    payload: WCResetAttendanceRequest = WCResetAttendanceRequest(),
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Resets a Working Committee attendance record for the day to NOT_MARKED.
    """
    rec = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.id == attendance_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Working Committee attendance record not found")

    old_cin = format_to_ist_time(rec.check_in_at)
    old_cout = format_to_ist_time(rec.check_out_at)
    now_utc = get_current_utc_datetime()

    rec.check_in_at = None
    rec.check_out_at = None
    rec.status = "NOT_MARKED"
    rec.last_modified_by = f"{current_user.name} (Super Admin)"
    rec.last_modified_at = now_utc

    user_name = rec.user.name if rec.user else f"Member #{rec.working_committee_member_id}"

    audit = WorkingCommitteeAuditLog(
        attendance_id=rec.id,
        working_committee_member_id=rec.working_committee_member_id,
        member_name=user_name,
        attendance_date=rec.attendance_date,
        old_check_in=old_cin,
        new_check_in="--",
        old_check_out=old_cout,
        new_check_out="--",
        action="SUPERADMIN_RESET",
        modified_by=f"{current_user.name} (Super Admin)",
        modified_at=now_utc,
        reason=payload.reason or "Super Admin Working Committee Reset"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Working Committee attendance for {user_name} reset to NOT MARKED."
    }


# ==============================================================================
# 5. AUDIT LOGS FOR WORKING COMMITTEE
# ==============================================================================

@router.get("/audit")
def get_wc_audit_logs(
    date: Optional[str] = None,
    member_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Retrieve immutable Working Committee audit trail.
    """
    query = db.query(WorkingCommitteeAuditLog)
    if date and date != "all":
        query = query.filter(WorkingCommitteeAuditLog.attendance_date == date)
    if member_id:
        query = query.filter(WorkingCommitteeAuditLog.working_committee_member_id == member_id)

    logs = query.order_by(WorkingCommitteeAuditLog.modified_at.desc()).offset(offset).limit(limit).all()

    output = []
    for l in logs:
        member = db.query(User).filter(User.id == l.working_committee_member_id).first()
        output.append({
            "id": l.id,
            "attendance_id": l.attendance_id,
            "working_committee_member_id": l.working_committee_member_id,
            "member_name": l.member_name,
            "participant_name": l.member_name,
            "akv_dept": member.volunteer_domain if member else "--",
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
# 6. MEMBER MANAGEMENT (ADDING / CONFIGURING WORKING COMMITTEE MEMBERS)
# ==============================================================================

@router.get("/members")
def list_wc_members(
    search: Optional[str] = None,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Retrieve list of all Working Committee members.
    """
    query = get_wc_members_query(db)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.name).like(s),
                func.lower(User.auid).like(s),
                func.lower(User.registration_id).like(s),
                func.lower(User.phone).like(s),
                func.lower(User.department).like(s)
            )
        )
    members = query.order_by(User.name.asc()).all()
    results = []
    for m in members:
        results.append({
            "id": m.id,
            "user_id": m.id,
            "registration_id": m.registration_id or f"WC{m.id:03d}",
            "name": m.name,
            "auid": m.auid,
            "email": m.email,
            "phone": m.phone,
            "institute": m.institute,
            "department": m.department,
            "working_committee_role": m.working_committee_role or "Coordinator",
            "managed_by": m.managed_by or "Super Admin",
            "admin_type": m.admin_type,
            "role": m.role
        })
    return {"success": True, "members": results}


@router.post("/members")
def add_or_assign_wc_member(
    payload: AddWCMemberRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Designates an existing user as Working Committee member,
    or creates a new member without account duplication.
    """
    if payload.user_id:
        user = db.query(User).filter(User.id == payload.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.is_working_committee = True
        user.working_committee_role = payload.working_committee_role.strip() or "Coordinator"
        if payload.registration_id:
            user.registration_id = payload.registration_id.strip()
        db.commit()
        return {
            "success": True,
            "message": f"{user.name} designated as Working Committee ({user.working_committee_role})."
        }
    
    # If creating a new user entity for Working Committee
    if not payload.name or not payload.phone:
        raise HTTPException(status_code=400, detail="Name and Contact Number are required")

    clean_email = payload.email.strip().lower() if payload.email else f"wc_{func.random()}@acharya.ac.in"
    reg_id = payload.registration_id.strip() if payload.registration_id else f"WC{db.query(User).count() + 101:03d}"
    auid_val = payload.auid.strip() if payload.auid else f"WC-AUID-{reg_id}"

    # Check unique constraints
    if db.query(User).filter(User.registration_id == reg_id).first():
        reg_id = f"WC{db.query(User).count() + 201:03d}"

    from ..auth_deps import get_password_hash
    new_user = User(
        name=payload.name.strip(),
        auid=auid_val,
        email=clean_email,
        phone=payload.phone.strip(),
        institute=payload.institute.strip() if payload.institute else "Acharya Institute of Technology",
        department=payload.department.strip() if payload.department else "Working Committee",
        role="ADMIN",
        admin_type="WORKING_COMMITTEE",
        is_working_committee=True,
        working_committee_role=payload.working_committee_role.strip() or "Coordinator",
        registration_id=reg_id,
        password_hash=get_password_hash("AKV@2026"),
        account_status="ACTIVE",
        managed_by=current_user.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "message": f"Working Committee member '{new_user.name}' created with ID {new_user.registration_id}.",
        "member_id": new_user.id
    }


@router.patch("/members/{user_id}")
def update_wc_member(
    user_id: int,
    payload: UpdateWCMemberRequest,
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY: Update Working Committee member details or role.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Working Committee member not found")

    if payload.working_committee_role is not None:
        user.working_committee_role = payload.working_committee_role.strip()
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip()
    if payload.department is not None:
        user.department = payload.department.strip()
    if payload.institute is not None:
        user.institute = payload.institute.strip()
    if payload.managed_by is not None:
        user.managed_by = payload.managed_by.strip()

    db.commit()
    return {"success": True, "message": f"Working Committee member {user.name} updated."}


# ==============================================================================
# 7. COMBINED ATTENDANCE STATS
# ==============================================================================

@router.get("/stats")
def get_combined_attendance_stats(
    date: Optional[str] = Query(None, description="Event date YYYY-MM-DD"),
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY:
    Returns both dedicated Working Committee statistics and combined statistics:
    Department Members, Working Committee Members, Total Members, Checked-In, Completed, Not Marked.
    """
    target_date = date.strip() if date else get_current_ist_date_str()

    # 1. Working Committee stats
    all_wc_users = get_wc_members_query(db).all()
    wc_total = len(all_wc_users)
    wc_user_ids = [u.id for u in all_wc_users]

    wc_records = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.attendance_date == target_date,
        WorkingCommitteeAttendance.working_committee_member_id.in_(wc_user_ids) if wc_user_ids else False
    ).all()

    wc_checked_in = sum(1 for r in wc_records if r.status == "CHECKED_IN")
    wc_completed = sum(1 for r in wc_records if r.status == "COMPLETED")
    wc_not_marked = max(0, wc_total - (wc_checked_in + wc_completed))

    wc_session = db.query(WorkingCommitteeDaySession).filter(
        WorkingCommitteeDaySession.attendance_date == target_date
    ).first()
    wc_submitted = bool(wc_session and wc_session.is_submitted)

    # 2. Normal Department Members stats (excluding users who are Working Committee to prevent double counting)
    dept_users = db.query(User).filter(
        User.role.in_(["PARTICIPANT", "VOLUNTEER", "STUDENT"]),
        User.id.notin_(wc_user_ids) if wc_user_ids else True
    ).all()
    dept_total = len(dept_users)
    dept_user_ids = [u.id for u in dept_users]

    dept_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.attendance_date == target_date,
        AttendanceRecord.user_id.in_(dept_user_ids) if dept_user_ids else False
    ).all()

    dept_checked_in = sum(1 for r in dept_records if r.status == "CHECKED_IN")
    dept_completed = sum(1 for r in dept_records if r.status == "COMPLETED")
    dept_not_marked = max(0, dept_total - (dept_checked_in + dept_completed))

    return {
        "success": True,
        "date": target_date,
        "working_committee": {
            "total_members": wc_total,
            "checked_in": wc_checked_in,
            "completed": wc_completed,
            "not_marked": wc_not_marked,
            "is_submitted": wc_submitted,
            "submitted_label": "YES" if wc_submitted else "NO"
        },
        "department_members": {
            "total_members": dept_total,
            "checked_in": dept_checked_in,
            "completed": dept_completed,
            "not_marked": dept_not_marked
        },
        "combined": {
            "total_members": dept_total + wc_total,
            "checked_in": dept_checked_in + wc_checked_in,
            "completed": dept_completed + wc_completed,
            "not_marked": dept_not_marked + wc_not_marked
        }
    }


# ==============================================================================
# 8. DEDICATED WORKING COMMITTEE EXCEL EXPORT (SHEET 14 FORMAT)
# ==============================================================================

@router.get("/export")
@router.get("/export/excel")
def export_working_committee_excel(
    current_user: User = Depends(require_wc_superadmin),
    db: Session = Depends(get_db)
):
    """
    SUPERADMIN ONLY:
    Generates and downloads the dedicated Working Committee Attendance Excel sheet (Sheet 14 format):
    Reg ID | Name | AUID | Institute | Dept | Working Committee Role | [Date 1] Time In | [Date 1] Time Out | ... | Total Days Present | Contact No. | Managed By
    """
    # 1. Event dates
    configured_dates = [d[0] for d in db.query(FestivalEventDate.date).filter(FestivalEventDate.is_active == True).all()]
    record_dates = [r[0] for r in db.query(WorkingCommitteeAttendance.attendance_date).distinct().all()]
    all_dates = sorted(list(set(configured_dates + record_dates)))
    if not all_dates:
        all_dates = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]

    # 2. Members
    members = get_wc_members_query(db).order_by(User.name.asc()).all()
    member_ids = [m.id for m in members]

    records = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.working_committee_member_id.in_(member_ids)
    ).all() if member_ids else []

    rec_lookup = {(r.working_committee_member_id, r.attendance_date): r for r in records}

    # 3. Workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "WORKING COMMITTEE"

    header_fill = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")
    summary_fill = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid")
    
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

    headers = [
        "Reg ID",
        "Name",
        "AUID",
        "Institute",
        "Dept",
        "AKV_DOMAIN"
    ]

    for d in all_dates:
        dmy = iso_date_to_dmy(d)
        headers.append(f"{dmy} Time In")
        headers.append(f"{dmy} Time Out")

    headers.extend([
        "Total Days Present",
        "Contact No.",
        "Managed By"
    ])

    total_cols = len(headers)
    last_col_letter = get_column_letter(total_cols)

    ws.merge_cells(f"A1:{last_col_letter}1")
    ws["A1"] = "ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026"
    ws["A1"].font = font_title
    ws["A1"].alignment = align_center

    ws.merge_cells(f"A2:{last_col_letter}2")
    now_ist_str = get_current_ist_datetime().strftime("%d/%m/%Y %I:%M:%S %p IST")
    ws["A2"] = f"Official Working Committee Attendance • Generated: {now_ist_str} • Generated By: {current_user.name}"
    ws["A2"].font = font_sub
    ws["A2"].alignment = align_center

    ws.append([])
    ws.append(headers)

    header_row_idx = 4
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

    start_data_row = 5
    for m in members:
        days_present = 0
        date_times = []
        managed_by_set = set()

        for d in all_dates:
            rec = rec_lookup.get((m.id, d))
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

        registered_auid = (m.auid or "").strip().upper() or (m.faculty_id or "").strip().upper() or "--"
        akv_domain_val = m.volunteer_domain or m.department or m.working_committee_role or "--"

        row_values = [
            m.registration_id or f"WC{m.id:03d}",
            m.name,
            registered_auid,
            m.institute or "Acharya Institute of Technology",
            m.department or "--",
            akv_domain_val
        ]
        row_values.extend(date_times)
        row_values.extend([
            days_present,
            m.phone or "--",
            managed_by_str
        ])
        ws.append(row_values)

    end_data_row = ws.max_row
    for row_idx in range(start_data_row, end_data_row + 1):
        for col_idx in range(1, total_cols + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.font = font_data
            cell.border = thin_border
            col_name = headers[col_idx - 1]
            if col_name in ["Name", "Dept", "Institute", "AKV_DOMAIN", "Managed By"]:
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

    # ==========================================================================
    # SHEET 2: CONSOLIDATED (WORKING COMMITTEE & ALL DEPARTMENT VOLUNTEERS)
    # ==========================================================================
    ws_all = wb.create_sheet(title="CONSOLIDATED")
    all_headers = ["Reg ID", "Name", "AUID", "Institute", "Dept", "AKV_DOMAIN"]
    for d in all_dates:
        dmy = iso_date_to_dmy(d)
        all_headers.append(f"{dmy} Time In")
        all_headers.append(f"{dmy} Time Out")
    all_headers.extend([
        "Total Days Present",
        "Contact No.",
        "Managed By",
        "Member Type"
    ])
    total_cols_all = len(all_headers)
    last_col_letter_all = get_column_letter(total_cols_all)

    ws_all.merge_cells(f"A1:{last_col_letter_all}1")
    ws_all["A1"] = "ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026"
    ws_all["A1"].font = font_title
    ws_all["A1"].alignment = align_center

    ws_all.merge_cells(f"A2:{last_col_letter_all}2")
    ws_all["A2"] = f"Official Consolidated Attendance Sheet (Working Committee & All Department Volunteers) • Generated: {now_ist_str} • Generated By: {current_user.name}"
    ws_all["A2"].font = font_sub
    ws_all["A2"].alignment = align_center

    ws_all.append([])
    ws_all.append(all_headers)

    header_row_all = 4
    for col_idx in range(1, total_cols_all + 1):
        cell = ws_all.cell(row=header_row_all, column=col_idx)
        cell.font = font_header
        cell.border = thin_border
        cell.alignment = align_center
        if all_headers[col_idx - 1] == "Total Days Present":
            cell.fill = summary_fill
            cell.font = Font(name="Calibri", size=11, bold=True, color="000000")
        else:
            cell.fill = header_fill

    # Query Department volunteers
    all_volunteers = db.query(User).options(defer(User.photo_url), defer(User.password_hash)).filter(
        User.role.in_(["PARTICIPANT", "VOLUNTEER", "STUDENT"])
    ).order_by(User.name.asc()).all()
    dept_user_ids = [p.id for p in all_volunteers]

    dept_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id.in_(dept_user_ids)
    ).all() if dept_user_ids else []
    dept_rec_lookup = {(r.user_id, r.attendance_date): r for r in dept_records}

    seen_ids = set()

    # 1. Working Committee rows
    for m in members:
        seen_ids.add(m.id)
        days_present = 0
        date_times = []
        managed_by_set = set()

        for d in all_dates:
            rec = rec_lookup.get((m.id, d))
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
        registered_auid = (m.auid or "").strip().upper() or (m.faculty_id or "").strip().upper() or "--"
        akv_domain_val = m.volunteer_domain or m.department or m.working_committee_role or "--"

        row = [
            m.registration_id or f"WC{m.id:03d}",
            m.name,
            registered_auid,
            m.institute or "Acharya Institute of Technology",
            m.department or "--",
            akv_domain_val
        ]
        row.extend(date_times)
        row.extend([
            days_present,
            m.phone or "--",
            managed_by_str,
            "WORKING COMMITTEE"
        ])
        ws_all.append(row)

    # 2. Department volunteer rows
    for p in all_volunteers:
        if p.id in seen_ids:
            continue
        days_present = 0
        date_times = []
        managed_by_set = set()

        for d in all_dates:
            rec = dept_rec_lookup.get((p.id, d))
            time_in_str = format_to_ist_time(rec.check_in_at) if rec and rec.check_in_at else ("Present" if rec and rec.status == "COMPLETED" else "--")
            time_out_str = format_to_ist_time(rec.check_out_at) if rec and rec.check_out_at else ("Present" if rec and rec.status == "COMPLETED" else "--")
            date_times.append(time_in_str)
            date_times.append(time_out_str)

            if rec and (rec.status == "COMPLETED" or (rec.check_in_at and rec.check_out_at) or rec.check_in_at):
                days_present += 1

            if rec and rec.submitted_by:
                managed_by_set.add(rec.submitted_by)
            elif rec and rec.last_modified_by:
                managed_by_set.add(rec.last_modified_by)

        managed_by_str = ", ".join(list(managed_by_set)) if managed_by_set else (p.managed_by or current_user.name or "AKV Coordinator")
        registered_auid = (p.auid or "").strip().upper() or "--"
        akv_domain_val = p.volunteer_domain or p.department or "--"

        row = [
            p.registration_id or f"AKVNT{p.id:04d}",
            p.name,
            registered_auid,
            p.institute or "Acharya Institute of Technology",
            p.department or "--",
            akv_domain_val
        ]
        row.extend(date_times)
        row.extend([
            days_present,
            p.phone or "--",
            managed_by_str,
            "VOLUNTEER / PARTICIPANT"
        ])
        ws_all.append(row)

    end_data_all = ws_all.max_row
    for row_idx in range(5, end_data_all + 1):
        for col_idx in range(1, total_cols_all + 1):
            cell = ws_all.cell(row=row_idx, column=col_idx)
            cell.font = font_data
            cell.border = thin_border
            col_name = all_headers[col_idx - 1]
            if col_name in ["Name", "Dept", "Institute", "AKV_DOMAIN", "Managed By", "Member Type"]:
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

    ws_all.freeze_panes = "A5"
    if end_data_all > header_row_all:
        ws_all.auto_filter.ref = f"A{header_row_all}:{last_col_letter_all}{end_data_all}"

    for col in ws_all.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            if cell.row in [1, 2, 3]:
                continue
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws_all.column_dimensions[col_letter].width = max(max_len + 4, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"AKV_NudiTaranga_Working_Committee_Attendance_{get_current_ist_date_str()}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
