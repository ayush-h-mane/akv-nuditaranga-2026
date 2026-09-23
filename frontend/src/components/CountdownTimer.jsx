import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { toKannadaDigits } from "../utils/kannadaUtils";

export const CountdownTimer = () => {
  const { lang, t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(siteConfig.festival.targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeBlocks = [
    { label: t("hero.days"), value: timeLeft.days },
    { label: t("hero.hours"), value: timeLeft.hours },
    { label: t("hero.minutes"), value: timeLeft.minutes },
    { label: t("hero.seconds"), value: timeLeft.seconds },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
        {timeBlocks.map((block, index) => {
          const formattedValue = String(block.value).padStart(2, "0");
          return (
            <div
              key={index}
              className="relative bg-white/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-amber-200/70 shadow-lg shadow-amber-900/5 group hover:border-kar-red transition-all"
            >
              {/* Top mini accent line */}
              <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-kar-red to-kar-yellow rounded-b-full" />
              
              <div className="text-2xl sm:text-4xl font-extrabold text-stone-900 font-display tracking-tight group-hover:text-kar-red transition-colors">
                {lang === "kn" ? toKannadaDigits(formattedValue) : formattedValue}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-amber-800/80 uppercase tracking-wider mt-1">
                {block.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
