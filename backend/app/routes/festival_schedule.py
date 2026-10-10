import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import KarunadaScheduleDay
from ..auth_deps import require_superadmin
from ..cache import fast_cache

router = APIRouter(prefix="/festival-schedule", tags=["Festival Schedule"])

_SCHEDULE_INITIALIZED = False

DEFAULT_SCHEDULE = [
    {
        "sort_order": 1,
        "day": "DAY 01", "day_kn": "ದಿನ ೦೧",
        "date": "30/10/2026", "date_kn": "೩೦/೧೦/೨೦೨೬",
        "title": "LAUNCH", "title_kn": "ಉದ್ಘಾಟನೆ",
        "tag": "Kala Karunadu", "tag_kn": "ಕಲಾ ಕರುನಾಡು",
        "desc_en": "Grand Opening & Inauguration of Karunada Vaibhava 2026, ceremonial lighting of the lamp by dignitaries, and unveiling of festival stages.",
        "desc_kn": "ಕರುನಾಡ ವೈಭವ ೨೦೨೬ ರ ಭವ್ಯ ಉದ್ಘಾಟನೆ, ಗಣ್ಯರಿಂದ ದೀಪ ಪ್ರಜ್ವಲನೆ ಹಾಗೂ ಸಾಂಸ್ಕೃತಿಕ ಕಹಳೆ.",
        "venue": "Acharya Basket Ball Court", "venue_en": "Acharya Basket Ball Court", "venue_kn": "ಆಚಾರ್ಯ ಬ್ಯಾಸ್ಕೆಟ್‌ಬಾಲ್ ಮೈದಾನ",
        "time_en": "9:00 AM Onwards", "time_kn": "ಬೆಳಿಗ್ಗೆ ೦೯:೦೦ ರಿಂದ",
    },
    {
        "sort_order": 2,
        "day": "DAY 02", "day_kn": "ದಿನ ೦೨",
        "date": "01/11/2026", "date_kn": "೦೧/೧೧/೨೦೨೬",
        "title": "Flag hoist + Cultural events", "title_kn": "ಧ್ವಜಾರೋಹಣ + ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು",
        "tag": "Rajyotsava Special", "tag_kn": "ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ ದಿನ",
        "desc_en": "69th Karnataka Rajyotsava Celebrations: Ceremonial hoisting of the Karnataka flag, grand Naadageethe rendition, heritage parade & mega folk performances.",
        "desc_kn": "ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ ಸಂಭ್ರಮ: ಅಧಿಕೃತ ಕರ್ನಾಟಕ ಧ್ವಜಾರೋಹಣ, ನಾಡಗೀತೆ ಗಾಯನ, ಭವ್ಯ ಮೆರವಣಿಗೆ ಮತ್ತು ಜಾನಪದ ನೃತ್ಯ ಸಂಭ್ರಮ.",
        "venue": "Acharya Basket Ball Court", "venue_en": "Acharya Basket Ball Court", "venue_kn": "ಆಚಾರ್ಯ ಬ್ಯಾಸ್ಕೆಟ್‌ಬಾಲ್ ಮೈದಾನ",
        "time_en": "9:00 AM Onwards", "time_kn": "ಬೆಳಿಗ್ಗೆ ೦೯:೦೦ ರಿಂದ",
    },
    {
        "sort_order": 3,
        "day": "DAY 03", "day_kn": "ದಿನ ೦೩",
        "date": "02/11/2026", "date_kn": "೦೨/೧೧/೨೦೨೬",
        "title": "Kala Ranga", "title_kn": "ಕಲಾರಂಗ",
        "tag": "Yuva Karunadu", "tag_kn": "ಯುವ ಕರುನಾಡು",
        "desc_en": "Traditional Karnataka theatre, Yakshagana, classical Bharatanatyam, Janapada dance troupes and drama competitions on the grand stage.",
        "desc_kn": "ಯಕ್ಷಗಾನ, ಶಾಸ್ತ್ರೀಯ ನೃತ್ಯ, ನಾಟಕ ಮತ್ತು ಪ್ರಾಚೀನ ಕಲಾ ಪ್ರಕಾರಗಳ ರೋಮಾಂಚಕ ವೇದಿಕೆ ಪ್ರದರ್ಶನ.",
        "venue": "Oya Junction", "venue_en": "Oya Junction", "venue_kn": "ಓಯಾ ಜಂಕ್ಷನ್",
        "time_en": "9:00 AM Onwards", "time_kn": "ಬೆಳಿಗ್ಗೆ ೦೯:೦೦ ರಿಂದ",
    },
    {
        "sort_order": 4,
        "day": "DAY 04", "day_kn": "ದಿನ ೦೪",
        "date": "03/11/2026", "date_kn": "೦೩/೧೧/೨೦೨೬",
        "title": "Jatre", "title_kn": "ಜಾತ್ರೆ",
        "tag": "Karunada Jatre", "tag_kn": "ಕರುನಾಡ ಜಾತ್ರೆ",
        "desc_en": "Traditional Karnataka cultural fair: Native food delicacies stalls, desi games, handicraft showcases, Dollu Kunitha & Veeragase processions.",
        "desc_kn": "ಸಾಂಪ್ರದಾಯಿಕ ಗ್ರಾಮೀಣ ಜಾತ್ರೆ: ದೇಸಿ ತಿಂಡಿ-ತಿನಿಸುಗಳ ಮಳಿಗೆಗಳು, ನಾಡಿನ ಆಟೋಟಗಳು, ಡೊಳ್ಳು ಕುಣಿತ ಮತ್ತು ವೀರಗಾಸೆ ಸಂಭ್ರಮ.",
        "venue": "Acharya Campus", "venue_en": "Acharya Campus", "venue_kn": "ಆಚಾರ್ಯ ಆವರಣ",
        "time_en": "9:00 AM Onwards", "time_kn": "ಬೆಳಿಗ್ಗೆ ೦೯:೦೦ ರಿಂದ",
    },
    {
        "sort_order": 5,
        "day": "DAY 05", "day_kn": "ದಿನ ೦೫",
        "date": "04/11/2026", "date_kn": "೦೪/೧೧/೨೦೨೬",
        "title": "Final day", "title_kn": "ಮಹಾ ಸಮಾರೋಪ ದಿನ",
        "tag": "Samskruthika Karunadu", "tag_kn": "ಸಾಂಸ್ಕೃತಿಕ ಕರುನಾಡು",
        "desc_en": "Grand Valedictory ceremony, felicitation of achievers, prize distributions, and Karunada Vaibhava mega star musical night concert.",
        "desc_kn": "ಭವ್ಯ ಸಮಾರೋಪ ಸಮಾರಂಭ, ವಿಜೇತರಿಗೆ ಪ್ರಶಸ್ತಿ ಪ್ರದಾನ, ಗಣ್ಯರ ಸನ್ಮಾನ ಮತ್ತು ತಾರಾ ಕಲಾವಿದರ ನಾದ ನಮನ ಮಹಾ ಸಂಗೀತ ಸಂಜೆ.",
        "venue": "Acharya Campus", "venue_en": "Acharya Campus", "venue_kn": "ಆಚಾರ್ಯ ಆವರಣ",
        "time_en": "9:00 AM Onwards", "time_kn": "ಬೆಳಿಗ್ಗೆ ೦೯:೦೦ ರಿಂದ",
    },
]


