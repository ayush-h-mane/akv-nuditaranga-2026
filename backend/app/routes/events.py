from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Event, Registration, CheckInLog, AuditLog
from ..schemas import EventOut, EventCreate, EventUpdate

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventOut])
def get_events(
    response: Response,
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    if not active_only:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    else:
        response.headers["Cache-Control"] = "public, max-age=5, s-maxage=15, stale-while-revalidate=30"
    query = db.query(Event)
    if active_only:
        query = query.filter(Event.is_active == True)
    if category and category != "all":
        query = query.filter(Event.category == category)
    return query.all()

@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

def generate_unique_event_id(db: Session) -> str:
    # Format: AKV-NT-01, AKV-NT-02, AKV-NT-03, ...
    events = db.query(Event.id).all()
    max_num = 0
    for (eid,) in events:
        if eid and eid.upper().startswith("AKV-NT-"):
            try:
                num = int(eid[7:])
                if num > max_num:
                    max_num = num
            except (ValueError, TypeError):
                pass
    next_num = max(max_num + 1, 1)
    eid = f"AKV-NT-{next_num:02d}"
    while db.query(Event).filter(Event.id == eid).first():
        next_num += 1
        eid = f"AKV-NT-{next_num:02d}"
    return eid

@router.post("", response_model=EventOut)
def create_event(event_in: EventCreate, db: Session = Depends(get_db)):
    if not event_in.id or not event_in.id.strip():
        event_id = generate_unique_event_id(db)
    else:
        event_id = event_in.id.strip().upper()

    existing = db.query(Event).filter(Event.id == event_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Event with this ID already exists")
    
    event_data = event_in.model_dump()
    event_data["id"] = event_id
    new_event = Event(**event_data)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    # Audit log entry
    try:
        log = AuditLog(
            actor_name="Super Administrator",
            action="EVENT_CREATED",
            target_type="EVENT",
            target_id=event_id,
            previous_value=None,
            new_value=f"Created new event {new_event.title_en} ({event_id}) [Format: {new_event.format}]"
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()

    return new_event

@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: str, event_update: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        from ..seed import INITIAL_EVENTS
        init_ev = next((e for e in INITIAL_EVENTS if e.get("id") == event_id), None)
        if init_ev:
            init_data = dict(init_ev)
            update_data = event_update.model_dump(exclude_unset=True)
            init_data.update(update_data)
            init_data["id"] = event_id
            event = Event(**init_data)
            db.add(event)
            db.commit()
            db.refresh(event)
        elif event_update.title_en:
            update_data = event_update.model_dump(exclude_unset=True)
            update_data["id"] = event_id
            update_data.setdefault("title_kn", update_data.get("title_en"))
            update_data.setdefault("category", "cultural")
            update_data.setdefault("category_kn", "ಸಾಂಸ್ಕೃತಿಕ")
            update_data.setdefault("description_en", "")
            update_data.setdefault("description_kn", "")
            update_data.setdefault("venue", "Acharya Campus")
            update_data.setdefault("venue_kn", "ಆಚಾರ್ಯ ಆವರಣ")
            update_data.setdefault("event_date", "02-11-2026")
            update_data.setdefault("event_time", "10:00 AM")
            update_data.setdefault("reporting_time", "09:30 AM")
            update_data.setdefault("rules_en", "")
            update_data.setdefault("rules_kn", "")
            event = Event(**update_data)
            db.add(event)
            db.commit()
            db.refresh(event)
        else:
            raise HTTPException(status_code=404, detail="Event not found")
    else:
        update_data = event_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is None and key in ["title_kn", "category_kn", "description_kn", "venue_kn", "reporting_time", "rules_en", "rules_kn"]:
                continue
            setattr(event, key, value)
        db.commit()
        db.refresh(event)
    
    # Audit log entry safely isolated
    try:
        log = AuditLog(
            actor_name="Super Administrator",
            action="EVENT_UPDATED",
            target_type="EVENT",
            target_id=event_id,
            previous_value=None,
            new_value=f"Updated event details for {event.title_en} ({event_id})"
        )
        db.add(log)
        db.commit()
    except Exception:
        pass

    return event

@router.delete("/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Clean up associated check-in logs and registrations to maintain consistency
    regs = db.query(Registration).filter(Registration.event_id == event_id).all()
    reg_ids = [r.registration_id for r in regs]
    if reg_ids:
        db.query(CheckInLog).filter(CheckInLog.registration_id.in_(reg_ids)).delete(synchronize_session=False)
    db.query(Registration).filter(Registration.event_id == event_id).delete(synchronize_session=False)
    
    # Audit log entry
    try:
        log = AuditLog(
            actor_name="Super Administrator",
            action="EVENT_DELETED",
            target_type="EVENT",
            target_id=event_id,
            previous_value=f"Title: {event.title_en}",
            new_value="Deleted from festival events"
        )
        db.add(log)
    except Exception:
        pass

    db.delete(event)
    db.commit()
    return {"success": True, "message": f"Event '{event.title_en}' deleted successfully"}
