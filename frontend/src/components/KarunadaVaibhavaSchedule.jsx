import React, { useState } from "react";
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
  CheckCircle2
} from "lucide-react";

export const KarunadaVaibhavaSchedule = ({ onRegisterClick }) => {
  const { lang, t } = useLanguage();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [posterModalOpen, setPosterModalOpen] = useState(false);

  const scheduleDays = siteConfig.festival.schedule || [];

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
              {lang === "kn" ? "ಅಧಿಕೃತ ಕಾರ್ಯಕ್ರಮ ಪಟ್ಟಿ ೨೦೨೬" : "Official 6-Day Festival Schedule"}
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
              ? "ಅಕ್ಟೋಬರ್ ೩೦ ರಿಂದ ನವೆಂಬರ್ ೪ ರವರೆಗೆ ಆಚಾರ್ಯ ಕ್ಯಾಂಪಸ್‌ನಲ್ಲಿ ನಡೆಯುವ ೬ ದಿನಗಳ ಸಂಭ್ರಮದ ರೂಪುರೇಷೆ"
              : "6 Days of Grand Heritage & Cultural Confluence at Acharya Institutes (30/10/2026 - 04/11/2026)"}
          </p>

          {/* Action to view the uploaded Draft Poster */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPosterModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-400/40 text-amber-300 hover:text-white text-xs font-extrabold transition-all shadow-sm group"
            >
              <Maximize2 className="w-4 h-4 text-kar-yellow group-hover:scale-110 transition-transform" />
              <span>{lang === "kn" ? "ಮೂಲ ಪೋಸ್ಟರ್ ವೀಕ್ಷಿಸಿ" : "View Official Draft Poster"}</span>
            </button>

            {onRegisterClick && (
              <button
                onClick={onRegisterClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-kar-red hover:bg-red-700 text-white text-xs font-extrabold transition-all shadow-md"
              >
                <span>{lang === "kn" ? "ಸ್ಪರ್ಧೆಗೆ ನೋಂದಾಯಿಸಿ" : "Register Now"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 6-Day Grid / Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {scheduleDays.map((item, idx) => {
            const isSelected = idx === selectedDayIndex;
            const isDay3Rajyotsava = idx === 2; // Day 3 Flag Hoist

            return (
              <div
                key={idx}
                onClick={() => setSelectedDayIndex(idx)}
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

                  <h3 className="font-extrabold text-white text-sm sm:text-base leading-snug line-clamp-1">
                    {lang === "kn" ? item.titleKn : item.title}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-mono">{lang === "kn" ? (item.dateKn || formatKannadaDate(item.date)) : item.date}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-kar-yellow" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Spotlight Card */}
        {selectedDay && (
          <div className="bg-stone-900/90 rounded-3xl border-2 border-amber-400/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-kar-red via-kar-yellow to-kar-red" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Left Details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3.5 py-1 rounded-xl text-xs font-black bg-kar-red text-white uppercase tracking-wider">
                    {lang === "kn" ? selectedDay.dayKn : selectedDay.day}
                  </span>
                  <span className="px-3.5 py-1 rounded-xl text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {lang === "kn" ? selectedDay.tagKn : selectedDay.tag}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-300 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-kar-yellow" />
                    <span>{lang === "kn" ? (selectedDay.dateKn || formatKannadaDate(selectedDay.date)) : selectedDay.date}</span>
                  </span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-black text-white font-display">
                  {lang === "kn" ? selectedDay.titleKn : selectedDay.title}
                </h3>

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

      </div>

      {/* Modal for Full-Size Poster Inspection */}
      {posterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative max-w-2xl w-full bg-stone-950 rounded-3xl overflow-hidden border border-amber-400/40 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-kar-red" />
                <h4 className="text-sm font-bold text-white">
                  {lang === "kn" ? "ಕರುನಾಡ ವೈಭವ ೨೦೨೬ - ಅಧಿಕೃತ ಕರಡು ಪೋಸ್ಟರ್" : "Karunada Vaibhava 2026 - Official Draft Plan Poster"}
                </h4>
              </div>
              <button
                onClick={() => setPosterModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex items-center justify-center bg-black">
              <img
                src="/images/rajyotsava-draft-poster.jpg"
                alt="Nuditaranga 2026 Karunada Vaibhava Plan"
                className="max-h-[75vh] w-auto rounded-xl shadow-lg border border-stone-800"
              />
            </div>

            <div className="p-3 bg-stone-900 border-t border-stone-800 text-center text-xs text-stone-400">
              {lang === "kn" 
                ? "ಆಚಾರ್ಯ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ಸ್ • ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ • ೩೦/೧೦/೨೦೨೬ ರಿಂದ ೦೪/೧೧/೨೦೨೬"
                : "Acharya Institutes • Acharya Kannada Vedike • 30/10/2026 to 04/11/2026"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
