from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Event, Registration, CheckInLog, AuditLog
from ..schemas import EventOut, EventCreate, EventUpdate

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventOut])
def get_events(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if active_only:
        query = query.filter(Event.is_active == True)
    if category and category != "all":
        query = query.filter(Event.category == category)
    return query.all()

@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
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
    return new_event

@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: str, event_update: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    
    # Audit log entry
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
    except Exception:
        pass

    db.commit()
    db.refresh(event)
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
