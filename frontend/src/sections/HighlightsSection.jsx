import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";
import { api } from "../services/api";
import {
  festivalHighlights,
  highlightCategories
} from "../config/highlightsData";
import { useHistoryModal } from "../utils/useHistoryModal";
import {
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  X,
  Trophy,
  Users,
  Compass,
  CheckCircle2,
  ChevronRight,
  BookmarkCheck,
  Flame
} from "lucide-react";

export const HighlightsSection = ({ onRegister, onViewEvents, onExploreSchedule }) => {
  const { lang, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [highlights, setHighlights] = useState(() => api.getCachedHighlights() || festivalHighlights);

  useHistoryModal(Boolean(selectedHighlight), () => setSelectedHighlight(null));

  useEffect(() => {
    let mounted = true;
    api.getHighlights().then((data) => {
      if (mounted && data?.highlights && Array.isArray(data.highlights)) {
        setHighlights(data.highlights);
      }
    }).catch(() => {});

    const handleUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setHighlights(e.detail);
      }
    };

    const handleStorage = (e) => {
      if ((e.key === "akv_festival_highlights_v2" || e.key === "akv_festival_highlights_v1") && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setHighlights(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener("akv_highlights_updated", handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      mounted = false;
      window.removeEventListener("akv_highlights_updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Sync selectedHighlight if highlights are updated live while detail modal is open
  useEffect(() => {
    if (selectedHighlight) {
      const refreshed = highlights.find((h) => h.id === selectedHighlight.id);
      if (refreshed) {
        setSelectedHighlight(refreshed);
      }
    }
  }, [highlights]);

  // Gracefully hide entire section if no highlights exist in catalog
  if (!highlights || highlights.length === 0) {
    return null;
  }

  const filteredHighlights = activeCategory === "all"
    ? highlights
    : highlights.filter((h) => h.category === activeCategory);

  return (
    <section id="highlights" className="py-20 sm:py-24 bg-gradient-to-b from-stone-950 via-neutral-950 to-stone-900 text-white relative overflow-hidden">
      {/* Decorative Golden & Crimson Ambient Glow Orbs */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ==================================================== */}
        {/* SECTION HEADER                                       */}
        {/* ==================================================== */}
        <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-900/60 via-amber-900/60 to-red-900/60 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-950/40 mb-4 backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-kar-yellow animate-pulse" />
            <span>
              {lang === "kn" ? "ನುಡಿತರಂಗ ೨೦೨೬ ರ ಪ್ರಮುಖ ಆಕರ್ಷಣೆಗಳು" : "Highlights of Nuditaranga 2026"}
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white mb-4">
            {lang === "kn" ? (
              <>
                ಉತ್ಸವದ ಭವ್ಯ <span className="text-transparent bg-clip-text bg-gradient-to-r from-kar-yellow via-amber-300 to-amber-500">ಆಕರ್ಷಣೆಗಳು</span>
              </>
            ) : (
              <>
                Grand Festival <span className="text-transparent bg-clip-text bg-gradient-to-r from-kar-yellow via-amber-300 to-amber-500">Highlights</span>
              </>
            )}
          </h2>

          <p className="text-xs sm:text-base text-stone-300 font-kannada max-w-2xl mx-auto leading-relaxed">
            {lang === "kn"
              ? "ಕರ್ನಾಟಕದ ಹೆಮ್ಮೆಯ ಪರಂಪರೆ, ಯಕ್ಷಗಾನ, ಸಾಂಪ್ರದಾಯಿಕ ಕರುನಾಡ ಜಾತ್ರೆ, ಅಖಂಡ ಸಾಹಿತ್ಯ ಸಂಭ್ರಮ ಹಾಗೂ ತಾರಾ ಸಂಗೀತ ಸಂಜೆಯ ಅವಿಸ್ಮರಣೀಯ ಕಲಾ ಪ್ರಸ್ತುತಿಗಳು."
              : "Immerse yourself in Karnataka's golden heritage, coastal Yakshagana, the bustling village carnival, literary conclaves, and star-studded musical nights."}
          </p>
        </div>

        {/* ==================================================== */}
        {/* CATEGORY FILTER TABS                                 */}
        {/* ==================================================== */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 sm:mb-12 no-scrollbar">
          {highlightCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-gradient-to-r from-kar-red to-amber-600 text-white shadow-lg shadow-red-900/30 scale-102 border border-amber-400/30"
                    : "bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10 hover:border-white/20"
                }`}
              >
                <span>{lang === "kn" ? cat.labelKn : cat.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* ==================================================== */}
        {/* HIGHLIGHTS CARDS GRID                                */}
        {/* ==================================================== */}
        {filteredHighlights.length === 0 ? (
          <div className="py-16 text-center text-stone-400 font-kannada bg-white/5 rounded-3xl border border-white/10 max-w-xl mx-auto p-8">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm sm:text-base font-semibold">
              {lang === "kn"
                ? "ಈ ವಿಭಾಗದಲ್ಲಿ ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಆಕರ್ಷಣೆಗಳಿಲ್ಲ."
                : "No attractions found in this category yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredHighlights.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedHighlight(item)}
                className="group relative rounded-3xl bg-stone-900/80 border border-white/10 hover:border-amber-400/50 shadow-xl hover:shadow-2xl hover:shadow-amber-950/30 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer transform hover:-translate-y-1.5"
              >
              {/* Card Image with Overlays */}
              <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-stone-950">
                <img
                  src={item.image}
                  alt={lang === "kn" ? item.titleKn : item.titleEn}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                />
                
                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />

                {/* Day Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-stone-950/80 backdrop-blur-md border border-amber-400/40 text-amber-300 shadow-md">
                    {item.scheduleDay}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-kar-red/90 text-white backdrop-blur-md shadow-md">
                    {lang === "kn" ? item.tagKn : item.tagEn}
                  </span>
                </div>

                {/* Date on bottom right of image */}
                <div className="absolute bottom-3 right-3 text-[11px] font-bold text-amber-300 bg-black/75 px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5 border border-white/10">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>{lang === "kn" ? item.dateKn : item.dateEn}</span>
                </div>
              </div>

              {/* Card Content Body */}
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white font-display group-hover:text-amber-300 transition-colors line-clamp-1 mb-1">
                    {lang === "kn" ? item.titleKn : item.titleEn}
                  </h3>

                  <p className="text-xs text-amber-400/90 font-medium font-kannada line-clamp-1 mb-3">
                    {lang === "kn" ? item.subtitleKn : item.subtitleEn}
                  </p>

                  <p className="text-xs text-stone-300/90 font-kannada line-clamp-3 leading-relaxed mb-4">
                    {lang === "kn" ? item.descKn : item.descEn}
                  </p>
                </div>

                {/* Badges / Micro-tags */}
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {((lang === "kn" ? (item.badgesKn || item.badgesEn) : (item.badgesEn || item.badgesKn)) || []).slice(0, 3).map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 border border-white/10 text-stone-300"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* Card Footer: Venue and Action */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-stone-400 truncate max-w-[200px]" title={lang === "kn" ? item.venueKn : item.venueEn}>
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate text-[11px] font-kannada">{lang === "kn" ? item.venueKn : item.venueEn}</span>
                    </div>

                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                      <span>{lang === "kn" ? "ವಿವರ ವೀಕ್ಷಿಸಿ" : "Explore"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* ==================================================== */}
        {/* BOTTOM ACTION BANNER                                 */}
        {/* ==================================================== */}
        <div className="mt-16 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/70 via-stone-900 to-amber-950/70 border border-amber-400/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="text-center md:text-left">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
              {lang === "kn" ? "ನೀವು ನುಡಿತರಂಗದಲ್ಲಿ ಭಾಗವಹಿಸಲು ಸಿದ್ಧರೇ?" : "Ready to Experience Nuditaranga 2026?"}
            </span>
            <h4 className="text-xl sm:text-2xl font-black text-white font-display">
              {lang === "kn" ? "ಸ್ಪರ್ಧೆಗಳಿಗೆ ನೋಂದಾಯಿಸಿ & ಕಲಾ ಪ್ರತಿಭೆ ಮೆರೆಯಿರಿ" : "Register Now & Showcase Your Artistic Talent"}
            </h4>
            <p className="text-xs sm:text-sm text-stone-300 font-kannada mt-1 max-w-xl">
              {lang === "kn"
                ? "ಆಚಾರ್ಯ ಕ್ಯಾಂಪಸ್‌ನ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಸ್ಪರ್ಧೆಗಳಿಗೆ ಮುಕ್ತ ನೋಂದಣಿ. ಆಕರ್ಷಕ ನಗದು ಬಹುಮಾನಗಳು ಮತ್ತು ವಿಟಿಯು ಅಂಕಗಳು ಲಭ್ಯ."
                : "Open to all Acharya students. Compete across solo & team categories for prestigious trophies and official VTU activity credits."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            {onRegister && (
              <button
                type="button"
                onClick={onRegister}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-kar-red to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg hover:shadow-red-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{lang === "kn" ? "ಸ್ಪರ್ಧೆಗಳಿಗೆ ನೋಂದಾಯಿಸಿ" : "Register for Events"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {onExploreSchedule && (
              <button
                type="button"
                onClick={onExploreSchedule}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-stone-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{lang === "kn" ? "ವೇಳಾಪಟ್ಟಿ ಪರಿಶೀಲಿಸಿ" : "View Full Schedule"}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ==================================================== */}
      {/* HIGHLIGHT DETAIL MODAL DIALOG                        */}
      {/* ==================================================== */}
      {selectedHighlight && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedHighlight(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-stone-900 rounded-3xl shadow-2xl border border-amber-400/40 overflow-hidden transform transition-all animate-scale-up my-auto max-h-[90vh] flex flex-col text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Hero */}
            <div className="relative h-60 sm:h-72 w-full overflow-hidden shrink-0 bg-stone-950">
              <img
                src={selectedHighlight.image}
                alt={lang === "kn" ? selectedHighlight.titleKn : selectedHighlight.titleEn}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/50 to-transparent" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedHighlight(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Day & Category Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-stone-950/85 backdrop-blur-md border border-amber-400/40 text-amber-300">
                  {selectedHighlight.scheduleDay}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-kar-red/90 text-white backdrop-blur-md">
                  {lang === "kn" ? selectedHighlight.tagKn : selectedHighlight.tagEn}
                </span>
              </div>

              {/* Title Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl sm:text-2xl font-black text-white font-display">
                  {lang === "kn" ? selectedHighlight.titleKn : selectedHighlight.titleEn}
                </h3>
                <p className="text-xs sm:text-sm text-amber-300 font-semibold font-kannada mt-0.5">
                  {lang === "kn" ? selectedHighlight.subtitleKn : selectedHighlight.subtitleEn}
                </p>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-stone-200">
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      {lang === "kn" ? "ದಿನಾಂಕ & ಸಮಯ" : "Date & Timing"}
                    </span>
                    <span className="text-xs font-bold text-white font-kannada">
                      {lang === "kn" ? selectedHighlight.dateKn : selectedHighlight.dateEn}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      {lang === "kn" ? "ಕಾರ್ಯಕ್ರಮ ಸ್ಥಳ" : "Venue Location"}
                    </span>
                    <span className="text-xs font-bold text-white font-kannada">
                      {lang === "kn" ? selectedHighlight.venueKn : selectedHighlight.venueEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4" />
                  <span>{lang === "kn" ? "ವಿಶೇಷ ವಿವರಣೆ" : "Overview & Special Highlights"}</span>
                </h4>
                <p className="text-xs sm:text-sm text-stone-300 font-kannada leading-relaxed">
                  {lang === "kn" ? selectedHighlight.fullDescKn : selectedHighlight.fullDescEn}
                </p>
              </div>

              {/* Highlights Feature Badges */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
                  {lang === "kn" ? "ಪ್ರಮುಖ ವೈಶಿಷ್ಟ್ಯಗಳು" : "Key Attractions"}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {((lang === "kn" ? (selectedHighlight.badgesKn || selectedHighlight.badgesEn) : (selectedHighlight.badgesEn || selectedHighlight.badgesKn)) || []).map((badge, bIdx) => (
                    <div
                      key={bIdx}
                      className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-kar-yellow" />
                      <span>{badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 bg-stone-950 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedHighlight(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
              </button>

              <div className="flex items-center gap-2">
                {onRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHighlight(null);
                      onRegister();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>{lang === "kn" ? "ನೋಂದಣಿ ಮಾಡಿ" : "Register Now"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </section>
  );
};
