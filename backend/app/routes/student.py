import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..database import get_db
from ..models import User, Event, Registration, VolunteerAttendance, AuditLog
from ..schemas import TeamMemberSchema
from ..auth_deps import require_student, get_password_hash, verify_password
from ..routes.registrations import generate_unique_reg_id
from ..services.id_card_service import generate_candidate_id_card_pdf

router = APIRouter(prefix="/student", tags=["Student"])

class EventRegisterRequest(BaseModel):
    event_id: str
    is_team: bool = False
    team_name: Optional[str] = None
    team_members: Optional[List[TeamMemberSchema]] = []

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

@router.get("/dashboard")
def get_student_dashboard(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    # Fetch registered events for this student
    registrations = db.query(Registration).filter(
        or_(
            Registration.user_id == current_user.id,
            func.upper(Registration.auid) == current_user.auid.upper(),
            func.upper(Registration.email) == current_user.email.upper()
        )
    ).order_by(Registration.created_at.desc()).all()

    registered_events = []
    registered_event_ids = set()
    for reg in registrations:
        registered_event_ids.add(reg.event_id)
        ev = reg.event
        registered_events.append({
            "registration_id": reg.registration_id,
            "event_id": reg.event_id,
            "event_title_en": ev.title_en if ev else reg.event_id,
            "event_title_kn": ev.title_kn if ev else "",
            "category": ev.category if ev else "",
            "venue": ev.venue if ev else "",
            "event_date": ev.event_date if ev else "",
            "event_time": ev.event_time if ev else "",
            "is_team": reg.is_team,
            "team_name": reg.team_name,
            "status": reg.status,
            "registered_at": reg.created_at.isoformat() if reg.created_at else None,
            "checkin_time": reg.checkin_time.isoformat() if reg.checkin_time else None
        })

    # Available events for registration
    total_events_count = db.query(func.count(Event.id)).filter(Event.is_active == True).scalar() or 0

    # Volunteer-specific data if applicable
    volunteer_attendance_records = []
    today_status = None
    if current_user.role == "VOLUNTEER":
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        records = db.query(VolunteerAttendance).filter(
            or_(
                VolunteerAttendance.user_id == current_user.id,
                VolunteerAttendance.auid == current_user.auid
            )
        ).order_by(VolunteerAttendance.date.desc()).all()

        for rec in records:
            if rec.date == today_str:
                today_status = rec.status
            volunteer_attendance_records.append({
                "date": rec.date,
                "status": rec.status,
                "check_in_time": rec.check_in_time.strftime("%I:%M %p") if rec.check_in_time else None,
                "marked_by": rec.marked_by
            })

    # Official event attendance records (Check-In & Check-Out)
    from ..models import AttendanceRecord
    from ..utils.timezone import format_to_ist_time, iso_date_to_dmy, get_current_ist_date_str

    attendance_records = []
    official_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.user_id == current_user.id
    ).order_by(AttendanceRecord.attendance_date.desc()).all()

    today_ist = get_current_ist_date_str()
    today_official_record = None

    for r in official_records:
        rec_data = {
            "date": r.attendance_date,
            "date_dmy": iso_date_to_dmy(r.attendance_date),
            "status": r.status,
            "check_in_time": format_to_ist_time(r.check_in_at) if r.check_in_at else None,
            "check_out_time": format_to_ist_time(r.check_out_at) if r.check_out_at else None,
            "submitted": r.submitted
        }
        if r.attendance_date == today_ist:
            today_official_record = rec_data
        attendance_records.append(rec_data)

    return {
        "success": True,
        "profile": {
            "id": current_user.id,
            "name": current_user.name,
            "auid": current_user.auid,
            "email": current_user.email,
            "phone": current_user.phone,
            "photo_url": current_user.photo_url,
            "institute": current_user.institute,
            "department": current_user.department,
            "semester": current_user.semester,
            "section": current_user.section,
            "gender": current_user.gender,
            "role": current_user.role,
            "registration_id": current_user.registration_id
        },
        "stats": {
            "registered_events_count": len(registered_events),
            "total_available_events": total_events_count,
            "volunteer_days_present": len([r for r in volunteer_attendance_records if r["status"] == "PRESENT"]),
            "attendance_days_present": len([r for r in attendance_records if r["status"] == "COMPLETED"])
        },
        "registered_events": registered_events,
        "registered_event_ids": list(registered_event_ids),
        "today_attendance": today_official_record,
        "attendance_records": attendance_records,
        "volunteer_info": {
            "is_volunteer": current_user.role == "VOLUNTEER",
            "today_attendance": today_status or "NOT_MARKED",
            "attendance_history": volunteer_attendance_records
        } if current_user.role == "VOLUNTEER" else None
    }

