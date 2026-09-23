import re
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime

class TeamMemberSchema(BaseModel):
    name: str = Field(..., min_length=2)
    auid: Optional[str] = None
    usn: Optional[str] = None
    phone: Optional[str] = None

class EventBase(BaseModel):
    id: Optional[str] = None
    title_en: str
    title_kn: str
    category: str
    category_kn: str
    description_en: str
    description_kn: str
    is_team: bool = False
    format: Optional[str] = "solo"  # solo, team, both
    min_team_size: int = 1
    max_team_size: int = 1
    max_slots: int = 50
    registered_count: int = 0
    venue: str
    venue_kn: str
    event_date: str
    event_time: str
    reporting_time: str
    rules_en: str
    rules_kn: str
    is_active: bool = True

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title_en: Optional[str] = None
    title_kn: Optional[str] = None
    category: Optional[str] = None
    category_kn: Optional[str] = None
    description_en: Optional[str] = None
    description_kn: Optional[str] = None
    is_team: Optional[bool] = None
    format: Optional[str] = None
    min_team_size: Optional[int] = None
    max_team_size: Optional[int] = None
    max_slots: Optional[int] = None
    venue: Optional[str] = None
    venue_kn: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    reporting_time: Optional[str] = None
    rules_en: Optional[str] = None
    rules_kn: Optional[str] = None
    registered_count: Optional[int] = None
    is_active: Optional[bool] = None

class EventOut(EventBase):
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, EmailStr, Field, field_validator, computed_field
import json

class RegistrationCreate(BaseModel):
    event_id: str
    full_name: str = Field(..., min_length=2, max_length=100)
    auid: Optional[str] = None
    usn: Optional[str] = None
    institute: str = Field("Acharya Institute of Technology", min_length=2, max_length=150)
    department: str = Field(..., min_length=2, max_length=100)
    semester: int = Field(6, ge=1, le=8)
    section: str = Field("A", min_length=1, max_length=10)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    gender: str = Field("Other")
    is_team: bool = False
    team_name: Optional[str] = None
    team_members: Optional[List[TeamMemberSchema]] = []

    @field_validator("auid", mode="before")
    @classmethod
    def validate_auid(cls, v, info):
        if not v:
            usn_val = info.data.get("usn")
            if usn_val:
                return str(usn_val).strip().upper()
            return "GUEST"
        cleaned = str(v).strip().upper()
        return cleaned

    @field_validator("usn", mode="before")
    @classmethod
    def validate_usn(cls, v, info):
        if not v:
            auid_val = info.data.get("auid")
            if auid_val:
                return str(auid_val).strip().upper()
            return "GUEST"
        return str(v).strip().upper()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10 or len(digits) > 12:
            raise ValueError("Phone number must be a valid 10-digit number")
        return digits[-10:]

class RegistrationOut(BaseModel):
    id: int
    registration_id: str
    event_id: str
    full_name: str
    usn: str
    auid: Optional[str] = None
    institute: Optional[str] = "Acharya Institute of Technology"
    department: str
    semester: int
    section: str
    email: str
    phone: str
    gender: str
    is_team: bool
    team_name: Optional[str] = None
    team_members: Optional[str] = None
    status: str
    checkin_time: Optional[datetime] = None
    checked_in_by: Optional[str] = None
    created_at: datetime
    event: Optional[EventOut] = None

    @computed_field
    @property
    def participants_count(self) -> int:
        if not self.is_team:
            return 1
        if self.team_members:
            try:
                parsed = json.loads(self.team_members)
                if isinstance(parsed, list):
                    return len(parsed) + 1
            except Exception:
                pass
        return 1

    @computed_field
    @property
    def effective_auid(self) -> str:
        return self.auid if self.auid else self.usn

    class Config:
        from_attributes = True

class CheckInRequest(BaseModel):
    registration_id: str
    agent: Optional[str] = "Organizer"
    notes: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class StatsOut(BaseModel):
    total_events: int
    total_registrations: int
    checked_in_count: int
    pending_checkin_count: int
    events_breakdown: List[dict]


class ActivityBase(BaseModel):
    category: str = "Nuditaranga"
    title_en: str
    title_kn: str
    desc_en: str
    desc_kn: str
    image: str
    tag_en: Optional[str] = ""
    tag_kn: Optional[str] = ""
    icon: Optional[str] = ""
    is_active: bool = True

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    category: Optional[str] = None
    title_en: Optional[str] = None
    title_kn: Optional[str] = None
    desc_en: Optional[str] = None
    desc_kn: Optional[str] = None
    image: Optional[str] = None
    tag_en: Optional[str] = None
    tag_kn: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class ActivityOut(ActivityBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GalleryItemBase(BaseModel):
    title_en: str  # Event Name
    title_kn: Optional[str] = ""
    desc_en: Optional[str] = ""  # Description
    desc_kn: Optional[str] = ""
    image: str  # Base64 data URL or URL


class GalleryItemCreate(GalleryItemBase):
    pass


class GalleryItemUpdate(BaseModel):
    title_en: Optional[str] = None
    title_kn: Optional[str] = None
    desc_en: Optional[str] = None
    desc_kn: Optional[str] = None
    image: Optional[str] = None


class GalleryItemOut(GalleryItemBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

