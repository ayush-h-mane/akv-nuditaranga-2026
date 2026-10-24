export const initialEvents = [
  {
    "id": "AKV-NT-REEL",
    "title_en": "Reel Contest",
    "title_kn": "ರೀಲ್ ಸ್ಪರ್ಧೆ (Reel Contest)",
    "category": "cultural",
    "category_kn": "ಸಾಂಸ್ಕೃತಿಕ",
    "description_en": "Create captivating short video reels celebrating Karnataka heritage, Kannada culture, and vibrant Nuditaranga fest moments. Upload to Instagram and submit your profile link and username.",
    "description_kn": "ಕರ್ನಾಟಕದ ಸಾಂಸ್ಕೃತಿಕ ಪರಂಪರೆ, ಕನ್ನಡ ನುಡಿ ಮತ್ತು ನುಡಿತರಂಗ ಹಬ್ಬದ ರೋಮಾಂಚಕ ಕ್ಷಣಗಳನ್ನು ಬಿಂಬಿಸುವ ಸೃಜನಾತ್ಮಕ ಕಿರು ವಿಡಿಯೋ ರೀಲ್ಸ್ ಸ್ಪರ್ಧೆ.",
    "is_team": false,
    "format": "solo",
    "min_team_size": 1,
    "max_team_size": 1,
    "max_slots": 100,
    "registered_count": 0,
    "venue": "Acharya Campus / Instagram",
    "venue_kn": "ಆಚಾರ್ಯ ಆವರಣ / ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್",
    "event_date": "04-11-2026",
    "event_time": "10:00 AM - 05:00 PM",
    "reporting_time": "09:30 AM",
    "rules_en": "1. Reel must be original and celebrate Kannada culture, heritage, or AKV Nuditaranga fest vibes.\n2. Participants must provide their active Instagram username and public profile link.\n3. Tag @acharyakannadavedike and use #AKVNuditaranga2026 in the reel caption.\n4. Decisions of the jury will be final and binding.",
    "rules_kn": "೧. ರೀಲ್ಸ್ ಸ್ವಂತದ್ದಾಗಿರಬೇಕು ಹಾಗೂ ಕನ್ನಡ ಸಂಸ್ಕೃತಿ, ನಾಡು-ನುಡಿ ಅಥವಾ ನುಡಿತರಂಗ ಹಬ್ಬಕ್ಕೆ ಸಂಬಂಧಿಸಿರಬೇಕು.\n೨. ಸ್ಪರ್ಧಿಗಳು ತಮ್ಮ ಸಕ್ರಿಯ ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಬಳಕೆದಾರ ಹೆಸರು (Username) ಮತ್ತು ಪ್ರೊಫೈಲ್ ಲಿಂಕ್ ನೀಡುವುದು ಕಡ್ಡಾಯ.\n೩. ರೀಲ್‌ನಲ್ಲಿ @acharyakannadavedike ಟ್ಯಾಗ್ ಮಾಡಬೇಕು ಹಾಗೂ #AKVNuditaranga2026 ಹ್ಯಾಶ್‌ಟ್ಯಾಗ್ ಬಳಸಬೇಕು.\n೪. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮ.",
    "is_active": true
  }
];

export const isReelContestEvent = (eventOrId) => {
  if (!eventOrId) return false;
  if (typeof eventOrId === "object") {
    const id = (eventOrId.id || "").toLowerCase();
    const title = (eventOrId.title_en || "").toLowerCase();
    return id === "akv-nt-reel" || id.includes("reel") || title.includes("reel");
  }
  const str = String(eventOrId).toLowerCase();
  return str === "akv-nt-reel" || str.includes("reel");
};
