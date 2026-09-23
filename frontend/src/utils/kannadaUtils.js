/**
 * Kannada Localization Utilities
 * Formats dates, times, venues, statuses, and numerals into natural Kannada.
 */

const KANNADA_DIGITS = ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"];

/**
 * Converts Latin digits (0-9) to Kannada digits (೦-೯)
 */
export const toKannadaDigits = (input) => {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (d) => KANNADA_DIGITS[Number(d)]);
};

const MONTH_MAP = {
  january: "ಜನವರಿ",
  jan: "ಜನವರಿ",
  february: "ಫೆಬ್ರವರಿ",
  feb: "ಫೆಬ್ರವರಿ",
  march: "ಮಾರ್ಚ್",
  mar: "ಮಾರ್ಚ್",
  april: "ಏಪ್ರಿಲ್",
  apr: "ಏಪ್ರಿಲ್",
  may: "ಮೇ",
  june: "ಜೂನ್",
  jun: "ಜೂನ್",
  july: "ಜುಲೈ",
  jul: "ಜುಲೈ",
  august: "ಆಗಸ್ಟ್",
  aug: "ಆಗಸ್ಟ್",
  september: "ಸೆಪ್ಟೆಂಬರ್",
  sep: "ಸೆಪ್ಟೆಂಬರ್",
  sept: "ಸೆಪ್ಟೆಂಬರ್",
  october: "ಅಕ್ಟೋಬರ್",
  oct: "ಅಕ್ಟೋಬರ್",
  november: "ನವೆಂಬರ್",
  nov: "ನವೆಂಬರ್",
  december: "ಡಿಸೆಂಬರ್",
  dec: "ಡಿಸೆಂಬರ್",
};

/**
 * Converts English dates into Kannada
 * e.g. "March 27, 2026" -> "ಮಾರ್ಚ್ ೨೭, ೨೦೨೬"
 * e.g. "30/10/2026" -> "೩೦/೧೦/೨೦೨೬"
 * e.g. "March 2026" -> "ಮಾರ್ಚ್ ೨೦೨೬"
 */
export const formatKannadaDate = (dateStr) => {
  if (!dateStr) return "";
  let result = String(dateStr);

  // Replace month names (case-insensitive)
  Object.entries(MONTH_MAP).forEach(([enMonth, knMonth]) => {
    const regex = new RegExp(`\\b${enMonth}\\b`, "gi");
    result = result.replace(regex, knMonth);
  });

  // Common date word replacements
  result = result
    .replace(/\bday\b/gi, "ದಿನ")
    .replace(/\bdays\b/gi, "ದಿನಗಳು")
    .replace(/\bat\b/gi, "")
    .replace(/\bto\b/gi, "ರಿಂದ");

  // Convert all numbers to Kannada numerals
  return toKannadaDigits(result);
};

/**
 * Converts English times into Kannada
 * e.g. "9:00 AM Onwards" -> "ಬೆಳಿಗ್ಗೆ ೦೯:೦೦ ರಿಂದ"
 * e.g. "10:00 AM - 12:00 PM" -> "ಬೆಳಿಗ್ಗೆ ೧೦:೦೦ - ಮಧ್ಯಾಹ್ನ ೧೨:೦೦"
 * e.g. "30 mins prior" -> "೩೦ ನಿಮಿಷ ಮುಂಚಿತವಾಗಿ"
 * e.g. "Morning Session" -> "ಬೆಳಗಿನ ಅವಧಿ"
 */
