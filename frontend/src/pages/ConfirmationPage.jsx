import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { DigitalPass } from "../components/DigitalPass";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export const ConfirmationPage = ({ confirmedRegistration, setCurrentView }) => {
  const { lang, t } = useLanguage();

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

        {/* The Digital Pass */}
        <DigitalPass
          registration={confirmedRegistration}
          onBack={() => {
            setCurrentView("events");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

      </div>
    </div>
  );
};
