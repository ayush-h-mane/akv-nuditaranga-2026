import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { api } from "../services/api";
import { QRScanner } from "../components/QRScanner";
import { formatKannadaStatus, toKannadaDigits } from "../utils/kannadaUtils";
import { CheckCircle2, UserCheck, AlertTriangle, Clock, MapPin, RefreshCw, XCircle } from "lucide-react";

export const CheckInPage = () => {
  const { lang, t } = useLanguage();
  const [activeReg, setActiveReg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleScanOrSearch = async (id) => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await api.getRegistration(id);
      setActiveReg(data);
    } catch (err) {
      setMessage({ type: "error", text: err.message || (lang === "kn" ? "ನೋಂದಣಿ ಮಾಹಿತಿ ಕಂಡುಬಂದಿಲ್ಲ." : "Registration not found.") });
      setActiveReg(null);
    } finally {
      setLoading(false);
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

        {/* QR Scanner Component */}
        <div className="mb-8">
          <QRScanner onScanSuccess={handleScanOrSearch} />
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
