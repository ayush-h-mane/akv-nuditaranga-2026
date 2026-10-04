import re
import json
import hashlib
import secrets
import datetime
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from ..database import get_db, ensure_schema_migrations
from ..models import User, Admin, PasswordResetToken, AuditLog
from ..auth_deps import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    ensure_authorized_superadmins,
    SUPERADMIN_DEFINITIONS,
    AUTHORIZED_SUPERADMIN_USERNAMES
)
from ..utils.email_validation import validate_acharya_email
from ..services.email_service import (
    send_student_welcome_email,
    send_password_reset_email,
    send_admin_registration_email,
    send_superadmin_new_admin_alert
)
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Schemas
class StudentRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    auid: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    institute: str = Field("Acharya Institute of Technology", min_length=2, max_length=150)
    department: str = Field(..., min_length=2, max_length=100)
    semester: int = Field(1, ge=1, le=6)
    section: Optional[str] = Field("A")
    gender: str = Field("Male")
    role: str = Field("PARTICIPANT")  # VOLUNTEER, PARTICIPANT
    photo_url: Optional[str] = None
    volunteer_domain: Optional[str] = None
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: EmailStr) -> str:
        return validate_acharya_email(str(v))

    @field_validator("auid")
    @classmethod
    def clean_auid(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if not re.fullmatch(r"[0-9A-Z]{11,30}", cleaned):
            raise ValueError("AUID must contain 11-30 letters and numbers only (e.g., AIT23BEAI129)")
        return cleaned

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 12:
            raise ValueError("Contact number must be a valid 10-digit phone number")
        return digits[-10:]

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = ["VOLUNTEER", "PARTICIPANT"]
        upper_v = v.strip().upper()
        if upper_v not in allowed:
            raise ValueError(f"Invalid participation role. Must be one of: {', '.join(allowed)}")
        return upper_v

class StudentLoginRequest(BaseModel):
    auid: str
    password: str

class AdminRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    username: Optional[str] = None
    faculty_id: Optional[str] = None
    auid: Optional[str] = None
    admin_type: str = Field("WORKING_COMMITTEE")  # FACULTY_COORDINATOR, WORKING_COMMITTEE
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    institute: str = Field("Acharya Institute of Technology", min_length=2, max_length=150)
    department: str = Field(..., min_length=2, max_length=100)
    semester: Optional[int] = Field(None, ge=1, le=6)
    photo_url: Optional[str] = None
    volunteer_domain: Optional[str] = None
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: EmailStr) -> str:
        return validate_acharya_email(str(v))

    @field_validator("auid")
    @classmethod
    def clean_auid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().upper()
        if not cleaned:
            return None
        if not re.fullmatch(r"[0-9A-Z]{3,30}", cleaned):
            raise ValueError("AUID must contain 3-30 letters and numbers only (e.g., AIT23BEAI129)")
        return cleaned

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 12:
            raise ValueError("Contact number must be a valid 10-digit number")
        return digits[-10:]

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., min_length=3)

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, v: str) -> str:
        identifier = v.strip()
        if "@" in identifier:
            return validate_acharya_email(identifier)
        return identifier.lower()

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

def generate_student_reg_id(db: Session) -> str:
    """Generate unique ID in the format AKVNT0001, AKVNT0002..."""
    total = db.query(func.count(User.id)).scalar() or 0
    next_num = total + 1
    reg_id = f"AKVNT{next_num:04d}"
    while db.query(User).filter(User.registration_id == reg_id).first():
        next_num += 1
        reg_id = f"AKVNT{next_num:04d}"
    return reg_id

def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

ONE_TIME_EDIT_DEADLINE_UTC = datetime.datetime(2026, 10, 5, 18, 29, 59)
ONE_TIME_EDIT_DEADLINE_IST_STR = "October 5, 2026, 11:59 PM IST (05/10/2026 23:59)"

def is_profile_edit_window_open() -> bool:
    return datetime.datetime.utcnow() <= ONE_TIME_EDIT_DEADLINE_UTC

def _safe_iso(val):
    if not val:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)

def user_to_dict(user: User, admin_profile: Optional[Admin] = None) -> dict:
    has_edited = bool(getattr(user, "profile_edited_once", False))
    window_open = is_profile_edit_window_open()
    return {
        "id": user.id,
        "name": user.name,
        "auid": user.auid,
        "email": user.email,
        "phone": user.phone,
        "institute": user.institute,
        "department": user.department,
        "semester": user.semester,
        "section": user.section,
        "gender": user.gender,
        "role": user.role,
        "photo_url": user.photo_url,
        "volunteer_domain": user.volunteer_domain,
        "admin_type": user.admin_type or (admin_profile.admin_type if admin_profile else "WORKING_COMMITTEE"),
        "faculty_id": user.faculty_id or (admin_profile.faculty_id if admin_profile else None),
        "registration_id": user.registration_id,
        "account_status": user.account_status,
        "admin_status": admin_profile.approval_status if admin_profile else None,
        "admin_username": admin_profile.username if admin_profile else None,
        "username": admin_profile.username if admin_profile else user.auid,
        "profile_edited_once": has_edited,
        "profile_edited_at": _safe_iso(getattr(user, "profile_edited_at", None)),
        "one_time_edit_deadline": "2026-10-05T23:59:59+05:30",
        "one_time_edit_deadline_str": ONE_TIME_EDIT_DEADLINE_IST_STR,
        "can_edit_profile": (not has_edited) and window_open,
        "first_time_setup_required": bool(getattr(user, "first_time_setup_required", False)) if getattr(admin_profile, "username", "").lower() != "akvsaculturals" else False,
        "created_at": _safe_iso(getattr(user, "created_at", None))
    }


