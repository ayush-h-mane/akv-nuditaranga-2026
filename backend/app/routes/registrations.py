import json
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Registration, Event
from ..schemas import RegistrationCreate, RegistrationOut

router = APIRouter(prefix="/registrations", tags=["Registrations"])

def generate_unique_reg_id(db: Session) -> str:
    # Format: AKV26001, AKV26002, AKV26003, ...
    existing_ids = db.query(Registration.registration_id).all()
    max_num = 0
    for (rid,) in existing_ids:
        if rid and rid.startswith("AKV26"):
            try:
                num = int(rid[5:])
                if num > max_num:
                    max_num = num
            except (ValueError, TypeError):
                pass
    next_num = max(max_num + 1, 1)
    reg_id = f"AKV26{next_num:03d}"
    # Verify uniqueness
    while db.query(Registration).filter(Registration.registration_id == reg_id).first():
        next_num += 1
        reg_id = f"AKV26{next_num:03d}"
    return reg_id

@router.post("", response_model=RegistrationOut)
def register_participant(reg_data: RegistrationCreate, db: Session = Depends(get_db)):
    # 1. Check Event Existence
    event = db.query(Event).filter(Event.id == reg_data.event_id).first()
    if not event:
        event = Event(
            id=reg_data.event_id,
            title_en=reg_data.event_id,
            title_kn=reg_data.event_id,
            category="cultural",
            category_kn="ಸಾಂಸ್ಕೃತಿಕ",
            description_en=f"Nuditaranga 2026 event: {reg_data.event_id}",
            description_kn=f"ನುಡಿತರಂಗ ೨೦೨೬ ಸ್ಪರ್ಧೆ: {reg_data.event_id}",
            is_team=reg_data.is_team,
            format="team" if reg_data.is_team else "solo",
            min_team_size=2 if reg_data.is_team else 1,
            max_team_size=10 if reg_data.is_team else 1,
            max_slots=200,
            registered_count=0,
            venue="Acharya Campus",
            venue_kn="ಆಚಾರ್ಯ ಆವರಣ",
            event_date="02-11-2026",
            event_time="10:00 AM",
            reporting_time="09:30 AM",
            rules_en="Standard festival rules apply.",
            rules_kn="ಮಾನಕ ನಿಯಮಗಳು ಅನ್ವಯಿಸುತ್ತವೆ.",
            is_active=True
        )
        db.add(event)
        db.commit()
        db.refresh(event)
    elif not event.is_active:
        raise HTTPException(status_code=400, detail="Registrations for this event are currently closed")
    
    # 2. Check Capacity
    if event.registered_count >= event.max_slots:
        raise HTTPException(status_code=400, detail="Registrations for this event have reached maximum capacity")
    
    # 3. Duplicate check for the SAME event
    auid_val = reg_data.auid.strip().upper() if reg_data.auid else (reg_data.usn.strip().upper() if reg_data.usn else "")
    usn_val = reg_data.usn.strip().upper() if reg_data.usn else auid_val

    duplicate = db.query(Registration).filter(
        Registration.event_id == reg_data.event_id,
        (Registration.auid == auid_val) | (Registration.usn == usn_val)
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Student with AUID {auid_val} is already registered for this event with Registration ID: {duplicate.registration_id}"
        )
    
    # 4. Process team members if team event
    team_members_str = None
    if reg_data.is_team and reg_data.team_members:
        team_members_str = json.dumps([m.model_dump() for m in reg_data.team_members])

    # 5. Generate unique Registration ID
    reg_id = generate_unique_reg_id(db)

    # 6. Create Registration record
    new_reg = Registration(
        registration_id=reg_id,
        event_id=reg_data.event_id,
        full_name=reg_data.full_name.strip(),
        usn=usn_val,
        auid=auid_val,
        institute=reg_data.institute.strip() if reg_data.institute else "Acharya Institute of Technology",
        department=reg_data.department.strip(),
        semester=reg_data.semester,
        section=reg_data.section.strip().upper(),
        email=reg_data.email.strip().lower(),
        phone=reg_data.phone.strip(),
        gender=reg_data.gender,
        is_team=reg_data.is_team,
        team_name=reg_data.team_name.strip() if reg_data.team_name else None,
        team_members=team_members_str,
        status="Registered"
    )
    
    db.add(new_reg)
    # Increment event slot count
    event.registered_count += 1
    db.commit()
    db.refresh(new_reg)
    return new_reg

@router.get("/auid/{auid}", response_model=List[RegistrationOut])
def get_registrations_by_auid(auid: str, db: Session = Depends(get_db)):
    clean_auid = auid.strip().lower()
    regs = db.query(Registration).filter(
        (func.lower(Registration.auid) == clean_auid) |
        (func.lower(Registration.usn) == clean_auid)
    ).order_by(Registration.created_at.desc()).all()
    if not regs:
        raise HTTPException(status_code=404, detail="No passes found for this AUID/USN")
    return regs

@router.get("/{registration_id}", response_model=RegistrationOut)
def get_registration(registration_id: str, db: Session = Depends(get_db)):
    clean_id = registration_id.strip().lower()
    reg = db.query(Registration).filter(
        func.lower(Registration.registration_id) == clean_id
    ).first()
    if not reg:
        # Also allow finding by AUID or USN
        reg = db.query(Registration).filter(
            (func.lower(Registration.auid) == clean_id) |
            (func.lower(Registration.usn) == clean_id)
        ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    return reg

@router.get("", response_model=List[RegistrationOut])
def list_registrations(
    event_id: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Registration)
    if event_id and event_id != "all":
        query = query.filter(Registration.event_id == event_id)
    if department and department != "all":
        query = query.filter(Registration.department == department)
    if status and status != "all":
        query = query.filter(Registration.status == status)
    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(Registration.registration_id).like(search_term) |
            func.lower(Registration.full_name).like(search_term) |
            func.lower(Registration.auid).like(search_term) |
            func.lower(Registration.usn).like(search_term) |
            func.lower(Registration.institute).like(search_term) |
            func.lower(Registration.department).like(search_term) |
            func.lower(Registration.email).like(search_term) |
            func.lower(Registration.phone).like(search_term)
        )
    return query.order_by(Registration.created_at.desc()).offset(offset).limit(limit).all()
