import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { siteConfig } from "../config/siteConfig";
import { CountdownTimer } from "../components/CountdownTimer";
import { 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  ShieldCheck, 
  Flame, 
  User, 
  KeyRound, 
  LayoutDashboard, 
  LogOut 
} from "lucide-react";

export const HeroSection = ({ onExploreNuditaranga, onKnowAbout, onOpenAuthTab, setCurrentView }) => {
  const { lang, t } = useLanguage();
  const { user, role, logout } = useAuth();

  const handleGoToDashboard = () => {
    if (!user) {
      if (onOpenAuthTab) onOpenAuthTab("student-login");
      if (setCurrentView) setCurrentView("auth");
      return;
    }
    if (role === "SUPERADMIN") {
      if (setCurrentView) setCurrentView("superadmin-dashboard");
    } else if (role === "ADMIN") {
      if (setCurrentView) setCurrentView("admin-dashboard");
    } else {
      if (setCurrentView) setCurrentView("student-dashboard");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-5 animate-fade-in">
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
          <span>{lang === "kn" ? "ಆಚಾರ್ಯ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ಸ್ • ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ" : "Acharya Institutes • Acharya Kannada Vedike"}</span>
        </div>

        {/* Up Side Hero Authentication Section */}
        <div className="max-w-2xl mx-auto mb-6 px-2 animate-fade-in">
          {user ? (
            /* Logged In State */
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-300 shadow-md shadow-emerald-900/5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-stone-900 leading-tight">
                      {lang === "kn" ? "ಸ್ವಾಗತ, " : "Welcome, "}
                      <span className="text-kar-red">{user.name}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-kar-red text-white uppercase tracking-wider">
                      {role}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-stone-500 mt-0.5">
                    {user.auid || user.username || "Portal Active"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={handleGoToDashboard}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow hover:opacity-95 shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-amber-200" />
                  <span>{lang === "kn" ? "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ" : "Go to Dashboard"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-kar-red hover:bg-red-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Guest / Unauthenticated State: Prominent Auth Bar */
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-amber-200/90 shadow-md shadow-amber-900/5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                {/* Auth Label / Icon */}
                <div className="flex items-center gap-2 text-stone-800 shrink-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                    <KeyRound className="w-3.5 h-3.5 text-kar-red" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black text-stone-900 tracking-tight block">
                      {lang === "kn" ? "ಅಧಿಕೃತ ಪ್ರವೇಶ & ಲಾಗಿನ್" : "Portal Access & Login"}
                    </span>
                    <span className="text-[10px] font-bold text-amber-900/80 block">
                      {lang === "kn" ? "ವಿದ್ಯಾರ್ಥಿ ಅಥವಾ ಅಡ್ಮಿನ್ ಲಾಗಿನ್" : "Student, SuperAdmin & Faculty"}
                    </span>
                  </div>
                </div>

                {/* Authentication Options Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 w-full sm:w-auto">
                  {/* Student Login */}
                  <button
                    onClick={() => onOpenAuthTab && onOpenAuthTab("student-login")}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-stone-800 bg-stone-100 hover:bg-stone-200 hover:text-stone-950 border border-stone-200 shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <User className="w-3.5 h-3.5 text-kar-red" />
                    <span>{lang === "kn" ? "ವಿದ್ಯಾರ್ಥಿ ಲಾಗಿನ್" : "Student Login"}</span>
                  </button>

                  {/* Student Register */}
                  <button
                    onClick={() => onOpenAuthTab && onOpenAuthTab("student-register")}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow hover:opacity-95 shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>{lang === "kn" ? "ಹೊಸ ನೋಂದಣಿ" : "Student Sign Up"}</span>
                  </button>

                  {/* SuperAdmin & Admin */}
                  <button
                    onClick={() => onOpenAuthTab && onOpenAuthTab("superadmin")}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-extrabold text-stone-200 bg-stone-900 hover:bg-black hover:text-white border border-stone-700 shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    title="SuperAdmin (akv-nt-2026) & Admin Login"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === "kn" ? "ಸೂಪರ್ ಅಡ್ಮಿನ್" : "SuperAdmin"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