# ==========================================
# 1. STUDENT REGISTRATION
# ==========================================
@router.post("/register/student", status_code=status.HTTP_201_CREATED)
def register_student(
    payload: StudentRegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if payload.role == "VOLUNTEER" and not payload.volunteer_domain:
        raise HTTPException(status_code=400, detail="AKV domain is required for volunteers.")

    # Check unique AUID
    clean_auid = payload.auid.strip().upper()
    if db.query(User).filter(func.upper(User.auid) == clean_auid).first():
        raise HTTPException(status_code=409, detail="An account already exists with this AUID.")

    # Check unique Email
    clean_email = payload.email.strip().lower()
    if db.query(User).filter(func.lower(User.email) == clean_email).first():
        raise HTTPException(status_code=409, detail="This college email is already registered.")

    # Generate unique Registration ID
    reg_id = generate_student_reg_id(db)

    # Hash password
    pw_hash = get_password_hash(payload.password)

    # Create User
    new_user = User(
        name=payload.full_name.strip(),
        auid=clean_auid,
        email=clean_email,
        phone=payload.phone.strip(),
        institute=payload.institute.strip(),
        department=payload.department.strip(),
        semester=payload.semester,
        section=(payload.section or "A").strip().upper(),
        gender=payload.gender,
        role=payload.role,
        photo_url=payload.photo_url,
        volunteer_domain=payload.volunteer_domain.strip() if payload.volunteer_domain else None,
        registration_id=reg_id,
        password_hash=pw_hash,
        account_status="ACTIVE"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send Welcome & Confirmation Email asynchronously with ID Card PDF attached
    candidate_info = {
        "name": new_user.name,
        "auid": clean_auid,
        "registration_id": reg_id,
        "role": new_user.role,
        "institute": new_user.institute,
        "department": new_user.department,
        "semester": new_user.semester,
        "section": new_user.section,
        "email": clean_email,
        "phone": new_user.phone,
        "volunteer_domain": new_user.volunteer_domain,
        "photo_url": new_user.photo_url
    }
    background_tasks.add_task(
        send_student_welcome_email,
        to_email=clean_email,
        student_name=new_user.name,
        auid=clean_auid,
        role=new_user.role,
        registration_id=reg_id,
        candidate_data=candidate_info
    )

    # Log action
    log = AuditLog(
        user_id=new_user.id,
        actor_name=new_user.name,
        action="STUDENT_REGISTERED",
        target_type="STUDENT",
        target_id=str(new_user.id),
        previous_value=None,
        new_value=f"Role: {new_user.role}, AUID: {clean_auid}, RegID: {reg_id}"
    )
    db.add(log)
    db.commit()

    # Generate token
    token = create_access_token({"sub": str(new_user.id), "role": new_user.role})

    return {
        "success": True,
        "message": "Registration Successful",
        "token": token,
        "user": user_to_dict(new_user)
    }

# ==========================================
# 2. STUDENT LOGIN
# ==========================================
@router.post("/login/student")
def login_student(payload: StudentLoginRequest, db: Session = Depends(get_db)):
    clean_input = payload.auid.strip()
    clean_auid = clean_input.upper()
    clean_email = clean_input.lower()

    # 1. High-speed indexed lookup (B-Tree index seek on AUID, Email, Reg ID, Phone)
    user = db.query(User).filter(
        or_(
            User.auid == clean_auid,
            User.email == clean_email,
            User.registration_id == clean_auid,
            User.phone == clean_input,
            User.auid == clean_input,
            User.email == clean_input
        )
    ).first()

    # Fallback to case-insensitive only if direct indexed seek didn't find a record
    if not user:
        user = db.query(User).filter(
            or_(
                func.upper(User.auid) == clean_auid,
                func.lower(User.email) == clean_email,
                func.upper(User.registration_id) == clean_auid
            )
        ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AUID, email, or password."
        )

    # Validate password with optimized single-check
    clean_pw = payload.password.strip()
    pw_matches = verify_password(payload.password, user.password_hash)
    if not pw_matches and clean_pw != payload.password:
        pw_matches = verify_password(clean_pw, user.password_hash)

    if not pw_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AUID, email, or password."
        )

    # Strictly isolate: Student login is for Students/Participants/Volunteers ONLY.
    # Reject any user with Admin or Superadmin role, or any user associated with an Admin profile.
    if user.role in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: This account belongs to an Administrator. Please log in via the Admin / Super Admin Portal."
        )
    has_admin_profile = db.query(Admin.id).filter(Admin.user_id == user.id).first()
    if has_admin_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: This account belongs to an Administrator. Please log in via the Admin / Super Admin Portal."
        )

    if user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact the administrator."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": user_to_dict(user, admin_profile=None)
    }

