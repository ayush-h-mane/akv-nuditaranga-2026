import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { Users, User, Calendar, MapPin, Clock, BookOpen, ArrowRight } from "lucide-react";
import { formatKannadaDate, formatKannadaTime, formatKannadaVenue, toKannadaDigits } from "../utils/kannadaUtils";

export const EventCard = ({ event, onOpenRules, onRegister }) => {
  const { lang, t } = useLanguage();

  const title = lang === "kn" ? event.title_kn : event.title_en;
  const description = lang === "kn" ? event.description_kn : event.description_en;
  const venue = lang === "kn" ? (event.venue_kn || formatKannadaVenue(event.venue)) : event.venue;
  const categoryLabel = lang === "kn" ? event.category_kn : event.category.toUpperCase();

  const slotsAvailable = Math.max(0, event.max_slots - (event.registered_count || 0));
  const isFull = slotsAvailable <= 0;
  const percentFilled = Math.min(100, Math.round(((event.registered_count || 0) / event.max_slots) * 100));

  const categoryColorMap = {
    literary: "bg-red-50 text-kar-red border-red-200",
    cultural: "bg-amber-50 text-amber-800 border-amber-200",
    traditional: "bg-orange-50 text-orange-800 border-orange-200",
  };

  return (
    <div className="group relative bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-[transform,box-shadow,border-color] duration-300 cubic-bezier(0.16,1,0.3,1) transform-gpu will-change-transform hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between">
      
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-kar-red via-kar-yellow to-amber-500 transform group-hover:scale-x-105 transition-transform duration-300 ease-out" />

      <div className="p-6 flex-1 flex flex-col">
        {/* Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${categoryColorMap[event.category] || "bg-stone-100 text-stone-700"}`}>
            {categoryLabel}
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
            {event.format === "both" ? (
              <>
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  {t("events.both")} ({lang === "kn" ? `೧-${toKannadaDigits(event.max_team_size)}` : `1-${event.max_team_size}`})
                </span>
              </>
            ) : event.is_team ? (
              <>
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {t("events.team")} ({lang === "kn" ? `${toKannadaDigits(event.min_team_size)}-${toKannadaDigits(event.max_team_size)}` : `${event.min_team_size}-${event.max_team_size}`})
                </span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-kar-red" />
                <span>{t("events.individual")}</span>
              </>
            )}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-stone-900 group-hover:text-kar-red transition-colors font-display mb-2 line-clamp-1">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-stone-600 font-kannada leading-relaxed mb-4 line-clamp-2">
          {description}
        </p>

        {/* Details Grid */}
        <div className="space-y-1.5 text-xs text-stone-500 mt-auto pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-kar-red flex-shrink-0" />
            <span className="font-medium text-stone-700">
              {lang === "kn" ? formatKannadaDate(event.event_date) : event.event_date}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>{lang === "kn" ? formatKannadaTime(event.event_time) : event.event_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span className="line-clamp-1">{venue}</span>
          </div>
        </div>

        {/* Slots Progress Bar */}
        <div className="mt-4 pt-3 border-t border-stone-100">
          <div className="flex justify-between text-[11px] font-semibold mb-1">
            <span className="text-stone-500">{t("events.slotsLeft")}</span>
            <span className={isFull ? "text-red-600 font-bold" : "text-amber-800 font-bold"}>
              {isFull ? t("events.fullBadge") : (lang === "kn" ? `${toKannadaDigits(slotsAvailable)} / ${toKannadaDigits(event.max_slots)} ಲಭ್ಯ` : `${slotsAvailable} / ${event.max_slots}`)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-[width] duration-700 cubic-bezier(0.16,1,0.3,1) ${isFull ? "bg-red-500" : "bg-gradient-to-r from-kar-red to-kar-yellow"}`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onOpenRules(event)}
          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-200/80 active:scale-95 transition-all duration-150 flex items-center justify-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{t("events.rulesBtn")}</span>
        </button>

        <button
          disabled={isFull}
          onClick={() => onRegister(event.id)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white shadow transition-all duration-150 flex items-center justify-center gap-1.5 ${
            isFull
              ? "bg-stone-300 cursor-not-allowed text-stone-500"
              : "bg-gradient-to-r from-kar-red to-kar-yellow hover:shadow-md hover:brightness-105 active:scale-95"
          }`}
        >
          <span>{isFull ? t("events.fullBadge") : t("events.registerBtn")}</span>
          {!isFull && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
