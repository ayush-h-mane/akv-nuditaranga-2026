import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useModalAlert } from "../context/ModalAlertContext";
import { api } from "../services/api";
import { ACHARYA_EMAIL_ERROR, isAcharyaEmail } from "../utils/emailValidation";
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
import { Instagram } from "../components/InstagramIcon";
import { isReelContestEvent } from "../config/eventsData";

export const RegisterPage = ({ 
  selectedEventId, 
  setSelectedEventId, 
  setCurrentView, 
  setConfirmedRegistration 
}) => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const { showError, showWarning } = useModalAlert();
  const effectiveEventId = selectedEventId || (typeof window !== "undefined" ? sessionStorage.getItem("akv_pending_event_id") : "") || "";
  const [currentStep, setCurrentStep] = useState(() => (effectiveEventId ? 2 : 1));
  const [events, setEvents] = useState(() => api.getCachedEvents());
  const [loadingEvents, setLoadingEvents] = useState(() => !api.hasCachedEvents());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [participationMode, setParticipationMode] = useState("solo"); // "solo" or "group"
  const [rulesAccepted, setRulesAccepted] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    eventId: effectiveEventId,
    fullName: user?.name || "",
    auid: user?.auid || "",
    usn: user?.auid || "",
    institute: user?.institute || "Acharya Institute of Technology",
    department: user?.department || "",
    semester: user?.semester || 1,
    section: user?.section || "A",
    email: user?.email || "",
    phone: user?.phone || "",
    gender: user?.gender || "Male",
    instagramUsername: "",
    instagramProfileLink: "",
    teamName: "",
    teamMembers: []
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        auid: prev.auid || user.auid || "",
        usn: prev.usn || user.auid || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
        institute: prev.institute || user.institute || "Acharya Institute of Technology",
        department: prev.department || user.department || "",
        semester: user.semester || prev.semester || 1,
        section: user.section || prev.section || "A"
      }));
    }
  }, [user]);

  useEffect(() => {
    const applyEventSelection = (dataList, evId) => {
      if (!evId || !Array.isArray(dataList) || dataList.length === 0) return;
      const targetEvent = dataList.find(e => e.id === evId);
      if (targetEvent) {
        setFormData(prev => ({ ...prev, eventId: evId }));
        if (targetEvent.format === "team") {
          setParticipationMode("group");
        } else {
          setParticipationMode("solo");
        }
        setCurrentStep(2);
      }
    };

    const targetId = effectiveEventId;

    const cached = api.getCachedEvents();
    if (cached && cached.length > 0) {
      setEvents(cached);
      setLoadingEvents(false);
      if (targetId) {
        applyEventSelection(cached, targetId);
      }
    }

    const loadEvents = async () => {
      try {
        const data = await api.getEvents();
        if (Array.isArray(data)) {
          setEvents(data);
          if (targetId) {
            applyEventSelection(data, targetId);
          }
        }
      } catch (e) {
        console.error("Error loading events in registration:", e);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, [effectiveEventId]);

  // Requirement 11: In the web, don't give option to register to event without registering to the portal.
  if (!user) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-red-50 text-kar-red flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-red-100 text-red-900 border border-red-200">
              PORTAL REGISTRATION REQUIRED
            </span>
            <h3 className="text-xl font-extrabold text-stone-900 mt-3 tracking-tight">
              Portal Account Required
            </h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Per festival rules, you must be registered in the Student Portal before registering for any cultural or literary competitions.
              This provides your official verified badge and instant access passes.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                if (effectiveEventId && typeof window !== "undefined") {
                  sessionStorage.setItem("akv_pending_event_id", effectiveEventId);
                }
                setCurrentView("student", { subMode: "register" });
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Register / Sign In to Student Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentView("events")}
              className="w-full py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Events Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === formData.eventId);
  const isReelContest = isReelContestEvent(selectedEvent);

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
      const msg = lang === "kn"
        ? `ಈ ಸ್ಪರ್ಧೆಗೆ ಗರಿಷ್ಠ ತಂಡದ ಗಾತ್ರ ${toKannadaDigits(maxLimit)} ಸದಸ್ಯರು.`
        : `Maximum team size for this event is ${maxLimit} members.`;
      setErrorMessage(msg);
      showWarning(msg, lang === "kn" ? "ತಂಡದ ಮಿತಿ" : "Team Limit");
      return;
    }
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { name: "", auid: "", usn: "", department: "", phone: "" }]
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
    const cleanAuid = (formData.auid || "").trim().toUpperCase();
    if (!/^[0-9A-Z]{3,30}$/.test(cleanAuid)) {
      return lang === "kn" 
        ? "ಅಕ್ಷರ ಮತ್ತು ಅಂಕಿಗಳನ್ನು ಮಾತ್ರ ಹೊಂದಿರುವ ಮಾನ್ಯ AUID ನಮೂದಿಸಿ (ಉದಾ: AIT23BEAI129)."
        : "Enter an alphanumeric AUID using letters and numbers only (e.g., AIT23BEAI129).";
    }

    // Reel Contest Validations
    if (isReelContest) {
      if (!formData.institute?.trim()) {
        return lang === "kn" ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂಸ್ಥೆಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ." : "Please enter your Institute.";
      }
      if (!formData.department?.trim()) {
        return lang === "kn" ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಿಭಾಗವನ್ನು ನಮೂದಿಸಿ." : "Please enter your Department.";
      }
      if (!formData.phone?.trim()) {
        return lang === "kn" ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ." : "Please enter your contact phone number.";
      }
      if (!formData.email?.trim() || !formData.email.includes("@")) {
        return lang === "kn" ? "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಇಮೇಲ್ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ." : "Please enter a valid email address.";
      }
      if (!formData.instagramUsername?.trim()) {
        return lang === "kn" 
          ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಬಳಕೆದಾರ ಹೆಸರು (Instagram Username) ನಮೂದಿಸಿ." 
          : "Please enter your Instagram username (e.g. @your_handle).";
      }
      if (!formData.instagramProfileLink?.trim()) {
        return lang === "kn" 
          ? "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಪ್ರೊಫೈಲ್ ಲಿಂಕ್ (Instagram Profile Link) ನಮೂದಿಸಿ." 
          : "Please provide your Instagram profile link (e.g. https://instagram.com/your_handle).";
      }
      return null;
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
        : (selectedEvent?.min_team_size || 2);
      const totalTeamCount = formData.teamMembers.length + 1;
      if (totalTeamCount < minRequired) {
        return lang === "kn" 
          ? `ಈ ಸ್ಪರ್ಧೆಗೆ ಗುಂಪು ನೋಂದಣಿಗೆ ಕನಿಷ್ಠ ${toKannadaDigits(minRequired)} ಸದಸ್ಯರು ಅಗತ್ಯ. ದಯವಿಟ್ಟು ತಂಡದ ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ.` 
          : `Group participation for this event requires a minimum of ${minRequired} members. Please add team members.`;
      }
      // Check each member info: Name, AUID/Faculty ID, Department
      for (let i = 0; i < formData.teamMembers.length; i++) {
        const m = formData.teamMembers[i];
        if (!m.name?.trim()) {
          return lang === "kn" 
            ? `ದಯವಿಟ್ಟು ತಂಡದ ಸದಸ್ಯ #${toKannadaDigits(i + 2)} ರ ಹೆಸರು ಭರ್ತಿ ಮಾಡಿ.` 
            : `Please fill name for Team Member #${i + 2}.`;
        }
        if (!(m.auid || m.usn)?.trim()) {
          return lang === "kn" 
            ? `ದಯವಿಟ್ಟು ತಂಡದ ಸದಸ್ಯ #${toKannadaDigits(i + 2)} ರ AUID / Faculty ID ಭರ್ತಿ ಮಾಡಿ.` 
            : `Please fill AUID / Faculty ID for Team Member #${i + 2}.`;
        }
        if (!m.department?.trim()) {
          return lang === "kn" 
            ? `ದಯವಿಟ್ಟು ತಂಡದ ಸದಸ್ಯ #${toKannadaDigits(i + 2)} ರ ವಿಭಾಗ (Dept) ಭರ್ತಿ ಮಾಡಿ.` 
            : `Please fill Department for Team Member #${i + 2}.`;
        }
      }
    }

    return null;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.eventId) {
        const msg = t("registration.selectEventPrompt");
        setErrorMessage(msg);
        showWarning(msg, lang === "kn" ? "ಸ್ಪರ್ಧೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select an Event");
        return;
      }
      setErrorMessage("");
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      const error = validateStep2();
      if (error) {
        setErrorMessage(error);
        showWarning(error, lang === "kn" ? "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ" : "Required Details Missing");
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
    if (!rulesAccepted) {
      showWarning(
        lang === "kn"
          ? "ದಯವಿಟ್ಟು ಮುಂದುವರಿಯುವ ಮೊದಲು ಸ್ಪರ್ಧಾ ನಿಯಮಾವಳಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಒಪ್ಪಿಗೆ ಸೂಚಿಸಿ."
          : "Please review and accept the event rules and regulations before confirming registration.",
        lang === "kn" ? "ನಿಯಮಾವಳಿಗಳ ಒಪ್ಪಿಗೆ ಅಗತ್ಯ" : "Rules Acceptance Required"
      );
      return;
    }

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
        is_team: isReelContest ? false : isTeamRegistration,
        team_name: (!isReelContest && isTeamRegistration) ? formData.teamName.trim() : null,
        team_members: (!isReelContest && isTeamRegistration) 
          ? formData.teamMembers.map(m => ({
              name: m.name.trim(),
              auid: (m.auid || m.usn || "").trim().toUpperCase(),
              usn: (m.auid || m.usn || "").trim().toUpperCase(),
              department: (m.department || "").trim(),
              phone: (m.phone || "").trim()
            }))
          : [],
        instagram_username: isReelContest ? (formData.instagramUsername?.trim() || null) : null,
        instagram_profile_link: isReelContest ? (formData.instagramProfileLink?.trim() || null) : null
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

      // Clear any pending event once successfully registered
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("akv_pending_event_id");
      }
      if (setSelectedEventId) {
        setSelectedEventId(null);
      }

      // Save confirmed registration and switch to confirmation page
      const enrichedResult = {
        ...result,
        event: result?.event || selectedEvent
      };
      setConfirmedRegistration(enrichedResult);
      setCurrentView("confirmation");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      const msg = err.message || (lang === "kn" ? "ನೋಂದಣಿ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ." : "Registration failed. Please check details.");
      setErrorMessage(msg);
      showError(msg, lang === "kn" ? "ನೋಂದಣಿ ದೋಷ" : "Registration Failed");
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
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                            {isReelContestEvent(ev) || ev.category === "social_media"
                              ? (lang === "kn" ? (ev.category_kn || "ಸೋಷಿಯಲ್ ಮೀಡಿಯಾ") : "Social Media")
                              : (ev.category === "fine_arts"
                                ? (lang === "kn" ? (ev.category_kn || "ಲಲಿತಕಲೆ") : "FINE_ARTS")
                                : (lang === "kn" ? ev.category_kn : (ev.category || "").toUpperCase()))}
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

            {/* Solo Confirmation, Group Registration Details, OR Reel Contest Details */}
            {isReelContest ? (
              /* REEL CONTEST REGISTRATION DETAILS */
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 border border-pink-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-700 block">
                        {lang === "kn" ? "ರೀಲ್ ಸ್ಪರ್ಧೆ ನೋಂದಣಿ" : "Reel Contest Registration"}
                      </span>
                      <h4 className="text-base font-extrabold text-stone-900 font-display">
                        {lang === "kn" ? "ಸ್ಪರ್ಧಿ ಹಾಗೂ ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ವಿವರಗಳು" : "Participant & Instagram Details"}
                      </h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-pink-100 text-pink-900 border border-pink-200">
                    Solo Entry
                  </span>
                </div>

                {/* Regular Registration Details */}
                <div className="p-5 rounded-3xl bg-stone-50 border border-stone-200 space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-600 block border-b border-stone-200 pb-2">
                    {lang === "kn" ? "ಸಾಮಾನ್ಯ ನೋಂದಣಿ ವಿವರಗಳು (Regular Registration Details)" : "Regular Registration Details"}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ಪೂರ್ಣ ಹೆಸರು (Name)" : "Full Name"} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-kar-red"
                        placeholder="Your full name"
                      />
                    </div>

                    {/* AUID */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        AUID / Faculty ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.auid}
                        onChange={(e) => setFormData(prev => ({ ...prev, auid: e.target.value.toUpperCase(), usn: e.target.value.toUpperCase() }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-mono font-bold focus:ring-2 focus:ring-kar-red"
                        placeholder="e.g. AIT23BEAI129"
                      />
                    </div>

                    {/* Institute */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ಸಂಸ್ಥೆ (Institute)" : "Institute"} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.institute}
                        onChange={(e) => setFormData(prev => ({ ...prev, institute: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-kar-red"
                        placeholder="Acharya Institute of Technology"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ವಿಭಾಗ (Department)" : "Department"} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-kar-red"
                        placeholder="e.g. CSE / ISE / ECE"
                      />
                    </div>

                    {/* Year / Semester */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ವರ್ಷ (Year of Study)" : "Year of Study"}
                      </label>
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData(prev => ({ ...prev, semester: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-kar-red"
                      >
                        {[1, 2, 3, 4, 5, 6].map(y => (
                          <option key={y} value={y}>Year {y} {lang === "kn" ? `(${toKannadaDigits(y)}ನೇ ವರ್ಷ)` : ""}</option>
                        ))}
                      </select>
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ವಿಭಾಗ (Section)" : "Section"}
                      </label>
                      <input
                        type="text"
                        value={formData.section}
                        onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value.toUpperCase() }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-kar-red"
                        placeholder="A / B / C"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (Phone Number)" : "Phone Number"} *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-mono focus:ring-2 focus:ring-kar-red"
                        placeholder="10-digit mobile number"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ಇಮೇಲ್ (Email ID)" : "Email ID"} *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-kar-red"
                        placeholder="yourname@acharya.ac.in"
                      />
                    </div>

                    {/* Gender */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {lang === "kn" ? "ಲಿಂಗ (Gender)" : "Gender"}
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-kar-red"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Instagram Specific Details Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-pink-50/90 via-purple-50/50 to-amber-50/80 border-2 border-pink-300/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-pink-900 border-b border-pink-200/80 pb-2">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {lang === "kn" ? "ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ವಿವರಗಳು (Instagram Handles)" : "Instagram Contest Submission Details"} *
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Instagram Username */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        {lang === "kn" ? "ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಬಳಕೆದಾರ ಹೆಸರು (Instagram Username)" : "Instagram Username"} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">@</span>
                        <input
                          type="text"
                          required
                          value={formData.instagramUsername?.replace(/^@/, "")}
                          onChange={(e) => setFormData(prev => ({ ...prev, instagramUsername: e.target.value.trim().replace(/^@/, "") }))}
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-pink-300 bg-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-pink-500"
                          placeholder="your_handle"
                        />
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">
                        {lang === "kn" ? "ರೀಲ್ ಅಪ್‌ಲೋಡ್ ಮಾಡುವ ನಿಮ್ಮ ಅಧಿಕೃತ ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಹ್ಯಾಂಡಲ್" : "The Instagram handle from which you will upload your reel."}
                      </p>
                    </div>

                    {/* Instagram Profile Link */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        {lang === "kn" ? "ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಪ್ರೊಫೈಲ್ ಲಿಂಕ್ (Profile Link)" : "Instagram Profile Link"} *
                      </label>
                      <input
                        type="url"
                        required
                        value={formData.instagramProfileLink}
                        onChange={(e) => setFormData(prev => ({ ...prev, instagramProfileLink: e.target.value.trim() }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-pink-300 bg-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-pink-500"
                        placeholder="https://instagram.com/your_handle"
                      />
                      <p className="text-[10px] text-stone-500 mt-1">
                        {lang === "kn" ? "ನಿಮ್ಮ ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಪ್ರೊಫೈಲ್‌ಗೆ ನೇರ ಲಿಂಕ್" : "Direct URL to your Instagram profile."}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/80 border border-pink-200 text-[11px] text-stone-700 space-y-1">
                    <p className="font-bold text-pink-900">📌 Reel Contest Guidelines:</p>
                    <p>• Post your creative reel on Instagram with official hashtags: <strong>#Nuditaranga2026 #AcharyaAKV #NuditarangaReels</strong></p>
                    <p>• Tag the official festival handle: <strong>@acharya_habba</strong> / <strong>@acharya_kannada_vedike</strong></p>
                    <p>• Keep your profile public during the evaluation period for judges to verify.</p>
                  </div>
                </div>
              </div>
            ) : !isTeamRegistration ? (
              /* SOLO REGISTRATION: Don't ask for any info, use verified account profile */
              <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/90 via-white to-red-50/60 border border-amber-200/90 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center gap-3 border-b border-amber-100 pb-3">
                  <div className="w-10 h-10 rounded-2xl bg-kar-red text-white flex items-center justify-center font-bold shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                      {lang === "kn" ? "ದೃಢೀಕರಿಸಿದ ಪ್ರೊಫೈಲ್ ವಿವರಗಳು (ಖಾತೆಯಿಂದ)" : "Verified Participant Profile"}
                    </span>
                    <h4 className="text-base font-extrabold text-stone-900 font-display">
                      {formData.fullName || user?.name}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      AUID / Faculty ID
                    </span>
                    <span className="font-mono font-bold text-stone-900">{formData.auid || user?.auid}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      Institute
                    </span>
                    <span className="font-bold text-stone-900">{formData.institute || user?.institute}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      {lang === "kn" ? "ವಿಭಾಗ & ವರ್ಷ" : "Department & Year"}
                    </span>
                    <span className="font-bold text-stone-900">
                      {formData.department || user?.department || "General"} {formData.semester ? `(${lang === "kn" ? `${toKannadaDigits(formData.semester)}ನೇ ವರ್ಷ` : `${formData.semester}th Year`})` : ""}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-stone-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      Contact & Email
                    </span>
                    <span className="font-medium text-stone-700">
                      {formData.phone || user?.phone} • {formData.email || user?.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>
                    {lang === "kn" 
                      ? "ಇದು ಏಕವ್ಯಕ್ತಿ (Solo) ಸ್ಪರ್ಧೆಯಾಗಿದ್ದು, ನಿಮ್ಮ ಖಾತೆಯ ವಿವರಗಳನ್ನು ನೇರವಾಗಿ ಬಳಸಲಾಗುತ್ತದೆ. ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ಮಾಹಿತಿ ನಮೂದಿಸುವ ಅಗತ್ಯವಿಲ್ಲ."
                      : "This is a Solo competition. Your verified account profile will be used directly. No additional information is required."}
                  </span>
                </div>
              </div>
            ) : (
              /* GROUP REGISTRATION: Ask only Team Name & Team Members' Name, Faculty ID / AUID, Dept */
              <div className="space-y-4 animate-fade-in">
                {/* Team Lead Indicator */}
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block mb-0.5">
                      {lang === "kn" ? "ತಂಡದ ನಾಯಕ (ನಿಮ್ಮ ಖಾತೆ)" : "Team Lead (Your Account)"}
                    </span>
                    <span className="font-bold text-stone-900 text-sm">{formData.fullName || user?.name}</span>
                    <span className="text-stone-500 block text-xs mt-0.5 font-mono">
                      {formData.auid || user?.auid} • {formData.department || user?.department || "General"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-kar-red text-white uppercase tracking-wider">
                    {lang === "kn" ? "ನಾಯಕ" : "Lead"}
                  </span>
                </div>

                {/* Team Name */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-1">
                  <label className="block font-bold text-stone-800 text-xs uppercase tracking-wider">
                    {t("registration.teamName")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    placeholder={lang === "kn" ? "ಉದಾ: ನುಡಿ ಸಿಂಹಗಳು" : "e.g. Nudi Simhagalu"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red font-semibold"
                  />
                </div>

                {/* Additional Team Members */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-600" />
                      <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                        {t("registration.teamDetails")} ({lang === "kn" ? "ಗಾತ್ರ: " : "Size: "} {lang === "kn" ? toKannadaDigits(selectedEvent.format === "both" ? (selectedEvent.min_team_size || 2) : (selectedEvent.min_team_size || 2)) : (selectedEvent.format === "both" ? (selectedEvent.min_team_size || 2) : (selectedEvent.min_team_size || 2))} {lang === "kn" ? "ರಿಂದ" : "to"} {lang === "kn" ? toKannadaDigits(selectedEvent.max_team_size || 4) : (selectedEvent.max_team_size || 4)})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-300 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t("registration.addMember")}</span>
                    </button>
                  </div>

                  {formData.teamMembers.length === 0 ? (
                    <p className="text-xs text-stone-500 py-3 text-center">
                      {lang === "kn" 
                        ? "ಹೆಚ್ಚುವರಿ ಸದಸ್ಯರನ್ನು ಸೇರಿಸಲು 'ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ' ಕ್ಲಿಕ್ ಮಾಡಿ (ಹೆಸರು, AUID/Faculty ID, ವಿಭಾಗ ಮಾತ್ರ ಅಗತ್ಯ)." 
                        : "Click '+ Add Member' to add team members (only Name, AUID/Faculty ID, and Dept required)."}
                    </p>
                  ) : (
                    formData.teamMembers.map((member, index) => (
                      <div key={index} className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800 text-xs">
                            {lang === "kn" ? `ಸದಸ್ಯ #${toKannadaDigits(index + 2)}` : `Team Member #${index + 2}`}
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                              Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={lang === "kn" ? "ಪೂರ್ಣ ಹೆಸರು" : "Member Full Name"}
                              value={member.name}
                              onChange={(e) => handleMemberChange(index, "name", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-1 focus:ring-kar-red"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                              AUID / Faculty ID *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. AIT23BEAI129"
                              value={member.auid || member.usn || ""}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase();
                                handleMemberChange(index, "auid", val);
                                handleMemberChange(index, "usn", val);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs uppercase font-mono focus:ring-1 focus:ring-kar-red"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                              Department *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={lang === "kn" ? "ವಿಭಾಗ (Dept)" : "e.g. CSE / EEE / MBA"}
                              value={member.department || ""}
                              onChange={(e) => handleMemberChange(index, "department", e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-1 focus:ring-kar-red"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                      {formData.department || "General"} {formData.semester ? `(${lang === "kn" ? `${toKannadaDigits(formData.semester)}ನೇ ವರ್ಷ` : `${formData.semester}th Year`})` : ""}
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
                  {isReelContest && (
                    <div className="col-span-2 pt-3 mt-1 border-t border-stone-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 block mb-1">
                        {lang === "kn" ? "ಇನ್‌ಸ್ಟಾಗ್ರಾಮ್ ಸ್ಪರ್ಧಾ ವಿವರಗಳು" : "Instagram Contest Details"}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-200">
                          <span className="text-stone-500 block text-[10px]">Instagram Username:</span>
                          <span className="font-bold text-pink-700 flex items-center gap-1">
                            <Instagram className="w-3.5 h-3.5" />
                            @{formData.instagramUsername?.replace(/^@/, "")}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-200">
                          <span className="text-stone-500 block text-[10px]">Profile Link:</span>
                          <a href={formData.instagramProfileLink} target="_blank" rel="noopener noreferrer" className="font-mono text-pink-700 underline truncate block">
                            {formData.instagramProfileLink}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
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
                      <div key={i}>
                        {lang === "kn" ? `${toKannadaDigits(i + 2)}. ` : `${i + 2}. `}{m.name} ({m.auid || m.usn}){m.department ? ` - ${m.department}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Rules & Regulations Display */}
              {selectedEvent && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-kar-red shrink-0" />
                      <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm font-kannada">
                        {lang === "kn" ? "ಸ್ಪರ್ಧಾ ನಿಯಮಾವಳಿಗಳು & ಮಾರ್ಗಸೂಚಿಗಳು" : "Event Rules & Regulations"}
                      </h4>
                    </div>
                    {selectedEvent.reporting_time && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        {lang === "kn" ? `ವರದಿ ಸಮಯ: ${selectedEvent.reporting_time}` : `Reporting: ${selectedEvent.reporting_time}`}
                      </span>
                    )}
                  </div>

                  {/* Rules list */}
                  <div className="space-y-1.5 text-xs text-stone-700 font-kannada max-h-48 overflow-y-auto pr-1">
                    {(lang === "kn" ? (selectedEvent.rules_kn || selectedEvent.rules_en) : (selectedEvent.rules_en || selectedEvent.rules_kn))
                      ?.split("\n")
                      .filter(r => r.trim().length > 0)
                      .map((rule, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-amber-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{rule.trim()}</span>
                        </div>
                      )) || (
                        <p className="text-stone-500 italic text-[11px]">
                          {lang === "kn" ? "ಸಾಮಾನ್ಯ ಉತ್ಸವ ನಿಯಮಗಳು ಅನ್ವಯಿಸುತ್ತವೆ." : "Standard festival guidelines apply."}
                        </p>
                      )}
                  </div>

                  {/* Rules Agreement Checkbox */}
                  <label className="flex items-start gap-2.5 pt-2 border-t border-amber-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="accept-rules-checkbox"
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-kar-red rounded border-amber-400 focus:ring-kar-red cursor-pointer"
                    />
                    <span className="text-xs font-bold text-stone-800 leading-relaxed font-kannada">
                      {lang === "kn"
                        ? "ನಾನು ಈ ಸ್ಪರ್ಧೆಯ ಎಲ್ಲಾ ನಿಯಮಾವಳಿಗಳನ್ನು ಓದಿದ್ದೇನೆ ಮತ್ತು ಪಾಲಿಸಲು ಒಪ್ಪಿಕೊಳ್ಳುತ್ತೇನೆ."
                        : "I have read, understood, and agree to follow all the rules and regulations for this event."}
                    </span>
                  </label>
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
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t("registration.btnBack")}</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting || !rulesAccepted}
                className={`px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer ${
                  (!rulesAccepted || submitting) ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title={!rulesAccepted ? "Please accept the event rules to proceed" : "Confirm and Submit Registration"}
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