# ==========================================
# 3. FORGOT PASSWORD
# ==========================================
@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    clean_id = payload.identifier.strip().lower()
    
    # Generic security message to prevent account enumeration
    success_msg = f"If an account exists with this identifier, a 10-minute password reset link will be emailed from {settings.EMAIL_FROM} to your registered college email."

    user = db.query(User).outerjoin(Admin).filter(
        or_(
            func.lower(User.email) == clean_id,
            func.lower(User.auid) == clean_id,
            func.lower(Admin.username) == clean_id
        )
    ).first()

    if not user:
        return {"success": True, "message": success_msg}

    # Generate single-use secure random token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_reset_token(raw_token)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    # Invalidate previous unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at == None
    ).delete()

    reset_record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(reset_record)
    db.commit()

    # Reset URL
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    reset_link = f"{frontend_base}/#reset-token={raw_token}"

    delivery_ok = send_password_reset_email(
        to_email=user.email,
        student_name=user.name,
        reset_link=reset_link,
        expires_minutes=10
    )
    if delivery_ok:
        print(f"[PASSWORD RESET EMAIL] Automated reset email successfully dispatched to {user.email} from {settings.EMAIL_FROM}.", flush=True)
    else:
        print(f"[PASSWORD RESET EMAIL NOTICE] Live SMTP dispatch could not be completed for {user.email}. Preserving 10-minute token in database.", flush=True)
        print("=" * 70, flush=True)
        print(f"[AUTOMATED MAIL - PASSWORD RESET LINK GENERATED]", flush=True)
        print(f"From:    {settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>", flush=True)
        print(f"To:      {user.name} <{user.email}>", flush=True)
        print(f"Subject: AKV Nuditaranga 2026 – Password Reset Link (Valid for 10 Minutes)", flush=True)
        print(f"Link:    {reset_link}", flush=True)
        print(f"Expires: 10 minutes", flush=True)
        print("=" * 70, flush=True)

    resp_payload = {
        "success": True,
        "message": success_msg,
        "email_delivered": delivery_ok
    }
    if settings.ENVIRONMENT == "development":
        resp_payload["dev_reset_token"] = raw_token
        resp_payload["dev_reset_link"] = reset_link

    return resp_payload

# ==========================================
# 4. RESET PASSWORD
# ==========================================
@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    token_hash = hash_reset_token(payload.token.strip())
    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at == None
    ).first()

    if not reset_entry:
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid or has already been used. Please request a new one."
        )

    if datetime.datetime.utcnow() > reset_entry.expires_at:
        raise HTTPException(
            status_code=400,
            detail="This password reset link has expired. Please request a new one."
        )

    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    # Update password
    user.password_hash = get_password_hash(payload.new_password)
    user.updated_at = datetime.datetime.utcnow()
    
    # Mark token used
    reset_entry.used_at = datetime.datetime.utcnow()

    # Audit log
    log = AuditLog(
        user_id=user.id,
        actor_name=user.name,
        action="PASSWORD_RESET",
        target_type="STUDENT",
        target_id=str(user.id),
        previous_value=None,
        new_value="Password changed via secure reset token"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": "Password successfully reset. You can now log in with your new password."
    }

