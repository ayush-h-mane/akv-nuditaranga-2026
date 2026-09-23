import datetime
import secrets
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db, SessionLocal
from .models import User, Admin

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

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
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id_int).first()
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
    Auto-provision initial Super Admin from environment variables on startup.
    Credentials are encrypted and never exposed in client code.
    """
    db = SessionLocal()
    try:
        # Check if Super Admin exists
        sa_username = settings.SUPERADMIN_USERNAME or "superadmin"
        admin_entry = db.query(Admin).filter(Admin.username == sa_username).first()

        if not admin_entry:
            # Check if user with that email or auid exists
            sa_user = db.query(User).filter(
                (User.auid == "AKV-SUPERADMIN") | 
                (User.email == settings.SUPERADMIN_EMAIL)
            ).first()

            if not sa_user:
                hashed_pw = get_password_hash(settings.SUPERADMIN_PASSWORD)
                sa_user = User(
                    name=settings.SUPERADMIN_NAME,
                    auid="AKV-SUPERADMIN",
                    email=settings.SUPERADMIN_EMAIL,
                    phone="9876543210",
                    institute="Acharya Institute of Technology",
                    department="Kannada Vedike",
                    semester=8,
                    section="A",
                    gender="Other",
                    role="SUPERADMIN",
                    registration_id="AKV-SA-0001",
                    password_hash=hashed_pw,
                    account_status="ACTIVE"
                )
                db.add(sa_user)
                db.commit()
                db.refresh(sa_user)

            admin_entry = Admin(
                user_id=sa_user.id,
                username=sa_username,
                approval_status="APPROVED",
                approved_by="SYSTEM_BOOTSTRAP",
                approved_at=datetime.datetime.utcnow()
            )
            db.add(admin_entry)
            db.commit()
            print(f"[BOOTSTRAP] Super Admin account initialized: '{sa_username}'")
        else:
            # Ensure role is SUPERADMIN
            user = db.query(User).filter(User.id == admin_entry.user_id).first()
            if user and user.role != "SUPERADMIN":
                user.role = "SUPERADMIN"
                db.commit()
    except Exception as e:
        print(f"[BOOTSTRAP ERROR] Failed to initialize Super Admin: {e}")
        db.rollback()
    finally:
        db.close()
