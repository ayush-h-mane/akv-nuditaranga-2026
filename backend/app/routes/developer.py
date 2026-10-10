import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from ..database import get_db, engine
from ..models import (
    User, Admin, Event, Registration, VolunteerAttendance,
    AttendanceRecord, WorkingCommitteeAttendance, AuditLog
)
from ..auth_deps import require_developer, get_password_hash
from ..cache import fast_cache

router = APIRouter(prefix="/developer", tags=["Developer Console"])

# Schemas
class SuperAdminCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
    email: str = Field(...)
    auid: str = Field(..., min_length=3)
    phone: Optional[str] = "9999999999"
    department: Optional[str] = "Department of Kannada Vedike"
    institute: Optional[str] = "Acharya Institute of Technology"

class SuperAdminUpdateRequest(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    auid: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    institute: Optional[str] = None
    account_status: Optional[str] = None

# ==========================================
# 1. SUPERADMIN PROFILES MANAGEMENT
# ==========================================
@router.get("/superadmins")
def list_developer_superadmins(
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    """
    Retrieve all Superadmin profiles.
    Strictly excludes the developer account 'nanu' so it never shows in any directory.
    """
    admins = db.query(Admin).options(
        joinedload(Admin.user)
    ).join(User, Admin.user_id == User.id).filter(
        or_(
            Admin.admin_type == "SUPERADMIN",
            User.role == "SUPERADMIN"
        ),
        func.lower(Admin.username) != "nanu",
        func.lower(User.email) != "nanu.dev@acharyahabba.com"
    ).order_by(Admin.id.asc()).all()

    results = []
    for a in admins:
        u = a.user
        if not u:
            continue
        results.append({
            "id": u.id,
            "admin_id": a.id,
            "username": a.username,
            "name": u.name,
            "auid": u.auid,
            "email": u.email,
            "phone": u.phone,
            "department": u.department,
            "institute": u.institute,
            "plain_password": getattr(u, "plain_password", None) or "",
            "account_status": u.account_status,
            "photo_url": u.photo_url,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "approved_at": a.approved_at.isoformat() if a.approved_at else None
        })
    return results

@router.post("/superadmins")
def create_developer_superadmin(
    payload: SuperAdminCreateRequest,
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    clean_uname = payload.username.strip().lower()
    clean_email = payload.email.strip().lower()
    clean_auid = payload.auid.strip().upper()
    clean_pw = payload.password.strip()

    if clean_uname == "nanu":
        raise HTTPException(status_code=400, detail="Username 'nanu' is reserved for Developer Terminal.")

    if db.query(Admin).filter(func.lower(Admin.username) == clean_uname).first():
        raise HTTPException(status_code=400, detail=f"Username '{clean_uname}' is already in use.")

    if db.query(User).filter(func.lower(User.email) == clean_email).first():
        raise HTTPException(status_code=400, detail=f"Email '{clean_email}' is already registered.")

    if db.query(User).filter(func.upper(User.auid) == clean_auid).first():
        raise HTTPException(status_code=400, detail=f"AUID '{clean_auid}' is already registered.")

    reg_id = f"AKV-SA-{clean_uname.upper()}"
    if db.query(User).filter(User.registration_id == reg_id).first():
        reg_id = f"AKV-SA-{clean_uname.upper()}-{int(datetime.datetime.utcnow().timestamp())}"

    new_user = User(
        name=payload.name.strip(),
        auid=clean_auid,
        email=clean_email,
        phone=payload.phone.strip() if payload.phone else "9999999999",
        institute=payload.institute.strip() if payload.institute else "Acharya Institute of Technology",
        department=payload.department.strip() if payload.department else "Department of Kannada Vedike",
        semester=8,
        section="A",
        gender="Other",
        role="SUPERADMIN",
        admin_type="SUPERADMIN",
        registration_id=reg_id,
        password_hash=get_password_hash(clean_pw),
        plain_password=clean_pw,
        account_status="ACTIVE",
        first_time_setup_required=False
    )
    db.add(new_user)
    db.flush()

    new_admin = Admin(
        user_id=new_user.id,
        username=clean_uname,
        admin_type="SUPERADMIN",
        approval_status="APPROVED",
        approved_by=f"DEVELOPER_{current_user.name}",
        approved_at=datetime.datetime.utcnow()
    )
    db.add(new_admin)

    log = AuditLog(
        user_id=current_user.id,
        actor_name=f"Developer ({current_user.name})",
        action="DEVELOPER_SUPERADMIN_CREATED",
        target_type="SUPERADMIN",
        target_id=str(new_user.id),
        previous_value="N/A",
        new_value=f"Created SuperAdmin '{payload.name}' ({clean_uname})"
    )
    db.add(log)
    db.commit()
    db.refresh(new_user)
    db.refresh(new_admin)

    return {
        "success": True,
        "message": f"SuperAdmin '{new_user.name}' ({clean_uname}) created successfully.",
        "superadmin": {
            "id": new_user.id,
            "admin_id": new_admin.id,
            "username": new_admin.username,
            "name": new_user.name,
            "auid": new_user.auid,
            "email": new_user.email,
            "phone": new_user.phone,
            "department": new_user.department,
            "institute": new_user.institute,
            "plain_password": new_user.plain_password,
            "account_status": new_user.account_status,
            "created_at": new_admin.created_at.isoformat() if new_admin.created_at else None
        }
    }

@router.put("/superadmins/{user_id}")
def update_developer_superadmin(
    user_id: int,
    payload: SuperAdminUpdateRequest,
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="SuperAdmin user not found.")

    target_admin = db.query(Admin).filter(Admin.user_id == user_id).first()

    if target_user.auid == "DEV-NANU" or (target_admin and target_admin.username.lower() == "nanu"):
        raise HTTPException(status_code=403, detail="Developer profile cannot be modified via superadmin manager.")

    prev_summary = f"Name: {target_user.name}, Email: {target_user.email}, Phone: {target_user.phone}"

    if payload.name:
        target_user.name = payload.name.strip()
    if payload.email:
        clean_email = payload.email.strip().lower()
        conflict = db.query(User).filter(func.lower(User.email) == clean_email, User.id != user_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Email '{clean_email}' already in use by another user.")
        target_user.email = clean_email
    if payload.auid:
        clean_auid = payload.auid.strip().upper()
        conflict = db.query(User).filter(func.upper(User.auid) == clean_auid, User.id != user_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"AUID '{clean_auid}' already in use by another user.")
        target_user.auid = clean_auid
    if payload.phone:
        target_user.phone = payload.phone.strip()
    if payload.department:
        target_user.department = payload.department.strip()
    if payload.institute:
        target_user.institute = payload.institute.strip()
    if payload.account_status:
        target_user.account_status = payload.account_status.strip().upper()

    if payload.password and len(payload.password.strip()) >= 4:
        clean_pw = payload.password.strip()
        target_user.password_hash = get_password_hash(clean_pw)
        target_user.plain_password = clean_pw

    if payload.username and target_admin:
        clean_uname = payload.username.strip().lower()
        if clean_uname != target_admin.username.lower():
            if clean_uname == "nanu":
                raise HTTPException(status_code=400, detail="Username 'nanu' is reserved for Developer Terminal.")
            conflict_adm = db.query(Admin).filter(func.lower(Admin.username) == clean_uname, Admin.id != target_admin.id).first()
            if conflict_adm:
                raise HTTPException(status_code=400, detail=f"Username '{clean_uname}' already in use.")
            target_admin.username = clean_uname

    target_user.updated_at = datetime.datetime.utcnow()

    log = AuditLog(
        user_id=current_user.id,
        actor_name=f"Developer ({current_user.name})",
        action="DEVELOPER_SUPERADMIN_UPDATED",
        target_type="SUPERADMIN",
        target_id=str(user_id),
        previous_value=prev_summary,
        new_value=f"Updated SuperAdmin '{target_user.name}' ({target_user.auid})"
    )
    db.add(log)
    db.commit()
    db.refresh(target_user)

    return {
        "success": True,
        "message": f"SuperAdmin profile for '{target_user.name}' updated successfully.",
        "superadmin": {
            "id": target_user.id,
            "admin_id": target_admin.id if target_admin else None,
            "username": target_admin.username if target_admin else "N/A",
            "name": target_user.name,
            "auid": target_user.auid,
            "email": target_user.email,
            "phone": target_user.phone,
            "department": target_user.department,
            "institute": target_user.institute,
            "plain_password": getattr(target_user, "plain_password", None) or "",
            "account_status": target_user.account_status
        }
    }

@router.delete("/superadmins/{user_id}")
def delete_developer_superadmin(
    user_id: int,
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="SuperAdmin user not found.")

    target_admin = db.query(Admin).filter(Admin.user_id == user_id).first()

    if target_user.auid == "DEV-NANU" or (target_admin and target_admin.username.lower() == "nanu"):
        raise HTTPException(status_code=403, detail="Developer root account cannot be deleted.")

    if target_user.email.lower() == "akv@acharya.ac.in":
        raise HTTPException(status_code=403, detail="Root AKV system account cannot be deleted.")

    sa_name = target_user.name
    sa_auid = target_user.auid

    log = AuditLog(
        user_id=current_user.id,
        actor_name=f"Developer ({current_user.name})",
        action="DEVELOPER_SUPERADMIN_DELETED",
        target_type="SUPERADMIN",
        target_id=str(user_id),
        previous_value=f"Name: {sa_name}, AUID: {sa_auid}, Email: {target_user.email}",
        new_value="DELETED"
    )
    db.add(log)

    if target_admin:
        db.delete(target_admin)
    db.delete(target_user)
    db.commit()

    return {
        "success": True,
        "message": f"SuperAdmin profile '{sa_name}' ({sa_auid}) deleted successfully."
    }

# ==========================================
# 2. SYSTEM DIAGNOSTICS & DEVELOPER TOOLS
# ==========================================
@router.get("/system-health")
def get_system_health(
    current_user: User = Depends(require_developer),
    db: Session = Depends(get_db)
):
    users_total = db.query(func.count(User.id)).scalar() or 0
    students_total = db.query(func.count(User.id)).filter(User.role == "PARTICIPANT").scalar() or 0
    volunteers_total = db.query(func.count(User.id)).filter(User.role == "VOLUNTEER").scalar() or 0
    admins_total = db.query(func.count(Admin.id)).filter(Admin.admin_type != "SUPERADMIN", Admin.username != "nanu").scalar() or 0
    superadmins_total = db.query(func.count(Admin.id)).filter(Admin.admin_type == "SUPERADMIN", Admin.username != "nanu").scalar() or 0
    events_total = db.query(func.count(Event.id)).scalar() or 0
    registrations_total = db.query(func.count(Registration.id)).scalar() or 0
    volunteer_attendance_total = db.query(func.count(VolunteerAttendance.id)).scalar() or 0
    wc_attendance_total = db.query(func.count(WorkingCommitteeAttendance.id)).scalar() or 0
    audit_logs_total = db.query(func.count(AuditLog.id)).scalar() or 0

    dialect_name = engine.dialect.name

    return {
        "success": True,
        "metrics": {
            "users_total": users_total,
            "students_total": students_total,
            "volunteers_total": volunteers_total,
            "admins_total": admins_total,
            "superadmins_total": superadmins_total,
            "events_total": events_total,
            "registrations_total": registrations_total,
            "volunteer_attendance_total": volunteer_attendance_total,
            "wc_attendance_total": wc_attendance_total,
            "audit_logs_total": audit_logs_total,
            "database_engine": dialect_name,
            "status": "OPERATIONAL",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
    }

@router.post("/cache/flush")
def flush_developer_cache(
    current_user: User = Depends(require_developer)
):
    fast_cache.clear()
    return {
        "success": True,
        "message": "In-memory cache invalidated across all application nodes.",
        "flushed_at": datetime.datetime.utcnow().isoformat()
    }
