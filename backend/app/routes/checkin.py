import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Registration, CheckInLog
from ..schemas import CheckInRequest, RegistrationOut

router = APIRouter(tags=["Check-In"])

def extract_lookup_id(raw_id: str) -> str:
    """Extract reg_id or auid from JSON QR payloads or plain strings."""
    clean = raw_id.strip()
    if clean.startswith("{") and clean.endswith("}"):
        try:
            data = json.loads(clean)
            return (data.get("reg_id") or data.get("auid") or data.get("usn") or clean).strip()
        except Exception:
            pass
    return clean

def find_registration(db: Session, lookup_id: str) -> Registration:
    clean_id = extract_lookup_id(lookup_id).lower()
    
    # 1. Direct match on registration_id
    reg = db.query(Registration).filter(
        func.lower(Registration.registration_id) == clean_id
    ).first()
    if reg:
        return reg

    # 2. Match on AUID
    reg = db.query(Registration).filter(
        func.lower(Registration.auid) == clean_id
    ).first()
    if reg:
        return reg

    # 3. Match on USN
    reg = db.query(Registration).filter(
        func.lower(Registration.usn) == clean_id
    ).first()
    return reg

@router.post("/check-in", response_model=RegistrationOut)
@router.post("/checkin", response_model=RegistrationOut)
def check_in_participant(payload: CheckInRequest, db: Session = Depends(get_db)):
    reg = find_registration(db, payload.registration_id)
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Registration Pass ID, AUID, or USN not found in fest records."
        )

    # If already checked in, return with confirmation
    if reg.status == "Checked In":
        return reg

    # Mark as Checked In
    reg.status = "Checked In"
    reg.checkin_time = datetime.datetime.utcnow()
    reg.checked_in_by = payload.agent or "Scanner Desk"

    log = CheckInLog(
        registration_id=reg.registration_id,
        action="Checked In",
        agent=payload.agent or "Scanner Desk",
        notes=payload.notes or "Camera QR Scan"
    )
    db.add(log)
    db.commit()
    db.refresh(reg)
    return reg

@router.get("/check-in/verify/{code}", response_model=RegistrationOut)
@router.get("/checkin/verify/{code}", response_model=RegistrationOut)
def verify_participant_pass(code: str, db: Session = Depends(get_db)):
    reg = find_registration(db, code)
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Registration Pass not found."
        )
    return reg

@router.post("/check-in/revert/{registration_id}", response_model=RegistrationOut)
@router.post("/checkin/revert/{registration_id}", response_model=RegistrationOut)
def revert_checkin(registration_id: str, db: Session = Depends(get_db)):
    reg = find_registration(db, registration_id)
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
