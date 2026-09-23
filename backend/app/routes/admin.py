import csv
import io
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..database import get_db
from ..models import User, Admin, Registration, Event, VolunteerAttendance, AuditLog, CheckInLog
from ..schemas import AdminLogin, StatsOut
from ..config import settings
from ..auth_deps import require_admin, create_access_token

router = APIRouter(prefix="/admin", tags=["Admin"])

class MarkAttendancePayload(BaseModel):
    volunteer_user_id: int
    status: str = Field(..., description="PRESENT or ABSENT")

# Legacy login fallback maintained for backward compatibility
@router.post("/login")
def admin_login(payload: AdminLogin):
    if payload.username == settings.ADMIN_USERNAME and payload.password == settings.ADMIN_PASSWORD:
        token = create_access_token({"sub": "admin", "role": "ADMIN"})
        return {
            "success": True,
            "message": "Login successful",
            "token": token,
            "admin": {"username": payload.username, "role": "Fest Coordinator"}
        }
    raise HTTPException(status_code=401, detail="Invalid admin username or password")

# ==========================================
# 1. OVERVIEW FOR APPROVED ADMINS
# ==========================================
@router.get("/overview")
def get_admin_overview(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_students = db.query(func.count(User.id)).filter(
        User.role.in_(["STUDENT", "VOLUNTEER", "PARTICIPANT", "SPECTATOR"])
    ).scalar() or 0

    total_volunteers = db.query(func.count(User.id)).filter(User.role == "VOLUNTEER").scalar() or 0
    total_participants = db.query(func.count(User.id)).filter(User.role == "PARTICIPANT").scalar() or 0
    total_spectators = db.query(func.count(User.id)).filter(User.role == "SPECTATOR").scalar() or 0
    total_events = db.query(func.count(Event.id)).scalar() or 0
    total_registrations = db.query(func.count(Registration.id)).scalar() or 0

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    today_present = db.query(func.count(VolunteerAttendance.id)).filter(
        VolunteerAttendance.date == today_str,
        VolunteerAttendance.status == "PRESENT"
    ).scalar() or 0

    today_absent = db.query(func.count(VolunteerAttendance.id)).filter(
        VolunteerAttendance.date == today_str,
        VolunteerAttendance.status == "ABSENT"
    ).scalar() or 0

    return {
        "success": True,
        "total_students": total_students,
        "total_volunteers": total_volunteers,
        "total_participants": total_participants,
        "total_spectators": total_spectators,
        "total_events": total_events,
        "total_registrations": total_registrations,
        "today_attendance": {
            "date": today_str,
            "present": today_present,
            "absent": today_absent,
            "total_marked": today_present + today_absent,
            "total_volunteers": total_volunteers
        }
    }

# ==========================================
# 2. VOLUNTEER LIST & DAILY ATTENDANCE
# ==========================================
@router.get("/volunteers/today")
def get_today_volunteers(
    department: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns the volunteer list automatically populated from student registrations 
    where role == 'VOLUNTEER'. Admin cannot manually create the list.
    """
    query = db.query(User).filter(User.role == "VOLUNTEER")

    if department and department != "all":
        query = query.filter(User.department == department)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.name).like(s),
                func.lower(User.auid).like(s),
                func.lower(User.department).like(s),
                func.lower(User.phone).like(s)
            )
        )

    volunteers = query.order_by(User.name.asc()).all()
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    results = []
    for v in volunteers:
        # Check today's attendance record
        att = db.query(VolunteerAttendance).filter(
            VolunteerAttendance.user_id == v.id,
            VolunteerAttendance.date == today_str
        ).first()

        results.append({
            "user_id": v.id,
            "name": v.name,
            "auid": v.auid,
            "department": v.department,
            "institute": v.institute,
            "contact": v.phone,
            "email": v.email,
            "attendance_status": att.status if att else "NOT_MARKED",
            "check_in_time": att.check_in_time.strftime("%I:%M %p") if att and att.check_in_time else None,
            "attendance_id": att.id if att else None,
            "date": today_str
        })

    return {
        "date": today_str,
        "total_volunteers": len(volunteers),
        "volunteers": results
    }

@router.post("/volunteers/attendance")
def mark_volunteer_attendance(
    payload: MarkAttendancePayload,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admins can mark volunteer attendance for today (Present or Absent).
    Attendance records themselves are restricted to Super Admin.
    """
    volunteer = db.query(User).filter(
        User.id == payload.volunteer_user_id,
        User.role == "VOLUNTEER"
    ).first()

    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    status_val = payload.status.upper()
    if status_val not in ["PRESENT", "ABSENT"]:
        raise HTTPException(status_code=400, detail="Status must be PRESENT or ABSENT")

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    now = datetime.datetime.utcnow()

    record = db.query(VolunteerAttendance).filter(
        VolunteerAttendance.user_id == volunteer.id,
        VolunteerAttendance.date == today_str
    ).first()

    previous_status = record.status if record else "NOT_MARKED"

    if record:
        record.status = status_val
        record.check_in_time = now if status_val == "PRESENT" else None
        record.marked_by = current_user.name
        record.updated_at = now
    else:
        record = VolunteerAttendance(
            user_id=volunteer.id,
            auid=volunteer.auid,
            volunteer_name=volunteer.name,
            department=volunteer.department,
            date=today_str,
            status=status_val,
            check_in_time=now if status_val == "PRESENT" else None,
            marked_by=current_user.name
        )
        db.add(record)
        db.flush()

    # Create Audit Log
    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="ATTENDANCE_MARKED",
        target_type="ATTENDANCE",
        target_id=str(record.id),
        previous_value=f"Volunteer: {volunteer.name}, Status: {previous_status}",
        new_value=f"Status: {status_val}, MarkedBy: {current_user.name}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Marked {volunteer.name} as {status_val} for {today_str}.",
        "status": record.status,
        "check_in_time": record.check_in_time.strftime("%I:%M %p") if record.check_in_time else None,
        "attendance": {
            "id": record.id,
            "volunteer_user_id": volunteer.id,
            "status": record.status,
            "check_in_time": record.check_in_time.strftime("%I:%M %p") if record.check_in_time else None,
            "date": today_str
        }
    }

# ==========================================
# 3. ATTENDANCE PRIVACY PROTECTION
# ==========================================
@router.get("/attendance/export")
def blocked_attendance_export(current_user: User = Depends(require_admin)):
    """
    Regular admins CANNOT download or export the attendance database.
    Strictly enforced through backend authorization.
    """
    if current_user.role != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Attendance records, history, and exports are restricted to Super Administrators only."
        )

