import re
from typing import List, Optional, Any, Union
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, computed_field
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
    photo_url: Optional[str] = None
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
    category: Optional[str] = "Major Activity"
    title_en: str
    title_kn: Optional[str] = ""
    desc_en: Optional[str] = ""
    desc_kn: Optional[str] = ""
    image: str
    activity_date: Optional[str] = ""
    tag_en: Optional[str] = ""
    tag_kn: Optional[str] = ""
    icon: Optional[str] = ""
    is_active: bool = True

class ActivityCreate(BaseModel):
    category: Optional[str] = "Major Activity"
    title_en: Optional[str] = None
    title: Optional[str] = None
    title_kn: Optional[str] = ""
    desc_en: Optional[str] = None
    description: Optional[str] = None
    desc_kn: Optional[str] = ""
    image: Optional[str] = None
    image_url: Optional[str] = None
    activity_date: Optional[str] = ""
    tag_en: Optional[str] = ""
    tag_kn: Optional[str] = ""
    icon: Optional[str] = ""
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("title_en") and data.get("title"):
                data["title_en"] = data["title"]
            if not data.get("desc_en") and data.get("description"):
                data["desc_en"] = data["description"]
            if not data.get("image") and data.get("image_url"):
                data["image"] = data["image_url"]
            if not data.get("title_en"):
                data["title_en"] = "Major AKV Activity"
            if not data.get("desc_en"):
                data["desc_en"] = ""
            if not data.get("image"):
                data["image"] = ""
        return data

class ActivityUpdate(BaseModel):
    category: Optional[str] = None
    title_en: Optional[str] = None
    title: Optional[str] = None
    title_kn: Optional[str] = None
    desc_en: Optional[str] = None
    description: Optional[str] = None
    desc_kn: Optional[str] = None
    image: Optional[str] = None
    image_url: Optional[str] = None
    activity_date: Optional[str] = None
    tag_en: Optional[str] = None
    tag_kn: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_update(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("title_en") and data.get("title"):
                data["title_en"] = data["title"]
            if not data.get("desc_en") and data.get("description"):
                data["desc_en"] = data["description"]
            if not data.get("image") and data.get("image_url"):
                data["image"] = data["image_url"]
        return data

class ActivityOut(ActivityBase):
    id: int
    created_at: Optional[datetime] = None

    @computed_field
    @property
    def image_url(self) -> str:
        return self.image

    @computed_field
    @property
    def title(self) -> str:
        return self.title_en

    @computed_field
    @property
    def description(self) -> str:
        return self.desc_en or ""

    class Config:
        from_attributes = True


class GalleryItemBase(BaseModel):
    title_en: str
    title_kn: Optional[str] = ""
    desc_en: Optional[str] = ""
    desc_kn: Optional[str] = ""
    image: str
    event_date: Optional[str] = ""


class GalleryItemCreate(BaseModel):
    title_en: Optional[str] = None
    title: Optional[str] = None
    title_kn: Optional[str] = ""
    desc_en: Optional[str] = None
    description: Optional[str] = None
    desc_kn: Optional[str] = ""
    image: Optional[str] = None
    image_url: Optional[str] = None
    event_date: Optional[str] = ""
    category: Optional[str] = "Cultural"

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("title_en") and data.get("title"):
                data["title_en"] = data["title"]
            if not data.get("desc_en") and data.get("description"):
                data["desc_en"] = data["description"]
            if not data.get("image") and data.get("image_url"):
                data["image"] = data["image_url"]
            if not data.get("title_en"):
                data["title_en"] = "Cultural Event"
            if not data.get("desc_en"):
                data["desc_en"] = ""
            if not data.get("image"):
                data["image"] = ""
        return data


class GalleryItemUpdate(BaseModel):
    title_en: Optional[str] = None
    title: Optional[str] = None
    title_kn: Optional[str] = None
    desc_en: Optional[str] = None
    description: Optional[str] = None
    desc_kn: Optional[str] = None
    image: Optional[str] = None
    image_url: Optional[str] = None
    event_date: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_update(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("title_en") and data.get("title"):
                data["title_en"] = data["title"]
            if not data.get("desc_en") and data.get("description"):
                data["desc_en"] = data["description"]
            if not data.get("image") and data.get("image_url"):
                data["image"] = data["image_url"]
        return data


class GalleryItemOut(GalleryItemBase):
    id: int
    created_at: Optional[datetime] = None

    @computed_field
    @property
    def image_url(self) -> str:
        return self.image

    @computed_field
    @property
    def title(self) -> str:
        return self.title_en

    @computed_field
    @property
    def description(self) -> str:
        return self.desc_en or ""

    class Config:
        from_attributes = True


class SocialPostBase(BaseModel):
    type: str = "reel"  # "reel" or "post"
    url: str
    likes: Optional[str] = "0"
    description: Optional[str] = ""
    cover_image: Optional[str] = ""
    views: Optional[str] = "0"
    comments: Optional[str] = "0"
    is_active: bool = True

class SocialPostCreate(SocialPostBase):
    likes: Optional[Any] = "0"
    views: Optional[Any] = "0"
    comments: Optional[Any] = "0"

    @model_validator(mode="before")
    @classmethod
    def normalize_post(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("type"):
                data["type"] = str(data["type"]).lower()
            if "likes" in data and data["likes"] is not None:
                data["likes"] = str(data["likes"])
            if "views" in data and data["views"] is not None:
                data["views"] = str(data["views"])
            if "comments" in data and data["comments"] is not None:
                data["comments"] = str(data["comments"])
        return data

class SocialPostUpdate(BaseModel):
    type: Optional[str] = None
    url: Optional[str] = None
    likes: Optional[Any] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    views: Optional[Any] = None
    comments: Optional[Any] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_update(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("type"):
                data["type"] = str(data["type"]).lower()
            if "likes" in data and data["likes"] is not None:
                data["likes"] = str(data["likes"])
            if "views" in data and data["views"] is not None:
                data["views"] = str(data["views"])
            if "comments" in data and data["comments"] is not None:
                data["comments"] = str(data["comments"])
        return data

class SocialPostOut(SocialPostBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True