# ==========================================
# 5. ADMIN REGISTRATION
# ==========================================
@router.post("/register/admin", status_code=status.HTTP_201_CREATED)
def register_admin(
    payload: AdminRegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Resolve username, faculty ID, and AUID based on admin_type
    admin_type = payload.admin_type or "WORKING_COMMITTEE"
    clean_fac_id = payload.faculty_id.strip().upper() if payload.faculty_id else None
    clean_auid = payload.auid.strip().upper() if payload.auid else None

    if admin_type == "WORKING_COMMITTEE":
        if not payload.volunteer_domain:
            raise HTTPException(status_code=400, detail="AKV domain is required for Working Committee admins.")
        if not clean_auid:
            raise HTTPException(status_code=400, detail="AUID is required for Working Committee registration.")

    if payload.username and payload.username.strip():
        clean_uname = payload.username.strip().lower()
    elif clean_auid:
        clean_uname = clean_auid.lower()
    elif clean_fac_id:
        clean_uname = f"fac_{clean_fac_id.lower()}"
    else:
        clean_uname = re.sub(r"[^a-z0-9]", "", payload.full_name.lower())[:15] + str(secrets.randbelow(999))

    clean_email = payload.email.strip().lower()

    if clean_auid:
        auid_val = clean_auid
    elif clean_fac_id:
        auid_val = f"FAC-{clean_fac_id}"
    else:
        auid_val = f"ADM-{clean_uname.upper()}"

    # Check username in admins
    existing_admin_by_uname = db.query(Admin).filter(func.lower(Admin.username) == clean_uname).first()

    # Check if a user with this AUID or email already exists in users
    existing_user_by_auid = db.query(User).filter(func.upper(User.auid) == auid_val.upper()).first()
    existing_user_by_email = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if existing_user_by_auid and existing_user_by_email and existing_user_by_auid.id != existing_user_by_email.id:
        raise HTTPException(status_code=409, detail="The provided AUID and email belong to different registered accounts.")

    matched_user = existing_user_by_auid or existing_user_by_email
    pw_hash = get_password_hash(payload.password)

    if matched_user:
        # Check if already registered as an admin
        existing_admin = db.query(Admin).filter(Admin.user_id == matched_user.id).first()
        if existing_admin:
            if existing_admin.approval_status == "PENDING_APPROVAL":
                raise HTTPException(status_code=409, detail="Your admin registration is already submitted and awaiting Super Admin approval.")
            elif existing_admin.approval_status == "APPROVED":
                raise HTTPException(status_code=409, detail="This account is already registered and approved as an admin. Please log in directly.")
            else:
                raise HTTPException(status_code=409, detail="An administrator account with this AUID or email is already registered.")

        # Check if username is taken by another admin
        if existing_admin_by_uname and existing_admin_by_uname.user_id != matched_user.id:
            raise HTTPException(status_code=409, detail="This admin username or AUID is already taken by another administrator.")

        # Upgrade existing student/volunteer to Admin role with working committee details
        matched_user.name = payload.full_name.strip()
        matched_user.phone = payload.phone.strip()
        matched_user.institute = payload.institute.strip()
        matched_user.department = payload.department.strip()
        matched_user.admin_type = admin_type
        matched_user.is_working_committee = (admin_type == "WORKING_COMMITTEE")
        if admin_type == "WORKING_COMMITTEE":
            matched_user.working_committee_role = "Coordinator"
            if payload.semester:
                matched_user.semester = payload.semester
        if clean_fac_id:
            matched_user.faculty_id = clean_fac_id
        if payload.volunteer_domain:
            matched_user.volunteer_domain = payload.volunteer_domain.strip()
        if payload.photo_url:
            matched_user.photo_url = payload.photo_url
        matched_user.role = "ADMIN"
        matched_user.password_hash = pw_hash
        db.commit()
        db.refresh(matched_user)
        target_user = matched_user
    else:
        if existing_admin_by_uname:
            raise HTTPException(status_code=409, detail="This admin username or AUID is already taken.")

        reg_id = generate_student_reg_id(db)

        # Determine semester for Working Committee vs Faculty Coordinator
        admin_sem = payload.semester if (payload.semester and 1 <= payload.semester <= 6) else 1
        if admin_type == "FACULTY_COORDINATOR":
            admin_sem = 1
        elif not payload.semester and auid_val:
            m = re.search(r"^[A-Za-z]+(\d{2})", auid_val)
            if m:
                join_yr = 2000 + int(m.group(1))
                admin_sem = max(1, min(6, 2026 - join_yr))

        # Create user with role ADMIN
        new_user = User(
            name=payload.full_name.strip(),
            auid=auid_val,
            email=clean_email,
            phone=payload.phone.strip(),
            institute=payload.institute.strip(),
            department=payload.department.strip(),
            semester=admin_sem,
            section="A",
            gender="Other",
            role="ADMIN",
            photo_url=payload.photo_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
            volunteer_domain=payload.volunteer_domain.strip() if payload.volunteer_domain else None,
            admin_type=admin_type,
            faculty_id=clean_fac_id,
            is_working_committee=(admin_type == "WORKING_COMMITTEE"),
            working_committee_role="Coordinator" if admin_type == "WORKING_COMMITTEE" else None,
            registration_id=reg_id,
            password_hash=pw_hash,
            account_status="ACTIVE"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        target_user = new_user

    # Create Admin profile with status PENDING_APPROVAL
    admin_entry = Admin(
        user_id=target_user.id,
        username=clean_uname,
        admin_type=admin_type,
        faculty_id=clean_fac_id,
        approval_status="PENDING_APPROVAL",
        created_at=datetime.datetime.utcnow()
    )
    db.add(admin_entry)

    # Audit log
    log = AuditLog(
        user_id=target_user.id,
        actor_name=target_user.name,
        action="ADMIN_REGISTERED",
        target_type="ADMIN",
        target_id=str(target_user.id),
        previous_value=None,
        new_value=f"Status: PENDING_APPROVAL, Type: {admin_type}, Username: {clean_uname}, AUID: {target_user.auid}"
    )
    db.add(log)
    db.commit()

    # Collect all SuperAdmin email addresses for broadcast notification
    sa_emails = set()
    if settings.SUPERADMIN_EMAIL and settings.SUPERADMIN_EMAIL.strip():
        sa_emails.add(settings.SUPERADMIN_EMAIL.strip().lower())
    for sa_user in db.query(User).filter(User.role == "SUPERADMIN").all():
        if sa_user.email:
            sa_emails.add(sa_user.email.strip().lower())

    # Email notifications dispatched asynchronously via BackgroundTasks
    background_tasks.add_task(send_admin_registration_email, clean_email, target_user.name, clean_uname)
    background_tasks.add_task(
        send_superadmin_new_admin_alert,
        superadmin_email=list(sa_emails),
        admin_name=target_user.name,
        username=clean_uname,
        admin_email=clean_email,
        department=target_user.department
    )

    return {
        "success": True,
        "message": "Your admin account is awaiting Super Admin approval.",
        "status": "PENDING_APPROVAL",
        "username": clean_uname,
        "auid": target_user.auid
    }

# ==========================================
# 6. ADMIN LOGIN
# ==========================================
@router.post("/login/admin")
def login_admin(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    clean_uname = payload.username.strip().lower()
    clean_pw = payload.password.strip()

    # Fast indexed lookup by username, email, or AUID
    admin_entry = db.query(Admin).options(joinedload(Admin.user)).join(User, Admin.user_id == User.id).filter(
        or_(
            func.lower(Admin.username) == clean_uname,
            func.lower(User.email) == clean_uname,
            func.upper(User.auid) == clean_uname.upper(),
            func.lower(User.auid) == clean_uname
        )
    ).first()

    if not admin_entry:
        admin_entry = db.query(Admin).options(joinedload(Admin.user)).filter(func.lower(Admin.username) == clean_uname).first()

    if not admin_entry:
        admin_entry = db.query(Admin).options(joinedload(Admin.user)).join(User, Admin.user_id == User.id).filter(
            or_(
                func.lower(Admin.username) == clean_uname,
                func.lower(User.email) == clean_uname,
                func.upper(User.auid) == clean_uname.upper()
            )
        ).first()

    # 3. If not an admin, check if a student is trying to access the admin portal
    if not admin_entry:
        student_match = db.query(User).filter(
            or_(
                func.upper(User.auid) == clean_uname.upper(),
                func.lower(User.email) == clean_uname,
                func.upper(User.registration_id) == clean_uname.upper(),
            )
        ).first()
        if student_match:
            pending_adm = db.query(Admin).filter(Admin.user_id == student_match.id).first()
            if pending_adm and pending_adm.approval_status == "PENDING_APPROVAL":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your admin account is awaiting Super Admin approval."
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Student credentials cannot be used to log in to the Admin Portal. Please use the Student Login."
            )

    if not admin_entry or not admin_entry.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials (AUID, College Email, or Password)."
        )

    pw_matches = verify_password(payload.password, admin_entry.user.password_hash)
    if not pw_matches and clean_pw != payload.password:
        pw_matches = verify_password(clean_pw, admin_entry.user.password_hash)
    if not pw_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials (AUID, College Email, or Password)."
        )

    if admin_entry.user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin account has been deactivated."
        )

    # Check approval status
    if admin_entry.approval_status == "PENDING_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin account is awaiting Super Admin approval."
        )

    if admin_entry.approval_status == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin registration has not been approved."
        )

    if admin_entry.approval_status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your admin account is not active."
        )

    # Ensure role is ADMIN or SUPERADMIN
    if admin_entry.user.role not in ["ADMIN", "SUPERADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have administrator privileges."
        )

    token = create_access_token({"sub": str(admin_entry.user.id), "role": admin_entry.user.role})
    return {
        "success": True,
        "message": "Admin login successful",
        "token": token,
        "user": user_to_dict(admin_entry.user, admin_entry)
    }

