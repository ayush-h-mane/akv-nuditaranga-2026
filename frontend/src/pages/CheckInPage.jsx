import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { CameraQRScanner } from "../components/CameraQRScanner";
import { formatKannadaStatus, toKannadaDigits } from "../utils/kannadaUtils";
import { CheckCircle2, UserCheck, AlertTriangle, Clock, MapPin, RefreshCw, XCircle, Search, Camera } from "lucide-react";

export const CheckInPage = () => {
  const { lang, t } = useLanguage();
  const { user, role } = useAuth();
  const [activeReg, setActiveReg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [mode, setMode] = useState("camera"); // "camera" | "manual"
  const [manualInput, setManualInput] = useState("");

  if (!user || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-kar-red mx-auto flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6 text-kar-red" />
          </div>
          <h2 className="text-xl font-extrabold text-stone-900">Restricted to Administrators</h2>
          <p className="text-xs text-stone-600">
            The Organizer QR Verification & Check-In Desk is strictly restricted to authorized festival administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleScanOrSearch = async (id) => {
    if (!id || !id.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      // Decode potential JSON if passed raw
      let cleanId = id.trim();
      try {
        if (cleanId.startsWith("{") && cleanId.endsWith("}")) {
          const parsed = JSON.parse(cleanId);
          cleanId = parsed.reg_id || parsed.auid || parsed.usn || cleanId;
        }
      } catch (e) {}

      const data = await api.getRegistration(cleanId);
      setActiveReg(data);
    } catch (err) {
      setMessage({ type: "error", text: err.message || (lang === "kn" ? "ನೋಂದಣಿ ಮಾಹಿತಿ ಕಂಡುಬಂದಿಲ್ಲ." : "Registration not found.") });
      setActiveReg(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScanOrSearch(manualInput.trim());
      setManualInput("");
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!activeReg) return;
    setLoading(true);
    try {
      const updated = await api.checkIn(activeReg.registration_id, "Desk Coordinator");
      setActiveReg(updated);
      setMessage({ 
        type: "success", 
        text: lang === "kn" 
          ? `ಭಾಗವಹಿಸಿದವರು ${updated.full_name} ಯಶಸ್ವಿಯಾಗಿ ಹಾಜರಾತಿ ದಾಖಲಿಸಿದ್ದಾರೆ!` 
          : `Participant ${updated.full_name} checked in successfully!` 
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message || (lang === "kn" ? "ಹಾಜರಾತಿ ದಾಖಲಿಸಲು ವಿಫಲವಾಗಿದೆ." : "Failed to mark check-in.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
            {t("checkin.badge")}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 font-display mt-2 mb-1">
            {t("checkin.heading")}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-kannada">
            {t("checkin.subheading")}
          </p>
        </div>

        {/* Status Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in ${
            message.type === "success" 
              ? "bg-green-50 text-green-800 border border-green-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />}
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="max-w-md mx-auto mb-6 flex bg-stone-200/70 p-1 rounded-2xl border border-stone-300">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === "camera"
                ? "bg-white text-kar-red shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{lang === "kn" ? "ಕ್ಯಾಮೆರಾ ಕ್ಯೂಆರ್ ಸ್ಕ್ಯಾನರ್" : "Camera QR Scanner"}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === "manual"
                ? "bg-white text-kar-red shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{lang === "kn" ? "ಕೈಯಾರೆ ಐಡಿ ನಮೂದು" : "Manual ID Search"}</span>
          </button>
        </div>

        {/* Scanner or Manual Search View */}
        <div className="max-w-xl mx-auto mb-8">
          {mode === "camera" ? (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6">
              <CameraQRScanner 
                onScanSuccess={(scannedId) => handleScanOrSearch(scannedId)}
                isLoading={loading}
                autoStart={false}
              />
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6">
              <label className="text-xs font-bold text-stone-700 block mb-2">
                {lang === "kn" ? "ನೋಂದಣಿ ಐಡಿ / AUID / USN ನಮೂದಿಸಿ" : "Enter Registration Pass ID / AUID / USN"}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g. AKV26001 or AIT22CS001"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !manualInput.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-50 shadow transition-colors"
                >
                  {lang === "kn" ? "ಹುಡುಕಿ" : "Search"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 shadow-sm mb-6">
            <RefreshCw className="w-6 h-6 text-kar-red animate-spin mx-auto mb-2" />
            <span className="text-xs font-bold text-stone-500">
              {lang === "kn" ? "ದಾಖಲೆಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ..." : "Searching records..."}
            </span>
          </div>
        )}

        {/* Scanned Participant Result Card */}
        {activeReg && (
          <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-xl p-6 sm:p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  {t("checkin.participantInfo")}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 font-display">
                  {activeReg.full_name}
                </h3>
                <span className="text-xs font-mono font-bold text-kar-red">
                  {lang === "kn" ? "USN / AUID: " : "USN: "}{activeReg.usn} • {activeReg.department} ({lang === "kn" ? `${toKannadaDigits(activeReg.semester)}ನೇ ಸೆಮ್, ವಿಭಾಗ ${activeReg.section}` : `Sem ${activeReg.semester}, Sec ${activeReg.section}`})
                </span>
              </div>

              {/* Status Badge */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  activeReg.status === "Checked In"
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}>
                  {activeReg.status === "Checked In" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  <span>{lang === "kn" ? formatKannadaStatus(activeReg.status) : activeReg.status}</span>
                </span>
              </div>
            </div>

            {/* Event & Team Info */}
            <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-stone-400 block font-semibold">{t("pass.event")}</span>
                <span className="font-bold text-stone-900 text-sm block">
                  {activeReg.event 
                    ? (lang === "kn" ? activeReg.event.title_kn : activeReg.event.title_en)
                    : activeReg.event_id}
                </span>
                {activeReg.is_team && (
                  <span className="text-amber-800 font-bold block mt-1">
                    {lang === "kn" ? "ತಂಡ: " : "Team: "}{activeReg.team_name}
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <div>
                  <span className="text-stone-400 font-medium">
                    {lang === "kn" ? "ನೋಂದಣಿ ಐಡಿ: " : "Registration ID: "}
                  </span>
                  <span className="font-mono font-bold text-stone-800">{activeReg.registration_id}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">
                    {lang === "kn" ? "ಮೊಬೈಲ್: " : "Mobile: "}
                  </span>
                  <span className="font-mono text-stone-800">{activeReg.phone}</span>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">
                    {lang === "kn" ? "ಇಮೇಲ್: " : "Email: "}
                  </span>
                  <span className="text-stone-800">{activeReg.email}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => setActiveReg(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                {lang === "kn" ? "ತೆರವುಗೊಳಿಸಿ" : "Clear"}
              </button>

              {activeReg.status === "Checked In" ? (
                <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 px-4 py-2.5 rounded-xl border border-green-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t("checkin.alreadyCheckedIn")}</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirmCheckIn}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{t("checkin.markCheckIn")}</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
