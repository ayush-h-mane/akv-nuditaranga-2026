import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { formatKannadaDate, formatKannadaTime, formatKannadaVenue } from "../utils/kannadaUtils";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  Flag, 
  BookOpen, 
  Theater, 
  Store, 
  Trophy, 
  Rocket, 
  Maximize2, 
  X, 
  ArrowRight,
  CheckCircle2,
  Download
} from "lucide-react";
import { api } from "../services/api";
import { useHistoryModal } from "../utils/useHistoryModal";

export const KarunadaVaibhavaSchedule = ({ onRegisterClick }) => {
  const { lang, t } = useLanguage();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [activeDialogDay, setActiveDialogDay] = useState(null);
  const [activeView, setActiveView] = useState("schedule");
  const [posterLang, setPosterLang] = useState(() => (lang === "kn" ? "kn" : "en"));

  useEffect(() => {
    setPosterLang(lang === "kn" ? "kn" : "en");
  }, [lang]);

  useHistoryModal(posterModalOpen, () => setPosterModalOpen(false));
  useHistoryModal(Boolean(activeDialogDay), () => setActiveDialogDay(null));

  const [scheduleDays, setScheduleDays] = useState(() => {
    const cached = api.getCachedFestivalSchedule();
    return cached?.schedule || siteConfig.festival.schedule || [];
  });

  useEffect(() => {
    api.getFestivalSchedule()
      .then((data) => {
        if (data?.schedule && data.schedule.length > 0) {
          setScheduleDays(data.schedule);
        }
      })
      .catch(() => {});
  }, []);

  const getDayIcon = (index) => {
    switch (index) {
      case 0: return <Rocket className="w-5 h-5 text-kar-red" />;
      case 1: return <BookOpen className="w-5 h-5 text-amber-600" />;
      case 2: return <Flag className="w-5 h-5 text-kar-red" />;
      case 3: return <Theater className="w-5 h-5 text-purple-600" />;
      case 4: return <Store className="w-5 h-5 text-amber-600" />;
      case 5: return <Trophy className="w-5 h-5 text-kar-yellow-gold" />;
      default: return <Sparkles className="w-5 h-5 text-kar-red" />;
    }
  };

  const selectedDay = scheduleDays[selectedDayIndex] || scheduleDays[0];
  const localizedTagline = (day) => {
    const canonicalTaglines = {
      "ಉದ್ಘಾಟನೆ": { en: "Kala Karunadu", kn: "ಕಲಾ ಕರುನಾಡು", oldEn: "Inaugural Day", oldKn: "ಉದ್ಘಾಟನಾ ಸಮಾರಂಭ" },
      "ಕಲಾರಂಗ": { en: "Yuva Karunadu", kn: "ಯುವ ಕರುನಾಡು", oldEn: "Theatre & Performing Arts", oldKn: "ರಂಗಭೂಮಿ & ಪ್ರದರ್ಶನ ಕಲೆ" },
      "ಜಾತ್ರೆ": { en: "Karunada Jatre", kn: "ಕರುನಾಡ ಜಾತ್ರೆ", oldEn: "Village Fair & Carnival", oldKn: "ಗ್ರಾಮೀಣ ಜಾತ್ರೆ & ಮೇಳ" },
      "ಮಹಾ ಸಮಾರೋಪ ದಿನ": { en: "Samskruthika Karunadu", kn: "ಸಾಂಸ್ಕೃತಿಕ ಕರುನಾಡು", oldEn: "Grand Valedictory & Concert", oldKn: "ಮಹಾ ಸಮಾರೋಪ & ಸಂಗೀತ ಸಂಜೆ" },
    };
    const canonical = canonicalTaglines[day?.titleKn];
    const isLegacyEnglishTag = canonical && [canonical.en, canonical.oldEn].includes(day.tag);
    const isLegacyKannadaTag = canonical && [canonical.en, canonical.oldKn].includes(day.tagKn);
    if (lang === "kn" && isLegacyKannadaTag) return canonical.kn;
    if (lang !== "kn" && isLegacyEnglishTag) return canonical.en;
    return lang === "kn" ? day?.tagKn : day?.tag;
  };
  return (
    <section className="py-20 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 text-stone-100 relative overflow-hidden" id="schedule">
      {/* Decorative Traditional Kannada Motifs Background */}
      <div className="absolute top-0 left-0 right-0 h-1.5 karnataka-ribbon" />
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-kar-red to-kar-yellow text-white shadow-lg tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {lang === "kn" ? "ಅಧಿಕೃತ ಕಾರ್ಯಕ್ರಮ ಪಟ್ಟಿ ೨೦೨೬" : "Official Festival Schedule"}
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight mb-3">
            <span className="block text-amber-400">
              {lang === "kn" ? siteConfig.festival.nameKn : siteConfig.festival.name}
            </span>
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-kar-yellow via-amber-300 to-kar-yellow-light font-kannada-serif text-4xl sm:text-6xl font-bold">
              ಕರುನಾಡ ವೈಭವ
            </span>
          </h2>

          <p className="text-stone-300 text-sm sm:text-base font-bold font-kannada max-w-2xl mx-auto mb-6">
            {lang === "kn" 
              ? "ಅಕ್ಟೋಬರ್ ೩೦, ನವೆಂಬರ್ ೧, ೨, ೩ ಮತ್ತು ೪ ರಂದು ಆಚಾರ್ಯ ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ನಡೆಯುವ ೫ ದಿನಗಳ ಸಂಭ್ರಮದ ರೂಪುರೇಷೆ"
              : "Grand Heritage & Cultural Confluence at Acharya Institutes (30/10/2026 - 04/11/2026)"}
          </p>

          {/* Action buttons & View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* View Mode Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-stone-950/80 border border-stone-800 shadow-xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveView("schedule")}
                className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activeView === "schedule"
                    ? "bg-gradient-to-r from-kar-red to-amber-600 text-white shadow-md shadow-red-950/40"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Clock className="w-4 h-4 text-kar-yellow" />
                <span>{lang === "kn" ? "ದಿನವಾರು ವೇಳಾಪಟ್ಟಿ" : "5-Day Schedule"}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("calendar")}
                className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activeView === "calendar"
                    ? "bg-gradient-to-r from-kar-red to-amber-600 text-white shadow-md shadow-red-950/40"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Calendar className="w-4 h-4 text-kar-yellow" />
                <span>{lang === "kn" ? "ಅಧಿಕೃತ ಕ್ಯಾಲೆಂಡರ್" : "Official Calendar"}</span>
              </button>
            </div>

            <button
              onClick={() => setPosterModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-400/40 text-amber-300 hover:text-white text-xs sm:text-sm font-extrabold transition-all shadow-sm group cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-kar-yellow group-hover:scale-110 transition-transform" />
              <span>{lang === "kn" ? "ಅಧಿಕೃತ ಪೋಸ್ಟರ್ ವೀಕ್ಷಿಸಿ" : "View Official Plan Poster"}</span>
            </button>

            {onRegisterClick && (
              <button
                onClick={onRegisterClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-kar-red hover:bg-red-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-md cursor-pointer"
              >
                <span>{lang === "kn" ? "ಸ್ಪರ್ಧೆಗೆ ನೋಂದಾಯಿಸಿ" : "Register Now"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* View Mode: Official Plan Calendar */}
        {activeView === "calendar" && (
          <div className="bg-stone-900/90 rounded-3xl border-2 border-amber-400/40 p-4 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md animate-fade-in mb-10">
            <div className="absolute top-0 left-0 right-0 h-1.5 karnataka-ribbon" />

            {/* Calendar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-kar-red animate-pulse shrink-0" />
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-white font-display">
                    {lang === "kn" ? "ಕರುನಾಡ ವೈಭವ ೨೦೨೬ - ಅಧಿಕೃತ ಪೋಸ್ಟರ್" : "Karunada Vaibhava 2026 - Official Plan Poster"}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 font-kannada">
                    {lang === "kn" 
                      ? "೫ ದಿನಗಳ ಮಹೋತ್ಸವದ ಅಧಿಕೃತ ಕ್ಯಾಲೆಂಡರ್ ಹಾಗೂ ಕಾರ್ಯಕ್ರಮ ರೂಪುರೇಷೆ" 
                      : "Official 5-Day Cultural Confluence Calendar & Schedule"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="inline-flex rounded-xl bg-stone-950 p-1 border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setPosterLang("kn")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      posterLang === "kn"
                        ? "bg-gradient-to-r from-kar-red to-amber-600 text-white shadow-sm"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    ಕನ್ನಡ ಆವೃತ್ತಿ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterLang("en")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      posterLang === "en"
                        ? "bg-gradient-to-r from-kar-red to-amber-600 text-white shadow-sm"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    English Version
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPosterModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-400/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{lang === "kn" ? "ಪೂರ್ಣ ಪರದೆ" : "Fullscreen"}</span>
                </button>

                <a
                  href={posterLang === "kn" ? "/images/calendar-2026-kannada.png" : "/images/calendar-2026.png"}
                  download={posterLang === "kn" ? "Karunada_Vaibhava_2026_Calender_Kannada.png" : "Karunada_Vaibhava_2026_Calender_English.png"}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === "kn" ? "HD ಡೌನ್‌ಲೋಡ್" : "Download HD"}</span>
                </a>
              </div>
            </div>

            {/* Poster Preview Frame */}
            <div 
              onClick={() => setPosterModalOpen(true)}
              className="group relative cursor-pointer rounded-2xl overflow-hidden bg-black/95 border border-stone-800 p-2 sm:p-6 flex flex-col items-center justify-center transition-all hover:border-amber-400/60 shadow-inner"
            >
              <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-kar-yellow" />
                <span>{lang === "kn" ? "ದೊಡ್ಡದಾಗಿ ವೀಕ್ಷಿಸಲು ಕ್ಲಿಕ್ ಮಾಡಿ" : "Click to view full size"}</span>
              </div>

              <picture className="w-full flex justify-center">
                <source
                  srcSet={posterLang === "kn" ? "/images/calendar-2026-kannada.webp" : "/images/calendar-2026.webp"}
                  type="image/webp"
                />
                <img
                  src={posterLang === "kn" ? "/images/calendar-2026-kannada.png" : "/images/calendar-2026.png"}
                  alt={posterLang === "kn" ? "ಕರುನಾಡ ವೈಭವ ೨೦೨೬ - ಅಧಿಕೃತ ಪೋಸ್ಟರ್" : "Karunada Vaibhava 2026 - Official Plan Poster"}
                  className="max-h-[75vh] w-auto max-w-full rounded-xl shadow-2xl object-contain transform group-hover:scale-[1.01] transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </div>
          </div>
        )}

        {/* View Mode: Day-by-Day Schedule */}
        {activeView === "schedule" && (
          <>
        <div className="flex sm:hidden flex-col gap-3 mb-8">
          {scheduleDays.map((item, idx) => {
            const isDay3Rajyotsava = idx === 1;

            return (
              <div
                key={idx}
                onClick={() => setActiveDialogDay(item)}
                className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 relative border flex flex-col justify-between bg-stone-900/80 hover:bg-stone-800/90 border-stone-800 active:scale-[0.99] ${
                  isDay3Rajyotsava ? "ring-1 ring-amber-400/50" : ""
                }`}
              >
                {isDay3Rajyotsava && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black bg-kar-red text-white uppercase tracking-wider shadow">
                    {lang === "kn" ? "ರಾಜ್ಯೋತ್ಸವ" : "Rajyotsava"}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      {lang === "kn" ? item.dayKn : item.day}
                    </span>
                    <span className="p-1 rounded-lg bg-white/5">
                      {getDayIcon(idx)}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-sm leading-snug">
                    {lang === "kn" ? item.titleKn : item.title}
                  </h3>
                  {localizedTagline(item) && (
                    <p className="mt-1 text-[11px] font-bold tracking-wide text-amber-300">
                      {localizedTagline(item)}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-mono">{lang === "kn" ? (item.dateKn || formatKannadaDate(item.date)) : item.date}</span>
                  <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                    {lang === "kn" ? "ವಿವರ ವೀಕ್ಷಿಸಿ ↗" : "View Details ↗"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Laptop/Desktop Programme grid / tabs */}
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
          {scheduleDays.map((item, idx) => {
            const isSelected = idx === selectedDayIndex;
            const isDay3Rajyotsava = idx === 1; // Day 2: 1 November Rajyotsava

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDayIndex(idx);
                  setActiveDialogDay(item);
                }}
                className={`cursor-pointer rounded-2xl p-4 transition-all duration-300 relative border flex flex-col justify-between ${
                  isSelected
                    ? "bg-gradient-to-b from-amber-500/20 to-red-600/20 border-amber-400 shadow-xl shadow-amber-500/10 transform -translate-y-1"
                    : "bg-stone-900/80 hover:bg-stone-800/90 border-stone-800 hover:border-stone-700"
                } ${isDay3Rajyotsava ? "ring-1 ring-amber-400/50" : ""}`}
              >
                {isDay3Rajyotsava && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black bg-kar-red text-white uppercase tracking-wider shadow">
                    {lang === "kn" ? "ರಾಜ್ಯೋತ್ಸವ" : "Rajyotsava"}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      {lang === "kn" ? item.dayKn : item.day}
                    </span>
                    <span className="p-1 rounded-lg bg-white/5">
                      {getDayIcon(idx)}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug line-clamp-2 min-h-10">
                    {lang === "kn" ? item.titleKn : item.title}
                  </h3>
                  {localizedTagline(item) && (
                    <p className="mt-1 text-[10px] font-bold tracking-wide text-amber-300 truncate">
                      {localizedTagline(item)}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-mono">{lang === "kn" ? (item.dateKn || formatKannadaDate(item.date)) : item.date}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-kar-yellow" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Laptop/Desktop Selected Day Spotlight Card */}
        {selectedDay && (
          <div className="hidden sm:block bg-stone-900/90 rounded-3xl border-2 border-amber-400/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-kar-red via-kar-yellow to-kar-red" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Left Details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3.5 py-1 rounded-xl text-xs font-black bg-kar-red text-white uppercase tracking-wider">
                    {lang === "kn" ? selectedDay.dayKn : selectedDay.day}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-300 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-kar-yellow" />
                    <span>{lang === "kn" ? (selectedDay.dateKn || formatKannadaDate(selectedDay.date)) : selectedDay.date}</span>
                  </span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-black text-white font-display">
                  {lang === "kn" ? selectedDay.titleKn : selectedDay.title}
                </h3>
                {localizedTagline(selectedDay) && (
                  <p className="text-amber-300 font-bold tracking-wide">
                    {localizedTagline(selectedDay)}
                  </p>
                )}

                <p className="text-stone-300 text-sm sm:text-base font-kannada leading-relaxed">
                  {lang === "kn" ? selectedDay.descKn : selectedDay.descEn}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-kar-red" />
                    <span>{lang === "kn" ? (selectedDay.venueKn || formatKannadaVenue(selectedDay.venue)) : (selectedDay.venueEn || selectedDay.venue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-kar-yellow" />
                    <span>{lang === "kn" ? (selectedDay.timeKn || formatKannadaTime("9:00 AM Onwards")) : (selectedDay.timeEn || "9:00 AM Onwards")}</span>
                  </div>
                </div>
              </div>

              {/* Right Visual Badge with Dual Logos */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <img 
                    src="/images/acharya-logo-white.png?v=2026" 
                    alt="Acharya Institutes" 
                    className="h-14 w-auto object-contain drop-shadow"
                  />
                  <div className="h-10 w-[1px] bg-stone-700" />
                  <img 
                    src="/images/akv-logo.png" 
                    alt="Acharya Kannada Vedike" 
                    className="h-16 w-auto object-contain drop-shadow"
                  />
                </div>

                <div>
                  <h4 className="text-white font-extrabold text-sm">
                    {lang === "kn" ? "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ" : "Acharya Kannada Vedike"}
                  </h4>
                  <p className="text-[11px] text-amber-400 font-medium">
                    {lang === "kn" ? "ನುಡಿತರಂಗ - ೨೦೨೬" : "Nuditaranga - 2026"}
                  </p>
                </div>

                {onRegisterClick && (
                  <button
                    onClick={onRegisterClick}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-kar-yellow text-white text-xs font-black shadow hover:opacity-95 transition-opacity"
                  >
                    {lang === "kn" ? "ಈ ದಿನದ ಸ್ಪರ್ಧೆಗೆ ನೋಂದಣಿ" : "Register for Day Events"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
          </>
        )}

      </div>

      {/* Centered Dialogue Box Modal for Schedule Day Details */}
      {activeDialogDay && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setActiveDialogDay(null)}
        >
          <div
            className="relative w-[92%] sm:w-full max-w-lg bg-stone-950 rounded-3xl overflow-hidden border-2 border-amber-400/50 shadow-2xl my-auto max-h-[84dvh] sm:max-h-[88vh] flex flex-col animate-scale-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Karnataka Ribbon */}
            <div className="h-1.5 w-full karnataka-ribbon shrink-0" />

            {/* Header */}
            <div className="p-4 sm:p-6 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-kar-red text-white uppercase tracking-wider">
                  {lang === "kn" ? activeDialogDay.dayKn : activeDialogDay.day}
                </span>
                <span className="text-xs text-stone-300 font-mono flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-kar-yellow" />
                  {lang === "kn" ? (activeDialogDay.dateKn || formatKannadaDate(activeDialogDay.date)) : activeDialogDay.date}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveDialogDay(null)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label={lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white font-display">
                  {lang === "kn" ? activeDialogDay.titleKn : activeDialogDay.title}
                </h3>
                {localizedTagline(activeDialogDay) && (
                  <p className="mt-1 text-xs sm:text-sm font-bold tracking-wide text-amber-300">
                    {localizedTagline(activeDialogDay)}
                  </p>
                )}
              </div>

              <p className="text-stone-300 text-xs sm:text-sm font-kannada leading-relaxed">
                {lang === "kn" ? activeDialogDay.descKn : activeDialogDay.descEn}
              </p>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-kar-red shrink-0" />
                  <span>{lang === "kn" ? (activeDialogDay.venueKn || formatKannadaVenue(activeDialogDay.venue)) : (activeDialogDay.venueEn || activeDialogDay.venue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-kar-yellow shrink-0" />
                  <span>{lang === "kn" ? (activeDialogDay.timeKn || formatKannadaTime("9:00 AM Onwards")) : (activeDialogDay.timeEn || "9:00 AM Onwards")}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-5 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0">
              {onRegisterClick ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDialogDay(null);
                    onRegisterClick();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-kar-yellow text-white text-xs font-black shadow hover:opacity-95 transition-opacity"
                >
                  {lang === "kn" ? "ಈ ದಿನದ ಸ್ಪರ್ಧೆಗೆ ನೋಂದಣಿ" : "Register for Day Events"}
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setActiveDialogDay(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal for Full-Size Poster Inspection */}
      {posterModalOpen && typeof document !== "undefined" && createPortal(
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setPosterModalOpen(false)}
        >
          <div 
            className="relative w-[96%] sm:w-full max-w-3xl bg-stone-950 rounded-3xl overflow-hidden border-2 border-amber-400/50 shadow-2xl flex flex-col max-h-[92vh] my-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Ribbon */}
            <div className="h-1.5 w-full karnataka-ribbon shrink-0" />

            {/* Modal Header */}
            <div className="p-3 sm:p-5 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-kar-red animate-pulse shrink-0" />
                <h4 className="text-xs sm:text-base font-extrabold text-white truncate">
                  {lang === "kn" ? "ಕರುನಾಡ ವೈಭವ ೨೦೨೬ - ಅಧಿಕೃತ ಪೋಸ್ಟರ್" : "Karunada Vaibhava 2026 - Official Plan Poster"}
                </h4>
              </div>

              {/* Action controls: Language toggle, HD Download, Close */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex rounded-xl bg-stone-800 p-0.5 sm:p-1 border border-stone-700/80">
                  <button
                    type="button"
                    onClick={() => setPosterLang("kn")}
                    className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      posterLang === "kn"
                        ? "bg-gradient-to-r from-kar-red to-amber-600 text-white shadow-sm"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    ಕನ್ನಡ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosterLang("en")}
                    className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      posterLang === "en"
                        ? "bg-gradient-to-r from-kar-red to-amber-600 text-white shadow-sm"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    English
                  </button>
                </div>

                <a
                  href={posterLang === "kn" ? "/images/calendar-2026-kannada.png" : "/images/calendar-2026.png"}
                  download={posterLang === "kn" ? "Karunada_Vaibhava_2026_Calender_Kannada.png" : "Karunada_Vaibhava_2026_Calender_English.png"}
                  className="p-1.5 sm:p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 transition-colors hidden sm:inline-flex items-center gap-1.5 text-xs font-bold"
                  title={lang === "kn" ? "ಮೂಲ ಪೋಸ್ಟರ್ ಡೌನ್‌ಲೋಡ್ (HD)" : "Download Original HD Poster"}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">{lang === "kn" ? "ಡೌನ್‌ಲೋಡ್" : "Download"}</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPosterModalOpen(false)}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Poster Image Container */}
            <div className="p-2 sm:p-4 overflow-y-auto flex items-center justify-center bg-black/95 flex-1 relative">
              <picture className="flex items-center justify-center max-w-full">
                <source
                  srcSet={posterLang === "kn" ? "/images/calendar-2026-kannada.webp" : "/images/calendar-2026.webp"}
                  type="image/webp"
                />
                <img
                  src={posterLang === "kn" ? "/images/calendar-2026-kannada.png" : "/images/calendar-2026.png"}
                  alt={posterLang === "kn" ? "ಕರುನಾಡ ವೈಭವ ೨೦೨೬ - ಅಧಿಕೃತ ಪೋಸ್ಟರ್" : "Karunada Vaibhava 2026 - Official Plan Poster"}
                  className="max-h-[70vh] sm:max-h-[78vh] w-auto max-w-full rounded-2xl shadow-2xl border border-stone-800 object-contain mx-auto select-none"
                  loading="eager"
                  decoding="async"
                />
              </picture>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-stone-900 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 shrink-0">
              <span className="truncate">
                {lang === "kn" 
                  ? "ಆಚಾರ್ಯ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ಸ್ • ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ • ೩೦/೧೦/೨೦೨೬ ರಿಂದ ೦೪/೧೧/೨೦೨೬"
                  : "Acharya Institutes • Acharya Kannada Vedike • 30/10/2026 to 04/11/2026"}
              </span>
              <a
                href={posterLang === "kn" ? "/images/calendar-2026-kannada.png" : "/images/calendar-2026.png"}
                download={posterLang === "kn" ? "Karunada_Vaibhava_2026_Calender_Kannada.png" : "Karunada_Vaibhava_2026_Calender_English.png"}
                className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1.5 sm:hidden"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === "kn" ? "HD ಡೌನ್‌ಲೋಡ್" : "Download HD"}</span>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
