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
      // Oct 30, 2026, 14:30:00 IST = Oct 30, 2026, 09:00:00 UTC
      const targetUtc = Date.UTC(2026, 9, 30, 9, 0, 0);
      const now = Date.now();
      const difference = targetUtc - now;

      if (!isNaN(difference) && difference > 0) {
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
    { label: lang === "kn" ? (t("hero.days") && t("hero.days") !== "hero.days" ? t("hero.days") : "ದಿನಗಳು") : "Days", value: timeLeft.days },
    { label: lang === "kn" ? (t("hero.hours") && t("hero.hours") !== "hero.hours" ? t("hero.hours") : "ಗಂಟೆಗಳು") : "Hours", value: timeLeft.hours },
    { label: lang === "kn" ? (t("hero.minutes") && t("hero.minutes") !== "hero.minutes" ? t("hero.minutes") : "ನಿಮಿಷಗಳು") : "Minutes", value: timeLeft.minutes },
    { label: lang === "kn" ? (t("hero.seconds") && t("hero.seconds") !== "hero.seconds" ? t("hero.seconds") : "ಸೆಕೆಂಡುಗಳು") : "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto notranslate" translate="no">
      <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center notranslate" translate="no">
        {timeBlocks.map((block, index) => {
          const formattedValue = String(block.value).padStart(2, "0");
          return (
            <div
              key={index}
              className="relative bg-white/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-amber-200/70 shadow-lg shadow-amber-900/5 group hover:border-kar-red transition-all notranslate"
              translate="no"
            >
              {/* Top mini accent line */}
              <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-kar-red to-kar-yellow rounded-b-full" />
              
              <div className="text-2xl sm:text-4xl font-extrabold text-stone-900 font-display tracking-tight group-hover:text-kar-red transition-colors notranslate" translate="no">
                {lang === "kn" ? toKannadaDigits(formattedValue) : formattedValue}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-amber-800/80 uppercase tracking-wider mt-1 notranslate" translate="no">
                {block.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
