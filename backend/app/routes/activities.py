from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Activity
from ..schemas import ActivityOut, ActivityCreate, ActivityUpdate

router = APIRouter(prefix="/activities", tags=["Activities"])

@router.get("", response_model=List[ActivityOut])
def get_activities(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Activity)
    if active_only:
        query = query.filter(Activity.is_active == True)
    if category and category != "all":
        query = query.filter(Activity.category == category)
    return query.order_by(Activity.id.asc()).all()

@router.get("/{activity_id}", response_model=ActivityOut)
def get_activity(activity_id: int, db: Session = Depends(get_db)):
    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    return act

@router.post("", response_model=ActivityOut)
def create_activity(activity_in: ActivityCreate, db: Session = Depends(get_db)):
    new_act = Activity(**activity_in.model_dump())
    db.add(new_act)
    db.commit()
    db.refresh(new_act)
    return new_act

@router.put("/{activity_id}", response_model=ActivityOut)
def update_activity(activity_id: int, act_update: ActivityUpdate, db: Session = Depends(get_db)):
    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = act_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(act, key, value)
    
    db.commit()
    db.refresh(act)
    return act

@router.delete("/{activity_id}")
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    title = act.title_en
    db.delete(act)
    db.commit()
    return {"success": True, "message": f"Activity '{title}' deleted successfully"}
