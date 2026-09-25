import io
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
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

# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

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
    status: Optional[str] = Field(None, description="NOT_MARKED, CHECKED_IN, COMPLETED")
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
    return db.query(User).filter(
        or_(
            User.is_working_committee == True,
            (User.admin_type == "WORKING_COMMITTEE") & (User.role.in_(["ADMIN", "WORKING_COMMITTEE"])),
            User.role == "WORKING_COMMITTEE",
            User.volunteer_domain == "Working Committee"
        )
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

    if role_filter and role_filter != "all":
        member_query = member_query.filter(
            func.lower(User.working_committee_role) == role_filter.strip().lower()
        )

    if search:
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
    all_wc_users = get_wc_members_query(db).all()
    total_wc_count = len(all_wc_users)
    all_wc_user_ids = [u.id for u in all_wc_users]

    all_date_records = db.query(WorkingCommitteeAttendance).filter(
        WorkingCommitteeAttendance.attendance_date == target_date,
        WorkingCommitteeAttendance.working_committee_member_id.in_(all_wc_user_ids) if all_wc_user_ids else False
    ).all()

    count_checked_in = sum(1 for r in all_date_records if r.status == "CHECKED_IN")
    count_completed = sum(1 for r in all_date_records if r.status == "COMPLETED")
    count_not_marked = total_wc_count - (count_checked_in + count_completed)
    if count_not_marked < 0:
        count_not_marked = 0

    # 5. Build output roster
    output_members = []
    for m in members:
        rec = records_by_uid.get(m.id)
        current_status = rec.status if rec else "NOT_MARKED"

        if status_filter and status_filter != "all":
            if current_status != status_filter.upper():
                continue

        cin_time = format_to_ist_time(rec.check_in_at) if rec and rec.check_in_at else None
        cout_time = format_to_ist_time(rec.check_out_at) if rec and rec.check_out_at else None

        output_members.append({
            "id": rec.id if rec else None,
            "user_id": m.id,
            "working_committee_member_id": m.id,
            "reg_id": m.registration_id or f"WC{m.id:03d}",
            "name": m.name,
            "auid": m.auid,
            "institute": m.institute,
            "department": m.department,
            "role": m.working_committee_role or "Coordinator",
            "contact": m.phone,
            "managed_by": m.managed_by or "Super Admin",
            "photo_url": m.photo_url,
            "check_in_time": cin_time,
            "check_out_time": cout_time,
            "status": current_status,
            "submitted": is_submitted or (rec.submitted if rec else False),
            "submitted_by": rec.submitted_by if rec else submitted_by,
            "last_modified_by": rec.last_modified_by if rec else None,
            "can_mark": current_status != "COMPLETED"
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
            "checked_in": count_checked_in,
            "completed": count_completed,
            "not_marked": count_not_marked,
            "is_submitted": is_submitted
        },
        "members": output_members
    }


# ==============================================================================
# 2. TWO ATTENDANCE MARKINGS: CHECK-IN & CHECK-OUT
# ==============================================================================

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
        output.append({
            "id": l.id,
            "attendance_id": l.attendance_id,
            "working_committee_member_id": l.working_committee_member_id,
            "member_name": l.member_name,
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
        User.role.in_(["PARTICIPANT", "VOLUNTEER", "STUDENT", "SPECTATOR"]),
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
        "Working Committee Role"
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

        managed_by_str = ", ".join(list(managed_by_set)) if managed_by_set else (m.managed_by or current_user.name or "AKV Superadmin")

        row_values = [
            m.registration_id or f"WC{m.id:03d}",
            m.name,
            m.auid or "--",
            m.institute or "Acharya Institute of Technology",
            m.department or "--",
            m.working_committee_role or "Coordinator"
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
            if col_name in ["Name", "Dept", "Institute", "Working Committee Role", "Managed By"]:
                cell.alignment = align_left
            else:
                cell.alignment = align_center

            if col_name == "Total Days Present":
                cell.font = font_bold_data
                cell.alignment = align_center

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

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"AKV_NudiTaranga_Working_Committee_Attendance_{get_current_ist_date_str()}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
