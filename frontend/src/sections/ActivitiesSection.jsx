import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { api } from "../services/api";
import { ArrowUpRight, Sparkles, Calendar } from "lucide-react";

export const ActivitiesSection = () => {
  const { lang, t } = useLanguage();
  const [activities, setActivities] = useState([
    {
      id: 1,
      category: "Nuditaranga",
      title_en: "Nuditaranga Annual Inter-College Fest",
      title_kn: "ನುಡಿತರಂಗ ವಾರ್ಷಿಕ ಸಾಂಸ್ಕೃತಿಕ ಹಬ್ಬ",
      desc_en: "Flagship cultural extravaganza with over 25+ events spanning literature, classical singing, folk dances, rangoli, and street theatre.",
      desc_kn: "ಸಾಹಿತ್ಯ, ಸುಗಮ ಸಂಗೀತ, ಜಾನಪದ ನೃತ್ಯ, ರಂಗೋಲಿ ಮತ್ತು ಬೀದಿ ನಾಟಕಗಳನ್ನೊಳಗೊಂಡ ೨೫ಕ್ಕೂ ಹೆಚ್ಚು ಸ್ಪರ್ಧೆಗಳ ಮಹಾಸಂಗಮ.",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
      is_active: true
    }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await api.getActivities("all", true);
      if (data && data.length > 0) {
        setActivities(data);
      }
    } catch (err) {
      console.warn("Failed to load activities from API, using default:", err);
    } finally {
      setLoading(false);
    }
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

        {/* Activities Cards Grid */}
        {activities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((act) => {
              const title = lang === "kn" ? (act.title_kn || act.titleKn) : (act.title_en || act.titleEn);
              const desc = lang === "kn" ? (act.desc_kn || act.descKn) : (act.desc_en || act.descEn);

              return (
                <div
                  key={act.id}
                  className="bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 overflow-hidden flex flex-col group"
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
  )
  }

      </div >
    </section >
  );
};
