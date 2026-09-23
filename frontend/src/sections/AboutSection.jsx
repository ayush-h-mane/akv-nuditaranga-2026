import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { BookOpen, Sparkles, Trophy, Users, HeartHandshake, Feather } from "lucide-react";

export const AboutSection = () => {
  const { lang, t } = useLanguage();

  const pillarIcons = [
    <Feather className="w-6 h-6 text-kar-red" />,
    <Sparkles className="w-6 h-6 text-amber-500" />,
    <Trophy className="w-6 h-6 text-red-600" />,
    <Users className="w-6 h-6 text-amber-600" />,
  ];

  const pillars = t("about.pillars") || [];

  return (
    <section id="about" className="py-20 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-amber-50/70 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-red-50 text-kar-red border border-red-200 uppercase tracking-wider">
            {t("about.badge")}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 font-display mt-3 mb-4">
            {t("about.heading")}
          </h2>
          <p className="text-sm sm:text-base font-bold text-amber-800 font-kannada mb-4">
            {t("about.subheading")}
          </p>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-kannada">
            {t("about.description")}
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="relative bg-stone-50/90 rounded-3xl p-6 border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-amber-400 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
            >
              {/* Pillar Accent Line */}
              <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-kar-red to-kar-yellow rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                <div className="w-12 h-12 rounded-2xl bg-white shadow-md border border-amber-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  {pillarIcons[index % pillarIcons.length]}
                </div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  {pillar.subtitle}
                </span>

                <h3 className="text-xl font-bold text-stone-900 font-display mb-3 group-hover:text-kar-red transition-colors">
                  {pillar.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 font-kannada leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-stone-200/60 flex items-center justify-between text-xs font-bold text-amber-800">
                <span>{lang === "kn" ? `೦${["೧", "೨", "೩", "೪"][index] || index + 1}` : `0${index + 1}`}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  ಆ.ಕಂ.ವೇ
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Campus Legacy Banner */}
        <div className="mt-16 rounded-3xl p-8 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 left-0 bottom-0 w-2 karnataka-ribbon" />

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              {lang === "kn" ? "ಹೆಮ್ಮೆಯ ಪರಂಪರೆ" : "Heritage of Excellence"}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-display">
              {lang === "kn" 
                ? "ತಾಂತ್ರಿಕ ಪ್ರತಿಭೆಗಳ ನಡುವೆ ಜೀವಂತವಾದ ಕನ್ನಡದ ಕಂಪು" 
                : "Cultivating Linguistic Pride Amongst Tomorrow's Engineers"}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl font-kannada leading-relaxed">
              {lang === "kn"
                ? "ಆಚಾರ್ಯ ಕ್ಯಾಂಪಸ್‌ನ ವಿವಿಧ ರಾಜ್ಯ ಹಾಗೂ ದೇಶಗಳ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಕರ್ನಾಟಕದ ಸಂಸ್ಕೃತಿಯನ್ನು ಪರಿಚಯಿಸುವ ಮಹತ್ವದ ವೇದಿಕೆಯಾಗಿ ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆಯು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿದೆ."
                : "Serving as a cultural ambassador introducing students from diverse backgrounds across India and abroad to the magnificent traditions of Karnataka."}
            </p>
          </div>

          <div className="flex-shrink-0">
            <div className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-kar-yellow font-display block">
                {lang === "kn" ? "೧೦೦%" : "100%"}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-300">
                {lang === "kn" ? "ಸಾಂಸ್ಕೃತಿಕ ಸಮರ್ಪಣೆ" : "Student Driven"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
