import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  Bell, 
  Eye, 
  Users, 
  QrCode, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  ArrowUpRight 
} from "lucide-react";

/**
 * RoleUpdatesBanner
 * Displays dedicated, role-specific website update notifications for logged-in profiles.
 * Includes a close button and stores dismissal per role and version in localStorage.
 */
export const RoleUpdatesBanner = ({ role = "PARTICIPANT" }) => {
  const normRole = (role || "").toUpperCase();
  const roleKey = normRole.includes("SUPERADMIN") 
    ? "superadmin" 
    : normRole.includes("ADMIN") || normRole.includes("COMMITTEE")
    ? "admin"
    : normRole === "VOLUNTEER"
    ? "volunteer"
    : "participant";

  const storageKey = `akv_updates_dismissed_${roleKey}_v238`;

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch (e) {
      return false;
    }
  });

  const [showModal, setShowModal] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch (e) {}
  };

  const handleReopen = () => {
    setDismissed(false);
  };

  // Content configuration for each user profile type
  const contentMap = {
    superadmin: {
      badge: "SUPERADMIN UPDATES",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
      title: "Latest System & Superadmin Updates (v2.3.8)",
      summary: "Volunteers & Participants Directory separation, volunteer credentials view, mobile attendance cards, and QR scanning.",
      updates: [
        {
          icon: Users,
          title: "Separated Directories",
          desc: "Volunteers Directory, Participants Directory, and Working Committee / Admin Directory are now independently organized."
        },
        {
          icon: Eye,
          title: "Volunteer Registration Details & Account Passwords",
          desc: "Tap on any volunteer in Volunteer Directory to view their complete registration details and account password."
        },
        {
          icon: QrCode,
          title: "Volunteer Attendance QR Scanner",
          desc: "Instantly scan volunteers' digital profile QR codes with your camera for fast Check-In & Check-Out marking."
        },
        {
          icon: Clock,
          title: "Daily Attendance Mobile Optimization",
          desc: "Daily Attendance Records window rearranged with mobile-friendly cards and large touch targets."
        },
        {
          icon: Calendar,
          title: "Attendance Window Open Till 05/11/2026",
          desc: "Official attendance marking is enabled through November 5, 2026."
        },
        {
          icon: Sparkles,
          title: "Event Registrations with Group Details Modal",
          desc: "Displays Event Title with Event ID, and tapping any group registration opens a full team details popup."
        }
      ]
    },
    admin: {
      badge: "ADMIN PORTAL UPDATES",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      title: "Latest Admin & Coordinator Portal Updates (v2.3.8)",
      summary: "Simplified attendance table layout to prevent mis-marking, Volunteer QR scanner, and extended attendance window.",
      updates: [
        {
          icon: CheckCircle2,
          title: "Simplified Attendance Table Layout",
          desc: "Clean 2-column view showing Name, Domain, AUID, and Check In / Check Out buttons only, with compact spacing."
        },
        {
          icon: QrCode,
          title: "Instant Volunteer QR Scanner",
          desc: "Tap 'Scan Volunteer QR' to scan volunteer QR passes directly from their phones for zero-error check-in."
        },
        {
          icon: Calendar,
          title: "Attendance Marking Active Till 05/11/2026",
          desc: "Official attendance marking is enabled through November 5, 2026."
        },
        {
          icon: Clock,
          title: "Profile Edit Window Reopened",
          desc: "One-time profile editing is reopened till 09/10/2026 14:00 IST for student corrections."
        }
      ]
    },
    volunteer: {
      badge: "VOLUNTEER UPDATES",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      title: "Latest Volunteer Portal Updates (v2.3.8)",
      summary: "Official Attendance QR Pass in your profile, profile update window reopened till 09/10/2026 14:00 IST.",
      updates: [
        {
          icon: QrCode,
          title: "Official Volunteer Attendance QR Pass",
          desc: "Your profile now displays your personal QR pass. Present it to coordinators for fast Check-In & Check-Out."
        },
        {
          icon: Clock,
          title: "Profile Details Update Reopened",
          desc: "One-time details update window is open till October 9, 2026, 2:00 PM IST (09/10/2026 14:00 IST)."
        },
        {
          icon: CheckCircle2,
          title: "Live Attendance Tracking",
          desc: "Track your real-time attendance logs, check-in timestamps, and total days present in your profile."
        }
      ]
    },
    participant: {
      badge: "STUDENT UPDATES",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      title: "Latest Student Portal Updates (v2.3.8)",
      summary: "Profile Details Update window reopened till 09/10/2026 14:00 IST and digital passes ready.",
      updates: [
        {
          icon: Clock,
          title: "Profile Details Update Window Reopened",
          desc: "You can update your account details one-time until October 9, 2026, 2:00 PM IST (09/10/2026 14:00 IST)."
        },
        {
          icon: QrCode,
          title: "Digital Event QR Passes",
          desc: "Access your official event entry QR passes under 'My Events & Digital Passes' for fest day verification."
        },
        {
          icon: Sparkles,
          title: "Karunada Vaibhava Cultural Schedule",
          desc: "View event dates, stage schedules, and competition guidelines."
        }
      ]
    }
  };

  const currentContent = contentMap[roleKey] || contentMap.participant;

  if (dismissed) {
    // When dismissed, provide an unobtrusive "What's New" pill so the user can review updates anytime
    return (
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={handleReopen}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-all cursor-pointer shadow-2xs"
          title="Review latest website updates for your profile"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>What's New in v2.3.8</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Dedicated Announcement Popup Message Bar */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white p-4 sm:p-5 shadow-lg border border-amber-500/30 relative overflow-hidden transition-all animate-fadeIn">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-kar-red/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentContent.badgeColor}`}>
                {currentContent.badge}
              </span>
              <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Nuditaranga 2026 Updates</span>
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              {currentContent.title}
            </h4>

            <p className="text-xs text-stone-300 leading-relaxed max-w-3xl">
              {currentContent.summary}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-black text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Close update message bar"
              aria-label="Close updates"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Details Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[120] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-stone-900 to-stone-950 p-5 sm:p-6 text-white flex items-center justify-between border-b border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentContent.badgeColor}`}>
                    {currentContent.badge}
                  </span>
                  <span className="text-[11px] font-mono text-amber-400">Release v2.3.8</span>
                </div>
                <h3 className="text-lg font-black text-white">{currentContent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Here are the newest updates and features prepared for your profile in the Acharya Kannada Vedike Nuditaranga 2026 Portal:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {currentContent.updates.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-stone-900 font-extrabold text-xs">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed pl-8">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-stone-500 font-medium">
                Acharya Kannada Vedike • Nuditaranga 2026
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