def _serialize_day(row: KarunadaScheduleDay) -> dict:
    programme_taglines = {
        "ಉದ್ಘಾಟನೆ": ("Kala Karunadu", "ಕಲಾ ಕರುನಾಡು", "Inaugural Day", "ಉದ್ಘಾಟನಾ ಸಮಾರಂಭ"),
        "ಕಲಾರಂಗ": ("Yuva Karunadu", "ಯುವ ಕರುನಾಡು", "Theatre & Performing Arts", "ರಂಗಭೂಮಿ & ಪ್ರದರ್ಶನ ಕಲೆ"),
        "ಜಾತ್ರೆ": ("Karunada Jatre", "ಕರುನಾಡ ಜಾತ್ರೆ", "Village Fair & Carnival", "ಗ್ರಾಮೀಣ ಜಾತ್ರೆ & ಮೇಳ"),
        "ಮಹಾ ಸಮಾರೋಪ ದಿನ": ("Samskruthika Karunadu", "ಸಾಂಸ್ಕೃತಿಕ ಕರುನಾಡು", "Grand Valedictory & Concert", "ಮಹಾ ಸಮಾರೋಪ & ಸಂಗೀತ ಸಂಜೆ"),
    }
    tag, tag_kn = row.tag, row.tag_kn
    known_tagline = programme_taglines.get(row.title_kn)
    if known_tagline:
        if (tag or "").strip().casefold() == known_tagline[2].casefold():
            tag = known_tagline[0]
        if (tag_kn or "").strip().casefold() in {
            known_tagline[3].casefold(), known_tagline[0].casefold()
        }:
            tag_kn = known_tagline[1]
    return {
        "id": row.id,
        "sort_order": row.sort_order,
        "day": row.day,
        "dayKn": row.day_kn,
        "date": row.date,
        "dateKn": row.date_kn,
        "title": row.title,
        "titleKn": row.title_kn,
        "tag": tag,
        "tagKn": tag_kn,
        "descEn": row.desc_en,
        "descKn": row.desc_kn,
        "venue": row.venue,
        "venueEn": row.venue_en or row.venue,
        "venueKn": row.venue_kn,
        "timeEn": row.time_en,
        "timeKn": row.time_kn,
        "is_active": row.is_active,
    }