# Legacy stats
@router.get("/stats", response_model=StatsOut)
def get_festival_stats(db: Session = Depends(get_db)):
    total_events = db.query(func.count(Event.id)).scalar() or 0
    total_registrations = db.query(func.count(Registration.id)).scalar() or 0
    checked_in_count = db.query(func.count(Registration.id)).filter(Registration.status == "Checked In").scalar() or 0
    pending_checkin_count = total_registrations - checked_in_count

    events = db.query(Event).all()
    events_breakdown = []
    for ev in events:
        ev_reg_count = db.query(func.count(Registration.id)).filter(Registration.event_id == ev.id).scalar() or 0
        ev_checked_in = db.query(func.count(Registration.id)).filter(
            Registration.event_id == ev.id,
            Registration.status == "Checked In"
        ).scalar() or 0
        events_breakdown.append({
            "id": ev.id,
            "title_en": ev.title_en,
            "title_kn": ev.title_kn,
            "category": ev.category,
            "max_slots": ev.max_slots,
            "registered": ev_reg_count,
            "checked_in": ev_checked_in,
            "is_active": ev.is_active,
            "format": getattr(ev, "format", "solo") or "solo"
        })

    return {
        "total_events": total_events,
        "total_registrations": total_registrations,
        "checked_in_count": checked_in_count,
        "pending_checkin_count": pending_checkin_count,
        "events_breakdown": events_breakdown
    }

@router.get("/export-csv")
def export_registrations_csv(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    registrations = db.query(Registration).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Registration ID",
        "Event ID",
        "Event Name",
        "Event Type",
        "Participant / Team Head Name",
        "AUID",
        "Institute",
        "Department",
        "Contact Number",
        "Mail ID",
        "Team Name",
        "Number of Participants",
        "Status",
        "Registered At",
        "Check-In Time",
        "Checked In By"
    ])

    for reg in registrations:
        ev_name = reg.event.title_en if reg.event else reg.event_id
        auid_val = reg.auid if reg.auid else reg.usn
        institute_val = reg.institute if reg.institute else "Acharya Institute of Technology"
        
        num_participants = 1
        if reg.is_team and reg.team_members:
            try:
                import json
                parsed_members = json.loads(reg.team_members)
                if isinstance(parsed_members, list):
                    num_participants = len(parsed_members) + 1
            except Exception:
                num_participants = 1

        writer.writerow([
            reg.registration_id,
            reg.event_id,
            ev_name,
            "Team" if reg.is_team else "Solo",
            reg.full_name,
            auid_val,
            institute_val,
            reg.department,
            reg.phone,
            reg.email,
            reg.team_name if reg.is_team else "N/A",
            num_participants,
            reg.status,
            reg.created_at.strftime("%Y-%m-%d %H:%M:%S") if reg.created_at else "",
            reg.checkin_time.strftime("%Y-%m-%d %H:%M:%S") if reg.checkin_time else "N/A",
            reg.checked_in_by or "N/A"
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Nuditaranga_2026_Registrations.csv"}
    )
