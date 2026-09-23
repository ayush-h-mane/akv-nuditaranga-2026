from .database import SessionLocal, engine, Base
from .models import Event, Registration, Activity
import datetime
import json

INITIAL_EVENTS = [
    # Initial competition events list cleared as requested.
    # Add new event definitions here or via the Admin Portal whenever ready.
]

INITIAL_ACTIVITIES = [
    {
        "category": "nuditaranga",
        "title_en": "Nuditaranga Annual Inter-College Fest",
        "title_kn": "ನುಡಿತರಂಗ ವಾರ್ಷಿಕ ಸಾಂಸ್ಕೃತಿಕ ಹಬ್ಬ",
        "desc_en": "Flagship cultural extravaganza with over 25+ events spanning literature, classical singing, folk dances, rangoli, and street theatre.",
        "desc_kn": "ಸಾಹಿತ್ಯ, ಸುಗಮ ಸಂಗೀತ, ಜಾನಪದ ನೃತ್ಯ, ರಂಗೋಲಿ ಮತ್ತು ಬೀದಿ ನಾಟಕಗಳನ್ನೊಳಗೊಂಡ ೨೫ಕ್ಕೂ ಹೆಚ್ಚು ಸ್ಪರ್ಧೆಗಳ ಮಹಾಸಂಗಮ.",
        "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
        "tag_en": "Cultural Fest",
        "tag_kn": "ವಾರ್ಷಿಕ ಹಬ್ಬ",
        "icon": "Music",
        "is_active": True
    }
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_count = db.query(Event).count()
        if existing_count == 0 and len(INITIAL_EVENTS) > 0:
            print(f"Seeding {len(INITIAL_EVENTS)} Nuditaranga 2026 events...")
            for ev in INITIAL_EVENTS:
                db_event = Event(**ev)
                db.add(db_event)
            db.commit()
            print("Events successfully seeded!")
        else:
            print(f"Database contains {existing_count} events. Skipping event seed.")

        # Seed activities
        act_count = db.query(Activity).count()
        if act_count == 0 and len(INITIAL_ACTIVITIES) > 0:
            print(f"Seeding {len(INITIAL_ACTIVITIES)} initial activity (Nuditaranga)...")
            for act in INITIAL_ACTIVITIES:
                db_act = Activity(**act)
                db.add(db_act)
            db.commit()
            print("Activities successfully seeded!")
        else:
            print(f"Database contains {act_count} activities.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
