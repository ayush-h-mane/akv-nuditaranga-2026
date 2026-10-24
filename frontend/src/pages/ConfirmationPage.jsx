import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { DigitalPass } from "../components/DigitalPass";
import { WhatsAppGroupModal } from "../components/WhatsAppGroupModal";
import { getEventWhatsAppGroup } from "../config/whatsappGroups";
import { CheckCircle2, ArrowLeft, MessageCircle, ExternalLink } from "lucide-react";

export const ConfirmationPage = ({ confirmedRegistration, setCurrentView }) => {
  const { lang, t } = useLanguage();
  const whatsAppGroup = getEventWhatsAppGroup(confirmedRegistration);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(() => Boolean(whatsAppGroup));

  if (!confirmedRegistration) {
    return (
      <div className="pt-32 pb-20 text-center min-h-screen">
        <h2 className="text-xl font-bold text-stone-800 mb-2">
          {lang === "kn" ? "ಯಾವುದೇ ನೋಂದಣಿ ಕಂಡುಬಂದಿಲ್ಲ" : "No Registration Found"}
        </h2>
        <button
          onClick={() => setCurrentView("events")}
          className="px-5 py-2.5 rounded-xl bg-kar-red text-white text-xs font-bold cursor-pointer"
        >
          {lang === "kn" ? "ಸ್ಪರ್ಧೆಗಳ ಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ" : "View Events"}
        </button>
      </div>
    );
  }

  const eventTitle = confirmedRegistration.event
    ? (lang === "kn" ? confirmedRegistration.event.title_kn : confirmedRegistration.event.title_en)
    : confirmedRegistration.event_title_en || confirmedRegistration.event_title || confirmedRegistration.event_id;

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Success Banner */}
        <div className="no-print text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3 shadow-sm animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 font-display">
            {t("registration.successTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-kannada mt-1 max-w-lg mx-auto">
            {t("registration.successDesc")}
          </p>
        </div>

        {/* WhatsApp Group Notification Card */}
        {whatsAppGroup && (
          <div className="no-print max-w-2xl mx-auto mb-6 p-4.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border border-emerald-500/40 shadow-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 animate-scale-up">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/40">
                <MessageCircle className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h4 className="font-extrabold text-sm sm:text-base text-white">
                    {lang === "kn" ? "ಅಧಿಕೃತ ವಾಟ್ಸಾಪ್ ಗ್ರೂಪ್" : "Official WhatsApp Group"}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {whatsAppGroup.name}
                  </span>
                </div>
                <p className="text-xs text-stone-300 font-kannada mt-0.5">
                  {lang === "kn" 
                    ? "ಸ್ಪರ್ಧೆಯ ಸಂಯೋಜಕರ ಮಹತ್ವದ ಮಾಹಿತಿಗಾಗಿ ಗ್ರೂಪ್‌ಗೆ ಸೇರಿಕೊಳ್ಳಿ." 
                    : "Join the official WhatsApp group for coordinator notices and schedule updates."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={whatsAppGroup.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{lang === "kn" ? "ಗ್ರೂಪ್‌ಗೆ ಸೇರಿ" : "Join WhatsApp"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white text-xs font-bold transition-all border border-white/10 cursor-pointer shrink-0"
              >
                {lang === "kn" ? "ವಿವರ" : "Details"}
              </button>
            </div>
          </div>
        )}

        {/* The Digital Pass */}
        <DigitalPass
          registration={confirmedRegistration}
          onBack={() => {
            setCurrentView("events");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

        {/* WhatsApp Group Modal Popup */}
        {showWhatsAppModal && whatsAppGroup && (
          <WhatsAppGroupModal
            group={whatsAppGroup}
            eventTitle={eventTitle}
            onClose={() => setShowWhatsAppModal(false)}
          />
        )}

      </div>
    </div>
  );
};
