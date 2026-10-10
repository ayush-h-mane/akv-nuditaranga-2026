import io
import csv
import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, defer, joinedload
from sqlalchemy import func, or_, and_, distinct
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from ..database import get_db
from ..models import User, Admin, Event, Registration, CheckInLog, VolunteerAttendance, AuditLog, AttendanceRecord, WorkingCommitteeAttendance, PasswordResetToken
from ..auth_deps import require_superadmin, get_password_hash
from ..schemas import RegistrationCreate, RegistrationOut, SuperAdminRegistrationUpdate
from ..routes.registrations import generate_unique_reg_id
from ..services.email_service import send_admin_approval_email, send_profile_edit_reopened_email
from ..services.id_card_service import generate_candidate_id_card_pdf

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])

# Schemas
class SuperAdminSetUserPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=4, max_length=100)

class StudentUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    institute: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None  # VOLUNTEER, PARTICIPANT
    account_status: Optional[str] = None  # ACTIVE, DISABLED

class AttendanceUpdateRequest(BaseModel):
    status: str  # PRESENT, ABSENT, LATE, EXCUSED
    notes: Optional[str] = None

class AttendanceCreateRequest(BaseModel):
    volunteer_user_id: int
    date: str  # YYYY-MM-DD
    status: str = "PRESENT"
    notes: Optional[str] = None

# ==========================================
# 1. OVERVIEW & METRICS
# ==========================================
@router.get("/stats")
def get_superadmin_stats(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    role_counts = dict(
        db.query(User.role, func.count(User.id))
        .filter(User.role.in_(["STUDENT", "VOLUNTEER", "PARTICIPANT"]))
        .group_by(User.role)
        .all()
    )
    total_volunteers = role_counts.get("VOLUNTEER", 0)
    total_participants = role_counts.get("PARTICIPANT", 0)
    total_students = total_volunteers + total_participants + role_counts.get("STUDENT", 0)

    total_events = db.query(func.count(Event.id)).scalar() or 0
    total_registrations = db.query(func.count(Registration.id)).scalar() or 0

    pending_admins = db.query(func.count(Admin.id)).join(User, Admin.user_id == User.id).filter(
        Admin.approval_status == "PENDING_APPROVAL",
        User.role != "SUPERADMIN",
        Admin.admin_type != "SUPERADMIN"
    ).scalar() or 0

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    today_counts = dict(
        db.query(VolunteerAttendance.status, func.count(VolunteerAttendance.id))
        .filter(VolunteerAttendance.date == today_str)
        .group_by(VolunteerAttendance.status)
        .all()
    )
    today_present = today_counts.get("PRESENT", 0)
    today_absent = today_counts.get("ABSENT", 0)

    # Also count official AttendanceRecord check-ins / completions for today
    official_today_present = db.query(func.count(AttendanceRecord.id)).filter(
        AttendanceRecord.attendance_date == today_str,
        AttendanceRecord.status.in_(["CHECKED_IN", "COMPLETED"])
    ).scalar() or 0
    if official_today_present > 0:
        today_present = max(today_present, official_today_present)
        today_absent = max(0, total_volunteers - today_present)

    return {
        "success": True,
        "metrics": {
            "total_students": total_students,
            "total_volunteers": total_volunteers,
            "total_participants": total_participants,
            "total_events": total_events,
            "total_registrations": total_registrations,
            "pending_admins": pending_admins,
            "today_attendance": {
                "date": today_str,
                "present": today_present,
                "absent": today_absent,
                "total_marked": today_present + today_absent,
                "total_volunteers": total_volunteers
            }
        }
    }

# ==========================================
# 2. STUDENT MANAGEMENT (CRUD)
# ==========================================
@router.get("/students")
def list_students(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    query = db.query(User).options(
        defer(User.photo_url), defer(User.password_hash)
    ).filter(
        User.role != "SUPERADMIN",
        User.role != "DEVELOPER",
        func.lower(User.auid) != "dev-nanu",
        func.lower(User.email) != "nanu.dev@acharyahabba.com"
    )

    if role and role.upper() != "ALL":
        query = query.filter(User.role == role.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(User.account_status == status_filter.upper())
    if department and department != "all":
        query = query.filter(User.department == department)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.name).like(s),
                func.lower(User.auid).like(s),
                func.lower(User.email).like(s),
                func.lower(User.phone).like(s),
                func.lower(User.department).like(s),
                func.lower(User.registration_id).like(s)
            )
        )

    total_count = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    user_ids = [u.id for u in users]
    user_auids = [u.auid for u in users if u.auid]

    reg_counts_by_uid = {}
    reg_counts_by_auid = {}
    if user_ids or user_auids:
        reg_records = db.query(Registration.user_id, Registration.auid).filter(
            or_(
                Registration.user_id.in_(user_ids) if user_ids else False,
                Registration.auid.in_(user_auids) if user_auids else False
            )
        ).all()
        for r_uid, r_auid in reg_records:
            if r_uid:
                reg_counts_by_uid[r_uid] = reg_counts_by_uid.get(r_uid, 0) + 1
            if r_auid:
                reg_counts_by_auid[r_auid] = reg_counts_by_auid.get(r_auid, 0) + 1

    student_list = []
    for u in users:
        reg_count = reg_counts_by_uid.get(u.id, 0) or (reg_counts_by_auid.get(u.auid, 0) if u.auid else 0)

        student_list.append({
            "id": u.id,
            "name": u.name,
            "auid": u.auid,
            "email": u.email,
            "phone": u.phone,
            "institute": u.institute,
            "department": u.department,
            "semester": u.semester,
            "section": u.section,
            "gender": u.gender,
            "role": u.role,
            "registration_id": u.registration_id,
            "account_status": u.account_status,
            "event_registrations_count": reg_count,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })

    return {
        "total": total_count,
        "students": student_list
    }

@router.put("/students/{user_id}")
def update_student(
    user_id: int,
    payload: StudentUpdateRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    old_details = f"Role: {student.role}, Status: {student.account_status}, Name: {student.name}"
    
    if payload.name:
        student.name = payload.name.strip()
    if payload.email:
        student.email = payload.email.strip().lower()
    if payload.phone:
        student.phone = payload.phone.strip()
    if payload.institute:
        student.institute = payload.institute.strip()
    if payload.department:
        student.department = payload.department.strip()
    if payload.role and payload.role.upper() in ["VOLUNTEER", "PARTICIPANT", "STUDENT"]:
        student.role = payload.role.upper()
    if payload.account_status and payload.account_status.upper() in ["ACTIVE", "DISABLED"]:
        student.account_status = payload.account_status.upper()

    student.updated_at = datetime.datetime.utcnow()
    new_details = f"Role: {student.role}, Status: {student.account_status}, Name: {student.name}"

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="STUDENT_UPDATED",
        target_type="STUDENT",
        target_id=str(student.id),
        previous_value=old_details,
        new_value=new_details
    )
    db.add(log)
    db.commit()

    return {"success": True, "message": "Student information updated successfully"}

