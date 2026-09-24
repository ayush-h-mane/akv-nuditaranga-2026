import datetime
import secrets
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func

from .config import settings
from .database import get_db, SessionLocal
from .models import User, Admin

import bcrypt

# Password Hashing via direct bcrypt (safe across all bcrypt versions and platforms)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not plain_password:
        return False
    try:
        pw_bytes = plain_password[:72].encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pw_bytes = (password or "")[:72].encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

# JWT Security
security = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth or not auth.credentials:
        raise credentials_exception

    payload = decode_access_token(auth.credentials)
    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_id_int = int(user_id)
        user = db.query(User).filter(User.id == user_id_int).first()
    except (ValueError, TypeError):
        if str(user_id).lower() == "superadmin" or payload.get("role") == "SUPERADMIN":
            user = db.query(User).filter(User.role == "SUPERADMIN").first()
            if not user:
                user = User(
                    id=1,
                    name=settings.SUPERADMIN_NAME,
                    auid="AKV-SUPERADMIN",
                    email=settings.SUPERADMIN_EMAIL,
                    phone="9876543210",
                    institute="Acharya Institute of Technology",
                    department="Kannada Vedike",
                    semester=7,
                    section="A",
                    gender="Male",
                    role="SUPERADMIN",
                    registration_id="AKV-SA-0001",
                    account_status="ACTIVE"
                )
        else:
            raise credentials_exception

    if not user:
        raise credentials_exception

    if user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator."
        )

    return user

def require_student(current_user: User = Depends(get_current_user)) -> User:
    allowed_roles = ["VOLUNTEER", "PARTICIPANT", "SPECTATOR", "STUDENT", "ADMIN", "SUPERADMIN"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student privileges required"
        )
    return current_user

def require_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    if current_user.role == "SUPERADMIN":
        return current_user

    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    # Check admin approval status
    admin_profile = db.query(Admin).filter(Admin.user_id == current_user.id).first()
    if not admin_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin profile not found"
        )

    if admin_profile.approval_status != "APPROVED":
        if admin_profile.approval_status == "PENDING_APPROVAL":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your admin account is awaiting Super Admin approval."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your admin registration has not been approved."
            )

    return current_user

def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin privileges required"
        )
    return current_user

def init_superadmin():
    """
    Database starts with zero preloaded records per user requirements.
    SuperAdmin is authenticated on-demand via secure credentials without preloading mock data.
    """
    pass