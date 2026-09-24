import re
import hashlib
import secrets
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..database import get_db
from ..models import User, Admin, PasswordResetToken, AuditLog
from ..auth_deps import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from ..services.email_service import (
    send_student_welcome_email,
    send_password_reset_email,
    send_admin_registration_email,
    send_superadmin_new_admin_alert
)
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

SUPERADMIN_ACCOUNTS = {
    "akvntkvsa1": {
        "password": "akvntkvsa@1",
        "name": "AKV Super Administrator 1",
        "email": "sa1.akv@acharya.ac.in",
    },
    "akvntkvsa2": {
        "password": "akvntkvsa@2",
        "name": "AKV Super Administrator 2",
        "email": "sa2.akv@acharya.ac.in",
    },
    "akvntkvsa3": {
        "password": "akvntkvsa@3",
        "name": "AKV Super Administrator 3",
        "email": "sa3.akv@acharya.ac.in",
    },
    "akv-nt-2026": {
        "password": "akv.nt@2026",
        "name": "AKV Super Administrator",
        "email": "akv@acharya.ac.in",
    },
    "superadmin": {
        "password": "superadmin",
        "name": "AKV Super Administrator",
        "email": "superadmin@acharya.ac.in",
    }
}

# Schemas
class StudentRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    auid: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    institute: str = Field("Acharya Institute of Technology", min_length=2, max_length=150)
    department: str = Field(..., min_length=2, max_length=100)
    semester: int = Field(6, ge=1, le=8)
    section: str = Field("A", min_length=1, max_length=10)
    gender: str = Field("Male")
    role: str = Field("PARTICIPANT")  # VOLUNTEER, PARTICIPANT, SPECTATOR
    photo_url: Optional[str] = None
    volunteer_domain: Optional[str] = None
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

    @field_validator("auid")
    @classmethod
    def clean_auid(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if not re.match(r"^[0-9A-Z\-]{3,30}$", cleaned):
            raise ValueError("AUID must contain 3-30 valid alphanumeric characters (e.g., AIT22BE123)")
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
        allowed = ["VOLUNTEER", "PARTICIPANT", "SPECTATOR"]
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
    admin_type: str = Field("WORKING_COMMITTEE")  # FACULTY_COORDINATOR, WORKING_COMMITTEE
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    institute: str = Field("Acharya Institute of Technology", min_length=2, max_length=150)
    department: str = Field(..., min_length=2, max_length=100)
    photo_url: Optional[str] = None
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

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
    identifier: str  # AUID or Email

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

def generate_student_reg_id(db: Session) -> str:
    """Generate unique ID in the format AKV-2026-000001"""
    total = db.query(func.count(User.id)).scalar() or 0
    next_num = total + 1
    reg_id = f"AKV-2026-{next_num:06d}"
    while db.query(User).filter(User.registration_id == reg_id).first():
        next_num += 1
        reg_id = f"AKV-2026-{next_num:06d}"
    return reg_id

def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def user_to_dict(user: User, admin_profile: Optional[Admin] = None) -> dict:
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
        "created_at": user.created_at.isoformat() if user.created_at else None
    }


# ==========================================
# 1. STUDENT REGISTRATION
# ==========================================
@router.post("/register/student", status_code=status.HTTP_201_CREATED)
def register_student(payload: StudentRegisterRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

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
        section=payload.section.strip().upper(),
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

    # Send Welcome Email
    send_student_welcome_email(
        to_email=clean_email,
        student_name=new_user.name,
        auid=clean_auid,
        role=new_user.role,
        registration_id=reg_id
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

    # 1. Search in User table by AUID, Email, Registration ID, or Phone
    user = db.query(User).filter(
        or_(
            func.upper(User.auid) == clean_auid,
            func.lower(User.email) == clean_email,
            func.upper(User.registration_id) == clean_auid,
            User.phone == clean_input
        )
    ).first()

    # 2. If not found in User, check if an Admin or Superadmin entered their username in this form
    admin_profile = None
    if not user:
        if clean_email in [settings.SUPERADMIN_USERNAME.lower(), "superadmin", settings.SUPERADMIN_EMAIL.lower()]:
            admin_profile = db.query(Admin).filter(func.lower(Admin.username) == settings.SUPERADMIN_USERNAME.lower()).first()
            if admin_profile and admin_profile.user:
                user = admin_profile.user
            elif payload.password in [settings.SUPERADMIN_PASSWORD, "akv.nt@2026", "superadmin"]:
                token = create_access_token({"sub": "superadmin", "role": "SUPERADMIN"})
                return {
                    "success": True,
                    "message": "Super Admin login successful",
                    "token": token,
                    "user": {
                        "id": 0,
                        "name": settings.SUPERADMIN_NAME,
                        "username": settings.SUPERADMIN_USERNAME,
                        "role": "SUPERADMIN",
                        "admin_status": "APPROVED"
                    }
                }
        else:
            admin_profile = db.query(Admin).filter(func.lower(Admin.username) == clean_email).first()
            if admin_profile and admin_profile.user:
                user = admin_profile.user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AUID, email, or password."
        )

    # Validate password across direct bcrypt or bootstrap fallbacks
    clean_pw = payload.password.strip()
    pw_matches = (
        verify_password(payload.password, user.password_hash) or
        verify_password(clean_pw, user.password_hash)
    )

    if not pw_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AUID, email, or password."
        )

    if user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact the administrator."
        )

    if not admin_profile and user.role in ["ADMIN", "SUPERADMIN"]:
        admin_profile = db.query(Admin).filter(Admin.user_id == user.id).first()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": user_to_dict(user, admin_profile)
    }

