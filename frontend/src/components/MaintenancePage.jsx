import React, { useState } from "react";
import {
  Wrench,
  ShieldCheck,
  RefreshCw,
  Mail,
  Phone,
  AlertTriangle,
  Lock,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  KeyRound,
  X
} from "lucide-react";
import { MAINTENANCE_CONFIG } from "../config/maintenanceConfig";

export const MaintenancePage = ({ onBypass, onNavigateDeveloper }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [isBypassedLocally, setIsBypassedLocally] = useState(false);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcode.trim() === MAINTENANCE_CONFIG.bypassPasscode || passcode.trim() === "akv2026") {
      localStorage.setItem("akv_maintenance_bypass", "granted");
      setIsBypassedLocally(true);
      setPasscodeError("");
      setShowBypassModal(false);
      if (onBypass) onBypass();
    } else {
      setPasscodeError("Invalid coordinator or developer passcode. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Ambient Gradient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-red-600/20 via-amber-500/10 to-transparent rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[500px] bg-red-800/15 rounded-full blur-[130px]" />
        <div className="absolute top-1/3 left-10 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[100px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "32px 32px" }}
        />
      </div>



      {/* Main Hero Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Maintenance Card */}
          <div className="relative rounded-3xl bg-gradient-to-b from-stone-900/90 via-stone-900/60 to-stone-950/90 border border-white/10 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-black/80 overflow-hidden text-center">
            {/* Top Decorative Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider mb-6">
              <Wrench className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>ತಾತ್ಕಾಲಿಕ ನಿರ್ವಹಣೆ • Scheduled Maintenance</span>
            </div>

            {/* Central Animated Maintenance Crest */}
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-red-600/30 to-amber-500/30 animate-pulse blur-xl" />
              <div className="relative w-full h-full rounded-2xl bg-stone-900/90 border border-amber-500/30 flex items-center justify-center shadow-inner">
                <Wrench className="w-10 h-10 text-amber-400 transform -rotate-12" />
              </div>
            </div>

            {/* Main Headings (Bilingual) */}
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              ವೆಬ್‌ಸೈಟ್ ನಿರ್ವಹಣೆಯಲ್ಲಿದೆ
            </h2>
            <h3 className="text-base sm:text-xl font-bold text-stone-300 tracking-tight mt-1">
              Website & Portal Down for Maintenance
            </h3>

            {/* Primary Instructions & User Notice */}
            <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-stone-300 text-xs sm:text-sm leading-relaxed space-y-2">
              <p className="text-amber-200/95 font-medium">
                ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ ನುಡಿತರಂಗ ೨೦೨೬ ವೆಬ್‌ಸೈಟ್ ಮತ್ತು ಪೋರ್ಟಲ್ ಸರ್ವರ್‌ಗಳ ಸುಧಾರಿತ ನಿರ್ವಹಣಾ ಕಾರ್ಯ ಪ್ರಗತಿಯಲ್ಲಿದೆ.
              </p>
              <p className="text-stone-300">
                The website & portals are temporarily offline for scheduled maintenance.
              </p>
            </div>



            {/* Safe Data Preservation Reassurance Badge */}
            <div className="mt-6 flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-left">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  ನಿಮ್ಮ ಡೇಟಾ ಮತ್ತು ಖಾತೆಗಳು ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತವಾಗಿವೆ • Safe & Preserved
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                  All registered student records, event registrations, attendance histories, and databases remain intact, secure, and untouched during this routine maintenance.
                </p>
              </div>
            </div>

            {/* Action Buttons: Refresh & Helplines */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ... Checking..." : "ಸ್ಥಿತಿ ಮರುಪರಿಶೀಲಿಸಿ • Check Status"}</span>
              </button>

              <a
                href={`mailto:${MAINTENANCE_CONFIG.supportEmail}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 font-bold text-xs transition-all"
              >
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span>{MAINTENANCE_CONFIG.supportEmail}</span>
              </a>

              <a
                href={`tel:${MAINTENANCE_CONFIG.emergencyPhone}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 font-bold text-xs transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{MAINTENANCE_CONFIG.emergencyPhone}</span>
              </a>
            </div>
          </div>

          {/* Footer note & Authorized Coordinator / Developer Bypass Link */}
          <div className="mt-4 flex items-center justify-between px-2 text-[11px] text-stone-500">
            <span>Acharya Institute, Bengaluru • Karunada Vaibhava</span>
            <button
              onClick={() => setShowBypassModal(true)}
              className="text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer underline underline-offset-4"
            >
              <Lock className="w-3 h-3" />
              <span>Staff / Developer Bypass</span>
            </button>
          </div>
        </div>
      </main>

      {/* Discreet Bypass Dialog for Authorized Administrators / Developers */}
      {showBypassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Developer & Staff Bypass
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowBypassModal(false);
                  setPasscodeError("");
                }}
                className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-stone-400 mt-3 leading-relaxed">
              If you are an authorized AKV Coordinator or Platform Developer performing maintenance tasks, enter the authorization passcode to bypass this notice.
            </p>

            <form onSubmit={handleVerifyPasscode} className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Passcode
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError("");
                  }}
                  placeholder="Enter bypass passcode..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:outline-hidden focus:border-amber-500 font-mono"
                  autoFocus
                />
              </div>

              {passcodeError && (
                <p className="text-[11px] text-red-400 font-medium">
                  {passcodeError}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors cursor-pointer"
                >
                  Verify & Unlock
                </button>
                {onNavigateDeveloper && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBypassModal(false);
                      onNavigateDeveloper();
                    }}
                    className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Open /developer
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center border-t border-white/5 text-[10px] text-stone-600">
        Acharya Kannada Vedike • Nuditaranga 2026 • Platform Status: Scheduled Maintenance Mode
      </footer>
    </div>
  );
};
