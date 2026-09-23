import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { X, CheckCircle2, AlertCircle, Clock, MapPin } from "lucide-react";
import { formatKannadaTime, formatKannadaVenue, toKannadaDigits } from "../utils/kannadaUtils";

export const RulesModal = ({ event, isOpen, onClose, onRegister }) => {
  const { lang, t } = useLanguage();

  if (!isOpen || !event) return null;

  const rulesText = lang === "kn" ? (event.rules_kn || event.rules_en) : event.rules_en;
  const rulesList = rulesText.split("\n").filter(r => r.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="h-2 karnataka-ribbon w-full" />

        {/* Modal Header */}
        <div className="p-6 border-b border-stone-100 flex items-start justify-between">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 mb-1.5">
              {lang === "kn" ? event.category_kn : event.category.toUpperCase()}
            </span>
            <h3 className="text-xl font-extrabold text-stone-900 font-display">
              {lang === "kn" ? event.title_kn : event.title_en}
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              {event.format === "both"
                ? (lang === "kn" ? `ವೈಯಕ್ತಿಕ & ಗುಂಪು ಸ್ಪರ್ಧೆ (೧-${toKannadaDigits(event.max_team_size)} ಮಂದಿ)` : `Solo & Group Event (1-${event.max_team_size} Members)`)
                : event.is_team 
                ? (lang === "kn" ? `ತಂಡದ ಸ್ಪರ್ಧೆ (${toKannadaDigits(event.min_team_size)}-${toKannadaDigits(event.max_team_size)} ಮಂದಿ)` : `Team Event (${event.min_team_size}-${event.max_team_size} Members)`)
                : (lang === "kn" ? "ವೈಯಕ್ತಿಕ ಸ್ಪರ್ಧೆ" : "Individual Event")}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-sm text-stone-700 font-kannada">
          {/* Timing & Venue */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/50 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-kar-red flex-shrink-0" />
              <div>
                <span className="text-stone-500 block">{t("events.time")}</span>
                <span className="font-bold text-stone-800">
                  {lang === "kn" ? formatKannadaTime(event.event_time) : event.event_time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div>
                <span className="text-stone-500 block">{t("events.venue")}</span>
                <span className="font-bold text-stone-800">
                  {lang === "kn" ? (event.venue_kn || formatKannadaVenue(event.venue)) : event.venue}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-kar-red" />
              <span>{t("rulesModal.title")}</span>
            </h4>
            <div className="space-y-2">
              {rulesList.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-stone-50 p-2.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-stone-800">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-stone-500 italic pt-2">
            {lang === "kn" 
              ? "* ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮವಾಗಿರುತ್ತದೆ. ಯಾವುದೇ ವಿವಾದಕ್ಕೆ ಅವಕಾಶವಿಲ್ಲ." 
              : "* The decision of the judging panel is final and binding for all participants."}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition-colors"
          >
            {t("rulesModal.close")}
          </button>
          <button
            onClick={() => {
              onClose();
              if (onRegister) onRegister(event.id);
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-kar-red to-kar-yellow shadow-md hover:shadow-lg transition-all"
          >
            {t("rulesModal.understood")}
          </button>
        </div>
      </div>
    </div>
  );
};
