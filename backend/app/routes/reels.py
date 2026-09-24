from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import SocialPost
from ..schemas import SocialPostOut, SocialPostCreate, SocialPostUpdate

router = APIRouter(prefix="/reels", tags=["Reels & Posts"])

@router.get("", response_model=List[SocialPostOut])
def get_reels(
    post_type: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(SocialPost)
    if active_only:
        query = query.filter(SocialPost.is_active == True)
    if post_type and post_type != "all":
        query = query.filter(SocialPost.type == post_type)
    return query.order_by(SocialPost.id.desc()).all()

@router.get("/{reel_id}", response_model=SocialPostOut)
def get_reel(reel_id: int, db: Session = Depends(get_db)):
    post = db.query(SocialPost).filter(SocialPost.id == reel_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Reel/post not found")
    return post

@router.post("", response_model=SocialPostOut)
def create_reel(post_in: SocialPostCreate, db: Session = Depends(get_db)):
    # Validate: If type is reel, cover_image is required or recommended
    data = post_in.model_dump()
    new_post = SocialPost(**data)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.put("/{reel_id}", response_model=SocialPostOut)
def update_reel(reel_id: int, post_update: SocialPostUpdate, db: Session = Depends(get_db)):
    post = db.query(SocialPost).filter(SocialPost.id == reel_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Reel/post not found")
    
    update_data = post_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)
    
    db.commit()
    db.refresh(post)
    return post

@router.delete("/{reel_id}")
def delete_reel(reel_id: int, db: Session = Depends(get_db)):
    post = db.query(SocialPost).filter(SocialPost.id == reel_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Reel/post not found")
    
    db.delete(post)
    db.commit()
    return {"success": True, "message": f"Reel/post #{reel_id} deleted successfully"}
