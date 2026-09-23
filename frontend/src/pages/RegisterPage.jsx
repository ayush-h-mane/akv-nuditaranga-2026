import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useLanguage } from "../context/LanguageContext";
import { api } from "../services/api";
import { 
  toKannadaDigits, 
  formatKannadaDate, 
  formatKannadaTime, 
  formatKannadaVenue 
} from "../utils/kannadaUtils";
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles, 
  User, 
  Users, 
  Plus, 
  Trash2, 
  Calendar, 
  MapPin, 
  ShieldCheck 
} from "lucide-react";

export const RegisterPage = ({ 
  selectedEventId, 
  setSelectedEventId, 
  setCurrentView, 
  setConfirmedRegistration 
}) => {
  const { lang, t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [participationMode, setParticipationMode] = useState("solo"); // "solo" or "group"

  // Form Fields
  const [formData, setFormData] = useState({
    eventId: selectedEventId || "",
    fullName: "",
    auid: "",
    usn: "",
    institute: "Acharya Institute of Technology",
    department: "",
    semester: 6,
    section: "A",
    email: "",
    phone: "",
    gender: "Male",
    teamName: "",
    teamMembers: []
  });

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await api.getEvents();
        setEvents(data);
        if (selectedEventId) {
          setFormData(prev => ({ ...prev, eventId: selectedEventId }));
          const pre = data.find(e => e.id === selectedEventId);
          if (pre?.format === "team") {
            setParticipationMode("group");
          } else {
            setParticipationMode("solo");
          }
          setCurrentStep(2); // If already clicked an event from previous page, jump to step 2
        }
      } catch (e) {
        console.error("Error loading events in registration:", e);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === formData.eventId);

  const isTeamRegistration = selectedEvent?.format === "both" 
    ? participationMode === "group" 
    : Boolean(selectedEvent?.is_team);

  const handleEventSelect = (id) => {
    const ev = events.find(e => e.id === id);
    setFormData(prev => ({ ...prev, eventId: id, teamMembers: [], teamName: "" }));
    if (ev?.format === "team") {
      setParticipationMode("group");
    } else {
      setParticipationMode("solo");
    }
    setSelectedEventId(id);
    setErrorMessage("");
  };

  // Add/Remove Team Member
  const handleAddMember = () => {
    if (!selectedEvent) return;
    const maxLimit = selectedEvent.max_team_size || 4;
    if (formData.teamMembers.length >= (maxLimit - 1)) {
      setErrorMessage(
        lang === "kn"
          ? `ಈ ಸ್ಪರ್ಧೆಗೆ ಗರಿಷ್ಠ ತಂಡದ ಗಾತ್ರ ${toKannadaDigits(maxLimit)} ಸದಸ್ಯರು.`
          : `Maximum team size for this event is ${maxLimit} members.`
      );
      return;
    }
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { name: "", auid: "", usn: "", phone: "" }]
    }));
  };

  const handleRemoveMember = (index) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index)
    }));
  };

  const handleMemberChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.teamMembers];
      updated[index][field] = value;
      return { ...prev, teamMembers: updated };
    });
  };

  // Validations
  const validateStep2 = () => {
    setErrorMessage("");
    if (!formData.fullName.trim()) {
      return lang === "kn" ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ." : "Please enter your full name.";
    }
    
    // AUID Validation
    const cleanAuid = formData.auid.trim().toUpperCase();
    if (!/^[0-9A-Z\-]{3,30}$/.test(cleanAuid)) {
      return lang === "kn" 
        ? "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಆಚಾರ್ಯ ಯೂನಿಕ್ ಐಡಿ (AUID) ನಮೂದಿಸಿ (ಉದಾ: AIT22BE123)." 
        : "Please enter a valid Acharya Unique ID (AUID) (e.g., AIT22BE123).";
    }

    // Institute Validation
    if (!formData.institute.trim()) {
      return lang === "kn" 
        ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂಸ್ಥೆ / ಕಾಲೇಜು ಹೆಸರನ್ನು ನಮೂದಿಸಿ." 
        : "Please enter your Institute / College name.";
    }

    // Department Validation (Manual entry)
    if (!formData.department.trim()) {
      return lang === "kn" 
        ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಿಭಾಗ / ಕೋರ್ಸ್ ನಮೂದಿಸಿ." 
        : "Please enter your Department / Branch.";
    }

    // Phone Validation (10 digits)
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return lang === "kn" 
        ? "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ೧೦ ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ." 
        : "Please enter a valid 10-digit mobile number.";
    }

    // Email Validation
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      return lang === "kn" 
        ? "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ." 
        : "Please enter a valid email address.";
    }

    // Team Validations if event is team or group mode selected
    if (isTeamRegistration) {
      if (!formData.teamName.trim()) {
        return lang === "kn" 
          ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ತಂಡದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ." 
          : "Please enter your Team / Group Name.";
      }
      const minRequired = selectedEvent.format === "both" 
        ? (selectedEvent.min_team_size || 2) 
        : selectedEvent.min_team_size;
      const totalTeamCount = formData.teamMembers.length + 1;
      if (totalTeamCount < minRequired) {
        return lang === "kn" 
          ? `ಈ ಸ್ಪರ್ಧೆಗೆ ಗುಂಪು ನೋಂದಣಿಗೆ ಕನಿಷ್ಠ ${toKannadaDigits(minRequired)} ಸದಸ್ಯರು ಅಗತ್ಯ. ದಯವಿಟ್ಟು ತಂಡದ ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ.` 
          : `Group participation for this event requires a minimum of ${minRequired} members. Please add team members.`;
      }
      // Check each member info
      for (let i = 0; i < formData.teamMembers.length; i++) {
        const m = formData.teamMembers[i];
        if (!m.name.trim() || !(m.auid || m.usn)?.trim()) {
          return lang === "kn" 
            ? `ದಯವಿಟ್ಟು ತಂಡದ ಸದಸ್ಯ #${toKannadaDigits(i + 2)} ರ ಹೆಸರು ಮತ್ತು AUID ಭರ್ತಿ ಮಾಡಿ.` 
            : `Please fill name and AUID for Team Member #${i + 2}.`;
        }
      }
    }

    return null;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.eventId) {
        setErrorMessage(t("registration.selectEventPrompt"));
        return;
      }
      setErrorMessage("");
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      const error = validateStep2();
      if (error) {
        setErrorMessage(error);
        return;
      }
      setErrorMessage("");
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setErrorMessage("");
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Registration Submission
  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        event_id: formData.eventId,
        full_name: formData.fullName.trim(),
        auid: formData.auid.trim().toUpperCase(),
        usn: formData.auid.trim().toUpperCase(),
        institute: formData.institute.trim(),
        department: formData.department.trim(),
        semester: Number(formData.semester),
        section: formData.section.trim().toUpperCase(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        is_team: isTeamRegistration,
        team_name: isTeamRegistration ? formData.teamName.trim() : null,
        team_members: isTeamRegistration 
          ? formData.teamMembers.map(m => ({
              name: m.name.trim(),
              auid: (m.auid || m.usn || "").trim().toUpperCase(),
              usn: (m.auid || m.usn || "").trim().toUpperCase(),
              phone: (m.phone || "").trim()
            }))
          : []
      };

      const result = await api.createRegistration(payload);

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#dc2626', '#fbbf24', '#f59e0b', '#10b981']
        });
      } catch (e) {}

      // Save confirmed registration and switch to confirmation page
      setConfirmedRegistration(result);
      setCurrentView("confirmation");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      setErrorMessage(err.message || (lang === "kn" ? "ನೋಂದಣಿ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ." : "Registration failed. Please check details."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Heading */}
        <div className="text-center mb-8">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-red-50 text-kar-red border border-red-200 uppercase tracking-wider">
            {lang === "kn" ? "ನುಡಿತರಂಗ ೨೦೨೬" : "Nuditaranga 2026"}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 font-display mt-2 mb-1">
            {t("registration.heading")}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-kannada">
            {t("registration.subheading")}
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="mb-10 max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            {[
              { num: 1, label: t("registration.step1") },
              { num: 2, label: t("registration.step2") },
              { num: 3, label: t("registration.step3") },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <div key={step.num} className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all mb-1.5 ${
                      isPast
                        ? "bg-green-600 text-white shadow-sm"
                        : isActive
                        ? "bg-gradient-to-r from-kar-red to-kar-yellow text-white shadow-md scale-105"
                        : "bg-white border border-stone-200 text-stone-400"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : (lang === "kn" ? toKannadaDigits(step.num) : step.num)}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-bold leading-tight ${isActive ? "text-stone-900" : "text-stone-400"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-kar-red" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: SELECT EVENT ================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-display">
                  {lang === "kn" ? "ಭಾಗವಹಿಸಲು ಸ್ಪರ್ಧೆಯನ್ನು ಆರಿಸಿ" : "Choose Competition to Register"}
                </h3>
                <p className="text-xs text-stone-500 font-kannada">
                  {lang === "kn" ? "ಕೆಳಗಿನ ಪಟ್ಟಿಯಿಂದ ನಿಮ್ಮ ಆಸಕ್ತಿಯ ಸ್ಪರ್ಧೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select an active event from the list below"}
                </p>
              </div>
            </div>

            {loadingEvents ? (
              <p className="text-xs font-bold text-stone-400 py-8 text-center">
                {lang === "kn" ? "ಸ್ಪರ್ಧೆಗಳ ವಿವರಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ..." : "Loading competitions..."}
              </p>
            ) : events.length === 0 ? (
              <div className="py-14 px-6 text-center bg-stone-50 rounded-3xl border-2 border-dashed border-stone-300">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Calendar className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-stone-900 font-display mb-1">
                  {lang === "kn" ? "ಪ್ರಸ್ತುತ ಯಾವುದೇ ಸ್ಪರ್ಧೆಗಳು ಲಭ್ಯವಿಲ್ಲ" : "No Competitions Currently Available"}
                </h4>
                <p className="text-xs sm:text-sm text-stone-500 font-kannada max-w-md mx-auto leading-relaxed">
                  {lang === "kn"
                    ? "ನುಡಿತರಂಗ ೨೦೨೬ ರ ಸ್ಪರ್ಧೆಗಳ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ನೋಂದಣಿ ಶೀಘ್ರದಲ್ಲೇ ತೆರೆಯಲಾಗುವುದು. ದಯವಿಟ್ಟು ನಂತರ ಪ್ರಯತ್ನಿಸಿ."
                    : "Competitions for Nuditaranga 2026 will be announced soon. Please check back later or contact fest coordinators."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {events.map((ev) => {
                  const isSelected = formData.eventId === ev.id;
                  const isFull = (ev.registered_count || 0) >= ev.max_slots;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => !isFull && handleEventSelect(ev.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isFull
                          ? "opacity-50 cursor-not-allowed bg-stone-100 border-stone-200"
                          : isSelected
                          ? "border-kar-red bg-red-50/50 shadow-md ring-2 ring-red-200"
                          : "border-stone-200 hover:border-amber-300 hover:bg-amber-50/30"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 uppercase">
                            {lang === "kn" ? ev.category_kn : ev.category}
                          </span>
                          <span className="text-[11px] font-semibold text-stone-500">
                            {ev.format === "both" 
                              ? `${t("events.both")} (${lang === "kn" ? "೧" : "1"}-${lang === "kn" ? toKannadaDigits(ev.max_team_size) : ev.max_team_size})` 
                              : ev.is_team 
                              ? `${t("events.team")} (${lang === "kn" ? toKannadaDigits(ev.min_team_size) : ev.min_team_size}-${lang === "kn" ? toKannadaDigits(ev.max_team_size) : ev.max_team_size})` 
                              : t("events.individual")}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-stone-900 mb-1 font-display">
                          {lang === "kn" ? ev.title_kn : ev.title_en}
                        </h4>
                        <p className="text-xs text-stone-500 font-kannada line-clamp-2 mb-2">
                          {lang === "kn" ? ev.description_kn : ev.description_en}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-stone-200/50 flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">{lang === "kn" ? formatKannadaDate(ev.event_date) : ev.event_date}</span>
                        <span className={`font-bold ${isFull ? "text-red-600" : "text-amber-800"}`}>
                          {isFull 
                            ? (lang === "kn" ? "ಸ್ಥಾನಗಳು ಭರ್ತಿಯಾಗಿವೆ" : "Slots Full") 
                            : (lang === "kn" ? `${toKannadaDigits(ev.max_slots - (ev.registered_count || 0))} ಬಾಕಿ` : `${ev.max_slots - (ev.registered_count || 0)} left`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                onClick={handleNext}
                disabled={!formData.eventId || events.length === 0}
                className="px-7 py-3 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-kar-red to-kar-yellow shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <span>{t("registration.btnNext")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PARTICIPANT DETAILS ================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            {/* Selected Event Preview Banner */}
            {selectedEvent && (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                    {t("registration.eventSelected")}
                  </span>
                  <h4 className="text-base font-extrabold text-stone-900 font-display">
                    {lang === "kn" ? selectedEvent.title_kn : selectedEvent.title_en}
                  </h4>
                  <span className="text-xs text-stone-600 font-kannada">
                    {lang === "kn" ? formatKannadaDate(selectedEvent.event_date) : selectedEvent.event_date} • {lang === "kn" ? formatKannadaTime(selectedEvent.event_time) : selectedEvent.event_time} • {lang === "kn" ? (selectedEvent.venue_kn || formatKannadaVenue(selectedEvent.venue)) : selectedEvent.venue}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-kar-red hover:underline self-start sm:self-center"
                >
                  {lang === "kn" ? "ಸ್ಪರ್ಧೆ ಬದಲಿಸಿ" : "Change Event"}
                </button>
              </div>
            )}

            {/* If format is 'both', allow choosing between Solo and Group */}
            {selectedEvent?.format === "both" && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block font-bold text-stone-900 text-xs sm:text-sm">
                      {t("events.chooseParticipation")} *
                    </label>
                    <p className="text-[11px] text-stone-500 font-kannada">
                      {lang === "kn" 
                        ? "ಈ ಸ್ಪರ್ಧೆಯಲ್ಲಿ ನೀವು ವೈಯಕ್ತಿಕವಾಗಿ (Solo) ಅಥವಾ ತಂಡವಾಗಿ (Group) ಭಾಗವಹಿಸಬಹುದು." 
                        : "You can participate individually as Solo or register with a Group/Team."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParticipationMode("solo");
                        setFormData(prev => ({ ...prev, teamMembers: [], teamName: "" }));
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                        participationMode === "solo"
                          ? "bg-white border-kar-red text-kar-red shadow-sm ring-2 ring-red-100"
                          : "bg-white/60 border-stone-200 text-stone-600 hover:bg-white hover:border-stone-300"
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>{t("events.modeSolo")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setParticipationMode("group")}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                        participationMode === "group"
                          ? "bg-white border-amber-600 text-amber-900 shadow-sm ring-2 ring-amber-100"
                          : "bg-white/60 border-stone-200 text-stone-600 hover:bg-white hover:border-stone-300"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{t("events.modeGroup")}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              
              {/* Full Name */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t("registration.fullName")} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={lang === "kn" ? "ಉದಾ: ಪ್ರಜ್ವಲ್ ಗೌಡ" : "e.g. Prajwal Gowda"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                />
              </div>

              {/* AUID */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t("registration.auid") || (lang === "kn" ? "ಆಚಾರ್ಯ ಯೂನಿಕ್ ಐಡಿ (AUID) *" : "Acharya Unique ID (AUID) *")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.auid}
                  onChange={(e) => setFormData({ ...formData, auid: e.target.value.toUpperCase(), usn: e.target.value.toUpperCase() })}
                  placeholder={lang === "kn" ? "ಉದಾ: AIT22BE123" : "e.g. AIT22BE123"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                />
              </div>

              {/* Institute */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t("registration.institute") || (lang === "kn" ? "ಸಂಸ್ಥೆ / ಕಾಲೇಜು *" : "Institute / College Name *")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.institute}
                  onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                  placeholder={lang === "kn" ? "ಉದಾ: ಆಚಾರ್ಯ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿ" : "e.g. Acharya Institute of Technology"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                />
              </div>

              {/* Department (Manual Entry) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t("registration.department") || (lang === "kn" ? "ವಿಭಾಗ / ಕೋರ್ಸ್ *" : "Department / Course *")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder={lang === "kn" ? "ಉದಾ: ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್, ಇಇಇ, ಎಂಬಿಎ..." : "e.g. Computer Science & Engineering, MBA..."}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red bg-white"
                />
              </div>

              {/* Semester & Section Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {t("registration.semester")} *
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>
                        {lang === "kn" ? `${toKannadaDigits(num)}ನೇ ಸೆಮಿಸ್ಟರ್` : `Sem ${num}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {t("registration.section")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                    placeholder={lang === "kn" ? "ಉದಾ: A" : "e.g. A"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 uppercase focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                  />
                </div>
              </div>

              {/* College Email */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t("registration.email")} *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={lang === "kn" ? "ಉದಾ: yourname@acharya.ac.in" : "e.g. yourname@acharya.ac.in"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                />
              </div>

              {/* Phone (WhatsApp) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t("registration.phone")} *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={lang === "kn" ? "೧೦ ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ" : "10-digit mobile number"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                />
              </div>

              {/* Gender */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-stone-700 mb-1">
                  {t("registration.gender")} *
                </label>
                <div className="flex items-center gap-6 pt-1">
                  {["Male", "Female", "Other"].map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={formData.gender === g}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="text-kar-red focus:ring-kar-red"
                      />
                      <span className="font-semibold text-stone-700">
                        {g === "Male" ? t("registration.genderMale") : g === "Female" ? t("registration.genderFemale") : t("registration.genderOther")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Team Members Section (if Team Event or Group mode selected) */}
            {isTeamRegistration && (
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-600" />
                    <h4 className="font-bold text-stone-900 text-sm">
                      {t("registration.teamDetails")} ({lang === "kn" ? "ಗಾತ್ರ: " : "Size: "} {lang === "kn" ? toKannadaDigits(selectedEvent.format === "both" ? (selectedEvent.min_team_size || 2) : selectedEvent.min_team_size) : (selectedEvent.format === "both" ? (selectedEvent.min_team_size || 2) : selectedEvent.min_team_size)} {lang === "kn" ? "ರಿಂದ" : "to"} {lang === "kn" ? toKannadaDigits(selectedEvent.max_team_size) : selectedEvent.max_team_size})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("registration.addMember")}</span>
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-xs mb-1">
                    {t("registration.teamName")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    placeholder={lang === "kn" ? "ಉದಾ: ನುಡಿ ಸಿಂಹಗಳು" : "e.g. Nudi Simhagalu"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white"
                  />
                </div>

                {/* Team Lead Indicator */}
                <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900">{lang === "kn" ? "ಸದಸ್ಯ #೧ (ತಂಡದ ನಾಯಕ): " : "Member #1 (Team Lead): "}</span>
                    <span className="text-stone-600">{formData.fullName || (lang === "kn" ? "ನಿಮ್ಮ ವಿವರಗಳು (ಮೇಲೆ ನೀಡಲಾಗಿದೆ)" : "Your Details (above)")}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-kar-red text-white uppercase">
                    {lang === "kn" ? "ನಾಯಕ" : "Lead"}
                  </span>
                </div>

                {/* Additional Team Members */}
                {formData.teamMembers.map((member, index) => (
                  <div key={index} className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800 text-xs">
                        {lang === "kn" ? `ಸದಸ್ಯ #${toKannadaDigits(index + 2)}` : `Member #${index + 2}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("registration.removeMember")}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder={t("registration.memberName")}
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, "name", e.target.value)}
                        className="px-3 py-2 rounded-lg border border-stone-300 text-xs"
                      />
                      <input
                        type="text"
                        placeholder={t("registration.memberAuid") || (lang === "kn" ? "ಸದಸ್ಯರ AUID" : "Member AUID")}
                        value={member.auid || member.usn || ""}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          handleMemberChange(index, "auid", val);
                          handleMemberChange(index, "usn", val);
                        }}
                        className="px-3 py-2 rounded-lg border border-stone-300 text-xs uppercase font-mono"
                      />
                      <input
                        type="tel"
                        placeholder={t("registration.memberPhone")}
                        value={member.phone || ""}
                        onChange={(e) => handleMemberChange(index, "phone", e.target.value)}
                        className="px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t("registration.btnBack")}</span>
              </button>

              <button
                onClick={handleNext}
                className="px-7 py-3 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-kar-red to-kar-yellow shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <span>{t("registration.btnNext")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* ================= STEP 3: REVIEW & CONFIRM ================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            <div className="border-b border-stone-100 pb-4">
              <h3 className="text-lg font-bold text-stone-900 font-display">
                {lang === "kn" ? "ನೋಂದಣಿ ವಿವರಗಳ ಅಂತಿಮ ಪರಿಶೀಲನೆ" : "Review Registration Summary"}
              </h3>
              <p className="text-xs text-stone-500 font-kannada">
                {lang === "kn" ? "ದಯವಿಟ್ಟು ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ನೋಂದಣಿಯನ್ನು ದೃಢೀಕರಿಸಿ" : "Ensure all credentials are accurate before submitting"}
              </p>
            </div>

            {/* Review Summary Grid */}
            <div className="space-y-4 text-xs sm:text-sm">
              
              {/* Event Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                  {t("pass.event")}
                </span>
                <h4 className="text-base font-black text-stone-900 font-display">
                  {lang === "kn" ? selectedEvent?.title_kn : selectedEvent?.title_en}
                </h4>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-amber-200 text-xs text-stone-600">
                  <div>
                    <span className="text-stone-400 block font-semibold">{t("pass.date")}:</span>
                    <span className="font-bold text-stone-800">
                      {lang === "kn" ? formatKannadaDate(selectedEvent?.event_date) : selectedEvent?.event_date} ({lang === "kn" ? formatKannadaTime(selectedEvent?.event_time) : selectedEvent?.event_time})
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-semibold">{t("pass.venue")}:</span>
                    <span className="font-bold text-stone-800">
                      {lang === "kn" ? (selectedEvent?.venue_kn || formatKannadaVenue(selectedEvent?.venue)) : selectedEvent?.venue}
                    </span>
                  </div>
                </div>
              </div>

              {/* Participant Details */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  {lang === "kn" ? "ಸ್ಪರ್ಧಿಯ ವಿವರಗಳು" : "Participant Details"}
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-stone-400 block text-xs">{t("registration.fullName")}:</span>
                    <span className="font-bold text-stone-900">{formData.fullName}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-xs">{t("registration.auid")}:</span>
                    <span className="font-bold text-kar-red font-mono">{formData.auid || formData.usn}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-xs">{t("registration.institute")}:</span>
                    <span className="font-semibold text-stone-800">{formData.institute}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-xs">{t("registration.department")}:</span>
                    <span className="font-semibold text-stone-800">
                      {formData.department} ({lang === "kn" ? `${toKannadaDigits(formData.semester)}ನೇ ಸೆಮ್, ವಿಭಾಗ ${formData.section}` : `Sem ${formData.semester}, Sec ${formData.section}`})
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-xs">{t("registration.phone")}:</span>
                    <span className="font-semibold text-stone-800 font-mono">{formData.phone}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-xs">{t("registration.email")}:</span>
                    <span className="font-semibold text-stone-800">{formData.email}</span>
                  </div>
                </div>
              </div>

              {/* Team Review if applicable */}
              {isTeamRegistration && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                    {t("registration.teamDetails")}
                  </span>
                  <p className="text-sm font-bold text-stone-900">
                    {lang === "kn" ? "ತಂಡ: " : "Team: "}<span className="text-kar-red">{formData.teamName}</span> ({lang === "kn" ? `${toKannadaDigits(formData.teamMembers.length + 1)} ಸದಸ್ಯರು` : `${formData.teamMembers.length + 1} Members`})
                  </p>
                  <div className="space-y-1 text-xs text-stone-600">
                    <div>{lang === "kn" ? "೧. " : "1. "}{formData.fullName} ({formData.auid || formData.usn}) - {lang === "kn" ? "ತಂಡದ ನಾಯಕ" : "Team Lead"}</div>
                    {formData.teamMembers.map((m, i) => (
                      <div key={i}>{lang === "kn" ? `${toKannadaDigits(i + 2)}. ` : `${i + 2}. `}{m.name} ({m.auid || m.usn})</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Undertaking Declaration */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs text-stone-600 font-kannada flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-kar-red flex-shrink-0 mt-0.5" />
                <span>
                  {lang === "kn"
                    ? "ನಾನು ಆಚಾರ್ಯ ತಾಂತ್ರಿಕ ಮಹಾವಿದ್ಯಾಲಯದ ನಿಯಮಗಳಿಗೆ ಹಾಗೂ ನುಡಿತರಂಗ ೨೦೨೬ ಸ್ಪರ್ಧಾ ನಿಯಮಾವಳಿಗಳಿಗೆ ಬದ್ಧನಾಗಿರುತ್ತೇನೆ ಎಂದು ದೃಢೀಕರಿಸುತ್ತೇನೆ."
                    : "I hereby confirm that all submitted particulars are authentic and I agree to abide by the festival code of conduct."}
                </span>
              </div>

            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={submitting}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t("registration.btnBack")}</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <span>{t("registration.submitting")}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>{t("registration.btnSubmit")}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
