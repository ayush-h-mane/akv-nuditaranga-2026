import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    auid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    institute = Column(String, default="Acharya Institute of Technology", nullable=False)
    department = Column(String, nullable=False)
    semester = Column(Integer, default=6, nullable=False)
    section = Column(String, default="A", nullable=False)
    gender = Column(String, default="Male", nullable=False)
    
    # Roles: VOLUNTEER, PARTICIPANT, SPECTATOR, ADMIN, SUPERADMIN
    role = Column(String, default="PARTICIPANT", index=True, nullable=False)
    registration_id = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    account_status = Column(String, default="ACTIVE", nullable=False)  # ACTIVE, DISABLED
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    admin_profile = relationship("Admin", back_populates="user", uselist=False, cascade="all, delete-orphan")
    attendances = relationship("VolunteerAttendance", back_populates="user", cascade="all, delete-orphan")
    event_registrations = relationship("Registration", back_populates="user")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    # Status: PENDING_APPROVAL, APPROVED, REJECTED
    approval_status = Column(String, default="PENDING_APPROVAL", index=True, nullable=False)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="admin_profile")


class VolunteerAttendance(Base):
    __tablename__ = "volunteer_attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    auid = Column(String, index=True, nullable=False)
    volunteer_name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    date = Column(String, index=True, nullable=False)  # Format: YYYY-MM-DD
    status = Column(String, default="PRESENT", nullable=False)  # PRESENT, ABSENT, LATE, EXCUSED
    check_in_time = Column(DateTime, nullable=True)
    marked_by = Column(String, nullable=False)  # Admin or Super Admin username/name
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="attendances")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    actor_name = Column(String, nullable=False)
    action = Column(String, nullable=False)  # e.g., ATTENDANCE_MARKED, ADMIN_APPROVED, ROLE_CHANGED
    target_type = Column(String, nullable=False)  # ATTENDANCE, ADMIN, STUDENT, EVENT
    target_id = Column(String, nullable=False)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    title_en = Column(String, nullable=False)
    title_kn = Column(String, nullable=False)
    category = Column(String, index=True, nullable=False)  # literary, cultural, traditional
    category_kn = Column(String, nullable=False)
    description_en = Column(Text, nullable=False)
    description_kn = Column(Text, nullable=False)
    is_team = Column(Boolean, default=False)
    format = Column(String, default="solo")  # solo, team, both
    min_team_size = Column(Integer, default=1)
    max_team_size = Column(Integer, default=1)
    max_slots = Column(Integer, default=50)
    registered_count = Column(Integer, default=0)
    venue = Column(String, nullable=False)
    venue_kn = Column(String, nullable=False)
    event_date = Column(String, nullable=False)
    event_time = Column(String, nullable=False)
    reporting_time = Column(String, nullable=False)
    rules_en = Column(Text, nullable=False)
    rules_kn = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    registrations = relationship("Registration", back_populates="event")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    registration_id = Column(String, unique=True, index=True, nullable=False)
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    full_name = Column(String, nullable=False)
    usn = Column(String, index=True, nullable=False)
    auid = Column(String, index=True, nullable=True)
    institute = Column(String, default="Acharya Institute of Technology", nullable=True)
    department = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    section = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    
    is_team = Column(Boolean, default=False)
    team_name = Column(String, nullable=True)
    team_members = Column(Text, nullable=True)  # JSON formatted string
    
    status = Column(String, default="Registered")  # Registered, Checked In, Cancelled
    checkin_time = Column(DateTime, nullable=True)
    checked_in_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="registrations")
    user = relationship("User", back_populates="event_registrations")


class CheckInLog(Base):
    __tablename__ = "checkin_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    registration_id = Column(String, index=True, nullable=False)
    action = Column(String, nullable=False)
    agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String, index=True, default="nuditaranga")
    title_en = Column(String, nullable=False)
    title_kn = Column(String, nullable=False)
    desc_en = Column(Text, nullable=False)
    desc_kn = Column(Text, nullable=False)
    image = Column(Text, nullable=False)
    tag_en = Column(String, nullable=True, default="")
    tag_kn = Column(String, nullable=True, default="")
    icon = Column(String, nullable=True, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class GalleryItem(Base):
    __tablename__ = "gallery_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title_en = Column(String, nullable=False)
    title_kn = Column(String, nullable=True, default="")
    desc_en = Column(Text, nullable=True, default="")
    desc_kn = Column(Text, nullable=True, default="")
    image = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
