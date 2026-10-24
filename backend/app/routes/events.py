from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Event, Registration, CheckInLog, AuditLog
from ..schemas import EventOut, EventCreate, EventUpdate
from ..cache import fast_cache

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventOut])
def get_events(
    response: Response,
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    norm_cat = "all" if not category or category == "all" else category
    if not active_only:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    else:
        response.headers["Cache-Control"] = "public, max-age=15, s-maxage=60, stale-while-revalidate=120"
        cache_key = f"events_{norm_cat}_{active_only}"
        cached = fast_cache.get(cache_key)
        if cached is not None:
            return cached

    # Self-healing: ensure all initial events (specifically Reel Contest AKV-NT-11) exist and remain active in database
    try:
        from ..seed import INITIAL_EVENTS
        existing_eids = {e[0].upper() for e in db.query(Event.id).all() if e[0]}
        needs_commit = False

        for init_ev in INITIAL_EVENTS:
            eid = init_ev.get("id", "").upper()
            if eid not in existing_eids:
                # Purge any stale EVENT_DELETED markers in AuditLog for official initial events
                db.query(AuditLog).filter(
                    AuditLog.action == "EVENT_DELETED",
                    AuditLog.target_type == "EVENT",
                    func.upper(AuditLog.target_id) == eid
                ).delete(synchronize_session=False)

                db.add(Event(**init_ev))
                existing_eids.add(eid)
                needs_commit = True
            else:
                # Ensure existing initial event is active
                ev_record = db.query(Event).filter(func.upper(Event.id) == eid).first()
                if ev_record and not ev_record.is_active:
                    ev_record.is_active = True
                    needs_commit = True

        if needs_commit:
            db.commit()
            fast_cache.delete_prefix("events_")
    except Exception:
        db.rollback()

    query = db.query(Event)
    if active_only:
        query = query.filter(Event.is_active == True)
    if norm_cat != "all":
        query = query.filter(Event.category == norm_cat)
    results = query.all()
    if active_only:
        fast_cache.set(f"events_{norm_cat}_{active_only}", results, ttl_seconds=60)
    return results

@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    event = db.query(Event).filter(func.lower(Event.id) == event_id.strip().lower()).first()
    if not event:
        from ..seed import INITIAL_EVENTS
        init_ev = next((e for e in INITIAL_EVENTS if str(e.get("id", "")).strip().upper() == event_id.strip().upper()), None)
        if init_ev:
            try:
                new_ev = Event(**init_ev)
                db.add(new_ev)
                db.commit()
                db.refresh(new_ev)
                return new_ev
            except Exception:
                db.rollback()
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

    # Audit log entry & clear prior EVENT_DELETED marker if re-created
    try:
        db.query(AuditLog).filter(
            AuditLog.action == "EVENT_DELETED",
            AuditLog.target_type == "EVENT",
            func.upper(AuditLog.target_id) == event_id.upper()
        ).delete(synchronize_session=False)
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

    fast_cache.delete_prefix("events_")
    return new_event

@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: str, event_update: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(func.lower(Event.id) == event_id.lower()).first()
    if not event:
        from ..seed import INITIAL_EVENTS
        init_ev = next((e for e in INITIAL_EVENTS if str(e.get("id", "")).lower() == event_id.lower()), None)
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

    fast_cache.delete_prefix("events_")
    return event

@router.delete("/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(func.lower(Event.id) == event_id.strip().lower()).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found")
    
    canonical_id = event.id.upper()
    event_title = event.title_en

    # Protect the official system-configured Reel Contest from being deleted
    if canonical_id == "AKV-NT-11":
        raise HTTPException(
            status_code=400,
            detail="The Reel Contest (AKV-NT-11) is the festival's official base event configured by the system. It cannot be permanently deleted. If you need to suspend entries, please edit the event and toggle 'Active' to Off."
        )

    # Clean up associated check-in logs and registrations safely without full model projection
    try:
        from sqlalchemy import text
        reg_id_rows = db.execute(
            text("SELECT registration_id FROM registrations WHERE LOWER(event_id) = :eid"),
            {"eid": canonical_id.lower()}
        ).fetchall()
        reg_ids = [r[0] for r in reg_id_rows if r[0]]
        if reg_ids:
            for r_id in reg_ids:
                db.execute(text("DELETE FROM checkin_logs WHERE registration_id = :rid"), {"rid": r_id})
        db.execute(
            text("DELETE FROM registrations WHERE LOWER(event_id) = :eid"),
            {"eid": canonical_id.lower()}
        )
        db.flush()
    except Exception as cleanup_err:
        pass

    # Delete the event record
    db.delete(event)
    db.commit()

    # Audit log entry for permanent tracking so self-healing never resurrects it
    try:
        log = AuditLog(
            actor_name="Super Administrator",
            action="EVENT_DELETED",
            target_type="EVENT",
            target_id=canonical_id,
            previous_value=f"Title: {event_title}",
            new_value="Deleted from festival events by Superadmin"
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()

    fast_cache.delete_prefix("events_")
    return {"success": True, "message": f"Event '{event_title}' deleted successfully", "deleted_id": canonical_id}
