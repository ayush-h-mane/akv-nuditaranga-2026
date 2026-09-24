from .database import SessionLocal, engine, Base
from .models import Event, Registration, Activity, GalleryItem, SocialPost
import datetime
import json

INITIAL_EVENTS = []


INITIAL_ACTIVITIES = [
    {
        "category": "nuditaranga",
        "title_en": "Nuditaranga Annual Inter-College Fest",
        "title_kn": "ನುಡಿತರಂಗ ವಾರ್ಷಿಕ ಸಾಂಸ್ಕೃತಿಕ ಹಬ್ಬ",
        "desc_en": "Flagship cultural extravaganza with over 25+ events spanning literature, classical singing, folk dances, rangoli, and street theatre.",
        "desc_kn": "ಸಾಹಿತ್ಯ, ಸುಗಮ ಸಂಗೀತ, ಜಾನಪದ ನೃತ್ಯ, ರಂಗೋಲಿ ಮತ್ತು ಬೀದಿ ನಾಟಕಗಳನ್ನೊಳಗೊಂಡ ೨೫ಕ್ಕೂ ಹೆಚ್ಚು ಸ್ಪರ್ಧೆಗಳ ಮಹಾಸಂಗಮ.",
        "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
        "activity_date": "2026-10-30",
        "tag_en": "Cultural Fest",
        "tag_kn": "ವಾರ್ಷಿಕ ಹಬ್ಬ",
        "icon": "Music",
        "is_active": True
    },
    {
        "category": "rajyotsava",
        "title_en": "Karnataka Rajyotsava Celebrations",
        "title_kn": "ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ ಸಂಭ್ರಮಾಚರಣೆ",
        "desc_en": "Honoring Kannada heritage with yellow-red flag hoisting, Dollu Kunitha procession, and renowned guest orators.",
        "desc_kn": "ಕನ್ನಡ ಧ್ವಜಾರೋಹಣ, ಡೊಳ್ಳು ಕುಣಿತ ಮೆರವಣಿಗೆ ಹಾಗೂ ನಾಡಿನ ಗಣ್ಯ ವಿದ್ವಾಂಸರ ಉಪನ್ಯಾಸದೊಂದಿಗೆ ಭವ್ಯ ಆಚರಣೆ.",
        "image": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80",
        "activity_date": "2026-11-01",
        "tag_en": "Heritage Celebration",
        "tag_kn": "ರಾಜ್ಯೋತ್ಸವ",
        "icon": "Flag",
        "is_active": True
    }
]

INITIAL_GALLERY = [
    {
        "title_en": "Dollu Kunitha Folk Performance",
        "title_kn": "ಡೊಳ್ಳು ಕುಣಿತ ಜಾನಪದ ಪ್ರದರ್ಶನ",
        "desc_en": "Mesmerizing thunderous beats by folk artists across the Acharya campus grounds.",
        "desc_kn": "ಆಚಾರ್ಯ ಆವರಣದಲ್ಲಿ ಜಾನಪದ ಕಲಾವಿದರ ಅದ್ಭುತ ಡೊಳ್ಳು ಕುಣಿತ.",
        "image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
        "event_date": "2026-11-01"
    },
    {
        "title_en": "Classical Bharatanatyam Stage",
        "title_kn": "ಶಾಸ್ತ್ರೀಯ ಭರತನಾಟ್ಯ ವೇದಿಕೆ",
        "desc_en": "Enthralling classical dance performances by talented student artists.",
        "desc_kn": "ಪ್ರತಿಭಾವಂತ ವಿದ್ಯಾರ್ಥಿ ಕಲಾವಿದರಿಂದ ಶಾಸ್ತ್ರೀಯ ಭರತನಾಟ್ಯ ಪ್ರಸ್ತುತಿ.",
        "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
        "event_date": "2026-11-02"
    },
    {
        "title_en": "Yakshagana Coastal Theatre",
        "title_kn": "ಕರಾವಳಿಯ ಯಕ್ಷಗಾನ ವೈಭವ",
        "desc_en": "Vibrant theatrical narration of historical epics with traditional grand makeup.",
        "desc_kn": "ಪೌರಾಣಿಕ ಪ್ರಸಂಗಗಳ ಭವ್ಯ ರಂಗುರಂಗಿನ ಯಕ್ಷಗಾನ ನಾಟಕ ಪ್ರದರ್ಶನ.",
        "image": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=800&q=80",
        "event_date": "2026-11-03"
    }
]

INITIAL_REELS = [
    {
        "type": "reel",
        "url": "https://www.instagram.com/reel/DO0nSDlD3hT/",
        "likes": "1,420",
        "description": "Looking for passionate volunteers & cultural performers! Catch the rehearsal energy, stage preparations, and vibrant spirit of Acharya Kannada Vedike. Tap to watch the full reel! 🎭✨ #AcharyaKannadaVedike #Nuditaranga #CampusLife",
        "cover_image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=80",
        "views": "18.5K",
        "comments": "68",
        "is_active": True
    },
    {
        "type": "reel",
        "url": "https://www.instagram.com/reel/DBDFM2sCYBH/",
        "likes": "2,180",
        "description": "Grand Nuditaranga cultural festival celebrations on the main Acharya stadium stage! Unmatched euphoria and youth passion. 🚩🔥 #Nuditaranga2026 #Rajyotsava #AKV",
        "cover_image": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=700&q=80",
        "views": "27.3K",
        "comments": "142",
        "is_active": True
    },
    {
        "type": "reel",
        "url": "https://www.instagram.com/reel/DEzA7hJo3HS/",
        "likes": "1,890",
        "description": "Thunderous beats of traditional Dollu Kunitha and Veeragase folk dance echoing across Acharya campus! Pure cultural pride. 🥁💛❤️ #DolluKunitha #Veeragase #AcharyaInstitutes",
        "cover_image": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=700&q=80",
        "views": "22.1K",
        "comments": "98",
        "is_active": True
    }
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed events
        existing_count = db.query(Event).count()
        if existing_count == 0 and len(INITIAL_EVENTS) > 0:
            print(f"Seeding {len(INITIAL_EVENTS)} Nuditaranga 2026 events...")
            for ev in INITIAL_EVENTS:
                db_event = Event(**ev)
                db.add(db_event)
            db.commit()
            print("Events successfully seeded!")

        # Seed activities
        act_count = db.query(Activity).count()
        if act_count == 0 and len(INITIAL_ACTIVITIES) > 0:
            print(f"Seeding {len(INITIAL_ACTIVITIES)} initial activities...")
            for act in INITIAL_ACTIVITIES:
                db_act = Activity(**act)
                db.add(db_act)
            db.commit()
            print("Activities successfully seeded!")

        # Seed gallery
        gal_count = db.query(GalleryItem).count()
        if gal_count == 0 and len(INITIAL_GALLERY) > 0:
            print(f"Seeding {len(INITIAL_GALLERY)} initial gallery items...")
            for gal in INITIAL_GALLERY:
                db_gal = GalleryItem(**gal)
                db.add(db_gal)
            db.commit()
            print("Gallery successfully seeded!")

        # Seed reels
        reel_count = db.query(SocialPost).count()
        if reel_count == 0 and len(INITIAL_REELS) > 0:
            print(f"Seeding {len(INITIAL_REELS)} initial reels...")
            for r in INITIAL_REELS:
                db_reel = SocialPost(**r)
                db.add(db_reel)
            db.commit()
            print("Reels successfully seeded!")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

