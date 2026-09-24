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
    data = {
        "title_en": item_in.title_en or item_in.title or "Cultural Event",
        "title_kn": item_in.title_kn or "",
        "desc_en": item_in.desc_en or item_in.description or "",
        "desc_kn": item_in.desc_kn or "",
        "image": item_in.image or item_in.image_url or "",
        "event_date": item_in.event_date or ""
    }
    new_item = GalleryItem(**data)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}", response_model=GalleryItemOut)
def update_gallery_item(item_id: int, item_update: GalleryItemUpdate, db: Session = Depends(get_db)):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    if item_update.title_en is not None or item_update.title is not None:
        item.title_en = item_update.title_en or item_update.title
    if item_update.title_kn is not None:
        item.title_kn = item_update.title_kn
    if item_update.desc_en is not None or item_update.description is not None:
        item.desc_en = item_update.desc_en or item_update.description
    if item_update.desc_kn is not None:
        item.desc_kn = item_update.desc_kn
    if item_update.image is not None or item_update.image_url is not None:
        item.image = item_update.image or item_update.image_url
    if item_update.event_date is not None:
        item.event_date = item_update.event_date
    
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