# ==========================================
# 6B. SUPERADMIN DEDICATED LOGIN
# Strictly restricted to ONLY the 6 authorized credentials:
# 1. akvsadayt (Ayush H Mane)
# 2. akvsapriya (Priyanka S Reddy)
# 3. akvsaarjun (Arjun V)
# 4. akvsaculturals (Culturals)
# 5. akvsatejas (Mr. Tejas K)
# 6. akvsarakshi (Mrs. Rakshitha B. T)
# ==========================================
@router.post("/login/superadmin")
@router.post("/superadmin/login")
def login_superadmin(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    clean_uname = payload.username.strip().lower()
    clean_pw = payload.password.strip()

    # Resolve clean_uname if entered as email or AUID
    resolved_sa = next(
        (s for s in SUPERADMIN_DEFINITIONS if (
            s['username'].lower() == clean_uname or
            s['email'].lower() == clean_uname or
            s.get('auid', '').lower() == clean_uname
        )),
        None
    )
    if resolved_sa:
        clean_uname = resolved_sa['username'].lower()

    # Strictly verify that username/access ID is in the 6 authorized credentials
    if clean_uname not in AUTHORIZED_SUPERADMIN_USERNAMES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: This portal is strictly for authorized AKV Super Administrators only. Provided ID is not an authorized Super Administrator."
        )

    sa_def = next((s for s in SUPERADMIN_DEFINITIONS if s['username'].lower() == clean_uname), None)

    try:
        # Fast lookup of authorized SuperAdmin account
        admin_entry = db.query(Admin).options(joinedload(Admin.user)).filter(
            func.lower(Admin.username) == clean_uname
        ).first()

        if not admin_entry or not admin_entry.user or admin_entry.user.role != "SUPERADMIN":
            # Auto-seed authorized superadmin accounts into database if not yet present
            try:
                ensure_schema_migrations()
                ensure_authorized_superadmins(db)
            except Exception as seed_err:
                db.rollback()
                print(f"[SUPERADMIN AUTO-SEED ON LOGIN ERROR] {seed_err}")

            admin_entry = db.query(Admin).options(joinedload(Admin.user)).filter(
                func.lower(Admin.username) == clean_uname
            ).first()

        # Dedicated fallback reconciliation for this specific authorized superadmin
        if (not admin_entry or not admin_entry.user or admin_entry.user.role != "SUPERADMIN") and sa_def:
            try:
                usr = None
                # Check for Ayush aliases or canonical email/AUID
                if sa_def['username'] == 'akvsadayt':
                    usr = db.query(User).filter(
                        func.lower(User.email).in_(['ayushhmane@gmail.com', 'ayushhmane05@gmail.com'])
                    ).first()
                    if not usr:
                        usr = db.query(User).filter(
                            func.upper(User.auid).in_(['ADM-MANE', 'ADM-AYUSH', 'AIT22BEIS020', '1AY22IS020'])
                        ).first()

                if not usr and sa_def.get('email'):
                    usr = db.query(User).filter(func.lower(User.email) == sa_def['email'].lower()).first()

                if not usr and sa_def.get('auid'):
                    usr = db.query(User).filter(func.upper(User.auid) == sa_def['auid'].upper()).first()

                if not usr:
                    reg_id = f"AKV-SA-{clean_uname.upper()}"
                    existing_reg = db.query(User).filter(User.registration_id == reg_id).first()
                    if existing_reg:
                        reg_id = f"AKV-SA-{clean_uname.upper()}-{int(datetime.datetime.utcnow().timestamp())}"

                    usr = User(
                        name=sa_def['name'],
                        auid=sa_def['auid'],
                        email=sa_def['email'],
                        phone=sa_def['phone'] or '9999999999',
                        institute='Acharya Institute of Technology',
                        department=sa_def['dept'],
                        semester=8,
                        section='A',
                        gender='Other',
                        role='SUPERADMIN',
                        registration_id=reg_id,
                        password_hash=get_password_hash(sa_def['password']),
                        account_status='ACTIVE',
                        first_time_setup_required=sa_def['setup_required']
                    )
                    db.add(usr)
                    db.flush()
                else:
                    usr.name = sa_def['name']
                    usr.role = 'SUPERADMIN'
                    usr.account_status = 'ACTIVE'
                    usr.password_hash = get_password_hash(sa_def['password'])
                    if getattr(usr, "first_time_setup_required", None) is None:
                        usr.first_time_setup_required = sa_def['setup_required']
                    db.flush()

                # Clean any conflicting admin holding this username
                conflict = db.query(Admin).filter(
                    func.lower(Admin.username) == clean_uname,
                    Admin.user_id != usr.id
                ).first()
                if conflict:
                    db.delete(conflict)
                    db.flush()

                adm = db.query(Admin).filter(Admin.user_id == usr.id).first()
                if not adm:
                    adm = Admin(
                        user_id=usr.id,
                        username=clean_uname,
                        admin_type='SUPERADMIN',
                        approval_status='APPROVED',
                        approved_by='SYSTEM_INIT',
                        approved_at=datetime.datetime.utcnow()
                    )
                    db.add(adm)
                else:
                    adm.username = clean_uname
                    adm.admin_type = 'SUPERADMIN'
                    adm.approval_status = 'APPROVED'
                db.flush()
                db.commit()

                admin_entry = db.query(Admin).options(joinedload(Admin.user)).filter(
                    func.lower(Admin.username) == clean_uname
                ).first()
            except Exception as heal_err:
                db.rollback()
                print(f"[SUPERADMIN DIRECT HEAL ERROR] {heal_err}")

        if not admin_entry or not admin_entry.user or admin_entry.user.role != "SUPERADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted: This portal is strictly for Super Administrators."
            )

        db_sa = admin_entry.user

        is_pw_valid = False
        if verify_password(payload.password, db_sa.password_hash) or verify_password(clean_pw, db_sa.password_hash):
            is_pw_valid = True
        elif sa_def and (payload.password == sa_def['password'] or clean_pw == sa_def['password']):
            # Heal password hash in database on canonical password match
            is_pw_valid = True
            try:
                db_sa.password_hash = get_password_hash(sa_def['password'])
                db.commit()
            except Exception:
                db.rollback()

        if not is_pw_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Super Admin credentials."
            )

        if db_sa.account_status != "ACTIVE":
            try:
                db_sa.account_status = "ACTIVE"
                db.commit()
            except Exception:
                db.rollback()

        token = create_access_token({"sub": str(db_sa.id), "role": "SUPERADMIN"})
        user_dict = user_to_dict(db_sa, admin_entry)
        return {
            "success": True,
            "message": f"Super Admin ({clean_uname}) login authorized",
            "token": token,
            "user": user_dict
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Superadmin authentication encountered an internal error: {str(e)}"
        )

