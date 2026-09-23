from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import GalleryItem
from ..schemas import GalleryItemOut, GalleryItemCreate, GalleryItemUpdate

router = APIRouter(prefix="/gallery", tags=["Gallery"])

@router.get("", response_model=List[GalleryItemOut])
def get_gallery_items(db: Session = Depends(get_db)):
    return db.query(GalleryItem).order_by(GalleryItem.id.desc()).all()

@router.get("/{item_id}", response_model=GalleryItemOut)
def get_gallery_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return item

@router.post("", response_model=GalleryItemOut)
def create_gallery_item(item_in: GalleryItemCreate, db: Session = Depends(get_db)):
    new_item = GalleryItem(**item_in.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}", response_model=GalleryItemOut)
def update_gallery_item(item_id: int, item_update: GalleryItemUpdate, db: Session = Depends(get_db)):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_gallery_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    title = item.title_en
    db.delete(item)
    db.commit()
    return {"success": True, "message": f"Gallery item '{title}' deleted successfully"}
