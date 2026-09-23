import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { CountdownTimer } from "../components/CountdownTimer";
import { Sparkles, Calendar, MapPin, Clock, Award, ShieldAlert, FileText, ArrowRight } from "lucide-react";

export const NuditarangaHero = ({ onRegister, onViewEvents }) => {
  const { lang, t } = useLanguage();

  return (
    <section id="nuditaranga" className="py-20 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 text-white relative overflow-hidden">
      {/* Visual Accents & Golden Glowing Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Flagship Badge */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-kar-red to-kar-yellow text-white shadow-lg tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("nuditaranga.badge")}</span>
          </span>
        </div>

        {/* Fest Title */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white mb-3">
            {lang === "kn" ? siteConfig.festival.nameKn : siteConfig.festival.name}
          </h2>

          <div className="inline-block px-4 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-amber-400/30 mb-4">
            <span className="text-xs sm:text-sm font-bold text-amber-300 font-kannada">
              {lang === "kn" ? "ಧೈಯವಾಕ್ಯ: " : "Theme: "}
              {lang === "kn" ? siteConfig.festival.theme.kn : siteConfig.festival.theme.en}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mx-auto font-kannada leading-relaxed">
            {lang === "kn"
              ? "ಕರ್ನಾಟಕದ ಹೆಮ್ಮೆಯ ಕಲೆ, ಸಾಹಿತ್ಯ, ಗಾಯನ, ಜಾನಪದ ನೃತ್ಯ ಹಾಗೂ ಸಾಂಪ್ರದಾಯಿಕ ಸ್ಪರ್ಧೆಗಳ ಅತಿ ದೊಡ್ಡ ವಾರ್ಷಿಕ ಕಲಾ ಸಂಗಮ. ಆಚಾರ್ಯ ಕ್ಯಾಂಪಸ್‌ನ ಎಲ್ಲಾ ವಿಭಾಗಗಳ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಮುಕ್ತ ಪ್ರವೇಶ."
              : "The grand annual cultural festival celebrating Karnataka's unmatched folklore, classical literature, music, drama, and youth innovation. Open to all students of Acharya Institutes."}
          </p>
        </div>

        {/* Live Fest Countdown */}
        <div className="mb-14">
          <CountdownTimer />
        </div>

        {/* Essential Fest Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          
          {/* Card 1: Dates & Timings */}
          <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  {t("nuditaranga.dateLabel")}
                </span>
                <span className="text-sm sm:text-base font-bold text-white">
                  {lang === "kn" ? siteConfig.festival.displayDate.kn : siteConfig.festival.displayDate.en}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-400 font-kannada">
              {lang === "kn" ? "೬ ದಿನಗಳ ಭವ್ಯ ಸಾಂಸ್ಕೃತಿಕ ಮಹೋತ್ಸವ" : "6-Day Cultural Confluence"}
            </p>
          </div>

          {/* Card 2: Venue */}
          <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  {t("nuditaranga.venueLabel")}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white leading-tight block">
                  {lang === "kn" ? siteConfig.festival.venue.kn : siteConfig.festival.venue.en}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-400 font-kannada">
              {lang === "kn" ? "ಬಯಲು ರಂಗಮಂದಿರ & ಆಡಿಟೋರಿಯಂಗಳು" : "Amphitheatre & Auditoriums"}
            </p>
          </div>

          {/* Card 3: Deadline */}
          <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  {t("nuditaranga.deadlineLabel")}
                </span>
                <span className="text-xs sm:text-sm font-bold text-amber-400">
                  {lang === "kn" ? siteConfig.festival.registrationDeadline.kn : siteConfig.festival.registrationDeadline.en}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-400 font-kannada">
              {lang === "kn" ? "* ಮುಂಚಿತ ನೋಂದಣಿಗೆ ಆದ್ಯತೆ" : "* Early bird slot reservation"}
            </p>
          </div>

        </div>

        {/* Participation Rules & Guidelines Summary */}
        <div className="p-6 sm:p-8 rounded-3xl bg-stone-900/90 border border-amber-400/30 max-w-5xl mx-auto mb-12">
          <h3 className="text-lg font-bold text-white font-display mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>{lang === "kn" ? "ಮುಖ್ಯ ನಿಯಮಗಳು & ಅರ್ಹತೆ" : "Key Eligibility & General Rules"}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-stone-300 font-kannada">
            <div className="flex items-start gap-2.5">
              <span className="text-kar-yellow font-bold text-base">✓</span>
              <span>
                {lang === "kn" 
                  ? "ಆಚಾರ್ಯ ಕ್ಯಾಂಪಸ್‌ನ ಯಾವುದೇ ವಿಭಾಗದ ಮಾನ್ಯತೆ ಹೊಂದಿರುವ ವಿದ್ಯಾರ್ಥಿಗಳು ಭಾಗವಹಿಸಬಹುದು (ಕಡ್ಡಾಯವಾಗಿ ಕಾಲೇಜು ಗುರುತಿನ ಚೀಟಿ (ID Card) ಹೊಂದಿರಬೇಕು)."
                  : "Open to all enrolled students of Acharya Institutes across engineering, arts, science, and management."}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-kar-yellow font-bold text-base">✓</span>
              <span>
                {lang === "kn" 
                  ? "ಒಬ್ಬ ಸ್ಪರ್ಧಿ ಗರಿಷ್ಠ ೩ ಸ್ಪರ್ಧೆಗಳಲ್ಲಿ ಭಾಗವಹಿಸಲು ಅವಕಾಶವಿದೆ."
                  : "A participant may register for a maximum of 3 events ensuring non-overlapping schedules."}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-kar-yellow font-bold text-base">✓</span>
              <span>
                {lang === "kn" 
                  ? "ತಂಡ ಸ್ಪರ್ಧೆಗಳಿಗೆ ತಂಡದ ನಾಯಕರು ಆನ್‌ಲೈನ್ ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಿ ಎಲ್ಲಾ ಸದಸ್ಯರ USN / AUID ವಿವರ ಒದಗಿಸಬೇಕು."
                  : "For team competitions, the team lead registers the squad and specifies member USNs."}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-kar-yellow font-bold text-base">✓</span>
              <span>
                {lang === "kn" 
                  ? "ವಿಜೇತರಿಗೆ ಆಕರ್ಷಕ ನಗದು ಬಹುಮಾನ, ಟ್ರೋಫಿ ಮತ್ತು ಪ್ರಮಾಣಪತ್ರ ನೀಡಲಾಗುವುದು."
                  : "Winners will receive prestigious trophies, cash prizes, and VTU activity point certification."}
              </span>
            </div>
          </div>
        </div>

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onRegister}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm sm:text-base font-extrabold text-white shadow-xl shadow-red-600/30 hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:scale-95 bg-gradient-to-r from-kar-red to-kar-yellow flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-amber-200" />
            <span>{t("nuditaranga.registerBtn")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onViewEvents}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm sm:text-base font-extrabold text-stone-200 bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span>{t("nuditaranga.viewEventsBtn")}</span>
          </button>
        </div>

      </div>
    </section>
  );
};
