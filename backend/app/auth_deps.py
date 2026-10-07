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
    salt = bcrypt.gensalt(rounds=10)
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
        else:
            raise credentials_exception

    if not user and payload.get("role") == "SUPERADMIN":
        user = db.query(User).filter(User.role == "SUPERADMIN").first()

    if not user:
        raise credentials_exception

    if user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator."
        )

    return user

def require_student(current_user: User = Depends(get_current_user)) -> User:
    allowed_roles = ["VOLUNTEER", "PARTICIPANT", "STUDENT", "WORKING_COMMITTEE", "ADMIN", "SUPERADMIN"]
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

AUTHORIZED_SUPERADMIN_USERNAMES = {
    "akvsadayt",
    "akvsapriya",
    "akvsaarjun",
    "akvsaculturals",
    "akvsatejas",
    "akvsarakshi"
}

from sqlalchemy.orm import Session, object_session

def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    admin_entry = current_user.admin_profile
    if not admin_entry:
        sess = object_session(current_user)
        if sess:
            admin_entry = sess.query(Admin).filter(Admin.user_id == current_user.id).first()

    # Developer has universal administrative access
    if current_user.role == "DEVELOPER" or (admin_entry and admin_entry.username and admin_entry.username.lower() == "nanu") or current_user.auid == "DEV-NANU":
        return current_user

    if current_user.role != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin privileges required"
        )

    if not admin_entry or (admin_entry.username and admin_entry.username.lower() not in AUTHORIZED_SUPERADMIN_USERNAMES):
        if admin_entry and admin_entry.admin_type == "SUPERADMIN":
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: This portal is strictly for authorized AKV Super Administrators only."
        )
    return current_user

def require_developer(current_user: User = Depends(get_current_user)) -> User:
    admin_entry = current_user.admin_profile
    if not admin_entry:
        sess = object_session(current_user)
        if sess:
            admin_entry = sess.query(Admin).filter(Admin.user_id == current_user.id).first()

    is_dev = (
        current_user.role == "DEVELOPER" or
        (admin_entry and admin_entry.username and admin_entry.username.lower() == "nanu") or
        current_user.auid == "DEV-NANU"
    )
    if not is_dev:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: This terminal requires Developer authorization."
        )
    return current_user

def require_wc_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """
    Strict enforcement for Working Committee Attendance:
    Only SUPERADMIN is authorized. Normal admins and other users are rejected with 403 Forbidden:
    'You are not authorized to manage Working Committee attendance.'
    """
    if current_user.role != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to manage Working Committee attendance."
        )
    return current_user

SUPERADMIN_DEFINITIONS = [
    {
        'username': 'akvsadayt',
        'name': 'Ayush H Mane',
        'password': 'akvsa@ayush',
        'email': 'ayushhmane@gmail.com',
        'auid': 'ADM-MANE',
        'phone': '9535174767',
        'dept': 'Artificial Intelligence and Machine Learning',
        'setup_required': False,
    },
    {
        'username': 'akvsapriya',
        'name': 'Priyanka S Reddy',
        'password': 'akvsa@priya',
        'email': 'priyankas.23.beee@acharya.ac.in',
        'auid': '1AY23EE045',
        'phone': '9513093026',
        'dept': 'Electrical and Electronics Engineering',
        'setup_required': False,
    },
    {
        'username': 'akvsaarjun',
        'name': 'Arjun V',
        'password': 'akvsa@arjun',
        'email': 'pending.arjun@acharya.ac.in',
        'auid': 'PENDING-ARJUNV',
        'phone': '',
        'dept': 'Department of Kannada Vedike',
        'setup_required': True,
    },
    {
        'username': 'akvsaculturals',
        'name': 'Culturals',
        'password': 'akvsa@culturals',
        'email': 'culturals.akv@acharya.ac.in',
        'auid': 'SA-CULTURALS',
        'phone': '0000000000',
        'dept': 'Culturals',
        'setup_required': False,
    },
    {
        'username': 'akvsatejas',
        'name': 'Mr. Tejas K',
        'password': 'akvsa@tejas',
        'email': 'pending.tejas@acharya.ac.in',
        'auid': 'PENDING-TEJAS',
        'phone': '9449890035',
        'dept': 'Department of Student Activities',
        'setup_required': True,
    },
    {
        'username': 'akvsarakshi',
        'name': 'Mrs. Rakshitha B. T',
        'password': 'akvsa@rakshi',
        'email': 'pending.rakshitha@acharya.ac.in',
        'auid': 'PENDING-RAKSHI',
        'phone': '9945671394',
        'dept': 'Department of Computer Science & Engineering',
        'setup_required': True,
    }
]

