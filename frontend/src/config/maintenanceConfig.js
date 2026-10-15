/**
 * Acharya Kannada Vedike • Nuditaranga 2026
 * Maintenance Mode Configuration
 * 
 * Safely controls scheduled website maintenance without altering or harming
 * any database records, portal logic, or server infrastructure.
 */

export const MAINTENANCE_CONFIG = {
  // Master toggle: set to true to display the Maintenance Screen across all visitor routes
  enabled: true,

  // Scheduled end time of maintenance: 10:00 AM on 16th October 2026 (IST)
  endTime: "2026-10-16T10:00:00+05:30",

  // Localized Titles
  titleKn: "ವೆಬ್‌ಸೈಟ್ ನಿರ್ವಹಣೆಯಲ್ಲಿದೆ",
  titleEn: "Website & Portal Down for Maintenance",
  subtitleKn: "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ • ನುಡಿತರಂಗ ೨೦೨೬",
  subtitleEn: "Acharya Kannada Vedike • Nuditaranga 2026",

  // Localized Messages
  messageKn: "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ ನುಡಿತರಂಗ ೨೦೨೬ ರ ವೆಬ್‌ಸೈಟ್ ಹಾಗೂ ಪೋರ್ಟಲ್ ಸರ್ವರ್‌ಗಳನ್ನು ಸುಧಾರಿತ ನಿರ್ವಹಣಾ ಕಾರ್ಯಗಳಿಗಾಗಿ ಕೆಲವೇ ಗಂಟೆಗಳ ಕಾಲ ತಾತ್ಕಾಲಿಕವಾಗಿ ಸ್ಥಗಿತಗೊಳಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ನಾಳೆ ಬೆಳಿಗ್ಗೆ ೧೦:೦೦ AM (೧೬ ಅಕ್ಟೋಬರ್ ೨೦೨೬) ನಂತರ ಭೇಟಿ ನೀಡಿ.",
  messageEn: "The AKV Nuditaranga 2026 website and portal servers are currently down for scheduled maintenance and system optimization. Please check back after 10:00 AM tomorrow morning (16th October 2026).",

  // Safety assurance
  safetyNoteKn: "ನಿಮ್ಮ ವಿದ್ಯಾರ್ಥಿ ಖಾತೆಗಳು, ನೋಂದಣಿಗಳು, ಹಾಜರಾತಿ ಹಾಗೂ ಎಲ್ಲಾ ಡೇಟಾಗಳು ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತವಾಗಿವೆ.",
  safetyNoteEn: "Your student accounts, event registrations, attendance records, and festival data remain completely safe and securely preserved in our database.",

  // Secret passcode for authorized staff/coordinators/developers to bypass the screen
  bypassPasscode: "akv2026dev",

  // Official contact information for urgent queries
  supportEmail: "akv@acharya.ac.in",
  emergencyPhone: "+91 94498 90035",
  officerName: "Mr. Tejas K (Cultural Officer)"
};

/**
 * Checks if maintenance mode is active right now.
 * Returns true if maintenance is enabled and current time has not passed the scheduled resume time,
 * unless a developer bypass token is present.
 */
export function isMaintenanceModeActive() {
  if (!MAINTENANCE_CONFIG.enabled) return false;

  // Auto-expire when scheduled resume time has arrived
  try {
    const resumeTimestamp = new Date(MAINTENANCE_CONFIG.endTime).getTime();
    const now = Date.now();
    if (!isNaN(resumeTimestamp) && now >= resumeTimestamp) {
      return false;
    }
  } catch (e) {
    // If parse error occurs, respect the enabled flag
  }

  // Developer / Coordinator bypass check
  if (typeof window !== "undefined") {
    // Check if bypass token is saved in localStorage
    if (localStorage.getItem("akv_maintenance_bypass") === "granted") {
      return false;
    }

    // Check if bypass query param is in URL: ?bypass=akv2026dev or ?bypass=akv2026
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const queryBypass = searchParams.get("bypass");
      if (queryBypass === MAINTENANCE_CONFIG.bypassPasscode || queryBypass === "akv2026") {
        localStorage.setItem("akv_maintenance_bypass", "granted");
        return false;
      }
    } catch (e) {
      // ignore URL parsing error
    }
  }

  return true;
}