@router.delete("/students/{user_id}")
def delete_student(
    user_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.role == "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Cannot delete Super Admin account")

    student_name = student.name
    student_auid = student.auid

    # Log audit before deletion
    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="STUDENT_DELETED",
        target_type="STUDENT",
        target_id=str(user_id),
        previous_value=f"Name: {student_name}, AUID: {student_auid}",
        new_value="DELETED"
    )
    db.add(log)

    db.delete(student)
    db.commit()

    return {"success": True, "message": f"Student '{student_name}' deleted successfully"}

# ==========================================
# 3. ADMIN APPROVAL & MANAGEMENT
# ==========================================
@router.get("/admins")
def list_admins(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    # Retrieve registered coordinators and faculty admins (strictly excluding Superadmins and Developer)
    admins = db.query(Admin).options(
        joinedload(Admin.user).defer(User.password_hash)
    ).join(User, Admin.user_id == User.id).filter(
        User.role != "SUPERADMIN",
        Admin.admin_type != "SUPERADMIN",
        User.role != "DEVELOPER",
        Admin.admin_type != "DEVELOPER",
        func.lower(Admin.username) != "nanu",
        func.lower(User.email) != "nanu.dev@acharyahabba.com",
        func.lower(User.email) != "akv@acharya.ac.in",
        func.lower(Admin.username) != "akv-nt-2026"
    ).order_by(
        (Admin.approval_status == "PENDING_APPROVAL").desc(),
        Admin.created_at.desc()
    ).all()

    # Safety check: Detect any User marked role="ADMIN" without an Admin profile and backfill
    existing_user_ids = {a.user_id for a in admins if a.user_id}
    orphan_query = db.query(User).filter(User.role == "ADMIN")
    if existing_user_ids:
        orphan_query = orphan_query.filter(~User.id.in_(existing_user_ids))
    orphan_admins = orphan_query.all()

    for ou in orphan_admins:
        try:
            uname = ou.auid.lower().replace("-", "_") if ou.auid else f"admin_{ou.id}"
            if db.query(Admin).filter(func.lower(Admin.username) == uname.lower()).first():
                uname = f"{uname}_{ou.id}"
            new_a = Admin(
                user_id=ou.id,
                username=uname,
                admin_type=ou.admin_type or "WORKING_COMMITTEE",
                faculty_id=ou.faculty_id,
                approval_status="PENDING_APPROVAL",
                created_at=ou.created_at or datetime.datetime.utcnow()
            )
            db.add(new_a)
            db.commit()
            db.refresh(new_a)
            admins.insert(0, new_a)
        except Exception as e:
            db.rollback()
            print(f"[ORPHAN ADMIN BACKFILL WARNING] {e}")

    results = []
    for a in admins:
        u = a.user
        results.append({
            "id": a.id,
            "user_id": a.user_id,
            "username": a.username,
            "auid": u.auid if u else "N/A",
            "full_name": u.name if u else "N/A",
            "email": u.email if u else "N/A",
            "phone": u.phone if u else "N/A",
            "institute": u.institute if u else "N/A",
            "department": u.department if u else "N/A",
            "admin_type": a.admin_type or (u.admin_type if u else "WORKING_COMMITTEE"),
            "faculty_id": a.faculty_id or (u.faculty_id if u else None),
            "volunteer_domain": u.volunteer_domain if u else None,
            "akv_domain": u.volunteer_domain if u else None,
            "akv_dept": u.volunteer_domain if u else None,
            "photo_url": u.photo_url if u else None,
            "role": u.role if u else "ADMIN",
            "plain_password": getattr(u, "plain_password", None) or "",
            "approval_status": a.approval_status,
            "approved_by": a.approved_by,
            "approved_at": a.approved_at.isoformat() if a.approved_at else None,
            "account_status": u.account_status if u else "N/A",
            "created_at": a.created_at.isoformat() if a.created_at else None
        })
    return results

@router.post("/users/{user_id}/set-password")
def set_user_password(
    user_id: int,
    payload: SuperAdminSetUserPasswordRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if target_user.email == "akv@acharya.ac.in" and current_user.email != "akv@acharya.ac.in":
        raise HTTPException(status_code=403, detail="Root Super Admin account credentials cannot be modified.")

    clean_pw = payload.new_password.strip()
    if len(clean_pw) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    target_user.password_hash = get_password_hash(clean_pw)
    target_user.plain_password = clean_pw
    target_user.updated_at = datetime.datetime.utcnow()

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="SUPERADMIN_SET_PASSWORD",
        target_type="USER",
        target_id=str(target_user.id),
        previous_value="[PROTECTED]",
        new_value=f"Password updated for {target_user.name} ({target_user.auid})"
    )
    db.add(log)
    db.commit()
    db.refresh(target_user)

    return {
        "success": True,
        "message": f"Password for {target_user.name} ({target_user.auid}) has been updated successfully.",
        "plain_password": clean_pw
    }

@router.post("/admins/{admin_id}/approve")
def approve_admin(
    admin_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin record not found")

    old_status = admin.approval_status
    admin.approval_status = "APPROVED"
    admin.approved_by = current_user.name
    admin.approved_at = datetime.datetime.utcnow()

    # Ensure user account is active
    if admin.user:
        admin.user.account_status = "ACTIVE"
        if admin.user.email:
            background_tasks.add_task(send_admin_approval_email, admin.user.email, admin.user.name, "APPROVED")

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="ADMIN_APPROVED",
        target_type="ADMIN",
        target_id=str(admin.id),
        previous_value=old_status,
        new_value="APPROVED"
    )
    db.add(log)
    db.commit()

    return {"success": True, "message": f"Admin '{admin.username}' has been approved."}

@router.post("/admins/{admin_id}/reject")
def reject_admin(
    admin_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin record not found")

    old_status = admin.approval_status
    admin.approval_status = "REJECTED"
    admin.approved_by = current_user.name

    if admin.user and admin.user.email:
        background_tasks.add_task(send_admin_approval_email, admin.user.email, admin.user.name, "REJECTED")

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="ADMIN_REJECTED",
        target_type="ADMIN",
        target_id=str(admin.id),
        previous_value=old_status,
        new_value="REJECTED"
    )
    db.add(log)
    db.commit()

    return {"success": True, "message": f"Admin '{admin.username}' has been rejected."}

@router.post("/admins/{admin_id}/toggle-status")
def toggle_admin_status(
    admin_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin or not admin.user:
        raise HTTPException(status_code=404, detail="Admin record not found")

    new_status = "DISABLED" if admin.user.account_status == "ACTIVE" else "ACTIVE"
    old_status = admin.user.account_status
    admin.user.account_status = new_status

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="ADMIN_STATUS_CHANGED",
        target_type="ADMIN",
        target_id=str(admin.id),
        previous_value=f"Account status: {old_status}",
        new_value=f"Account status: {new_status}"
    )
    db.add(log)
    db.commit()

    return {"success": True, "message": f"Admin status updated to {new_status}"}

@router.delete("/admins/{admin_id}")
def delete_admin(
    admin_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    try:
        admin = db.query(Admin).filter(Admin.id == admin_id).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Admin record not found")

        username = admin.username or "Unknown"
        user = admin.user

        # 6 Canonical protected superadmins
        PROTECTED_SUPERADMINS = ["akvsadayt", "akvsapriya", "akvsaarjun", "akvsaculturals", "akvsatejas", "akvsarakshi"]
        if username.lower() in PROTECTED_SUPERADMINS:
            raise HTTPException(status_code=403, detail="Official Super Administrator profile is protected and cannot be deleted.")

        # Block self-deletion
        if user and user.id == current_user.id:
            raise HTTPException(status_code=403, detail="You cannot delete your own active administrator profile.")

        actor_name = current_user.name or current_user.email or "Super Administrator"

        log = AuditLog(
            user_id=current_user.id,
            actor_name=actor_name,
            action="ADMIN_DELETED",
            target_type="ADMIN",
            target_id=str(admin_id),
            previous_value=f"Admin: {username} (User: {user.name if user else 'N/A'})",
            new_value="DELETED"
        )
        db.add(log)

        # Delete the admin record
        db.delete(admin)

        # Handle associated user account
        if user:
            if user.role in ["ADMIN", "SUPERADMIN"]:
                # Clean up dependent records before deleting user to prevent ForeignKeyViolation
                db.query(Registration).filter(Registration.user_id == user.id).delete(synchronize_session=False)
                db.query(AttendanceRecord).filter(AttendanceRecord.user_id == user.id).delete(synchronize_session=False)
                db.query(VolunteerAttendance).filter(VolunteerAttendance.user_id == user.id).delete(synchronize_session=False)
                db.query(WorkingCommitteeAttendance).filter(WorkingCommitteeAttendance.working_committee_member_id == user.id).delete(synchronize_session=False)
                db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete(synchronize_session=False)
                db.delete(user)
            else:
                # If they are a registered participant or volunteer, strip admin privileges but retain student account
                user.admin_type = None
                user.faculty_id = None
                user.is_working_committee = False

        db.commit()
        return {"success": True, "message": f"Admin '{username}' removed successfully."}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[DELETE ADMIN ERROR] {e!r}")
        raise HTTPException(status_code=500, detail=f"Failed to remove admin: {str(e)}")

# ==========================================
# 4. VOLUNTEER MANAGEMENT (AUTO-GENERATED)
# ==========================================
@router.get("/volunteers")
def list_all_volunteers(
    department: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Volunteers are automatically queried from student registrations where role == 'VOLUNTEER'.
    No manual list creation is allowed or needed.
    """
    query = db.query(User).options(
        defer(User.password_hash)
    ).filter(
        User.role == "VOLUNTEER",
        User.role != "DEVELOPER",
        User.auid != "DEV-NANU"
    )

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
    volunteer_ids = [v.id for v in volunteers]

    # 1. Query official AttendanceRecord for today and completed attendance days (checked in and checked out)
    official_today = {}
    official_days_counts = {}
    if volunteer_ids:
        today_recs = db.query(AttendanceRecord).filter(
            AttendanceRecord.attendance_date == today_str,
            AttendanceRecord.user_id.in_(volunteer_ids)
        ).all()
        official_today = {r.user_id: r for r in today_recs}

        # Count completed days where volunteer has checked in and checked out (or status is COMPLETED)
        completed_counts = db.query(
            AttendanceRecord.user_id,
            func.count(distinct(AttendanceRecord.attendance_date))
        ).filter(
            AttendanceRecord.user_id.in_(volunteer_ids),
            or_(
                and_(AttendanceRecord.check_in_at.isnot(None), AttendanceRecord.check_out_at.isnot(None)),
                AttendanceRecord.status == "COMPLETED"
            )
        ).group_by(AttendanceRecord.user_id).all()
        official_days_counts = dict(completed_counts)

    # 2. Legacy VolunteerAttendance support
    legacy_today = {}
    legacy_counts = {}
    if volunteer_ids:
        today_records = db.query(VolunteerAttendance).filter(
            VolunteerAttendance.date == today_str,
            VolunteerAttendance.user_id.in_(volunteer_ids)
        ).all()
        legacy_today = {record.user_id: record for record in today_records}
        legacy_counts = dict(db.query(VolunteerAttendance.user_id, func.count(VolunteerAttendance.id))
            .filter(VolunteerAttendance.status == "PRESENT", VolunteerAttendance.user_id.in_(volunteer_ids))
            .group_by(VolunteerAttendance.user_id).all())

    results = []
    for v in volunteers:
        off_rec = official_today.get(v.id)
        leg_rec = legacy_today.get(v.id)

        if off_rec:
            if off_rec.status == "COMPLETED":
                today_status = "PRESENT"
            elif off_rec.status == "CHECKED_IN":
                today_status = "CHECKED_IN"
            else:
                today_status = off_rec.status or "NOT_MARKED"
            cin_time_str = off_rec.check_in_at.strftime("%I:%M %p") if off_rec.check_in_at else None
        elif leg_rec:
            today_status = leg_rec.status
            cin_time_str = leg_rec.check_in_time.strftime("%I:%M %p") if leg_rec.check_in_time else None
        else:
            today_status = "NOT_MARKED"
            cin_time_str = None

        total_present = max(official_days_counts.get(v.id, 0), legacy_counts.get(v.id, 0))

        results.append({
            "user_id": v.id,
            "id": v.id,
            "name": v.name,
            "auid": v.auid,
            "department": v.department,
            "institute": v.institute,
            "phone": v.phone,
            "email": v.email,
            "semester": v.semester,
            "section": v.section,
            "gender": v.gender,
            "role": v.role,
            "volunteer_domain": v.volunteer_domain,
            "photo_url": v.photo_url,
            "plain_password": getattr(v, "plain_password", None) or "",
            "account_status": v.account_status,
            "registration_id": v.registration_id,
            "today_attendance": today_status,
            "today_checkin_time": cin_time_str,
            "total_days_present": total_present,
            "registered_at": v.created_at.strftime("%Y-%m-%d %I:%M %p") if v.created_at else None,
            "created_at": v.created_at.isoformat() if v.created_at else None
        })

    return results

# ==========================================
# 5. SUPER ADMIN ATTENDANCE (FULL OVERSIGHT)
# ==========================================
@router.get("/attendance")
def get_superadmin_attendance(
    date: Optional[str] = None,  # Specific date YYYY-MM-DD or all
    department: Optional[str] = None,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 150,
    offset: int = 0,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    query = db.query(VolunteerAttendance)

    if date and date != "all":
        query = query.filter(VolunteerAttendance.date == date)
    if department and department != "all":
        query = query.filter(VolunteerAttendance.department == department)
    if status_filter and status_filter != "all":
        query = query.filter(VolunteerAttendance.status == status_filter.upper())
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(VolunteerAttendance.volunteer_name).like(s),
                func.lower(VolunteerAttendance.auid).like(s),
                func.lower(VolunteerAttendance.department).like(s)
            )
        )

    records = query.order_by(VolunteerAttendance.date.desc(), VolunteerAttendance.volunteer_name.asc()).offset(offset).limit(limit).all()
    
    # Available unique dates for filter dropdown
    unique_dates = [r[0] for r in db.query(VolunteerAttendance.date).distinct().order_by(VolunteerAttendance.date.desc()).all()]

    output = []
    for r in records:
        output.append({
            "id": r.id,
            "user_id": r.user_id,
            "auid": r.auid,
            "volunteer_name": r.volunteer_name,
            "department": r.department,
            "date": r.date,
            "status": r.status,
            "check_in_time": r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "N/A",
            "marked_by": r.marked_by,
            "last_modified": r.updated_at.strftime("%Y-%m-%d %I:%M %p") if r.updated_at else ""
        })

    return {
        "records": output,
        "available_dates": unique_dates
    }

@router.put("/attendance/{attendance_id}")
def update_attendance_record(
    attendance_id: int,
    payload: AttendanceUpdateRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    rec = db.query(VolunteerAttendance).filter(VolunteerAttendance.id == attendance_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_status = rec.status
    new_status = payload.status.upper()
    if new_status not in ["PRESENT", "ABSENT", "LATE", "EXCUSED"]:
        raise HTTPException(status_code=400, detail="Invalid attendance status")

    rec.status = new_status
    if new_status == "PRESENT" and not rec.check_in_time:
        rec.check_in_time = datetime.datetime.utcnow()
    elif new_status == "ABSENT":
        rec.check_in_time = None

    rec.marked_by = f"{current_user.name} (Super Admin)"
    rec.updated_at = datetime.datetime.utcnow()

    # Mandatory Audit Log Entry
    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="ATTENDANCE_MODIFIED",
        target_type="ATTENDANCE",
        target_id=str(rec.id),
        previous_value=f"Volunteer: {rec.volunteer_name}, Date: {rec.date}, Status: {old_status}",
        new_value=f"Status: {new_status}, Reason/Note: {payload.notes or 'Manual correction'}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Attendance for '{rec.volunteer_name}' on {rec.date} updated from {old_status} to {new_status}."
    }

@router.post("/attendance/mark")
def create_or_mark_attendance(
    payload: AttendanceCreateRequest,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    volunteer = db.query(User).filter(User.id == payload.volunteer_user_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    status_val = payload.status.upper()
    if status_val not in ["PRESENT", "ABSENT", "LATE", "EXCUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    existing = db.query(VolunteerAttendance).filter(
        VolunteerAttendance.user_id == volunteer.id,
        VolunteerAttendance.date == payload.date
    ).first()

    if existing:
        old_val = existing.status
        existing.status = status_val
        if status_val == "PRESENT" and not existing.check_in_time:
            existing.check_in_time = datetime.datetime.utcnow()
        elif status_val == "ABSENT":
            existing.check_in_time = None
        existing.marked_by = f"{current_user.name} (Super Admin)"
        existing.updated_at = datetime.datetime.utcnow()

        log = AuditLog(
            user_id=current_user.id,
            actor_name=current_user.name,
            action="ATTENDANCE_OVERWRITE",
            target_type="ATTENDANCE",
            target_id=str(existing.id),
            previous_value=f"Status: {old_val}",
            new_value=f"Status: {status_val}"
        )
        db.add(log)
    else:
        new_rec = VolunteerAttendance(
            user_id=volunteer.id,
            auid=volunteer.auid,
            volunteer_name=volunteer.name,
            department=volunteer.department,
            date=payload.date,
            status=status_val,
            check_in_time=datetime.datetime.utcnow() if status_val == "PRESENT" else None,
            marked_by=f"{current_user.name} (Super Admin)"
        )
        db.add(new_rec)
        db.flush()

        log = AuditLog(
            user_id=current_user.id,
            actor_name=current_user.name,
            action="ATTENDANCE_CREATED",
            target_type="ATTENDANCE",
            target_id=str(new_rec.id),
            previous_value="None",
            new_value=f"Volunteer: {volunteer.name}, Date: {payload.date}, Status: {status_val}"
        )
        db.add(log)

    db.commit()
    return {"success": True, "message": f"Attendance marked for {volunteer.name} ({payload.date}) as {status_val}"}

# ==========================================
# 6. ATTENDANCE EXPORTS (CSV & XLSX)
# ==========================================
@router.get("/attendance/export-csv")
def export_attendance_csv(
    date: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    query = db.query(VolunteerAttendance)
    if date and date != "all":
        query = query.filter(VolunteerAttendance.date == date)
    
    records = query.order_by(VolunteerAttendance.date.desc(), VolunteerAttendance.volunteer_name.asc()).all()
    user_lookup = {u.id: u.auid for u in db.query(User.id, User.auid).filter(User.id.in_([r.user_id for r in records])).all()} if records else {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID",
        "AUID",
        "Volunteer Name",
        "Department",
        "Date",
        "Attendance Status",
        "Check-In Time",
        "Marked By",
        "Last Modified"
    ])

    for r in records:
        registered_auid = (user_lookup.get(r.user_id) or r.auid or "").strip().upper()
        writer.writerow([
            r.id,
            registered_auid,
            r.volunteer_name,
            r.department,
            r.date,
            r.status,
            r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "N/A",
            r.marked_by,
            r.updated_at.strftime("%Y-%m-%d %H:%M:%S") if r.updated_at else ""
        ])

    csv_data = output.getvalue()
    filename = f"AKV_Nuditaranga_2026_Volunteer_Attendance_{date or 'All'}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/attendance/export-xlsx")
def export_attendance_xlsx(
    date: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    query = db.query(VolunteerAttendance)
    if date and date != "all":
        query = query.filter(VolunteerAttendance.date == date)
    
    records = query.order_by(VolunteerAttendance.date.desc(), VolunteerAttendance.volunteer_name.asc()).all()
    user_lookup = {u.id: u.auid for u in db.query(User.id, User.auid).filter(User.id.in_([r.user_id for r in records])).all()} if records else {}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Volunteer Attendance"

    # Styling Palettes
    header_fill = PatternFill(start_color="B91C1C", end_color="B91C1C", fill_type="solid")  # Karnataka Red
    sub_fill = PatternFill(start_color="FEF08A", end_color="FEF08A", fill_type="solid")     # Yellow accent
    white_bold = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=15, bold=True, color="991B1B")
    border_thin = Border(
        left=Side(style='thin', color='E5E7EB'),
        right=Side(style='thin', color='E5E7EB'),
        top=Side(style='thin', color='E5E7EB'),
        bottom=Side(style='thin', color='E5E7EB')
    )

    # Title block
    ws.merge_cells("A1:H1")
    ws["A1"] = "ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("A2:H2")
    date_label = f"Filter Date: {date}" if date and date != "all" else "Complete Attendance Record"
    ws["A2"] = f"Official Volunteer Daily Attendance Report • {date_label} • Generated by: {current_user.name}"
    ws["A2"].font = Font(size=10, italic=True, color="57534E")
    ws["A2"].alignment = Alignment(horizontal="center")

    ws.append([])  # Blank row

    # Headers
    headers = [
        "Record ID",
        "AUID",
        "Volunteer Full Name",
        "Department",
        "Date",
        "Status",
        "Check-In Time",
        "Marked By"
    ]
    ws.append(headers)
    header_row = 4

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=header_row, column=col_idx)
        cell.fill = header_fill
        cell.font = white_bold
        cell.alignment = Alignment(horizontal="center", vertical="center")

    # Data rows
    for r in records:
        checkin_val = r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "N/A"
        registered_auid = (user_lookup.get(r.user_id) or r.auid or "").strip().upper()
        row_data = [
            r.id,
            registered_auid,
            r.volunteer_name,
            r.department,
            r.date,
            r.status,
            checkin_val,
            r.marked_by
        ]
        ws.append(row_data)

    # Format data rows
    for row in ws.iter_rows(min_row=5, max_row=ws.max_row, min_col=1, max_col=len(headers)):
        for cell in row:
            cell.border = border_thin
            cell.alignment = Alignment(vertical="center")
            if cell.column == 6:  # Status column
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if cell.value == "PRESENT":
                    cell.font = Font(bold=True, color="15803D")
                elif cell.value == "ABSENT":
                    cell.font = Font(bold=True, color="B91C1C")
            if cell.column == 2:  # Keep alphanumeric AUIDs as text in Excel.
                cell.number_format = "@"
                if cell.value is not None:
                    cell.value = str(cell.value)

    # Adjust column widths
    column_widths = {
        "A": 12,
        "B": 18,
        "C": 28,
        "D": 30,
        "E": 14,
        "F": 15,
        "G": 18,
        "H": 25
    }
    for col, width in column_widths.items():
        ws.column_dimensions[col].width = width

    # ----------------------------------------------------
    # Sheet 2: WORKING COMMITTEE ATTENDANCE
    # ----------------------------------------------------
    ws_wc = wb.create_sheet(title="Working Committee")
    wc_query = db.query(WorkingCommitteeAttendance).options(joinedload(WorkingCommitteeAttendance.user))
    if date and date != "all":
        wc_query = wc_query.filter(WorkingCommitteeAttendance.attendance_date == date)
    raw_wc_records = wc_query.order_by(WorkingCommitteeAttendance.attendance_date.desc()).all()
    admin_uids = [r[0] for r in db.query(Admin.user_id).filter(Admin.user_id.isnot(None)).all()]
    wc_records = [
        r for r in raw_wc_records
        if r.user and (
            r.user.role in ("ADMIN", "SUPERADMIN", "WORKING_COMMITTEE") or
            r.user.id in admin_uids
        ) and r.user.role != "DEVELOPER" and r.user.auid != "DEV-NANU" and r.user.account_status != "DISABLED"
    ]
    wc_records.sort(key=lambda x: (x.user.name if x.user else ""))
    wc_records.sort(key=lambda x: x.attendance_date or "", reverse=True)

    ws_wc.merge_cells("A1:H1")
    ws_wc["A1"] = "ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026"
    ws_wc["A1"].font = title_font
    ws_wc["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_wc.merge_cells("A2:H2")
    ws_wc["A2"] = f"Official Working Committee Daily Attendance Report • {date_label} • Generated by: {current_user.name}"
    ws_wc["A2"].font = Font(size=10, italic=True, color="57534E")
    ws_wc["A2"].alignment = Alignment(horizontal="center")

    ws_wc.append([])
    wc_headers = [
        "Record ID",
        "AUID",
        "Member Full Name",
        "Role / Designation",
        "Date",
        "Status",
        "Check-In / Marked At",
        "Marked By"
    ]
    ws_wc.append(wc_headers)
    for col_idx in range(1, len(wc_headers) + 1):
        c = ws_wc.cell(row=4, column=col_idx)
        c.fill = PatternFill(start_color="6B21A8", end_color="6B21A8", fill_type="solid")
        c.font = white_bold
        c.alignment = Alignment(horizontal="center", vertical="center")

    for r in wc_records:
        member_name = r.user.name if r.user else "Unknown Member"
        auid_val = ((r.user.auid if r.user else "") or "").strip().upper()
        role_val = (r.user.working_committee_role if r.user and r.user.working_committee_role else (r.user.volunteer_domain if r.user and r.user.volunteer_domain else "Working Committee"))
        time_str = r.check_in_at.strftime("%I:%M %p") if r.check_in_at else ("Present" if r.status in ("PRESENT", "COMPLETED") else ("Absent" if r.status == "ABSENT" else "N/A"))
        marked_by = r.last_modified_by or r.submitted_by or "Super Admin"
        ws_wc.append([
            r.id,
            auid_val,
            member_name,
            role_val,
            r.attendance_date,
            r.status,
            time_str,
            marked_by
        ])

    for row in ws_wc.iter_rows(min_row=5, max_row=ws_wc.max_row, min_col=1, max_col=len(wc_headers)):
        for cell in row:
            cell.border = border_thin
            cell.alignment = Alignment(vertical="center")
            if cell.column == 6:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if cell.value in ("PRESENT", "COMPLETED"):
                    cell.font = Font(bold=True, color="15803D")
                elif cell.value == "ABSENT":
                    cell.font = Font(bold=True, color="B91C1C")
            if cell.column == 2:
                cell.number_format = "@"
                if cell.value is not None:
                    cell.value = str(cell.value)

    for col, width in column_widths.items():
        ws_wc.column_dimensions[col].width = width

    # ----------------------------------------------------
    # Sheet 3: CONSOLIDATED ATTENDANCE (VOLUNTEER + WC)
    # ----------------------------------------------------
    ws_cons = wb.create_sheet(title="Consolidated Attendance")
    ws_cons.merge_cells("A1:I1")
    ws_cons["A1"] = "ACHARYA KANNADA VEDIKE (AKV) — NUDITARANGA 2026"
    ws_cons["A1"].font = title_font
    ws_cons["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws_cons.merge_cells("A2:I2")
    ws_cons["A2"] = f"Consolidated Volunteer & Working Committee Attendance Report • {date_label} • Generated by: {current_user.name}"
    ws_cons["A2"].font = Font(size=10, italic=True, color="57534E")
    ws_cons["A2"].alignment = Alignment(horizontal="center")

    ws_cons.append([])
    cons_headers = [
        "Member Type",
        "Record ID",
        "AUID",
        "Full Name",
        "Department / Role",
        "Date",
        "Status",
        "Check-In / Marked Time",
        "Marked By"
    ]
    ws_cons.append(cons_headers)
    for col_idx in range(1, len(cons_headers) + 1):
        c = ws_cons.cell(row=4, column=col_idx)
        c.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        c.font = white_bold
        c.alignment = Alignment(horizontal="center", vertical="center")

    combined_rows = []
    for r in records:
        checkin_val = r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "N/A"
        auid_val = (user_lookup.get(r.user_id) or r.auid or "").strip().upper()
        combined_rows.append({
            "type": "Volunteer",
            "id": r.id,
            "auid": auid_val,
            "name": r.volunteer_name,
            "dept_role": r.department,
            "date": r.date,
            "status": r.status,
            "time": checkin_val,
            "marked_by": r.marked_by
        })

    for r in wc_records:
        member_name = r.user.name if r.user else "Unknown Member"
        auid_val = ((r.user.auid if r.user else "") or "").strip().upper()
        role_val = (r.user.working_committee_role if r.user and r.user.working_committee_role else (r.user.volunteer_domain if r.user and r.user.volunteer_domain else "Working Committee"))
        time_str = r.check_in_at.strftime("%I:%M %p") if r.check_in_at else ("Present" if r.status in ("PRESENT", "COMPLETED") else ("Absent" if r.status == "ABSENT" else "N/A"))
        marked_by = r.last_modified_by or r.submitted_by or "Super Admin"
        combined_rows.append({
            "type": "Working Committee",
            "id": r.id,
            "auid": auid_val,
            "name": member_name,
            "dept_role": role_val,
            "date": r.attendance_date,
            "status": r.status,
            "time": time_str,
            "marked_by": marked_by
        })

    combined_rows.sort(key=lambda x: x["name"] or "")
    combined_rows.sort(key=lambda x: x["date"] or "", reverse=True)

    for item in combined_rows:
        ws_cons.append([
            item["type"],
            item["id"],
            item["auid"],
            item["name"],
            item["dept_role"],
            item["date"],
            item["status"],
            item["time"],
            item["marked_by"]
        ])

    for row in ws_cons.iter_rows(min_row=5, max_row=ws_cons.max_row, min_col=1, max_col=len(cons_headers)):
        for cell in row:
            cell.border = border_thin
            cell.alignment = Alignment(vertical="center")
            if cell.column == 7:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if cell.value in ("PRESENT", "COMPLETED"):
                    cell.font = Font(bold=True, color="15803D")
                elif cell.value == "ABSENT":
                    cell.font = Font(bold=True, color="B91C1C")
            if cell.column == 3:
                cell.number_format = "@"
                if cell.value is not None:
                    cell.value = str(cell.value)

    cons_widths = {
        "A": 20,
        "B": 12,
        "C": 18,
        "D": 28,
        "E": 26,
        "F": 14,
        "G": 15,
        "H": 22,
        "I": 25
    }
    for col, width in cons_widths.items():
        ws_cons.column_dimensions[col].width = width

    # Save to stream
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = "AKV_Nuditaranga_2026_Consolidated_Attendance.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==========================================
# 7. AUDIT LOGS
# ==========================================
@router.post("/registrations", response_model=RegistrationOut)
def create_event_registration(
    registration_data: RegistrationCreate,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == registration_data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    auid = registration_data.auid.strip().upper()
    usn = (registration_data.usn or auid).strip().upper()
    duplicate = db.query(Registration).filter(
        Registration.event_id == event.id,
        or_(func.upper(Registration.auid) == auid, func.upper(Registration.usn) == usn)
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail=f"This participant is already registered for the event ({duplicate.registration_id}).")

    team_members = json.dumps([member.model_dump() for member in registration_data.team_members]) if registration_data.is_team and registration_data.team_members else None
    registration = Registration(
        registration_id=generate_unique_reg_id(db), event_id=event.id,
        full_name=registration_data.full_name.strip(), auid=auid, usn=usn,
        institute=registration_data.institute.strip(), department=registration_data.department.strip(),
        semester=registration_data.semester or 1, section=(registration_data.section or "A").strip().upper(),
        email=str(registration_data.email).strip().lower(), phone=registration_data.phone,
        gender=registration_data.gender, is_team=registration_data.is_team,
        team_name=registration_data.team_name.strip() if registration_data.team_name else None,
        team_members=team_members, status="Registered"
    )
    db.add(registration)
    event.registered_count = (event.registered_count or 0) + 1
    db.add(AuditLog(user_id=current_user.id, actor_name=current_user.name, action="EVENT_REGISTRATION_CREATED", target_type="REGISTRATION", target_id=registration.registration_id, new_value=f"Event: {event.id}; Participant: {registration.full_name}"))
    db.commit()
    db.refresh(registration)
    return registration


@router.put("/registrations/{registration_id}", response_model=RegistrationOut)
def update_event_registration(
    registration_id: int,
    changes: SuperAdminRegistrationUpdate,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    updates = changes.model_dump(exclude_unset=True)
    target_event_id = updates.get("event_id", registration.event_id)
    target_event = db.query(Event).filter(Event.id == target_event_id).first()
    if not target_event:
        raise HTTPException(status_code=404, detail="Event not found")

    next_auid = (updates.get("auid") or updates.get("usn") or registration.auid or registration.usn).strip().upper()
    next_usn = (updates.get("usn") or updates.get("auid") or registration.usn or registration.auid).strip().upper()
    duplicate = db.query(Registration).filter(
        Registration.id != registration.id,
        Registration.event_id == target_event_id,
        or_(func.upper(Registration.auid) == next_auid, func.upper(Registration.usn) == next_usn)
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail=f"This participant is already registered for the event ({duplicate.registration_id}).")

    if "status" in updates and updates["status"] not in {"Registered", "Checked In", "Cancelled"}:
        raise HTTPException(status_code=400, detail="Status must be Registered, Checked In, or Cancelled")
    if "phone" in updates:
        digits = "".join(char for char in updates["phone"] if char.isdigit())
        if len(digits) not in {10, 11, 12}:
            raise HTTPException(status_code=422, detail="Phone number must contain 10 to 12 digits")
        updates["phone"] = digits[-10:]
    if "email" in updates and updates["email"]:
        updates["email"] = updates["email"].strip().lower()
    if "auid" in updates or "usn" in updates:
        updates["auid"] = next_auid
        updates["usn"] = next_usn
    if "section" in updates and updates["section"]:
        updates["section"] = updates["section"].strip().upper()
    if "team_members" in updates:
        updates["team_members"] = json.dumps([member.model_dump() for member in updates["team_members"]]) if updates["team_members"] else None

    previous_event_id = registration.event_id
    old_values = {key: getattr(registration, key) for key in updates if key not in {"team_members"}}
    for key, value in updates.items():
        setattr(registration, key, value)
    if "status" in updates:
        if updates["status"] == "Checked In" and not registration.checkin_time:
            registration.checkin_time = datetime.datetime.utcnow()
            registration.checked_in_by = current_user.name
        elif updates["status"] != "Checked In":
            registration.checkin_time = None
            registration.checked_in_by = None
    if previous_event_id != target_event_id:
        previous_event = db.query(Event).filter(Event.id == previous_event_id).first()
        if previous_event:
            previous_event.registered_count = max(0, (previous_event.registered_count or 0) - 1)
        target_event.registered_count = (target_event.registered_count or 0) + 1

    db.add(AuditLog(user_id=current_user.id, actor_name=current_user.name, action="EVENT_REGISTRATION_UPDATED", target_type="REGISTRATION", target_id=registration.registration_id, previous_value=json.dumps(old_values, default=str), new_value=json.dumps({key: value for key, value in updates.items()}, default=str)))
    db.commit()
    db.refresh(registration)
    return registration


@router.delete("/registrations/{registration_id}")
def delete_event_registration(
    registration_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    registration = db.query(Registration).filter(Registration.id == registration_id).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    event = db.query(Event).filter(Event.id == registration.event_id).first()
    registration_code = registration.registration_id
    db.add(AuditLog(user_id=current_user.id, actor_name=current_user.name, action="EVENT_REGISTRATION_DELETED", target_type="REGISTRATION", target_id=registration_code, previous_value=f"Event: {registration.event_id}; Participant: {registration.full_name}"))
    db.query(CheckInLog).filter(CheckInLog.registration_id == registration_code).delete(synchronize_session=False)
    db.delete(registration)
    if event:
        event.registered_count = max(0, (event.registered_count or 0) - 1)
    db.commit()
    return {"success": True, "registration_id": registration_code}


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    action: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action and action != "all":
        query = query.filter(AuditLog.action == action)
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    
    results = []
    for l in logs:
        results.append({
            "id": l.id,
            "actor_name": l.actor_name,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "previous_value": l.previous_value,
            "new_value": l.new_value,
            "timestamp": l.created_at.strftime("%Y-%m-%d %I:%M:%S %p") if l.created_at else ""
        })
    return results

# ==========================================
# 8. DATABASE ERASE & RESET ENDPOINT
# ==========================================
@router.post("/database/reset")
def reset_database_endpoint(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Super Admin endpoint to safely reset the database and re-seed defaults.
    """
    from ...reset_db import erase_and_reset_database
    try:
        erase_and_reset_database()
        return {
            "success": True,
            "message": "Database has been completely erased, reseeded, and vacuumed successfully."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset database: {str(e)}"
        )


@router.get("/registrations/export-xlsx")
def export_event_registrations_xlsx(
    event_id: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Export full registration details into one Excel sheet per festival event."""
    events_query = db.query(Event).order_by(Event.title_en.asc())
    if event_id and event_id != "all":
        events_query = events_query.filter(Event.id == event_id)
    events = events_query.all()
    if event_id and event_id != "all" and not events:
        raise HTTPException(status_code=404, detail="Event not found")

    registrations = db.query(Registration).order_by(Registration.created_at.asc()).all()
    registrations_by_event = {}
    for registration in registrations:
        registrations_by_event.setdefault(registration.event_id, []).append(registration)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    headers = [
        "Event", "Event ID", "Registration ID", "Record ID", "Full Name", "AUID", "USN",
        "Institute", "Department", "Year", "Email", "Phone",
        "Gender", "Team Registration", "Team Name", "Team Members (JSON)", "Photo URL",
        "Status", "Check-In Time", "Checked In By", "Account User ID", "Registered At",
    ]
    header_fill = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    thin_border = Border(bottom=Side(style="thin", color="E7E5E4"))

    for index, event in enumerate(events):
        base_title = (event.title_en or event.id or f"Event {index + 1}").strip()
        safe_title = "".join(ch for ch in base_title if ch not in "[]:*?/\\")[:25].strip() or f"Event {index + 1}"
        sheet_title = f"{safe_title} {index + 1}"[:31]
        ws = wb.create_sheet(title=sheet_title)
        ws.append(headers)
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        for registration in registrations_by_event.get(event.id, []):
            ws.append([
                event.title_en or event.id,
                str(event.id),
                str(registration.registration_id or ""),
                str(registration.id),
                registration.full_name or "",
                str(registration.auid or ""),
                str(registration.usn or ""),
                registration.institute or "",
                registration.department or "",
                f"Year {registration.semester}" if registration.semester else "",
                registration.email or "",
                registration.phone or "",
                registration.gender or "",
                "Yes" if registration.is_team else "No",
                registration.team_name or "",
                registration.team_members or "",
                registration.photo_url or "",
                registration.status or "",
                registration.checkin_time.isoformat(sep=" ") if registration.checkin_time else "",
                registration.checked_in_by or "",
                registration.user_id or "",
                registration.created_at.isoformat(sep=" ") if registration.created_at else "",
            ])
        for row in ws.iter_rows(min_row=2):
            for cell in row:
                cell.border = thin_border
                cell.alignment = Alignment(vertical="top", wrap_text=True)
                if cell.data_type == "f":
                    cell.value = "'" + str(cell.value)
            for column in (6, 7):
                ws.cell(row=row[0].row, column=column).number_format = "@"
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions
        for column, width in enumerate([28, 18, 18, 12, 26, 18, 18, 30, 28, 12, 12, 32, 16, 14, 18, 24, 40, 36, 16, 23, 22, 16, 23], start=1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(column)].width = width
        ws.row_dimensions[1].height = 32

    if not events:
        ws = wb.create_sheet("No Events")
        ws.append(["No events are currently configured."])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    filename = "AKV_Event_Registrations.xlsx" if not event_id or event_id == "all" else f"AKV_Event_Registrations_{event_id}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _id_card_user_query(db: Session):
    return db.query(User).options(
        defer(User.photo_url),
        defer(User.password_hash)
    ).filter(or_(
        User.role.in_(["PARTICIPANT", "STUDENT", "VOLUNTEER"]),
        User.is_working_committee == True,
        (User.admin_type == "WORKING_COMMITTEE") & (User.role.in_(["ADMIN", "WORKING_COMMITTEE"])),
        User.role == "WORKING_COMMITTEE",
        User.volunteer_domain == "Working Committee",
    ))


@router.get("/id-cards")
def list_superadmin_id_cards(
    search: Optional[str] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """List printable ID-card records for students, volunteers, and working committee members."""
    user_query = _id_card_user_query(db)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        user_query = user_query.filter(or_(
            func.lower(User.name).like(term),
            func.lower(User.auid).like(term),
            func.lower(User.email).like(term),
            func.lower(User.registration_id).like(term),
            func.lower(User.role).like(term),
            func.lower(User.working_committee_role).like(term),
        ))

    cards = []
    for person in user_query.order_by(User.name.asc()).all():
        role = person.working_committee_role if person.is_working_committee or person.role in ("ADMIN", "WORKING_COMMITTEE") else person.role
        cards.append({
            "source_type": "user", "source_id": person.id, "name": person.name,
            "auid": person.auid, "registration_id": person.registration_id,
            "role": role or person.role, "email": person.email,
            "department": person.department, "event": "",
        })

    registration_query = db.query(Registration, Event.title_en).options(
        defer(Registration.photo_url)
    ).join(Event, Registration.event_id == Event.id).filter(Registration.user_id.is_(None))
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        registration_query = registration_query.filter(or_(
            func.lower(Registration.full_name).like(term),
            func.lower(Registration.auid).like(term),
            func.lower(Registration.usn).like(term),
            func.lower(Registration.email).like(term),
            func.lower(Registration.registration_id).like(term),
        ))
    for registration, event_title in registration_query.order_by(Registration.full_name.asc()).all():
        cards.append({
            "source_type": "registration", "source_id": registration.id,
            "name": registration.full_name, "auid": registration.auid or registration.usn,
            "registration_id": registration.registration_id, "role": "PARTICIPANT",
            "email": registration.email, "department": registration.department,
            "event": event_title or registration.event_id,
        })

    cards.sort(key=lambda card: (card["name"] or "").casefold())
    return {"cards": cards, "total": len(cards)}


@router.get("/id-cards/{source_type}/{source_id}/download")
def download_superadmin_id_card(
    source_type: str,
    source_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    if source_type == "user":
        person = _id_card_user_query(db).filter(User.id == source_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="ID card record not found")
        card_data = {
            "name": person.name, "auid": person.auid, "registration_id": person.registration_id,
            "role": person.working_committee_role if person.is_working_committee else person.role,
            "institute": person.institute, "department": person.department,
            "semester": person.semester, "section": person.section, "email": person.email,
            "phone": person.phone, "volunteer_domain": person.volunteer_domain,
            "photo_url": person.photo_url,
        }
        filename_id = person.registration_id or person.auid
    elif source_type == "registration":
        registration = db.query(Registration).filter(Registration.id == source_id, Registration.user_id.is_(None)).first()
        if not registration:
            raise HTTPException(status_code=404, detail="ID card record not found")
        card_data = {
            "name": registration.full_name, "auid": registration.auid or registration.usn,
            "registration_id": registration.registration_id, "role": "PARTICIPANT",
            "institute": registration.institute, "department": registration.department,
            "semester": registration.semester, "section": registration.section,
            "email": registration.email, "phone": registration.phone,
            "photo_url": registration.photo_url,
        }
        filename_id = registration.registration_id
    else:
        raise HTTPException(status_code=400, detail="Invalid ID card source")

    return Response(
        content=generate_candidate_id_card_pdf(card_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="AKV_ID_Card_{filename_id}.pdf"'},
    )


# ==============================================================================
# BROADCAST NOTIFICATIONS & PROFILE EDIT LOCK CONTROLS
# ==============================================================================

class BroadcastNotificationRequest(BaseModel):
    role_filter: Optional[str] = "ALL"  # "ALL", "STUDENT", "VOLUNTEER", "ADMIN"
    custom_deadline_str: Optional[str] = "October 10, 2026, 11:59 PM IST (10/10/2026 23:59 IST)"


def _dispatch_broadcast_profile_edit_notice(
    users_to_notify: List[dict],
    deadline_str: str,
    actor_name: str
):
    print(f"[BROADCAST NOTICE] Dispatching profile edit notice to {len(users_to_notify)} recipients...")
    success_count = 0
    fail_count = 0
    for u in users_to_notify:
        try:
            ok = send_profile_edit_reopened_email(
                to_email=u["email"],
                user_name=u["name"],
                deadline_str=deadline_str,
                role=u["role"]
            )
            if ok:
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            print(f"[BROADCAST NOTICE ERROR] Failed to send email to {u.get('email')}: {e}")
            fail_count += 1
    print(f"[BROADCAST NOTICE COMPLETED] Success: {success_count}, Failed: {fail_count} (Triggered by {actor_name})")


@router.post("/broadcast/profile-edit-reopened")
def broadcast_profile_edit_reopened(
    background_tasks: BackgroundTasks,
    payload: Optional[BroadcastNotificationRequest] = None,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Broadcasts the Profile Edit Window Reopened notification to all registered users
    asynchronously via BackgroundTasks.
    """
    query = db.query(User).filter(User.account_status == "ACTIVE")
    role_filter = (payload.role_filter.upper() if payload and payload.role_filter else "ALL").strip()

    if role_filter in ("STUDENT", "PARTICIPANT"):
        query = query.filter(User.role == "PARTICIPANT")
    elif role_filter == "VOLUNTEER":
        query = query.filter(User.role == "VOLUNTEER")
    elif role_filter in ("ADMIN", "COORDINATOR"):
        query = query.filter(User.role == "ADMIN")

    users = query.all()
    if not users:
        return {"success": True, "recipient_count": 0, "message": "No active users found matching criteria."}

    deadline_str = (payload.custom_deadline_str if payload and payload.custom_deadline_str else "October 10, 2026, 11:59 PM IST (10/10/2026 23:59 IST)").strip()

    users_data = [
        {"email": u.email, "name": u.name, "role": u.role}
        for u in users
        if u.email and "@" in u.email
    ]

    # Queue background task
    background_tasks.add_task(
        _dispatch_broadcast_profile_edit_notice,
        users_data,
        deadline_str,
        current_user.name
    )

    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="BROADCAST_PROFILE_EDIT_NOTICE",
        target_type="SYSTEM",
        target_id=f"RECIPIENTS_{len(users_data)}",
        previous_value="",
        new_value=f"Deadline: {deadline_str}, Filter: {role_filter}, Recipient Count: {len(users_data)}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "recipient_count": len(users_data),
        "message": f"Broadcast notification successfully queued for {len(users_data)} registered user(s)."
    }


@router.post("/users/{user_id}/reset-profile-edit")
def reset_user_profile_edit(
    user_id: int,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Resets the one-time profile edit lock for a specific user, allowing them to re-edit their details.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    user.profile_edited_once = False

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="RESET_PROFILE_EDIT_LOCK",
        target_type="USER",
        target_id=str(user.id),
        previous_value="profile_edited_once=True",
        new_value="profile_edited_once=False"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Profile edit lock has been reset for {user.name} ({user.auid}). They can now re-edit their details."
    }


@router.post("/users/reset-all-profile-edits")
def reset_all_profile_edits(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    """
    Unlocks and resets profile edit lock for all registered users across the platform.
    """
    count = db.query(User).filter(User.profile_edited_once == True).update({User.profile_edited_once: False})

    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="RESET_ALL_PROFILE_EDIT_LOCKS",
        target_type="SYSTEM",
        target_id=f"COUNT_{count}",
        previous_value="profile_edited_once=True",
        new_value="profile_edited_once=False"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "unlocked_count": count,
        "message": f"Profile edit lock has been reset for {count} user(s)."
    }

