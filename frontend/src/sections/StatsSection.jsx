import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { Users, Sparkles, Trophy, History } from "lucide-react";

export const StatsSection = () => {
  const { lang, t } = useLanguage();

  const statIcons = [
    <Users className="w-6 h-6 text-kar-red" />,
    <Sparkles className="w-6 h-6 text-amber-500" />,
    <Trophy className="w-6 h-6 text-red-600" />,
    <History className="w-6 h-6 text-amber-600" />,
  ];

  return (
    <section className="py-16 bg-white border-y border-stone-200/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-kar-red uppercase tracking-widest block mb-1">
            {lang === "kn" ? "ಸಾಧನೆಯ ಮೈಲಿಗಲ್ಲುಗಳು" : "Milestones of Glory"}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display">
            {t("stats.heading")}
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 font-kannada mt-1">
            {t("stats.subheading")}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {siteConfig.stats.map((stat, index) => (
            <div
              key={index}
              className="p-6 rounded-3xl bg-stone-50/80 border border-stone-200/80 hover:border-amber-300 hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-stone-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {statIcons[index % statIcons.length]}
              </div>

              <span className="text-3xl sm:text-4xl font-black text-stone-900 font-display tracking-tight group-hover:text-kar-red transition-colors">
                {lang === "kn" ? (stat.numberKn || stat.number) : stat.number}
              </span>

              <span className="text-xs sm:text-sm font-bold text-stone-600 font-kannada mt-1.5 leading-snug">
                {lang === "kn" ? stat.labelKn : stat.labelEn}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
