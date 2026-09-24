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
    data = {
        "category": activity_in.category or "Major Activity",
        "title_en": activity_in.title_en or activity_in.title or "Major Activity",
        "title_kn": activity_in.title_kn or "",
        "desc_en": activity_in.desc_en or activity_in.description or "",
        "desc_kn": activity_in.desc_kn or "",
        "image": activity_in.image or activity_in.image_url or "",
        "activity_date": activity_in.activity_date or "",
        "tag_en": activity_in.tag_en or "",
        "tag_kn": activity_in.tag_kn or "",
        "icon": activity_in.icon or "",
        "is_active": activity_in.is_active if activity_in.is_active is not None else True
    }
    new_act = Activity(**data)
    db.add(new_act)
    db.commit()
    db.refresh(new_act)
    return new_act

@router.put("/{activity_id}", response_model=ActivityOut)
def update_activity(activity_id: int, act_update: ActivityUpdate, db: Session = Depends(get_db)):
    act = db.query(Activity).filter(Activity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    if act_update.category is not None:
        act.category = act_update.category
    if act_update.title_en is not None or act_update.title is not None:
        act.title_en = act_update.title_en or act_update.title
    if act_update.title_kn is not None:
        act.title_kn = act_update.title_kn
    if act_update.desc_en is not None or act_update.description is not None:
        act.desc_en = act_update.desc_en or act_update.description
    if act_update.desc_kn is not None:
        act.desc_kn = act_update.desc_kn
    if act_update.image is not None or act_update.image_url is not None:
        act.image = act_update.image or act_update.image_url
    if act_update.activity_date is not None:
        act.activity_date = act_update.activity_date
    if act_update.tag_en is not None:
        act.tag_en = act_update.tag_en
    if act_update.tag_kn is not None:
        act.tag_kn = act_update.tag_kn
    if act_update.icon is not None:
        act.icon = act_update.icon
    if act_update.is_active is not None:
        act.is_active = act_update.is_active
    
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