export const formatKannadaTime = (timeStr) => {
  if (!timeStr) return "";
  let result = String(timeStr);

  // Common phrases
  if (/morning session/i.test(result)) return "ಬೆಳಗಿನ ಅವಧಿ";
  if (/afternoon session/i.test(result)) return "ಮಧ್ಯಾಹ್ನದ ಅವಧಿ";
  if (/evening session/i.test(result)) return "ಸಂಜೆಯ ಅವಧಿ";
  if (/(\d+)\s*mins?\s*prior/i.test(result)) {
    const match = result.match(/(\d+)/);
    const mins = match ? toKannadaDigits(match[1]) : "೩೦";
    return `${mins} ನಿಮಿಷ ಮುಂಚಿತವಾಗಿ`;
  }

  // Handle "9:00 AM Onwards" or similar
  result = result
    .replace(/onwards/gi, "ರಿಂದ")
    .replace(/am/gi, "ಬೆಳಿಗ್ಗೆ")
    .replace(/pm/gi, "ಸಂಜೆ");

  // If format is like "12:00 PM", PM can be afternoon (ಮಧ್ಯಾಹ್ನ) or evening (ಸಂಜೆ)
  result = result.replace(/12:(\d+)\s*ಸಂಜೆ/gi, "ಮಧ್ಯಾಹ್ನ ೧೨:$1");
  result = result.replace(/0?1:(\d+)\s*ಸಂಜೆ/gi, "ಮಧ್ಯಾಹ್ನ ೦೧:$1");
  result = result.replace(/0?2:(\d+)\s*ಸಂಜೆ/gi, "ಮಧ್ಯಾಹ್ನ ೦೨:$1");
  result = result.replace(/0?3:(\d+)\s*ಸಂಜೆ/gi, "ಮಧ್ಯಾಹ್ನ ೦೩:$1");

  // If pattern is "10:00 ಬೆಳಿಗ್ಗೆ", rearrange to "ಬೆಳಿಗ್ಗೆ ೧೦:೦೦"
  result = result.replace(/(\d{1,2}:\d{2})\s*(ಬೆಳಿಗ್ಗೆ|ಮಧ್ಯಾಹ್ನ|ಸಂಜೆ)/g, "$2 $1");

  return toKannadaDigits(result);
};

const VENUE_MAP = {
  "Acharya Basket Ball Court": "ಆಚಾರ್ಯ ಬ್ಯಾಸ್ಕೆಟ್‌ಬಾಲ್ ಮೈದಾನ",
  "Mechanical Seminar Hall": "ಮೆಕ್ಯಾನಿಕಲ್ ಸೆಮಿನಾರ್ ಹಾಲ್",
  "Oya Junction": "ಓಯಾ ಜಂಕ್ಷನ್",
  "Acharya Campus": "ಆಚಾರ್ಯ ಆವರಣ",
  "Acharya Campus, Bengaluru": "ಆಚಾರ್ಯ ಆವರಣ, ಬೆಂಗಳೂರು",
  "Seminar Hall 1, Acharya IT": "ಸೆಮಿನಾರ್ ಹಾಲ್ ೧, ಆಚಾರ್ಯ ಐ.ಟಿ",
  "Seminar Hall 1": "ಸೆಮಿನಾರ್ ಹಾಲ್ ೧",
  "Seminar Hall 2": "ಸೆಮಿನಾರ್ ಹಾಲ್ ೨",
  "Seminar Hall": "ಸೆಮಿನಾರ್ ಹಾಲ್",
  "Open Air Theatre": "ಬಯಲು ರಂಗಮಂದಿರ",
  "Main Auditorium": "ಮುಖ್ಯ ಸಭಾಂಗಣ",
  "Main Stage": "ಮುಖ್ಯ ವೇದಿಕೆ",
  "Central Library": "ಕೇಂದ್ರ ಗ್ರಂಥಾಲಯ",
  "Sports Ground": "ಕ್ರೀಡಾಂಗಣ",
  "Amphitheatre & Auditoriums": "ಬಯಲು ರಂಗಮಂದಿರ & ಆಡಿಟೋರಿಯಂಗಳು",
};

/**
 * Converts English venue/place names into Kannada
 */
export const formatKannadaVenue = (venueStr) => {
  if (!venueStr) return "ಆಚಾರ್ಯ ಆವರಣ";
  const trimmed = venueStr.trim();
  if (VENUE_MAP[trimmed]) return VENUE_MAP[trimmed];

  let result = trimmed;
  Object.entries(VENUE_MAP).forEach(([en, kn]) => {
    result = result.replace(new RegExp(en, "gi"), kn);
  });

  return toKannadaDigits(result);
};

const STATUS_MAP = {
  "confirmed": "ದೃಢೀಕೃತ",
  "checked in": "ಹಾಜರಾಗಿದ್ದಾರೆ",
  "pending": "ಬಾಕಿ ಇದೆ",
  "registered": "ನೋಂದಾಯಿಸಲಾಗಿದೆ",
  "cancelled": "ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ",
};

/**
 * Converts registration status into Kannada
 */
export const formatKannadaStatus = (statusStr) => {
  if (!statusStr) return "";
  const key = String(statusStr).toLowerCase().trim();
  return STATUS_MAP[key] || statusStr;
};

/**
 * Localizes numbers or counters (e.g. 1500+ -> ೧೫೦೦+)
 */
export const formatKannadaNumber = (val) => {
  if (val === null || val === undefined) return "";
  return toKannadaDigits(val);
};
