import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";
import { api } from "../services/api";
import { useHistoryModal } from "../utils/useHistoryModal";
import { ArrowUpRight, Sparkles, Calendar, X } from "lucide-react";

export const ActivitiesSection = () => {
  const { lang, t } = useLanguage();
  const [activities, setActivities] = useState(() => api.getCachedActivities("all", true));
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useHistoryModal(Boolean(selectedActivity), () => setSelectedActivity(null));

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await api.getActivities("all", true);
      if (data && data.length > 0) {
        setActivities(data);
      }
    } catch (err) {
      console.warn("Failed to load activities from API, using default:", err);
    }
  };

  const getActivityTitle = (act) => {
    if (!act) return "";
    if (lang === "kn") {
      return act.title_kn || act.titleKn || act.title_en || act.titleEn || act.title || "";
    }
    return act.title_en || act.titleEn || act.title || act.title_kn || act.titleKn || "";
  };

  const getActivityDesc = (act) => {
    if (!act) return "";
    if (lang === "kn") {
      return act.desc_kn || act.descKn || act.desc_en || act.descEn || act.description || "";
    }
    return act.desc_en || act.descEn || act.description || act.desc_kn || act.descKn || "";
  };

  return (
    <section id="activities" className="py-20 bg-stone-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
            {t("activities.badge")}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-stone-900 font-display mt-3 mb-3">
            {t("activities.heading")}
          </h2>
          <p className="text-xs sm:text-base text-stone-600 font-kannada">
            {t("activities.subheading")}
          </p>
        </div>

        {/* Mobile View: Compact Activity Cards */}
        {activities.length > 0 ? (
          <>
            <div className="flex sm:hidden flex-col gap-3">
              {activities.map((act) => {
                const title = getActivityTitle(act);
                const desc = getActivityDesc(act);

                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActivity(act)}
                    className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-xs flex gap-3 items-center cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                      <img
                        src={act.image || act.image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {act.activity_date && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 font-mono mb-0.5">
                          <Calendar className="w-2.5 h-2.5 text-kar-red" />
                          <span>{act.activity_date}</span>
                        </span>
                      )}
                      <h3 className="text-xs font-bold text-stone-900 font-display line-clamp-1 mb-0.5">
                        {title}
                      </h3>
                      <p className="text-[11px] text-stone-500 font-kannada line-clamp-2 leading-snug">
                        {desc}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-kar-red mt-1"
                      >
                        <span>{t("activities.viewDetails") || (lang === "kn" ? "ವಿವರ ವೀಕ್ಷಿಸಿ" : "View Details")}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Laptop/Desktop View: Unchanged standard 3-column grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {activities.map((act) => {
                const title = getActivityTitle(act);
                const desc = getActivityDesc(act);

                return (
                  <div
                    key={act.id}
                    className="bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
                    onClick={() => setSelectedActivity(act)}
                  >
                    {/* Image Container */}
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100">
                      <img
                        src={act.image || act.image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      {act.activity_date && (
                        <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>{act.activity_date}</span>
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900 group-hover:text-kar-red transition-colors font-display mb-2">
                          {title}
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-600 font-kannada leading-relaxed">
                          {desc}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-800">
                        <span className="font-kannada">{lang === "kn" ? "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ" : "Acharya Kannada Vedike"}</span>
                        <span className="flex items-center gap-1 text-kar-red group-hover:translate-x-1 transition-transform">
                          <span>{t("activities.viewDetails") || (lang === "kn" ? "ವಿವರ ವೀಕ್ಷಿಸಿ" : "View Details")}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-stone-200 max-w-xl mx-auto shadow-sm">
            <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {lang === "kn" ? "ಚಟುವಟಿಕೆಗಳು ಶೀಘ್ರದಲ್ಲೇ ಪ್ರಕಟವಾಗಲಿವೆ" : "Activities Coming Soon"}
            </h3>
            <p className="text-xs text-stone-500">
              {lang === "kn"
                ? "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆಯ ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಗಾಗಿ ನಿರೀಕ್ಷಿಸಿ."
                : "Stay tuned for upcoming campus activities and announcements."}
            </p>
          </div>
        )}

      </div>

      {/* Activity Details Dialogue Box Modal (Portaled to document.body for flawless mobile ratio & z-index) */}
      {selectedActivity && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-[backdropFade_0.2s_ease-out_forwards] overflow-y-auto min-h-[100dvh]"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="relative w-[92%] sm:w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col my-auto max-h-[85dvh] sm:max-h-[88vh] animate-scale-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Karnataka Ribbon */}
            <div className="h-1.5 w-full karnataka-ribbon shrink-0" />

            {/* Header Image with balanced mobile ratio */}
            <div className="relative h-36 sm:h-52 w-full overflow-hidden bg-stone-950 shrink-0">
              <img
                src={selectedActivity.image || selectedActivity.image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"}
                alt={getActivityTitle(selectedActivity)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white transition-colors cursor-pointer shadow-md"
                aria-label={lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {selectedActivity.activity_date && (
                <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-black/75 text-white backdrop-blur-xs flex items-center gap-1.5 shadow-md font-mono">
                  <Calendar className="w-3.5 h-3.5 text-kar-yellow" />
                  <span>{selectedActivity.activity_date}</span>
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1 overscroll-contain">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                <span>{selectedActivity.category || "Acharya Kannada Vedike"}</span>
              </div>

              <h3 className="text-base sm:text-2xl font-black text-stone-900 font-display leading-snug">
                {getActivityTitle(selectedActivity)}
              </h3>

              {/* Subtitle in the other language if available */}
              {(() => {
                const altTitle = lang === "kn"
                  ? (selectedActivity.title_en || selectedActivity.titleEn || selectedActivity.title)
                  : (selectedActivity.title_kn || selectedActivity.titleKn);
                const currentTitle = getActivityTitle(selectedActivity);
                if (altTitle && altTitle !== currentTitle) {
                  return (
                    <p className="text-xs sm:text-sm font-semibold text-amber-800 font-kannada">
                      {altTitle}
                    </p>
                  );
                }
                return null;
              })()}

              <p className="text-xs sm:text-sm text-stone-700 font-kannada leading-relaxed whitespace-pre-line pt-1">
                {getActivityDesc(selectedActivity)}
              </p>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 shrink-0">
              <span className="font-semibold text-[11px] sm:text-xs text-stone-600 truncate mr-2">
                {lang === "kn" ? "ಆಚಾರ್ಯ ವಿದ್ಯಾಸಂಸ್ಥೆಗಳು" : "Acharya Institutions"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 text-xs transition-transform active:scale-95 shadow-sm cursor-pointer shrink-0"
              >
                {lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
