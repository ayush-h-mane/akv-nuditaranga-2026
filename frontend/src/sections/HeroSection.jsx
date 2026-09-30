import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { siteConfig } from "../config/siteConfig";
import { CountdownTimer } from "../components/CountdownTimer";
import { 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Flame
} from "lucide-react";

export const HeroSection = ({ onExploreNuditaranga, onKnowAbout, onOpenAuthTab, setCurrentView }) => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [mascotGreeting, setMascotGreeting] = useState(false);

  return (
    <section className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-36 lg:pb-24 overflow-hidden bg-gradient-to-b from-amber-50/70 via-stone-50 to-white">
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
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-5 animate-fade-in">
          <div className="p-2 sm:p-3 rounded-2xl bg-white/90 shadow-md border border-amber-200/80">
            <img src="/images/acharya-logo.png?v=2026" alt="Acharya" className="h-12 sm:h-16 w-auto object-contain" />
          </div>
          <div className="h-10 w-[2px] bg-gradient-to-b from-kar-red to-kar-yellow rounded-full hidden sm:block" />
          <div className="p-1 sm:p-2 rounded-2xl bg-white/90 shadow-md border border-amber-200/80 hover:shadow-lg transition-all transform hover:-translate-y-0.5">
            <img
              src="/images/akv-logo.png"
              alt="Acharya Kannada Vedike"
              className="h-14 sm:h-20 w-auto object-contain drop-shadow"
            />
          </div>
        </div>

        {/* Top Campus Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold bg-white border border-amber-300/80 text-amber-900 shadow-sm mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-kar-red animate-ping shrink-0" />
          <span>{lang === "kn" ? "ಆಚಾರ್ಯ ವಿದ್ಯಾಸಂಸ್ಥೆಗಳು • ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ" : "Acharya Institutions • Acharya Kannada Vedike"}</span>
        </div>

        {/* Main Headings */}
        <div className="relative z-30 mb-7 sm:mb-4">
          <p className="text-2xl sm:text-4xl lg:text-5xl font-black text-kar-red font-display mb-2 tracking-tight">
            {lang === "kn" ? siteConfig.name.kn : siteConfig.name.en}
          </p>
          <p className="text-sm sm:text-lg font-extrabold text-amber-800 uppercase tracking-widest font-mono">
            {lang === "kn" ? "ನುಡಿತರಂಗ - ೨೦೨೬" : "Nuditaranga - 2026"}
          </p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-stone-900 tracking-tight font-display mt-1 pb-1">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-kar-red via-red-600 to-amber-600 font-kannada-serif font-black">
              ಕರುನಾಡ ವೈಭವ
            </span>
          </h1>
        </div>

        <div className="relative inline-flex min-h-28 w-full max-w-[calc(100vw-2rem)] items-center justify-center gap-2 overflow-visible sm:min-h-40 sm:gap-5 mt-6 sm:mt-1 mb-5 px-3 sm:px-9 py-2.5 sm:py-4 rounded-2xl sm:rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-red-800 via-kar-red to-red-800 shadow-[0_12px_35px_rgba(127,29,29,0.28)]">
          <span className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          <Sparkles className="relative z-30 hidden w-4 h-4 shrink-0 sm:block sm:w-8 sm:h-8 text-amber-300 motion-safe:animate-pulse" aria-hidden="true" />
          <p className={`relative z-30 text-center font-black font-kannada-serif tracking-wide leading-tight text-amber-200 drop-shadow-[0_2px_8px_rgba(255,215,0,0.5)] ${lang === "kn" ? "max-w-[80%] text-[clamp(1.8rem,8.5vw,3rem)] sm:text-5xl lg:text-6xl" : "max-w-[74%] text-2xl sm:text-5xl lg:text-6xl"}`}>
            {lang === "kn" ? "ದಶಕೋತ್ಸವ" : "The Decadal Festival"}
          </p>
          <Sparkles className="relative z-30 hidden w-4 h-4 shrink-0 sm:block sm:w-8 sm:h-8 text-amber-300 motion-safe:animate-pulse" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setMascotGreeting((value) => !value)}
            aria-label={lang === "kn" ? "ನೋಗ್ರಾಜ್ ಜೊತೆ ಮಾತನಾಡಿ" : "Talk to NOGRAJ"}
            aria-expanded={mascotGreeting}
            className="absolute -left-2 -top-20 z-20 w-32 sm:left-auto sm:-right-2 sm:-top-28 sm:w-36 lg:top-auto lg:bottom-0 lg:w-72 cursor-pointer rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            {mascotGreeting && (
              <span role="status" className="absolute -left-32 top-3 w-32 rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold leading-snug text-stone-800 shadow-lg sm:-left-44 sm:w-44 sm:text-sm">
                {lang === "kn" ? "ನಮಸ್ಕಾರ! ಕರುನಾಡ ವೈಭವಕ್ಕೆ ಸ್ವಾಗತ." : "Namaskara! Welcome to Karunada Vaibhava."}
              </span>
            )}
            <img
              src="/images/nograj.png"
              alt={lang === "kn" ? "ಕರ್ನಾಟಕ ಧ್ವಜ ಹಿಡಿದಿರುವ ನೋಗ್ರಾಜ್" : "NOGRAJ holding the Karnataka flag"}
              className="block h-auto w-full drop-shadow-[0_10px_15px_rgba(75,12,0,0.42)] transition-transform duration-300 hover:-translate-y-1"
            />
          </button>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14 max-w-md sm:max-w-none mx-auto">
          {!user && (
            <>
              <button
                onClick={() => setCurrentView?.("/student")}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm sm:text-base font-extrabold text-white shadow-lg bg-stone-900 hover:bg-stone-800 transition-all flex items-center justify-center cursor-pointer"
              >{lang === "kn" ? "ಲಾಗಿನ್" : "Login"}</button>
              <button
                onClick={() => setCurrentView?.("/student", { subMode: "register" })}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm sm:text-base font-extrabold text-kar-red bg-white border-2 border-kar-red/30 hover:border-kar-red transition-all flex items-center justify-center cursor-pointer"
              >{lang === "kn" ? "ನೋಂದಣಿ" : "Register"}</button>
            </>
          )}
          <button
            onClick={onExploreNuditaranga}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl text-sm sm:text-base font-extrabold text-white shadow-lg shadow-red-600/20 hover:shadow-xl hover:shadow-red-600/30 transition-all transform hover:-translate-y-0.5 active:scale-95 bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow flex items-center justify-center gap-2.5"
          >
            <Sparkles className="w-5 h-5 text-amber-200" />
            <span>{lang === "kn" ? "೫ ದಿನಗಳ ಕರುನಾಡ ವೈಭವ ಪಟ್ಟಿ" : "Explore 5-Day Schedule"}</span>
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






