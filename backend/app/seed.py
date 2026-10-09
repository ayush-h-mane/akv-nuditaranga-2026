from .database import SessionLocal, engine, Base
from .models import Event, Registration, Activity, GalleryItem, SocialPost
import datetime
import json

INITIAL_EVENTS = [
    {
        "id": "AKV-NT-01",
        "title_en": "Kala Ranga (Group Talent Showcase)",
        "title_kn": "ಕಲಾ ರಂಗ (ತಂಡ ಪ್ರದರ್ಶನ)",
        "description_en": "An open stage cultural event where troupes can showcase Karnataka folk and contemporary stage arts.",
        "description_kn": "ತಂಡಗಳು ಕರ್ನಾಟಕದ ಜಾನಪದ ಹಾಗೂ ಸಾಂಪ್ರದಾಯಿಕ ಕಲೆಗಳನ್ನು ಪ್ರದರ್ಶಿಸುವ ಮುಕ್ತ ವೇದಿಕೆಯ ಕಾರ್ಯಕ್ರಮ.",
        "category": "traditional",
        "category_kn": "ಜಾನಪದ & ಸಾಂಪ್ರದಾಯಿಕ",
        "event_date": "02-11-2026",
        "event_time": "02:00 PM",
        "reporting_time": "01:30 PM",
        "venue": "Oya Junction, Acharya Campus",
        "venue_kn": "ಓಯಾ ಜಂಕ್ಷನ್, ಆಚಾರ್ಯ ಆವರಣ",
        "format": "group",
        "is_team": True,
        "min_team_size": 2,
        "max_team_size": 20,
        "max_slots": 50,
        "registered_count": 4,
        "is_active": True,
        "rules_en": "1. Follow all instructions given by event coordinators.\n2. Decisions of the judges will be final and binding.\n3. Originality and cultural authenticity are prioritized.",
        "rules_kn": "೧. ಆಯೋಜಕರ ಸೂಚನೆಗಳನ್ನು ಕಡ್ಡಾಯವಾಗಿ ಪಾಲಿಸಬೇಕು.\n೨. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮವಾಗಿರುತ್ತದೆ.\n೩. ಕನ್ನಡತನ, ಸಂಸ್ಕೃತಿ ಮತ್ತು ಸ್ವಂತಿಕೆಗೆ ಆದ್ಯತೆ ನೀಡಲಾಗುವುದು."
    },
    {
        "id": "AKV-NT-02",
        "title_en": "Yakshagana & Drama Troupe",
        "title_kn": "ಯಕ್ಷಗಾನ ಮತ್ತು ನಾಟಕ ತಂಡ",
        "description_en": "Traditional coastal Karnataka theatrical dance drama and street play performances.",
        "description_kn": "ಕರಾವಳಿ ಕರ್ನಾಟಕದ ಪಾರಂಪರಿಕ ಯಕ್ಷಗಾನ ನೃತ್ಯ ನಾಟಕ ಮತ್ತು ಬೀದಿ ನಾಟಕ ಪ್ರದರ್ಶನ.",
        "category": "cultural",
        "category_kn": "ಸಾಂಸ್ಕೃತಿಕ",
        "event_date": "02-11-2026",
        "event_time": "02:00 PM - 05:00 PM",
        "reporting_time": "01:30 PM",
        "venue": "Open Air Theatre, Acharya",
        "venue_kn": "ಬಯಲು ರಂಗಮಂದಿರ, ಆಚಾರ್ಯ",
        "format": "group",
        "is_team": True,
        "min_team_size": 3,
        "max_team_size": 15,
        "max_slots": 30,
        "registered_count": 0,
        "is_active": True,
        "rules_en": "1. 3 to 15 members per troupe.\n2. Max performance duration: 15 minutes.\n3. Costumes and make-up must reflect traditional authenticity.",
        "rules_kn": "೧. ಪ್ರತಿ ತಂಡಕ್ಕೆ ೩ ರಿಂದ ೧೫ ಸದಸ್ಯರು.\n೨. ಗರಿಷ್ಠ ಪ್ರದರ್ಶನ ಸಮಯ: ೧೫ ನಿಮಿಷಗಳು.\n೩. ವೇಷಭೂಷಣ ಮತ್ತು ರಂಗಸಜ್ಜಿಕೆ ಪಾರಂಪರಿಕ ಶೈಲಿಯಲ್ಲಿರಬೇಕು."
    },
    {
        "id": "AKV-NT-03",
        "title_en": "Bhavageethe & Janapada (Solo Singing)",
        "title_kn": "ಭಾವಗೀತೆ & ಜನಪದ ಗೀತೆ (ಏಕವ್ಯಕ್ತಿ ಗಾಯನ)",
        "description_en": "Solo vocal competition celebrating timeless Kannada poets (Da.Ra.Bendre, Kuvempu, KSNA) and folk melodies.",
        "description_kn": "ಕನ್ನಡದ ಕವಿವರೇಣ್ಯರ ಕವಿತೆಗಳು ಮತ್ತು ಜನಪದ ಗೀತೆಗಳ ಸುಮಧುರ ಏಕವ್ಯಕ್ತಿ ಗಾಯನ ಸ್ಪರ್ಧೆ.",
        "category": "cultural",
        "category_kn": "ಸಾಂಸ್ಕೃತಿಕ & ಸಂಗೀತ",
        "event_date": "03-11-2026",
        "event_time": "10:30 AM - 01:30 PM",
        "reporting_time": "10:00 AM",
        "venue": "Seminar Hall 1, Acharya IT",
        "venue_kn": "ಸೆಮಿನಾರ್ ಹಾಲ್ ೧, ಆಚಾರ್ಯ ಐ.ಟಿ",
        "format": "solo",
        "is_team": False,
        "min_team_size": 1,
        "max_team_size": 1,
        "max_slots": 60,
        "registered_count": 1,
        "is_active": True,
        "rules_en": "1. Individual performance only.\n2. Karaoke tracks or live acoustic instruments permitted.\n3. Song must be in Kannada.",
        "rules_kn": "೧. ವೈಯಕ್ತಿಕ ಗಾಯನ ಮಾತ್ರ.\n೨. ಕರೋಕೆ ಟ್ರ್ಯಾಕ್ ಅಥವಾ ಅಕೌಸ್ಟಿಕ್ ವಾದ್ಯ ಬಳಸಬಹುದು.\n೩. ಹಾಡು ಶುದ್ಧ ಕನ್ನಡದಲ್ಲಿರಬೇಕು."
    },
    {
        "id": "AKV-NT-04",
        "title_en": "Kavya Vachana (Poetry Recitation)",
        "title_kn": "ಕಾವ್ಯ ವಾಚನ (ಕವನ ವಾಚನ ಸ್ಪರ್ಧೆ)",
        "description_en": "Recitation of classical and modern Kannada poetry with emotive expression, meter, and diction.",
        "description_kn": "ಪಂಪ, ರನ್ನ, ಕುಮಾರವ್ಯಾಸರಿಂದ ಹಿಡಿದು ನವೋದಯ-ನವ್ಯ ಕಾಲಘಟ್ಟದ ಕನ್ನಡ ಕವನಗಳ ಸುಲಲಿತ ಕಾವ್ಯ ವಾಚನ ಸ್ಪರ್ಧೆ.",
        "category": "literary",
        "category_kn": "ಸಾಹಿತ್ಯ ಸ್ಪರ್ಧೆ",
        "event_date": "02-11-2026",
        "event_time": "11:00 AM - 01:00 PM",
        "reporting_time": "10:30 AM",
        "venue": "Centenary Hall, Acharya Campus",
        "venue_kn": "ಶತಮಾನೋತ್ಸವ ಸಭಾಂಗಣ, ಆಚಾರ್ಯ",
        "format": "solo",
        "is_team": False,
        "min_team_size": 1,
        "max_team_size": 1,
        "max_slots": 40,
        "registered_count": 3,
        "is_active": True,
        "rules_en": "1. Individual participation.\n2. Time limit: 4 minutes.\n3. Recitation must be from celebrated Kannada poets or original compositions with prior approval.",
        "rules_kn": "೧. ಏಕವ್ಯಕ್ತಿ ಸ್ಪರ್ಧೆ.\n೨. ಗರಿಷ್ಠ ಕಾಲಾವಕಾಶ: ೪ ನಿಮಿಷಗಳು.\n೩. ಕನ್ನಡದ ಖ್ಯಾತ ಕವಿಗಳ ಕವನ ಅಥವಾ ಸ್ವಂತ ಕವನವನ್ನು ವಾಚಿಸಬಹುದು."
    },
    {
        "id": "AKV-NT-05",
        "title_en": "Kannada Prabandha (Essay Writing)",
        "title_kn": "ಕನ್ನಡ ಪ್ರಬಂಧ ಸ್ಪರ್ಧೆ",
        "description_en": "On-the-spot Kannada essay writing competition testing thought clarity, linguistic depth, and cultural perspectives.",
        "description_kn": "ಕನ್ನಡ ನಾಡು-ನುಡಿ, ಸಂಸ್ಕೃತಿ ಮತ್ತು ಸಮಕಾಲೀನ ವಿಚಾರಗಳ ಕುರಿತು ಸ್ಥಳದಲ್ಲೇ ನೀಡಲಾಗುವ ವಿಷಯದ ಮೇಲೆ ಪ್ರಬಂಧ ರಚನೆ.",
        "category": "literary",
        "category_kn": "ಸಾಹಿತ್ಯ ಸ್ಪರ್ಧೆ",
        "event_date": "02-11-2026",
        "event_time": "10:00 AM - 11:30 AM",
        "reporting_time": "09:30 AM",
        "venue": "Library Auditorium, Acharya IT",
        "venue_kn": "ಗ್ರಂಥಾಲಯ ಸಭಾಂಗಣ, ಆಚಾರ್ಯ ಐ.ಟಿ",
        "format": "solo",
        "is_team": False,
        "min_team_size": 1,
        "max_team_size": 1,
        "max_slots": 60,
        "registered_count": 5,
        "is_active": True,
        "rules_en": "1. Writing sheets provided at the venue; bring your own writing instruments.\n2. Time limit: 60 minutes.\n3. Content must be strictly in Kannada script.",
        "rules_kn": "೧. ಸ್ಪರ್ಧಾ ಸ್ಥಳದಲ್ಲಿ ಹಾಳೆಗಳನ್ನು ನೀಡಲಾಗುವುದು.\n೨. ಕಾಲಮಿತಿ: ೬೦ ನಿಮಿಷಗಳು.\n೩. ಪ್ರಬಂಧವು ಶುದ್ಧ ಕನ್ನಡ ಲಿಪಿಯಲ್ಲಿರಬೇಕು."
    },
    {
        "id": "AKV-NT-06",
        "title_en": "Charcha Spardhe (Kannada Debate)",
        "title_kn": "ಕನ್ನಡ ಚರ್ಚಾ ಸ್ಪರ್ಧೆ (ವಾಗ್ವಾದ)",
        "description_en": "Spirited Kannada debate and elocution tournament on contemporary cultural and social topics.",
        "description_kn": "ಕರ್ನಾಟಕದ ಸಮಕಾಲೀನ ಸಂಸ್ಕೃತಿ, ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ಸಾಮಾಜಿಕ ವಿಚಾರಗಳ ಕುರಿತು ರೋಚಕ ಕನ್ನಡ ಚರ್ಚಾ ಸ್ಪರ್ಧೆ.",
        "category": "literary",
        "category_kn": "ಸಾಹಿತ್ಯ ಸ್ಪರ್ಧೆ",
        "event_date": "03-11-2026",
        "event_time": "02:00 PM - 04:30 PM",
        "reporting_time": "01:30 PM",
        "venue": "MBA Seminar Hall, Acharya",
        "venue_kn": "ಎಂಬಿಎ ಸೆಮಿನಾರ್ ಹಾಲ್, ಆಚಾರ್ಯ",
        "format": "solo",
        "is_team": False,
        "min_team_size": 1,
        "max_team_size": 1,
        "max_slots": 30,
        "registered_count": 2,
        "is_active": True,
        "rules_en": "1. Each participant gets 3 minutes speaking time plus 1 minute rebuttal.\n2. Strict parliamentary decorum must be maintained.\n3. Points awarded for logic, vocabulary, and eloquence.",
        "rules_kn": "೧. ಪ್ರತಿ ಸ್ಪರ್ಧಿಗೆ ೩ ನಿಮಿಷ ಭಾಷಣ ಮತ್ತು ೧ ನಿಮಿಷ ಸಮರ್ಥನೆಗೆ ಕಾಲಾವಕಾಶ.\n೨. ಸಂಸದೀಯ ಭಾಷಾ ಶೈಲಿಯನ್ನು ಕಾಪಾಡಿಕೊಳ್ಳಬೇಕು.\n೩. ತರ್ಕ, ಭಾಷಾ ಶುದ್ಧತೆ ಮತ್ತು ವಾಗ್ಮಿತ್ವಕ್ಕೆ ಅಂಕಗಳು."
    },
    {
        "id": "AKV-NT-07",
        "title_en": "Janapada Nrithya (Folk Dance Troupe)",
        "title_kn": "ಜಾನಪದ ನೃತ್ಯ (ತಂಡ ನೃತ್ಯ ಸ್ಪರ್ಧೆ)",
        "description_en": "Colorful and energetic traditional folk dance competition representing Karnataka's rich regional diversity.",
        "description_kn": "ಕರ್ನಾಟಕದ ವಿವಿಧ ಭಾಗಗಳ ಸಾಂಪ್ರದಾಯಿಕ ಜಾನಪದ ನೃತ್ಯ ಶೈಲಿಗಳ (ಡೊಳ್ಳು ಕುಣಿತ, ಕಂಸಾಳೆ, ವೀರಗಾಸೆ) ಆಕರ್ಷಕ ತಂಡ ನೃತ್ಯ.",
        "category": "traditional",
        "category_kn": "ಜಾನಪದ & ಸಾಂಪ್ರದಾಯಿಕ",
        "event_date": "03-11-2026",
        "event_time": "02:30 PM - 05:30 PM",
        "reporting_time": "02:00 PM",
        "venue": "Main Stadium Stage, Acharya",
        "venue_kn": "ಮುಖ್ಯ ಕ್ರೀಡಾಂಗಣ ವೇದಿಕೆ, ಆಚಾರ್ಯ",
        "format": "group",
        "is_team": True,
        "min_team_size": 4,
        "max_team_size": 16,
        "max_slots": 25,
        "registered_count": 4,
        "is_active": True,
        "rules_en": "1. Troupe of 4-16 dancers.\n2. Performance duration: 6-8 minutes.\n3. Traditional folk costume and authentic music tracks are required.",
        "rules_kn": "೧. ತಂಡದಲ್ಲಿ ೪ ರಿಂದ ೧೬ ನರ್ತಕರು ಇರಬೇಕು.\n೨. ಪ್ರದರ್ಶನ ಸಮಯ: ೬ ರಿಂದ ೮ ನಿಮಿಷಗಳು.\n೩. ಪಾರಂಪರಿಕ ಜಾನಪದ ಉಡುಪು ಹಾಗೂ ಹಾಡುಗಳು ಕಡ್ಡಾಯ."
    },
    {
        "id": "AKV-NT-08",
        "title_en": "Rangoli & Desi Chitra (Traditional Rangoli)",
        "title_kn": "ರಂಗೋಲಿ & ದೇಶಿ ಕಲಾ ಸ್ಪರ್ಧೆ",
        "description_en": "Exquisite traditional rangoli and cultural art design competition celebrating Karnataka motifs.",
        "description_kn": "ಕರ್ನಾಟಕದ ಪರಂಪರೆ, ಕಲೆ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಚಿಹ್ನೆಗಳನ್ನು ಬಿಂಬಿಸುವ ಮನಮೋಹಕ ವರ್ಣರಂಜಿತ ರಂಗೋಲಿ ಸ್ಪರ್ಧೆ.",
        "category": "traditional",
        "category_kn": "ಜಾನಪದ & ಸಾಂಪ್ರದಾಯಿಕ",
        "event_date": "03-11-2026",
        "event_time": "09:30 AM - 11:30 AM",
        "reporting_time": "09:00 AM",
        "venue": "Oya Corridor, Acharya Campus",
        "venue_kn": "ಓಯಾ ಕಾರಿಡಾರ್, ಆಚಾರ್ಯ",
        "format": "solo",
        "is_team": False,
        "min_team_size": 1,
        "max_team_size": 2,
        "max_slots": 50,
        "registered_count": 6,
        "is_active": True,
        "rules_en": "1. Space allocated: 4ft x 4ft.\n2. Time limit: 90 minutes.\n3. Only natural colors, rangoli powder, and flower petals are permitted.",
        "rules_kn": "೧. ನಿಗದಿಪಡಿಸಿದ ಸ್ಥಳ: ೪x೪ ಅಡಿ.\n೨. ಕಾಲಮಿತಿ: ೯೦ ನಿಮಿಷಗಳು.\n೩. ನೈಸರ್ಗಿಕ ರಂಗೋಲಿ ಪುಡಿ ಮತ್ತು ಹೂವಿನ ದಳಗಳನ್ನು ಮಾತ್ರ ಬಳಸಬೇಕು."
    },
    {
        "id": "AKV-NT-09",
        "title_en": "Kannada Prashnothari (Heritage Quiz)",
        "title_kn": "ಕನ್ನಡ ಪ್ರಶ್ನೋತ್ತರಿ (ಸಾಹಿತ್ಯ & ಇತಿಹಾಸ ರಸಪ್ರಶ್ನೆ)",
        "description_en": "Multi-round quiz testing knowledge of Karnataka history, cinema, geography, and literature.",
        "description_kn": "ಕರ್ನಾಟಕದ ಇತಿಹಾಸ, ಭೌಗೋಳಿಕತೆ, ರಾಜಕೀಯ, ಚಲನಚಿತ್ರ ಹಾಗೂ ಸಾಹಿತ್ಯ ಕ್ಷೇತ್ರದ ಜ್ಞಾನ ಪರೀಕ್ಷಿಸುವ ರೋಚಕ ರಸಪ್ರಶ್ನೆ.",
        "category": "literary",
        "category_kn": "ಸಾಹಿತ್ಯ ಸ್ಪರ್ಧೆ",
        "event_date": "04-11-2026",
        "event_time": "10:30 AM - 01:00 PM",
        "reporting_time": "10:00 AM",
        "venue": "Seminar Hall 2, Acharya IT",
        "venue_kn": "ಸೆಮಿನಾರ್ ಹಾಲ್ ೨, ಆಚಾರ್ಯ ಐ.ಟಿ",
        "format": "group",
        "is_team": True,
        "min_team_size": 2,
        "max_team_size": 2,
        "max_slots": 40,
        "registered_count": 5,
        "is_active": True,
        "rules_en": "1. Team of 2 members.\n2. Written prelims followed by top 6 teams advancing to live stage finals.\n3. Quizmaster decision is final.",
        "rules_kn": "೧. ತಂಡದಲ್ಲಿ ಇಬ್ಬರು ಸದಸ್ಯರು.\n೨. ಲಿಖಿತ ಪ್ರಾಥಮಿಕ ಸುತ್ತು ಹಾಗೂ ಅತ್ಯುತ್ತಮ ೬ ತಂಡಗಳಿಗೆ ವೇದಿಕೆ ಫೈನಲ್ಸ್.\n೩. ರಸಪ್ರಶ್ನೆ ನಿರ್ವಾಹಕರ ತೀರ್ಮಾನವೇ ಅಂತಿಮ."
    },
    {
        "id": "AKV-NT-10",
        "title_en": "Kannada Anthakshari (Musical Extravaganza)",
        "title_kn": "ಕನ್ನಡ ಅಂತಾಕ್ಷರಿ (ಸಂಗೀತ ಮಹಾಸಂಗ್ರಾಮ)",
        "description_en": "High-octane musical face-off spanning evergreen sandalwood classics, folk beats, and modern hits.",
        "description_kn": "ಹಳೆಯ ಮಧುರ ಗೀತೆಗಳಿಂದ ಇಂದಿನ ಜನಪ್ರಿಯ ಹಾಡುಗಳವರೆಗಿನ ಕನ್ನಡ ಚಿತ್ರಗೀತೆಗಳ ರೋಮಾಂಚಕ ಅಂತಾಕ್ಷರಿ ಸ್ಪರ್ಧೆ.",
        "category": "cultural",
        "category_kn": "ಸಾಂಸ್ಕೃತಿಕ & ಸಂಗೀತ",
        "event_date": "04-11-2026",
        "event_time": "02:00 PM - 04:30 PM",
        "reporting_time": "01:30 PM",
        "venue": "Open Air Amphitheatre, Acharya",
        "venue_kn": "ಬಯಲು ರಂಗಮಂದಿರ, ಆಚಾರ್ಯ",
        "format": "group",
        "is_team": True,
        "min_team_size": 2,
        "max_team_size": 3,
        "max_slots": 35,
        "registered_count": 8,
        "is_active": True,
        "rules_en": "1. Team of 2 to 3 singers.\n2. Only Kannada songs permitted.\n3. Immediate response within 15 seconds to score points.",
        "rules_kn": "೧. ತಂಡದಲ್ಲಿ ೨ ರಿಂದ ೩ ಗಾಯಕರು.\n೨. ಕನ್ನಡ ಚಿತ್ರಗೀತೆ ಅಥವಾ ಭಾವಗೀತೆಗಳನ್ನು ಮಾತ್ರ ಹಾಡಬೇಕು.\n೩. ೧೫ ಸೆಕೆಂಡುಗಳ ಒಳಗೆ ಹಾಡನ್ನು ಆರಂಭಿಸಬೇಕು."
    },
    {
        "id": "bhavageethe_solo",
        "title_en": "Bhavageethe Solo",
        "title_kn": "ಭಾವಗೀತೆ ಏಕವ್ಯಕ್ತಿ",
        "description_en": "Expressive solo singing of acclaimed Kannada Bhavageethe and classical lyrics.",
        "description_kn": "ಭಾವಪೂರ್ಣ ಕನ್ನಡ ಭಾವಗೀತೆಗಳ ಏಕವ್ಯಕ್ತಿ ಗಾಯನ ಸ್ಪರ್ಧೆ.",
        "category": "cultural",
        "category_kn": "ಸಾಂಸ್ಕೃತಿಕ",
        "event_date": "02-11-2026",
        "event_time": "10:00 AM",
        "reporting_time": "09:30 AM",
        "venue": "Acharya Campus",
        "venue_kn": "ಆಚಾರ್ಯ ಆವರಣ",
        "format": "solo",
        "is_team": False,
        "min_team_size": 1,
        "max_team_size": 1,
        "max_slots": 200,
        "registered_count": 5,
        "is_active": True,
        "rules_en": "1. Standard festival rules apply.\n2. Song must be in Kannada.\n3. Time limit: 4 minutes.",
        "rules_kn": "೧. ಮಾನಕ ಸಾಂಸ್ಕೃತಿಕ ನಿಯಮಗಳು ಅನ್ವಯಿಸುತ್ತವೆ.\n೨. ಹಾಡು ಕನ್ನಡದಲ್ಲೇ ಇರಬೇಕು.\n೩. ಕಾಲಮಿತಿ: ೪ ನಿಮಿಷಗಳು."
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
        # Seed events: insert any missing events so all standard events are present in database
        seeded_new_events = 0
        for ev in INITIAL_EVENTS:
            existing = db.query(Event).filter(Event.id == ev["id"]).first()
            if not existing:
                db_event = Event(**ev)
                db.add(db_event)
                seeded_new_events += 1
        if seeded_new_events > 0:
            db.commit()
            print(f"Seeded {seeded_new_events} missing Nuditaranga 2026 events into database!")

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
            
        # Seed festival event dates
        from .models import FestivalEventDate
        dates_count = db.query(FestivalEventDate).count()
        if dates_count == 0:
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
            
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