@router.get("/my-registrations")
def get_my_registrations(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    regs = db.query(Registration).filter(
        or_(
            Registration.user_id == current_user.id,
            func.upper(Registration.auid) == current_user.auid.upper()
        )
    ).order_by(Registration.created_at.desc()).all()

    output = []
    for r in regs:
        ev = r.event
        output.append({
            "registration_id": r.registration_id,
            "event_id": r.event_id,
            "event_title_en": ev.title_en if ev else r.event_id,
            "event_title_kn": ev.title_kn if ev else "",
            "category": ev.category if ev else "",
            "venue": ev.venue if ev else "",
            "venue_kn": ev.venue_kn if ev else "",
            "event_date": ev.event_date if ev else "",
            "event_time": ev.event_time if ev else "",
            "reporting_time": ev.reporting_time if ev else "",
            "is_team": r.is_team,
            "team_name": r.team_name,
            "team_members": r.team_members,
            "status": r.status,
            "registered_at": r.created_at.isoformat() if r.created_at else None,
            "checkin_time": r.checkin_time.isoformat() if r.checkin_time else None,
            "checked_in_by": r.checked_in_by
        })
    return output

@router.post("/register-event")
def student_register_event(
    payload: EventRegisterRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    1-Click Event Registration for Authenticated Students.
    Profile details (Name, AUID, Email, Phone, Dept, etc.) are automatically 
    populated from the student's authenticated account without redundant input.
    """
    # 1. Event verification
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        event = Event(
            id=payload.event_id,
            title_en=payload.event_id,
            title_kn=payload.event_id,
            category="cultural",
            category_kn="ಸಾಂಸ್ಕೃತಿಕ",
            description_en=f"Nuditaranga 2026 event: {payload.event_id}",
            description_kn=f"ನುಡಿತರಂಗ ೨೦೨೬ ಸ್ಪರ್ಧೆ: {payload.event_id}",
            is_team=payload.is_team,
            format="team" if payload.is_team else "solo",
            min_team_size=2 if payload.is_team else 1,
            max_team_size=10 if payload.is_team else 1,
            max_slots=200,
            registered_count=0,
            venue="Acharya Campus",
            venue_kn="ಆಚಾರ್ಯ ಆವರಣ",
            event_date="02-11-2026",
            event_time="10:00 AM",
            reporting_time="09:30 AM",
            rules_en="Standard festival rules apply.",
            rules_kn="ಮಾನಕ ನಿಯಮಗಳು ಅನ್ವಯಿಸುತ್ತವೆ.",
            is_active=True
        )
        db.add(event)
        db.commit()
        db.refresh(event)
    elif not event.is_active:
        raise HTTPException(status_code=400, detail="Registrations for this event are currently closed")
    if event.registered_count >= event.max_slots:
        raise HTTPException(status_code=400, detail="This event has reached its maximum participant capacity")

    # 2. Duplicate check
    clean_auid = current_user.auid.strip().upper()
    duplicate = db.query(Registration).filter(
        Registration.event_id == payload.event_id,
        or_(
            Registration.user_id == current_user.id,
            func.upper(Registration.auid) == clean_auid,
            func.lower(Registration.email) == current_user.email.lower()
        )
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"You are already registered for '{event.title_en}' with Registration Pass: {duplicate.registration_id}"
        )

    # 3. Process team members if applicable
    team_members_str = None
    if payload.is_team and payload.team_members:
        team_members_str = json.dumps([m.model_dump() for m in payload.team_members])

    # 4. Generate Registration ID
    reg_id = generate_unique_reg_id(db)

    # 5. Create Registration linked to student user_id
    new_reg = Registration(
        registration_id=reg_id,
        event_id=payload.event_id,
        user_id=current_user.id,
        full_name=current_user.name,
        auid=clean_auid,
        usn=clean_auid,
        photo_url=current_user.photo_url,
        institute=current_user.institute,
        department=current_user.department,
        semester=current_user.semester,
        section=current_user.section,
        email=current_user.email,
        phone=current_user.phone,
        gender=current_user.gender,
        is_team=payload.is_team,
        team_name=payload.team_name.strip() if payload.team_name else None,
        team_members=team_members_str,
        status="Registered"
    )

    db.add(new_reg)
    event.registered_count += 1

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="EVENT_REGISTERED",
        target_type="EVENT",
        target_id=payload.event_id,
        previous_value=None,
        new_value=f"RegID: {reg_id}, Event: {event.title_en}"
    )
    db.add(log)
    db.commit()
    db.refresh(new_reg)

    return {
        "success": True,
        "message": f"Successfully registered for {event.title_en}!",
        "registration_id": reg_id,
        "event_title": event.title_en,
        "venue": event.venue,
        "event_date": event.event_date,
        "event_time": event.event_time
    }


@router.get("/id-card")
def download_student_id_card(current_user: User = Depends(require_student)):
    pdf_payload = {
        "name": current_user.name,
        "auid": current_user.auid,
        "registration_id": current_user.registration_id,
        "role": current_user.role,
        "institute": current_user.institute,
        "department": current_user.department,
        "semester": current_user.semester,
        "section": current_user.section,
        "email": current_user.email,
        "phone": current_user.phone,
        "volunteer_domain": current_user.volunteer_domain,
        "photo_url": current_user.photo_url,
    }
    pdf_bytes = generate_candidate_id_card_pdf(pdf_payload)
    filename = f"AKV_ID_Card_{current_user.registration_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/event-pass/{registration_id}")
def download_event_pass(
    registration_id: str,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    reg = db.query(Registration).filter(
        func.lower(Registration.registration_id) == registration_id.strip().lower(),
        or_(
            Registration.user_id == current_user.id,
            func.upper(Registration.auid) == current_user.auid.upper(),
            func.lower(Registration.email) == current_user.email.lower()
        )
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Event pass not found for this account.")

    pdf_payload = {
        "name": reg.full_name,
        "auid": reg.auid or reg.usn,
        "registration_id": reg.registration_id,
        "role": "PARTICIPANT",
        "institute": reg.institute or current_user.institute,
        "department": reg.department or current_user.department,
        "semester": reg.semester,
        "section": reg.section or current_user.section,
        "email": reg.email or current_user.email,
        "phone": reg.phone or current_user.phone,
        "photo_url": reg.photo_url or current_user.photo_url,
        "volunteer_domain": current_user.volunteer_domain,
    }
    pdf_bytes = generate_candidate_id_card_pdf(pdf_payload)
    filename = f"AKV_Pass_{reg.registration_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match.")

    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.updated_at = datetime.datetime.utcnow()

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="PASSWORD_CHANGED",
        target_type="STUDENT",
        target_id=str(current_user.id),
        previous_value=None,
        new_value="Password changed by user"
    )
    db.add(log)
    db.commit()

    return {"success": True, "message": "Password changed successfully."}