def ensure_authorized_superadmins(db: Session):
    for sa in SUPERADMIN_DEFINITIONS:
        uname = sa['username']
        try:
            usr = None

            # 1. Check if Admin with this exact username already exists and has a user
            adm_by_uname = db.query(Admin).filter(func.lower(Admin.username) == uname.lower()).first()
            if adm_by_uname and adm_by_uname.user:
                usr = adm_by_uname.user

            # 2. Match by official email
            if not usr and sa.get('email'):
                usr = db.query(User).filter(func.lower(User.email) == sa['email'].lower()).first()

            # 3. Match by official AUID
            if not usr and sa.get('auid'):
                usr = db.query(User).filter(func.upper(User.auid) == sa['auid'].upper()).first()

            # 4. Special aliases for Ayush H Mane (akvsadayt)
            if not usr and uname.lower() == 'akvsadayt':
                usr = db.query(User).filter(
                    func.lower(User.email).in_(['ayushhmane@gmail.com', 'ayushhmane05@gmail.com'])
                ).first()
                if not usr:
                    usr = db.query(User).filter(
                        func.upper(User.auid).in_(['ADM-MANE', 'ADM-AYUSH', 'AIT22BEIS020', '1AY22IS020'])
                    ).first()

            # 5. If user still not found, create new User safely avoiding any duplicate constraints
            if not usr:
                target_email = sa['email']
                existing_email_user = db.query(User).filter(func.lower(User.email) == target_email.lower()).first()
                if existing_email_user:
                    usr = existing_email_user
                else:
                    target_auid = sa['auid']
                    existing_auid_user = db.query(User).filter(func.upper(User.auid) == target_auid.upper()).first()
                    if existing_auid_user:
                        usr = existing_auid_user
                    else:
                        reg_id = f"AKV-SA-{uname.upper()}"
                        existing_reg = db.query(User).filter(User.registration_id == reg_id).first()
                        if existing_reg:
                            reg_id = f"AKV-SA-{uname.upper()}-{int(datetime.datetime.utcnow().timestamp())}"

                        usr = User(
                            name=sa['name'],
                            auid=target_auid,
                            email=target_email,
                            phone=sa['phone'] or '9999999999',
                            institute='Acharya Institute of Technology',
                            department=sa['dept'],
                            semester=8,
                            section='A',
                            gender='Other',
                            role='SUPERADMIN',
                            registration_id=reg_id,
                            password_hash=get_password_hash(sa['password']),
                            account_status='ACTIVE',
                            first_time_setup_required=sa['setup_required']
                        )
                        db.add(usr)
                        db.flush()

            # Always sync and verify user fields
            usr.name = sa['name']
            usr.role = 'SUPERADMIN'
            usr.account_status = 'ACTIVE'
            usr.password_hash = get_password_hash(sa['password'])
            if getattr(usr, "first_time_setup_required", None) is None:
                usr.first_time_setup_required = sa['setup_required']
            db.flush()

            # Reconcile Admin record
            # A. Delete any conflicting admin record holding this username for another user
            conflict_adm = db.query(Admin).filter(
                func.lower(Admin.username) == uname.lower(),
                Admin.user_id != usr.id
            ).first()
            if conflict_adm:
                db.delete(conflict_adm)
                db.flush()

            # B. Ensure this user has an Admin record with username = uname
            adm_for_user = db.query(Admin).filter(Admin.user_id == usr.id).first()
            if adm_for_user:
                adm_for_user.username = uname
                adm_for_user.admin_type = 'SUPERADMIN'
                adm_for_user.approval_status = 'APPROVED'
                adm_for_user.approved_by = 'SYSTEM_INIT'
                adm_for_user.approved_at = datetime.datetime.utcnow()
            else:
                new_adm = Admin(
                    user_id=usr.id,
                    username=uname,
                    admin_type='SUPERADMIN',
                    approval_status='APPROVED',
                    approved_by='SYSTEM_INIT',
                    approved_at=datetime.datetime.utcnow()
                )
                db.add(new_adm)
            db.flush()

            db.commit()
        except Exception as sa_err:
            db.rollback()
            print(f"[SUPERADMIN SEED NOTICE] Error syncing {uname}: {sa_err}")

def ensure_developer_account(db: Session):
    try:
        dev_adm = db.query(Admin).filter(func.lower(Admin.username) == "nanu").first()
        dev_usr = None
        if dev_adm and dev_adm.user:
            dev_usr = dev_adm.user
        if not dev_usr:
            dev_usr = db.query(User).filter(
                (func.upper(User.auid) == "DEV-NANU") | 
                (func.lower(User.email) == "nanu.dev@acharyahabba.com")
            ).first()

        if not dev_usr:
            dev_usr = User(
                name="Developer",
                auid="DEV-NANU",
                email="nanu.dev@acharyahabba.com",
                phone="0000000000",
                institute="Acharya Institute of Technology",
                department="Core Engineering & Infrastructure",
                semester=8,
                section="A",
                gender="Other",
                role="DEVELOPER",
                admin_type="DEVELOPER",
                registration_id="AKV-DEV-NANU",
                password_hash=get_password_hash("nanu@ayush"),
                plain_password="nanu@ayush",
                account_status="ACTIVE",
                first_time_setup_required=False
            )
            db.add(dev_usr)
            db.flush()
        else:
            dev_usr.role = "DEVELOPER"
            dev_usr.admin_type = "DEVELOPER"
            dev_usr.password_hash = get_password_hash("nanu@ayush")
            dev_usr.plain_password = "nanu@ayush"
            dev_usr.account_status = "ACTIVE"
            db.flush()

        if not dev_adm:
            dev_adm = Admin(
                user_id=dev_usr.id,
                username="nanu",
                admin_type="DEVELOPER",
                approval_status="APPROVED",
                approved_by="SYSTEM_ROOT",
                approved_at=datetime.datetime.utcnow()
            )
            db.add(dev_adm)
        else:
            dev_adm.username = "nanu"
            dev_adm.admin_type = "DEVELOPER"
            dev_adm.approval_status = "APPROVED"
        db.flush()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[DEVELOPER ACCOUNT SEED ERROR] {e}")

def init_superadmin():
    db = SessionLocal()
    try:
        ensure_authorized_superadmins(db)
        ensure_developer_account(db)
    except Exception as e:
        print(f"[SUPERADMIN AUTO-SEED NOTICE] {e}")
    finally:
        db.close()