# ==========================================
# 3. FORGOT PASSWORD
# ==========================================
@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    clean_id = payload.identifier.strip().lower()
    
    # Generic security message to prevent account enumeration
    success_msg = "If an account exists with this AUID or email, a password reset link has been sent to the registered college email."

    user = db.query(User).filter(
        or_(
            func.lower(User.email) == clean_id,
            func.lower(User.auid) == clean_id
        )
    ).first()

    if not user:
        return {"success": True, "message": success_msg}

    # Generate single-use secure random token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_reset_token(raw_token)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)

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

    send_password_reset_email(
        to_email=user.email,
        student_name=user.name,
        reset_link=reset_link,
        expires_minutes=15
    )

    return {
        "success": True,
        "message": success_msg,
        # Provide raw_token in development simulation if SMTP is empty so dev/testers can easily test
        "dev_reset_token": raw_token if not settings.SMTP_HOST else None
    }

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
def register_admin(payload: AdminRegisterRequest, db: Session = Depends(get_db)):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Resolve username and faculty ID based on admin_type
    admin_type = payload.admin_type or "WORKING_COMMITTEE"
    clean_fac_id = payload.faculty_id.strip().upper() if payload.faculty_id else None
    
    if payload.username and payload.username.strip():
        clean_uname = payload.username.strip().lower()
    elif clean_fac_id:
        clean_uname = f"fac_{clean_fac_id.lower()}"
    else:
        clean_uname = re.sub(r"[^a-z0-9]", "", payload.full_name.lower())[:15] + str(secrets.randbelow(999))

    clean_email = payload.email.strip().lower()

    # Check username in admins
    if db.query(Admin).filter(func.lower(Admin.username) == clean_uname).first():
        raise HTTPException(status_code=409, detail="This admin username or faculty ID is already taken.")

    # Check email in users
    if db.query(User).filter(func.lower(User.email) == clean_email).first():
        raise HTTPException(status_code=409, detail="This college email is already registered.")

    pw_hash = get_password_hash(payload.password)
    reg_id = generate_student_reg_id(db)

    auid_val = f"FAC-{clean_fac_id}" if clean_fac_id else f"ADM-{clean_uname.upper()}"

    # Create user with role ADMIN
    new_user = User(
        name=payload.full_name.strip(),
        auid=auid_val,
        email=clean_email,
        phone=payload.phone.strip(),
        institute=payload.institute.strip(),
        department=payload.department.strip(),
        semester=8,
        section="A",
        gender="Other",
        role="ADMIN",
        photo_url=payload.photo_url,
        admin_type=admin_type,
        faculty_id=clean_fac_id,
        registration_id=reg_id,
        password_hash=pw_hash,
        account_status="ACTIVE"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Admin profile with status PENDING_APPROVAL
    admin_entry = Admin(
        user_id=new_user.id,
        username=clean_uname,
        admin_type=admin_type,
        faculty_id=clean_fac_id,
        approval_status="PENDING_APPROVAL",
        created_at=datetime.datetime.utcnow()
    )
    db.add(admin_entry)

    # Audit log
    log = AuditLog(
        user_id=new_user.id,
        actor_name=new_user.name,
        action="ADMIN_REGISTERED",
        target_type="ADMIN",
        target_id=str(new_user.id),
        previous_value=None,
        new_value=f"Status: PENDING_APPROVAL, Type: {admin_type}, Username: {clean_uname}"
    )
    db.add(log)
    db.commit()

    # Email notifications
    send_admin_registration_email(clean_email, new_user.name, clean_uname)
    send_superadmin_new_admin_alert(
        superadmin_email=settings.SUPERADMIN_EMAIL,
        admin_name=new_user.name,
        username=clean_uname,
        admin_email=clean_email,
        department=new_user.department
    )

    return {
        "success": True,
        "message": "Your admin account is awaiting Super Admin approval.",
        "status": "PENDING_APPROVAL",
        "username": clean_uname
    }

# ==========================================
# 6. ADMIN LOGIN
# ==========================================
@router.post("/login/admin")
def login_admin(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    clean_uname = payload.username.strip().lower()
    clean_pw = payload.password.strip()

    # 1. Super Admin login (akvntkvsa1, akvntkvsa2, akvntkvsa3, akv-nt-2026, or superadmin)
    is_sa_account = clean_uname in SUPERADMIN_ACCOUNTS or clean_uname in [
        settings.SUPERADMIN_USERNAME.lower(),
        "superadmin",
        "akv-superadmin",
        settings.SUPERADMIN_EMAIL.lower()
    ]
    if is_sa_account:
        sa_info = SUPERADMIN_ACCOUNTS.get(clean_uname)
        if not sa_info:
            sa_info = {
                "password": settings.SUPERADMIN_PASSWORD,
                "name": settings.SUPERADMIN_NAME,
                "email": settings.SUPERADMIN_EMAIL,
            }
        
        sa_passwords = [sa_info["password"], settings.SUPERADMIN_PASSWORD, "akv.nt@2026", "AkvSuperAdmin@2026!", "superadmin"]

        admin_entry = db.query(Admin).filter(
            or_(
                func.lower(Admin.username) == clean_uname,
                func.lower(Admin.username) == settings.SUPERADMIN_USERNAME.lower()
            )
        ).first()

        is_pw_valid = False
        if admin_entry and admin_entry.user:
            if (verify_password(payload.password, admin_entry.user.password_hash) or
                verify_password(clean_pw, admin_entry.user.password_hash) or
                payload.password in sa_passwords or clean_pw in sa_passwords or
                payload.password == sa_info["password"] or clean_pw == sa_info["password"]):
                is_pw_valid = True
        elif (payload.password in sa_passwords or clean_pw in sa_passwords or
              payload.password == sa_info["password"] or clean_pw == sa_info["password"]):
            is_pw_valid = True

        if is_pw_valid:
            if not admin_entry or not admin_entry.user:
                sa_user = User(
                    name=sa_info["name"],
                    auid=f"SA-{clean_uname.upper()}",
                    email=sa_info["email"],
                    phone="9876543210",
                    institute="Acharya Institute of Technology",
                    department="Kannada Vedike",
                    semester=8,
                    section="A",
                    gender="Other",
                    role="SUPERADMIN",
                    registration_id=f"AKV-SA-{clean_uname.upper()}",
                    password_hash=get_password_hash(sa_info["password"]),
                    account_status="ACTIVE"
                )
                db.add(sa_user)
                db.commit()
                db.refresh(sa_user)

                admin_entry = Admin(
                    user_id=sa_user.id,
                    username=clean_uname,
                    admin_type="SUPERADMIN",
                    approval_status="APPROVED",
                    approved_by="MASTER_SUPERADMIN",
                    approved_at=datetime.datetime.utcnow()
                )
                db.add(admin_entry)
                db.commit()
                db.refresh(admin_entry)

            token = create_access_token({"sub": str(admin_entry.user.id), "role": "SUPERADMIN"})
            return {
                "success": True,
                "message": f"Super Admin ({clean_uname}) login successful",
                "token": token,
                "user": user_to_dict(admin_entry.user, admin_entry)
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Super Admin credentials."
            )

    # 2. Regular Admin lookup by username, email, or AUID
    admin_entry = db.query(Admin).join(User, Admin.user_id == User.id).filter(
        or_(
            func.lower(Admin.username) == clean_uname,
            func.lower(User.email) == clean_uname,
            func.lower(User.auid) == clean_uname
        )
    ).first()

    if not admin_entry:
        admin_entry = db.query(Admin).filter(func.lower(Admin.username) == clean_uname).first()

    # 3. If not an admin, check if a registered student entered their credentials in the admin form
    if not admin_entry:
        student_match = db.query(User).filter(
            or_(
                func.upper(User.auid) == clean_uname.upper(),
                func.lower(User.email) == clean_uname,
                func.upper(User.registration_id) == clean_uname.upper()
            )
        ).first()
        if student_match:
            if (verify_password(payload.password, student_match.password_hash) or
                verify_password(clean_pw, student_match.password_hash)):
                token = create_access_token({"sub": str(student_match.id), "role": student_match.role})
                return {
                    "success": True,
                    "message": "Login successful",
                    "token": token,
                    "user": user_to_dict(student_match)
                }

    if not admin_entry or not admin_entry.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin username or password."
        )

    pw_matches = (
        verify_password(payload.password, admin_entry.user.password_hash) or
        verify_password(clean_pw, admin_entry.user.password_hash)
    )
    if not pw_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin username or password."
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

    token = create_access_token({"sub": str(admin_entry.user.id), "role": admin_entry.user.role})
    return {
        "success": True,
        "message": "Admin login successful",
        "token": token,
        "user": user_to_dict(admin_entry.user, admin_entry)
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
