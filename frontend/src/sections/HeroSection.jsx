import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { CountdownTimer } from "../components/CountdownTimer";
import { Sparkles, ArrowRight, BookOpen, ShieldCheck, Flame } from "lucide-react";

export const HeroSection = ({ onExploreNuditaranga, onKnowAbout }) => {
  const { lang, t } = useLanguage();

  return (
    <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden bg-gradient-to-b from-amber-50/70 via-stone-50 to-white">
      {/* Karnataka Decorative Background Accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-red-200/40 via-amber-200/40 to-yellow-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-red-100/50 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-1/3 -left-12 w-80 h-80 bg-amber-100/60 rounded-full blur-2xl pointer-events-none" />

      {/* Floating Kannada Script Graphic Silhouette */}
      <div className="absolute right-4 lg:right-24 top-20 text-stone-200/40 font-kannada-serif font-black text-9xl select-none pointer-events-none">
        ಕ
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Dual Brand Crest: Acharya Institutes & Acharya Kannada Vedike with Karnataka flags */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 animate-fade-in">
          <div className="p-2 sm:p-3 rounded-2xl bg-white/90 shadow-md border border-amber-200/80 hover:shadow-lg transition-all transform hover:-translate-y-0.5">
            <img
              src="/images/acharya-logo.png?v=2026"
              alt="Acharya Institutes"
              className="h-12 sm:h-16 w-auto object-contain filter-none"
            />
          </div>
          <div className="h-10 w-[2px] bg-gradient-to-b from-kar-red to-kar-yellow rounded-full hidden sm:block" />
          <div className="p-1 sm:p-2 rounded-2xl bg-white/90 shadow-md border border-amber-200/80 hover:shadow-lg transition-all transform hover:-translate-y-0.5">
            <img
              src="/images/akv-logo.png"
              alt="Acharya Kannada Vedike with Karnataka Flags"
              className="h-14 sm:h-20 w-auto object-contain drop-shadow"
            />
          </div>
        </div>

        {/* Top Campus Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold bg-white border border-amber-300/80 text-amber-900 shadow-sm mb-4 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-kar-red animate-ping" />
          <span>{lang === "kn" ? "ಆಚಾರ್ಯ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ಸ್ • ಅಧಿಕೃತ ಕನ್ನಡ ವೇದಿಕೆ" : "Acharya Institutes • Official Kannada Vedike"}</span>
        </div>

        {/* Main Headings */}
        <div className="mb-4">
          <p className="text-sm sm:text-lg font-extrabold text-amber-800 uppercase tracking-widest font-mono">
            {lang === "kn" ? "ನುಡಿತರಂಗ - ೨೦೨೬" : "Nuditaranga - 2026"}
          </p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-stone-900 tracking-tight font-display mt-1">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-kar-red via-red-600 to-amber-600 font-kannada-serif font-black">
              ಕರುನಾಡ ವೈಭವ
            </span>
          </h1>
          <div className="inline-block mt-3 px-4 py-1 rounded-xl bg-amber-100 text-amber-950 font-mono text-xs sm:text-sm font-black border border-amber-300/70">
            {lang === "kn" 
              ? "೩೦/೧೦/೨೦೨೬ ರಿಂದ ೦೪/೧೧/೨೦೨೬ • ೬ ದಿನಗಳ ಸಾಂಸ್ಕೃತಿಕ ಹಬ್ಬ" 
              : "30/10/2026 to 04/11/2026 • 6-Day Cultural Extravaganza"}
          </div>
        </div>

        {/* Tagline */}
        <p className="text-base sm:text-xl font-bold text-amber-900/90 font-kannada max-w-3xl mx-auto mb-4 tracking-wide">
          {lang === "kn" ? siteConfig.tagline.kn : siteConfig.tagline.en}
        </p>

        {/* Description */}
        <p className="text-xs sm:text-base text-stone-600 max-w-2xl mx-auto mb-8 leading-relaxed font-kannada">
          {t("hero.description")}
        </p>

        {/* Dual Primary Call-To-Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <button
            onClick={onExploreNuditaranga}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm sm:text-base font-extrabold text-white shadow-lg shadow-red-600/20 hover:shadow-xl hover:shadow-red-600/30 transition-all transform hover:-translate-y-0.5 active:scale-95 bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow flex items-center justify-center gap-2.5"
          >
            <Sparkles className="w-5 h-5 text-amber-200" />
            <span>{lang === "kn" ? "೬ ದಿನಗಳ ಕರುನಾಡ ವೈಭವ ಪಟ್ಟಿ" : "Explore 6-Day Schedule"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onKnowAbout}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm sm:text-base font-extrabold text-stone-800 bg-white border-2 border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5 text-kar-red" />
            <span>{t("hero.ctaAbout")}</span>
          </button>
        </div>

        {/* Live Countdown Timer Card */}
        <div className="relative pt-6 pb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-900 bg-amber-100/80 mb-4">
            <Flame className="w-3.5 h-3.5 text-kar-red animate-pulse" />
            <span>{t("nuditaranga.countdownTitle")}</span>
          </div>

          <CountdownTimer />
        </div>

        {/* Bottom 4 Feature Ribbons */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-xs font-bold text-stone-700">
          <div className="p-3 rounded-2xl bg-white/80 border border-stone-200/70 shadow-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-kar-red" />
            <span>{lang === "kn" ? "ಕನ್ನಡ ಸಾಹಿತ್ಯ" : "Kannada Literature"}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 border border-stone-200/70 shadow-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-kar-yellow" />
            <span>{lang === "kn" ? "ಜಾನಪದ ಕಲೆಗಳು" : "Folklore & Folk Arts"}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 border border-stone-200/70 shadow-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{lang === "kn" ? "ಸಂಗೀತ & ನೃತ್ಯ" : "Music & Dance"}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 border border-stone-200/70 shadow-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>{lang === "kn" ? "ಯುವ ಪ್ರತಿಭೆಗಳು" : "Student Leadership"}</span>
          </div>
        </div>

      </div>
    </section>
  );
};
