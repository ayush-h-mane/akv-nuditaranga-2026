import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { EventCard } from "../components/EventCard";
import { RulesModal } from "../components/RulesModal";
import { Search, Filter, Sparkles, RefreshCw, ShieldAlert, ArrowRight } from "lucide-react";

export const EventsPage = ({ setCurrentView, setSelectedEventId }) => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalEvent, setModalEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(selectedCategory);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEvent = (eventId) => {
    setSelectedEventId(eventId);
    if (user) {
      setCurrentView("student-dashboard");
    } else {
      setCurrentView("auth");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredEvents = events.filter((ev) => {
    const titleMatch = (lang === "kn" ? ev.title_kn : ev.title_en)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const descMatch = (lang === "kn" ? ev.description_kn : ev.description_en)
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return titleMatch || descMatch;
  });

  const categoryTabs = [
    { id: "all", label: t("events.filterAll") },
    { id: "literary", label: t("events.filterLiterary") },
    { id: "cultural", label: t("events.filterCultural") },
    { id: "traditional", label: t("events.filterTraditional") },
  ];

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
            {t("events.badge")}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 font-display mt-3 mb-3">
            {t("events.heading")}
          </h1>
          <p className="text-xs sm:text-base text-stone-600 font-kannada">
            {t("events.subheading")}
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-sm mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {categoryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                  selectedCategory === tab.id
                    ? "bg-gradient-to-r from-kar-red to-kar-yellow text-white shadow"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("events.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
            />
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-kar-red animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-stone-600">
              {lang === "kn" ? "ಸ್ಪರ್ಧೆಗಳ ವಿವರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ..." : "Loading competition list..."}
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-kar-red" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 font-display mb-1">
              {lang === "kn" ? "ಪ್ರಸ್ತುತ ಯಾವುದೇ ಸ್ಪರ್ಧೆಗಳು ಲಭ್ಯವಿಲ್ಲ" : "No Competitions Currently Scheduled"}
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 font-kannada max-w-md mx-auto">
              {lang === "kn" 
                ? "ನುಡಿತರಂಗ ೨೦೨೬ ರ ಸಾಂಸ್ಕೃತಿಕ ಸ್ಪರ್ಧೆಗಳ ಪಟ್ಟಿಯನ್ನು ಶೀಘ್ರದಲ್ಲೇ ಪ್ರಕಟಿಸಲಾಗುವುದು. ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ."
                : "The competition schedule and registrations for Nuditaranga 2026 will be announced soon. Please stay tuned!"}
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-stone-200 p-8">
            <p className="text-base font-bold text-stone-700">
              {lang === "kn" ? "ಯಾವುದೇ ಸ್ಪರ್ಧೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ." : "No competitions found matching your search."}
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-kar-red bg-red-50 hover:bg-red-100"
            >
              {lang === "kn" ? "ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ" : "Clear Filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onOpenRules={(event) => setModalEvent(event)}
                onRegister={handleRegisterEvent}
              />
            ))}
          </div>
        )}

        {/* Rules & Guidelines Modal */}
        <RulesModal
          event={modalEvent}
          isOpen={!!modalEvent}
          onClose={() => setModalEvent(null)}
          onRegister={handleRegisterEvent}
        />

      </div>
    </div>
  );
};