def ensure_default_schedule(db: Session):
    global _SCHEDULE_INITIALIZED
    if _SCHEDULE_INITIALIZED:
        return
    has_rows = db.query(KarunadaScheduleDay.id).first() is not None
    if has_rows:
        _SCHEDULE_INITIALIZED = True
        return
    for item in DEFAULT_SCHEDULE:
        db.add(KarunadaScheduleDay(
            sort_order=item["sort_order"],
            day=item["day"],
            day_kn=item["day_kn"],
            date=item["date"],
            date_kn=item.get("date_kn"),
            title=item["title"],
            title_kn=item["title_kn"],
            tag=item.get("tag"),
            tag_kn=item.get("tag_kn"),
            desc_en=item.get("desc_en"),
            desc_kn=item.get("desc_kn"),
            venue=item.get("venue"),
            venue_en=item.get("venue_en"),
            venue_kn=item.get("venue_kn"),
            time_en=item.get("time_en"),
            time_kn=item.get("time_kn"),
            is_active=True,
        ))
    db.commit()
    _SCHEDULE_INITIALIZED = True


class ScheduleDayUpdate(BaseModel):
    id: Optional[int] = None
    sort_order: int = 0
    day: str = Field(..., min_length=2)
    day_kn: str = Field(..., min_length=2)
    date: str = Field(..., min_length=8)
    date_kn: Optional[str] = None
    title: str = Field(..., min_length=2)
    title_kn: str = Field(..., min_length=2)
    tag: Optional[str] = None
    tag_kn: Optional[str] = None
    desc_en: Optional[str] = None
    desc_kn: Optional[str] = None
    venue: Optional[str] = None
    venue_en: Optional[str] = None
    venue_kn: Optional[str] = None
    time_en: Optional[str] = None
    time_kn: Optional[str] = None
    is_active: bool = True


class ScheduleBulkUpdate(BaseModel):
    days: List[ScheduleDayUpdate]


@router.get("")
def get_festival_schedule(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    
    cached = fast_cache.get("festival_schedule")
    if cached is not None:
        return cached

    ensure_default_schedule(db)
    rows = (
        db.query(KarunadaScheduleDay)
        .filter(KarunadaScheduleDay.is_active == True)
        .order_by(KarunadaScheduleDay.sort_order.asc())
        .all()
    )
    result = {"success": True, "schedule": [_serialize_day(r) for r in rows]}
    fast_cache.set("festival_schedule", result, ttl_seconds=300)
    return result


@router.put("")
def update_festival_schedule(
    payload: ScheduleBulkUpdate,
    db: Session = Depends(get_db),
    _superadmin=Depends(require_superadmin),
):
    if not payload.days:
        raise HTTPException(status_code=400, detail="Schedule cannot be empty.")

    existing_ids = {r.id for r in db.query(KarunadaScheduleDay).all()}
    seen_ids = set()

    for idx, day in enumerate(payload.days, start=1):
        if day.id and day.id in existing_ids:
            row = db.query(KarunadaScheduleDay).filter(KarunadaScheduleDay.id == day.id).first()
            seen_ids.add(day.id)
        else:
            row = KarunadaScheduleDay()
            db.add(row)

        row.sort_order = idx
        row.day = day.day.strip()
        row.day_kn = day.day_kn.strip()
        row.date = day.date.strip()
        row.date_kn = (day.date_kn or "").strip() or None
        row.title = day.title.strip()
        row.title_kn = day.title_kn.strip()
        row.tag = (day.tag or "").strip() or None
        row.tag_kn = (day.tag_kn or "").strip() or None
        row.desc_en = day.desc_en
        row.desc_kn = day.desc_kn
        row.venue = day.venue
        row.venue_en = day.venue_en or day.venue
        row.venue_kn = day.venue_kn
        row.time_en = day.time_en
        row.time_kn = day.time_kn
        row.is_active = day.is_active

    for stale_id in existing_ids - seen_ids:
        stale = db.query(KarunadaScheduleDay).filter(KarunadaScheduleDay.id == stale_id).first()
        if stale:
            stale.is_active = False

    db.commit()
    fast_cache.delete("festival_schedule")
    rows = (
        db.query(KarunadaScheduleDay)
        .filter(KarunadaScheduleDay.is_active == True)
        .order_by(KarunadaScheduleDay.sort_order.asc())
        .all()
    )
    result = {
        "success": True,
        "message": "Karunada Vaibhava schedule updated successfully.",
        "schedule": [_serialize_day(r) for r in rows],
    }
    fast_cache.set("festival_schedule", result, ttl_seconds=300)
    return result
