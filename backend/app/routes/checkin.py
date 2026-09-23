import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Registration, CheckInLog
from ..schemas import CheckInRequest, RegistrationOut

router = APIRouter(prefix="/check-in", tags=["Check-In"])

@router.post("", response_model=RegistrationOut)
def check_in_participant(payload: CheckInRequest, db: Session = Depends(get_db)):
    reg = db.query(Registration).filter(
        func.lower(Registration.registration_id) == payload.registration_id.strip().lower()
    ).first()
    
    if not reg:
        # Check by USN fallback
        reg = db.query(Registration).filter(
            func.lower(Registration.usn) == payload.registration_id.strip().lower()
        ).first()

    if not reg:
        raise HTTPException(status_code=404, detail="Registration ID / USN not found")

    if reg.status == "Checked In":
        # Already checked in, return details with message or status
        return reg

    # Mark as Checked In
    reg.status = "Checked In"
    reg.checkin_time = datetime.datetime.utcnow()
    reg.checked_in_by = payload.agent or "Organizer"

    log = CheckInLog(
        registration_id=reg.registration_id,
        action="Checked In",
        agent=payload.agent or "Organizer",
        notes=payload.notes
    )
    db.add(log)
    db.commit()
    db.refresh(reg)
    return reg

@router.post("/revert/{registration_id}", response_model=RegistrationOut)
def revert_checkin(registration_id: str, db: Session = Depends(get_db)):
    reg = db.query(Registration).filter(
        func.lower(Registration.registration_id) == registration_id.strip().lower()
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    reg.status = "Registered"
    reg.checkin_time = None
    reg.checked_in_by = None

    log = CheckInLog(
        registration_id=reg.registration_id,
        action="Reverted to Registered",
        agent="Organizer",
        notes="Check-in status reverted"
    )
    db.add(log)
    db.commit()
    db.refresh(reg)
    return reg