# ==========================================
# 6C. SUPERADMIN FIRST-TIME ONBOARDING (Credentials 5 & 6)
# ==========================================
class SuperAdminFirstTimeSetupRequest(BaseModel):
    email: EmailStr
    faculty_id: Optional[str] = None
    auid: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: EmailStr) -> str:
        return validate_acharya_email(str(v))

    @field_validator("auid")
    @classmethod
    def clean_auid(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        cleaned = v.strip().upper()
        if not re.fullmatch(r"[0-9A-Z/\-_]{2,35}", cleaned):
            raise ValueError("AUID/Faculty ID must contain 2-35 characters (letters, numbers, hyphens, slashes).")
        return cleaned

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 12:
            raise ValueError("Contact number must be a valid 10-digit number")
        return digits[-10:]

@router.post("/superadmin/first-time-setup")
def superadmin_first_time_setup(
    payload: SuperAdminFirstTimeSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Only Superadmin accounts can access this onboarding.")

    admin_entry = db.query(Admin).filter(Admin.user_id == current_user.id).first()
    # 4th credential check: never prompt or feed details other than username & password
    if admin_entry and admin_entry.username.lower() == "akvsaculturals":
        raise HTTPException(status_code=400, detail="Culturals account does not require additional details.")

    clean_email = str(payload.email).strip().lower()
    clean_auid = (payload.auid or payload.faculty_id or "").strip().upper()
    if not clean_auid:
        clean_auid = f"SA-{admin_entry.username.upper()}" if admin_entry else f"SA-{current_user.id}"

    # Check email uniqueness against other users
    existing_email = db.query(User).filter(func.lower(User.email) == clean_email, User.id != current_user.id).first()
    if existing_email:
        raise HTTPException(status_code=409, detail=f"Email '{clean_email}' is already in use by another account.")

    # Check AUID uniqueness against other users
    existing_auid = db.query(User).filter(func.upper(User.auid) == clean_auid, User.id != current_user.id).first()
    if existing_auid:
        raise HTTPException(status_code=409, detail=f"AUID / Faculty ID '{clean_auid}' is already registered to another account.")

    # Update records
    current_user.email = clean_email
    current_user.auid = clean_auid
    if payload.faculty_id:
        current_user.faculty_id = payload.faculty_id.strip()
    if payload.phone:
        current_user.phone = payload.phone.strip()
    if payload.department:
        current_user.department = payload.department.strip()

    current_user.first_time_setup_required = False
    current_user.updated_at = datetime.datetime.utcnow()

    if admin_entry:
        if payload.faculty_id:
            admin_entry.faculty_id = payload.faculty_id.strip()

    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="SUPERADMIN_FIRST_TIME_SETUP",
        target_type="SUPERADMIN",
        target_id=str(current_user.id),
        previous_value="first_time_setup_required=True",
        new_value=f"email={clean_email}, auid={clean_auid}, faculty_id={payload.faculty_id}"
    )
    db.add(log)
    db.commit()
    db.refresh(current_user)
    if admin_entry:
        db.refresh(admin_entry)

    return {
        "success": True,
        "message": f"Welcome {current_user.name}! Your official Superadmin details have been successfully configured.",
        "user": user_to_dict(current_user, admin_entry)
    }

# ==========================================
# 7. GET CURRENT USER PROFILE (/me)
# ==========================================
@router.get("/me")
def get_authenticated_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    admin_profile = db.query(Admin).filter(Admin.user_id == current_user.id).first()
    return {
        "success": True,
        "user": user_to_dict(current_user, admin_profile)
    }

# ==========================================
# 8. ONE-TIME PROFILE EDIT (DEADLINE: 05/10/2026 11:59PM)
# ==========================================
class OneTimeProfileEditRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    auid: Optional[str] = Field(None, min_length=3, max_length=30)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    institute: Optional[str] = Field(None, min_length=2, max_length=150)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    semester: Optional[int] = Field(None, ge=1, le=6)
    section: Optional[str] = Field(None)
    gender: Optional[str] = None
    role: Optional[str] = None  # VOLUNTEER, PARTICIPANT
    volunteer_domain: Optional[str] = None
    photo_url: Optional[str] = None
    admin_type: Optional[str] = None  # FACULTY_COORDINATOR, WORKING_COMMITTEE
    faculty_id: Optional[str] = None
    username: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_domain(cls, v: Optional[EmailStr]) -> Optional[str]:
        if v is None:
            return None
        return validate_acharya_email(str(v))

    @field_validator("auid")
    @classmethod
    def clean_auid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip().upper()
        if not re.fullmatch(r"[0-9A-Z]{3,30}", cleaned):
            raise ValueError("AUID must contain 3-30 letters and numbers only (e.g., AIT23BEAI129)")
        return cleaned

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 12:
            raise ValueError("Contact number must be a valid 10-digit number")
        return digits[-10:]

@router.put("/profile/one-time-edit")
@router.post("/profile/one-time-edit")
def update_profile_one_time(
    payload: OneTimeProfileEditRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Enforce time limit (5/10/2026 11:59PM IST)
    if not is_profile_edit_window_open():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The one-time profile edit window closed on {ONE_TIME_EDIT_DEADLINE_IST_STR}."
        )

    # 2. Enforce one-time limit
    if getattr(current_user, "profile_edited_once", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already utilized your one-time profile details update opportunity."
        )

    # 3. Check uniqueness if auid changed
    if payload.auid:
        clean_auid = payload.auid.strip().upper()
        if clean_auid != current_user.auid:
            existing = db.query(User).filter(func.upper(User.auid) == clean_auid, User.id != current_user.id).first()
            if existing:
                raise HTTPException(status_code=409, detail=f"AUID {clean_auid} is already registered to another account.")
            current_user.auid = clean_auid

    # 4. Check uniqueness if email changed
    if payload.email:
        clean_email = payload.email.strip().lower()
        if clean_email != current_user.email:
            existing = db.query(User).filter(func.lower(User.email) == clean_email, User.id != current_user.id).first()
            if existing:
                raise HTTPException(status_code=409, detail=f"Email {clean_email} is already registered to another account.")
            current_user.email = clean_email

    # 5. Capture previous values for audit trail
    old_details = {
        "name": current_user.name,
        "auid": current_user.auid,
        "email": current_user.email,
        "phone": current_user.phone,
        "institute": current_user.institute,
        "department": current_user.department,
        "semester": current_user.semester,
        "section": current_user.section,
        "gender": current_user.gender,
        "role": current_user.role,
        "volunteer_domain": current_user.volunteer_domain
    }

    # 6. Apply updates
    if payload.name:
        current_user.name = payload.name.strip()
    if payload.phone:
        current_user.phone = payload.phone.strip()
    if payload.institute:
        current_user.institute = payload.institute.strip()
    if payload.department:
        current_user.department = payload.department.strip()
    if payload.semester is not None:
        current_user.semester = payload.semester
    if payload.section:
        current_user.section = payload.section.strip()
    if payload.gender:
        current_user.gender = payload.gender.strip()
    if payload.photo_url is not None:
        current_user.photo_url = payload.photo_url
    if payload.volunteer_domain is not None:
        current_user.volunteer_domain = payload.volunteer_domain.strip() if payload.volunteer_domain else None

    # Role changes: allowed between VOLUNTEER, PARTICIPANT
    if payload.role:
        new_role = payload.role.strip().upper()
        if new_role in ["VOLUNTEER", "PARTICIPANT"]:
            if current_user.role not in ["ADMIN", "SUPERADMIN"]:
                current_user.role = new_role

    # Admin profile updates if applicable
    admin_profile = db.query(Admin).filter(Admin.user_id == current_user.id).first()
    if admin_profile:
        if payload.username:
            clean_u = payload.username.strip().lower()
            if clean_u != admin_profile.username:
                existing_adm = db.query(Admin).filter(Admin.username == clean_u, Admin.id != admin_profile.id).first()
                if existing_adm:
                    raise HTTPException(status_code=409, detail=f"Admin username '{clean_u}' is already taken.")
                admin_profile.username = clean_u
        if payload.admin_type in ["FACULTY_COORDINATOR", "WORKING_COMMITTEE"]:
            admin_profile.admin_type = payload.admin_type
            current_user.admin_type = payload.admin_type
            current_user.is_working_committee = (payload.admin_type == "WORKING_COMMITTEE")
        if payload.faculty_id is not None:
            admin_profile.faculty_id = payload.faculty_id.strip() if payload.faculty_id else None
            current_user.faculty_id = admin_profile.faculty_id

    # 7. Lock one-time edit permanently
    current_user.profile_edited_once = True
    current_user.profile_edited_at = datetime.datetime.utcnow()
    current_user.updated_at = datetime.datetime.utcnow()

    # 8. Record in audit logs
    log = AuditLog(
        user_id=current_user.id,
        actor_name=current_user.name,
        action="ONE_TIME_PROFILE_EDIT",
        target_type="USER_PROFILE",
        target_id=str(current_user.id),
        previous_value=json.dumps(old_details),
        new_value=json.dumps({
            "name": current_user.name,
            "auid": current_user.auid,
            "email": current_user.email,
            "phone": current_user.phone,
            "institute": current_user.institute,
            "department": current_user.department,
            "semester": current_user.semester,
            "section": current_user.section,
            "role": current_user.role,
            "volunteer_domain": current_user.volunteer_domain,
            "edited_at": current_user.profile_edited_at.isoformat()
        })
    )
    db.add(log)
    db.commit()
    db.refresh(current_user)
    if admin_profile:
        db.refresh(admin_profile)

    return {
        "success": True,
        "message": "Your profile details have been successfully updated. Your one-time update opportunity is now complete and locked.",
        "user": user_to_dict(current_user, admin_profile)
    }

