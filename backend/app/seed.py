from .database import SessionLocal, engine, Base
from .models import Event, Registration, Activity
import datetime
import json

INITIAL_EVENTS = [
    {
        "id": "AKV-NT-01",
        "title_en": "Kala Ranga",
        "title_kn": "ಕಲಾ ರಂಗ",
        "category": "traditional",
        "category_kn": "ಜಾನಪದ & ಸಾಂಪ್ರದಾಯಿಕ",
        "description_en": "It is an open stage event where participant can show case their talent in any form.",
        "description_kn": "ಇದು ಮುಕ್ತ ವೇದಿಕೆಯ ಕಾರ್ಯಕ್ರಮವಾಗಿದ್ದು, ಇದರಲ್ಲಿ ಭಾಗವಹಿಸುವವರು ತಮ್ಮ ಪ್ರತಿಭೆಯನ್ನು ಯಾವುದೇ ರೂಪದಲ್ಲಿ ಪ್ರದರ್ಶಿಸಬಹುದು.",
        "is_team": True,
        "min_team_size": 2,
        "max_team_size": 20,
        "max_slots": 50,
        "registered_count": 0,
        "venue": "Oya junction",
        "venue_kn": "ಓಯಾ ಜಂಕ್ಷನ್",
        "event_date": "02-11-2026",
        "event_time": "02:00 PM",
        "reporting_time": "01:30 PM",
        "rules_en": "1. Follow all instructions given by event coordinators.\n2. Decisions of the judges will be final and binding.\n3. Originality and cultural authenticity are prioritized.",
        "rules_kn": "೧. ಆಯೋಜಕರ ಸೂಚನೆಗಳನ್ನು ಕಡ್ಡಾಯವಾಗಿ ಪಾಲಿಸಬೇಕು.\n೨. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮವಾಗಿರುತ್ತದೆ.\n೩. ಕನ್ನಡತನ, ಸಂಸ್ಕೃತಿ ಮತ್ತು ಸ್ವಂತಿಕೆಗೆ ಆದ್ಯತೆ ನೀಡಲಾಗುವುದು.",
        "format": "solo",
        "is_active": True
    },
    {
        "id": "AKV-NT-02",
        "title_en": "Yakshagana & Drama",
        "title_kn": "ಯಕ್ಷಗಾನ ಮತ್ತು ನಾಟಕ",
        "category": "cultural",
        "category_kn": "ಸಾಂಸ್ಕೃತಿಕ",
        "description_en": "Traditional coastal Karnataka theatrical dance performance",
        "description_kn": "ಕರಾವಳಿ ಕರ್ನಾಟಕದ ಪಾರಂಪರಿಕ ನೃತ್ಯ ನಾಟಕ",
        "is_team": False,
        "min_team_size": 1,
        "max_team_size": 15,
        "max_slots": 30,
        "registered_count": 0,
        "venue": "Open Air Theatre, Acharya",
        "venue_kn": "ಬಯಲು ರಂಗಮಂದಿರ, ಆಚಾರ್ಯ",
        "event_date": "November 02, 2026",
        "event_time": "02:00 PM - 05:00 PM",
        "reporting_time": "01:30 PM",
        "rules_en": "1. Max 15 members per troupe.",
        "rules_kn": "೧. ಪ್ರತಿ ತಂಡಕ್ಕೆ ಗರಿಷ್ಠ ೧೫ ಸದಸ್ಯರು.",
        "format": "group",
        "is_active": True
    }
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
