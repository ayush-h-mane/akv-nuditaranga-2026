from .database import SessionLocal, engine, Base
from .models import Event, Registration, Activity, GalleryItem, SocialPost, AuditLog
import os
import datetime
import json

INITIAL_EVENTS = [
    {
        'id': 'AKV-NT-REEL',
        'title_en': 'Reel Contest',
        'title_kn': 'ರೀಲ್ ಸ್ಪರ್ಧೆ (Reel Contest)',
        'category': 'social_media',
        'category_kn': 'ಸೋಷಿಯಲ್ ಮೀಡಿಯಾ',
        'description_en': 'Create captivating short video reels celebrating Karnataka heritage, Kannada culture, and vibrant Nuditaranga fest moments. Upload to Instagram and submit your profile link and username.',
        'description_kn': 'ಕರ್ನಾಟಕದ ಸಾಂಸ್ಕೃತಿಕ ಪರಂಪರೆ, ಕನ್ನಡ ನುಡಿ ಮತ್ತು ನುಡಿತರಂಗ ಹಬ್ಬದ ರೋಮಾಂಚಕ ಕ್ಷಣಗಳನ್ನು ಬಿಂಬಿಸುವ ಸೃಜನಾತ್ಮಕ ಕಿರು ವಿಡಿಯೋ ರೀಲ್ಸ್ ಸ್ಪರ್ಧೆ.',
        'is_team': False,
        'format': 'solo',
        'min_team_size': 1,
        'max_team_size': 1,
        'max_slots': 100,
        'registered_count': 0,
        'venue': 'Acharya Campus / Instagram',
        'venue_kn': 'ಆಚಾರ್ಯ ಆವರಣ / ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್',
        'event_date': '04-11-2026',
        'event_time': '10:00 AM - 05:00 PM',
        'reporting_time': '09:30 AM',
        'rules_en': '1. Reel must be original and celebrate Kannada culture, heritage, or AKV Nuditaranga fest vibes.\n2. Participants must provide their active Instagram username and public profile link.\n3. Tag @acharyakannadavedike and use #AKVNuditaranga2026 in the reel caption.\n4. Decisions of the jury will be final and binding.',
        'rules_kn': '೧. ರೀಲ್ಸ್ ಸ್ವಂತದ್ದಾಗಿರಬೇಕು ಹಾಗೂ ಕನ್ನಡ ಸಂಸ್ಕೃತಿ, ನಾಡು-ನುಡಿ ಅಥವಾ ನುಡಿತರಂಗ ಹಬ್ಬಕ್ಕೆ ಸಂಬಂಧಿಸಿರಬೇಕು.\n೨. ಸ್ಪರ್ಧಿಗಳು ತಮ್ಮ ಸಕ್ರಿಯ ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಬಳಕೆದಾರ ಹೆಸರು (Username) ಮತ್ತು ಪ್ರೊಫೈಲ್ ಲಿಂಕ್ ನೀಡುವುದು ಕಡ್ಡಾಯ.\n೩. ರೀಲ್‌ನಲ್ಲಿ @acharyakannadavedike ಟ್ಯಾಗ್ ಮಾಡಬೇಕು ಹಾಗೂ #AKVNuditaranga2026 ಹ್ಯಾಶ್‌ಟ್ಯಾಗ್ ಬಳಸಬೇಕು.\n೪. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮ.',
        'is_active': True,
    },
]


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

_SEEDING_DONE = False

def seed_database():
    global _SEEDING_DONE
    if _SEEDING_DONE:
        return
    if os.environ.get("VERCEL"):
        _SEEDING_DONE = True
        return

    # Check if database tables already exist before invoking heavy metadata create_all
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        if not inspector.has_table("events") or not inspector.has_table("users"):
            Base.metadata.create_all(bind=engine)
    except Exception:
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed events: single batch query for all existing event IDs, skipping deleted ones
        existing_event_ids = {r[0].upper() for r in db.query(Event.id).all() if r[0]}
        deleted_eids = {
            r[0].upper()
            for r in db.query(AuditLog.target_id)
            .filter(AuditLog.action == "EVENT_DELETED", AuditLog.target_type == "EVENT")
            .all()
            if r[0]
        }
        missing_events = [
            ev for ev in INITIAL_EVENTS
            if ev["id"].upper() not in existing_event_ids
            and ev["id"].upper() not in deleted_eids
        ]
        if missing_events:
            for ev in missing_events:
                db.add(Event(**ev))
            db.commit()
            print(f"Seeded {len(missing_events)} missing Nuditaranga 2026 events into database!")

        # Seed activities using fast presence check
        has_activities = db.query(Activity.id).first() is not None
        if not has_activities and len(INITIAL_ACTIVITIES) > 0:
            print(f"Seeding {len(INITIAL_ACTIVITIES)} initial activities...")
            for act in INITIAL_ACTIVITIES:
                db.add(Activity(**act))
            db.commit()
            print("Activities successfully seeded!")

        # Seed gallery using fast presence check
        has_gallery = db.query(GalleryItem.id).first() is not None
        if not has_gallery and len(INITIAL_GALLERY) > 0:
            print(f"Seeding {len(INITIAL_GALLERY)} initial gallery items...")
            for gal in INITIAL_GALLERY:
                db.add(GalleryItem(**gal))
            db.commit()
            print("Gallery successfully seeded!")

        # Seed reels using fast presence check
        has_reels = db.query(SocialPost.id).first() is not None
        if not has_reels and len(INITIAL_REELS) > 0:
            print(f"Seeding {len(INITIAL_REELS)} initial reels...")
            for r in INITIAL_REELS:
                db.add(SocialPost(**r))
            db.commit()
            print("Reels successfully seeded!")
            
        # Seed festival event dates using fast presence check
        from .models import FestivalEventDate
        has_dates = db.query(FestivalEventDate.id).first() is not None
        if not has_dates:
            initial_dates = [
                {"date": "2026-09-28", "label": "Day 1 (28/09/2026) - Inauguration & Literary"},
                {"date": "2026-09-29", "label": "Day 2 (29/09/2026) - Traditional Arts & Rangoli"},
                {"date": "2026-09-30", "label": "Day 3 (30/09/2026) - Folk Music & Drama"},
                {"date": "2026-10-01", "label": "Day 4 (01/10/2026) - Classical Dance & Competitions"},
                {"date": "2026-10-02", "label": "Day 5 (02/10/2026) - Grand Finale & Valedictory"},
            ]
            print(f"Seeding {len(initial_dates)} festival event dates...")
            for d in initial_dates:
                db.add(FestivalEventDate(**d))
            db.commit()
            print("Festival event dates successfully seeded!")

        _SEEDING_DONE = True
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

