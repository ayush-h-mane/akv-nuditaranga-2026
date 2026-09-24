import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { DigitalPass } from "../components/DigitalPass";
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  HeartHandshake, 
  Trophy, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Compass, 
  Lock, 
  ChevronRight,
  QrCode,
  X,
  Plus,
  Printer,
  ShieldCheck
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const StudentDashboard = ({ onNavigateHome }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // overview, my-events, browse-events, account
  const [dashboardData, setDashboardData] = useState(null);
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeringEventId, setRegisteringEventId] = useState(null);
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });
  
  // Selected registration for viewing digital pass
  const [viewingPassReg, setViewingPassReg] = useState(null);

  // Team Event Modal State
  const [teamModalEvent, setTeamModalEvent] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);

  // Change Password State
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState({ type: "", text: "" });

  const loadData = async () => {
    try {
      setLoading(true);
      const [dash, events] = await Promise.all([
        api.getStudentDashboard(),
        api.getEvents("all", true)
      ]);
      setDashboardData(dash);
      setEventsList(events);
    } catch (err) {
      console.error("Failed to load student dashboard:", err);
      setActionMessage({ type: "error", text: "Could not load dashboard data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1-Click Event Registration
  const handleQuickRegister = async (event) => {
    if (event.is_team || event.format === "team") {
      // Open team modal
      setTeamModalEvent(event);
      setTeamName("");
      setTeamMembers([]);
      return;
    }

    setRegisteringEventId(event.id);
    setActionMessage({ type: "", text: "" });

    try {
      const res = await api.studentRegisterEvent({
        event_id: event.id,
        is_team: false
      });

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      setActionMessage({ type: "success", text: res.message || `Successfully registered for ${event.title_en}!` });
      await loadData();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Registration failed." });
    } finally {
      setRegisteringEventId(null);
    }
  };

  // Submit Team Registration
  const handleTeamRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!teamModalEvent) return;

    setRegisteringEventId(teamModalEvent.id);
    setActionMessage({ type: "", text: "" });

    try {
      const res = await api.studentRegisterEvent({
        event_id: teamModalEvent.id,
        is_team: true,
        team_name: teamName.trim(),
        team_members: teamMembers
      });

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setActionMessage({ type: "success", text: res.message || "Team registered successfully!" });
      setTeamModalEvent(null);
      await loadData();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Team registration failed." });
    } finally {
      setRegisteringEventId(null);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setPwLoading(true);
    setPwMessage({ type: "", text: "" });

    try {
      await api.changeStudentPassword(
        pwForm.currentPassword,
        pwForm.newPassword,
        pwForm.confirmPassword
      );
      setPwMessage({ type: "success", text: "Password changed successfully." });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwMessage({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setPwLoading(false);
    }
  };

  // Add Team Member to local modal
  const handleAddMember = () => {
    setTeamMembers([...teamMembers, { name: "", auid: "", phone: "" }]);
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...teamMembers];
    updated[index][field] = value;
    setTeamMembers(updated);
  };

  const handleRemoveMember = (index) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen pt-28 pb-12 flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-kar-red border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone-600 font-bold text-sm">Loading Student Portal...</p>
        </div>
      </div>
    );
  }

  const profile = dashboardData?.profile || user;
  const registeredEvents = dashboardData?.registered_events || [];
  const registeredIds = new Set(dashboardData?.registered_event_ids || []);
  const volunteerInfo = dashboardData?.volunteer_info;

  return (
    <div className="min-h-screen pt-24 pb-16 bg-stone-50 text-stone-900 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Top Breadcrumb & Quick Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-kar-red bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
              Student Dashboard
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-500 font-mono">
              {profile?.registration_id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Explore AKV Website</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5 text-kar-red" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {actionMessage.text && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold shadow-xs ${
            actionMessage.type === "success" 
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900" 
              : "bg-red-50 border border-red-200 text-red-900"
          }`}>
            <div className="flex items-center gap-2.5">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-kar-red shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage({ type: "", text: "" })}>
              <X className="w-4 h-4 text-stone-400 hover:text-stone-700" />
            </button>
          </div>
        )}

        {/* Header Hero Banner with Role-Specific Styling */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow p-6 sm:p-8 text-white shadow-xl mb-8">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {profile?.photo_url ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/60 shadow-lg shrink-0 bg-white/20">
                  <img
                    src={profile.photo_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg shrink-0 bg-black/20 flex items-center justify-center text-amber-200">
                  <User className="w-8 h-8" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-black/25 text-amber-200 border border-white/20">
                    {profile?.role} PORTAL
                  </span>
                  <span className="text-amber-200 text-xs font-bold">
                    {profile?.role === "VOLUNTEER" && "ಸ್ವಯಂಸೇವಕ ವಿಭಾಗ"}
                    {profile?.role === "PARTICIPANT" && "ಸ್ಪರ್ಧಾ ವಿಭಾಗ"}
                    {profile?.role === "SPECTATOR" && "ವೀಕ್ಷಕರ ವಿಭಾಗ"}
                  </span>
                  {profile?.volunteer_domain && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-stone-900 shadow-2xs">
                      Domain: {profile.volunteer_domain}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  ನಮಸ್ಕಾರ, {profile?.name}!
                </h2>
                <p className="text-xs sm:text-sm text-amber-100 font-medium mt-0.5">
                  {profile?.institute} • {profile?.department}
                </p>
              </div>
            </div>

            {/* Quick Stats in Hero */}
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 text-center min-w-[90px]">
                <span className="block text-xl font-extrabold text-white">
                  {registeredEvents.length}
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">
                  Events Joined
                </span>
              </div>

              {profile?.role === "VOLUNTEER" && (
                <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20 text-center min-w-[90px]">
                  <span className="block text-xs font-extrabold text-white mt-1">
                    {volunteerInfo?.today_attendance === "PRESENT" ? "PRESENT ✅" : (volunteerInfo?.today_attendance || "PENDING")}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">
                    Today's Attendance
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <User className="w-4 h-4 text-amber-400" />
            <span>Profile & Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("my-events")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "my-events"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>My Registrations ({registeredEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("browse-events")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "browse-events"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Sparkles className="w-4 h-4 text-kar-red" />
            <span>1-Click Event Registration</span>
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "account"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Lock className="w-4 h-4 text-stone-400" />
            <span>Account Security</span>
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: OVERVIEW & PROFILE                           */}
        {/* ==================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Profile Details Card */}
              <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-kar-red" />
                    <span>Student Profile Details</span>
                  </h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
                    AUID: {profile?.auid}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">Full Name</span>
                    <span className="font-bold text-stone-900 text-base">{profile?.name}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">College Email</span>
                    <span className="font-semibold text-stone-800">{profile?.email}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">Contact Number</span>
                    <span className="font-semibold text-stone-800">{profile?.phone}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">Registration ID</span>
                    <span className="font-mono font-bold text-kar-red">{profile?.registration_id}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">Institute</span>
                    <span className="font-semibold text-stone-800">{profile?.institute}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">Department</span>
                    <span className="font-semibold text-stone-800">{profile?.department}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">Semester & Section</span>
                    <span className="font-semibold text-stone-800">Sem {profile?.semester} • Sec {profile?.section}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 font-bold block text-[11px] uppercase">Registered Role</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-kar-red text-white uppercase">
                        {profile?.role}
                      </span>
                      {profile?.volunteer_domain && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {profile.volunteer_domain}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Role-Specific Showcase Card */}
              <div className="bg-gradient-to-br from-amber-50 via-white to-amber-100/50 rounded-3xl p-6 border border-amber-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {profile?.role === "VOLUNTEER" && <HeartHandshake className="w-5 h-5 text-kar-red" />}
                    {profile?.role === "PARTICIPANT" && <Trophy className="w-5 h-5 text-amber-600" />}
                    {profile?.role === "SPECTATOR" && <Users className="w-5 h-5 text-stone-700" />}
                    <h3 className="font-extrabold text-sm text-stone-900 uppercase tracking-wide">
                      {profile?.role} BRIEFING
                    </h3>
                  </div>

                  {profile?.role === "VOLUNTEER" && (
                    <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
                      <p>
                        🌟 <strong>You are an official volunteer for Nuditaranga 2026.</strong>
                      </p>
                      <div className="p-3 bg-white rounded-xl border border-amber-200">
                        <span className="block text-[11px] font-bold text-stone-500 uppercase">Today's Attendance</span>
                        <span className="text-sm font-extrabold text-stone-900">
                          {volunteerInfo?.today_attendance === "PRESENT" ? "Marked Present ✅" : "Not Checked In Today"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        Daily volunteer attendance is verified by faculty coordinators at the hospitality desk.
                      </p>
                    </div>
                  )}

                  {profile?.role === "PARTICIPANT" && (
                    <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
                      <p>
                        🎯 <strong>Welcome to the cultural arena!</strong>
                      </p>
                      <p>
                        Browse events in the 1-Click Registration tab. Report at the designated venue 30 minutes prior to the reporting time.
                      </p>
                      <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs">
                        <span className="font-bold text-stone-900 block">Certificate Eligibility:</span>
                        <span>Participation e-certificates will be provided post fest.</span>
                      </div>
                    </div>
                  )}

                  {profile?.role === "SPECTATOR" && (
                    <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
                      <p>
                        🎉 <strong>Welcome Spectator!</strong>
                      </p>
                      <p>
                        Enjoy traditional dance, literary debate, street plays, and classical singing across all college auditoriums.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab("browse-events")}
                  className="mt-4 w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Register for Cultural Events</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ==================================================== */}
            {/* OFFICIAL VERIFICATION ID CARD & ALL-INFO QR CODE    */}
            {/* Required for Volunteer & Participant (v2.1.0)       */}
            {/* ==================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-amber-300 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-kar-red to-amber-500 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-stone-900">
                      Official Candidate ID Card & Verification QR
                    </h3>
                    <p className="text-xs text-stone-500">
                      Contains complete verified candidate credentials for desk attendance & campus security check-in.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors self-start cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-kar-red" />
                  <span>Print ID Card</span>
                </button>
              </div>

              {/* ID Card Box */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-stone-50 via-white to-amber-50/50 border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left flex-1">
                  {/* Photo */}
                  <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden border-2 border-kar-red bg-stone-100 shadow-md shrink-0">
                    {profile?.photo_url ? (
                      <img
                        src={profile.photo_url}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-100">
                        <User className="w-10 h-10" />
                        <span className="text-[10px] font-bold mt-1">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-kar-red text-white uppercase shadow-2xs">
                        {profile?.role}
                      </span>
                      {profile?.volunteer_domain && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-stone-900 shadow-2xs">
                          {profile.volunteer_domain}
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {profile?.registration_id}
                      </span>
                    </div>

                    <h4 className="text-xl font-black text-stone-900 tracking-tight">
                      {profile?.name}
                    </h4>

                    <p className="text-xs font-bold text-kar-red font-mono">
                      AUID: {profile?.auid}
                    </p>

                    <p className="text-xs font-bold text-stone-800">
                      {profile?.institute}
                    </p>

                    <p className="text-xs text-stone-600 font-semibold">
                      {profile?.department} • Sem {profile?.semester} (Sec {profile?.section})
                    </p>

                    <p className="text-[11px] text-stone-500 font-mono">
                      {profile?.email} • {profile?.phone}
                    </p>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center p-3.5 bg-white rounded-2xl border-2 border-stone-900 shadow-md shrink-0">
                  <QRCodeSVG
                    value={JSON.stringify({
                      reg_id: profile?.registration_id,
                      name: profile?.name,
                      auid: profile?.auid,
                      role: profile?.role,
                      domain: profile?.volunteer_domain || "N/A",
                      institute: profile?.institute,
                      department: profile?.department,
                      semester: profile?.semester,
                      section: profile?.section,
                      email: profile?.email,
                      phone: profile?.phone,
                      verified_by: "Acharya Kannada Vedike Nuditaranga 2026"
                    })}
                    size={130}
                    level="M"
                    includeMargin={false}
                  />
                  <span className="text-[10px] font-mono font-extrabold text-stone-800 mt-2 tracking-wide uppercase">
                    Scan to Verify
                  </span>
                  <span className="text-[9px] text-stone-400">Official Fest Credential</span>
                </div>
              </div>
            </div>

            {/* Quick Registered Events Preview */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Registered Events</h3>
                  <p className="text-xs text-stone-500 mt-0.5">Competitions and passes associated with your account</p>
                </div>
                {registeredEvents.length > 0 && (
                  <button
                    onClick={() => setActiveTab("my-events")}
                    className="text-xs font-bold text-kar-red hover:underline"
                  >
                    View all ({registeredEvents.length}) &rarr;
                  </button>
                )}
              </div>

              {registeredEvents.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-2xl space-y-2">
                  <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-sm font-bold text-stone-700">No events registered yet</p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Take part in Karunada Vaibhava! Register for solo and team competitions with 1-click.
                  </p>
                  <button
                    onClick={() => setActiveTab("browse-events")}
                    className="mt-2 px-4 py-2 rounded-xl bg-kar-red text-white text-xs font-bold shadow-sm hover:bg-red-700 transition-colors"
                  >
                    Browse Events Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {registeredEvents.slice(0, 4).map((r) => (
                    <div 
                      key={r.registration_id}
                      className="p-4 rounded-2xl border border-stone-200 hover:border-amber-300 bg-stone-50/50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900">{r.event_title_en}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 font-mono mt-0.5">{r.registration_id}</p>
                        <div className="flex items-center gap-3 text-[11px] text-stone-600 mt-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            {r.event_date || "Fest Day"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-stone-400" />
                            {r.venue || "Acharya IT"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setViewingPassReg(r)}
                        className="shrink-0 p-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-kar-red hover:border-kar-red transition-all shadow-xs"
                        title="View Digital Pass"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MY REGISTRATIONS & DIGITAL PASSES             */}
        {/* ==================================================== */}
        {activeTab === "my-events" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-stone-900">My Registered Events</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Official registration passes for Nuditaranga 2026. Show these QR passes at the verification desk.
              </p>
            </div>

            {registeredEvents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-3xl space-y-3">
                <Trophy className="w-10 h-10 text-stone-300 mx-auto" />
                <h4 className="font-bold text-stone-800">You haven't registered for any events yet</h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Browse the complete list of cultural competitions and secure your participation slot instantly.
                </p>
                <button
                  onClick={() => setActiveTab("browse-events")}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-xs shadow-md"
                >
                  Register for an Event
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {registeredEvents.map((reg) => (
                  <div 
                    key={reg.registration_id}
                    className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-extrabold text-base text-stone-900">{reg.event_title_en}</h4>
                        <span className="text-xs font-bold text-amber-900 font-kannada">{reg.event_title_kn}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          reg.status === "Checked In" 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}>
                          {reg.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
                        <span className="font-mono font-bold text-kar-red bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                          {reg.registration_id}
                        </span>
                        <span className="flex items-center gap-1 text-stone-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {reg.event_date || "March 2026"}
                        </span>
                        <span className="flex items-center gap-1 text-stone-500">
                          <Clock className="w-3.5 h-3.5" />
                          {reg.event_time || "Morning Session"}
                        </span>
                        <span className="flex items-center gap-1 text-stone-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {reg.venue || "Acharya Campus"}
                        </span>
                      </div>

                      {reg.is_team && (
                        <p className="text-xs font-semibold text-amber-800">
                          Team: <strong>{reg.team_name || "Team Registered"}</strong>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setViewingPassReg(reg)}
                      className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-extrabold shadow-sm transition-all"
                    >
                      <QrCode className="w-4 h-4 text-amber-300" />
                      <span>View Digital Pass</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: 1-CLICK EVENT REGISTRATION                   */}
        {/* ==================================================== */}
        {activeTab === "browse-events" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-kar-red" />
                <span>Nuditaranga 2026 Events</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Click <strong>"Register Now"</strong> to join an event immediately using your authenticated student profile.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventsList.map((ev) => {
                const isRegistered = registeredIds.has(ev.id);
                const isFull = ev.registered_count >= ev.max_slots;
                const isBusy = registeringEventId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isRegistered 
                        ? "border-emerald-200 bg-emerald-50/30" 
                        : "border-stone-200 hover:border-amber-300 bg-white"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {ev.category}
                        </span>
                        <span className="text-xs font-bold text-stone-400">
                          {ev.format === "team" || ev.is_team ? "Team Event" : "Solo Event"}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-base text-stone-900">{ev.title_en}</h4>
                        <p className="text-xs text-amber-900 font-bold font-kannada">{ev.title_kn}</p>
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {ev.description_en}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          {ev.event_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {ev.event_time}
                        </span>
                        <span className="flex items-center gap-1 col-span-2">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {ev.venue}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-xs text-stone-500 font-semibold">
                        Slots: {ev.registered_count} / {ev.max_slots}
                      </span>

                      {isRegistered ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Registered</span>
                        </span>
                      ) : isFull ? (
                        <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-bold">
                          Capacity Reached
                        </span>
                      ) : (
                        <button
                          onClick={() => handleQuickRegister(ev)}
                          disabled={isBusy}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-kar-red to-red-600 hover:from-red-700 hover:to-red-800 text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isBusy ? (
                            <span>Registering...</span>
                          ) : (
                            <>
                              <span>Register Now</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: ACCOUNT SECURITY                             */}
        {/* ==================================================== */}
        {activeTab === "account" && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-kar-red" />
                <span>Change Account Password</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Update your student portal password securely.
              </p>
            </div>

            {pwMessage.text && (
              <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                pwMessage.type === "success" 
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200" 
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}>
                {pwMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-kar-red" />}
                <span>{pwMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Team Registration Modal */}
      {teamModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-stone-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-stone-900">
                  Team Registration: {teamModalEvent.title_en}
                </h3>
                <p className="text-xs text-stone-500">Provide team-specific details below</p>
              </div>
              <button 
                onClick={() => setTeamModalEvent(null)}
                className="p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTeamRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Nudi Vaibhava Warriors"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Additional Team Members
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="text-xs font-bold text-kar-red flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>

                {teamMembers.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">No additional team members added.</p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((m, idx) => (
                      <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Member Name"
                          value={m.name}
                          onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="AUID / USN"
                          value={m.auid}
                          onChange={(e) => handleMemberChange(idx, "auid", e.target.value)}
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white uppercase font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-1.5 text-stone-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900 border border-amber-200">
                You (<strong>{profile?.name}</strong>) are automatically assigned as the Team Captain / Primary Registrant.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTeamModalEvent(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registeringEventId === teamModalEvent.id}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white text-xs font-extrabold shadow-sm"
                >
                  {registeringEventId === teamModalEvent.id ? "Registering..." : "Confirm Team Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Pass Viewer Modal */}
      {viewingPassReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 border border-stone-200 shadow-2xl relative my-auto">
            <button
              onClick={() => setViewingPassReg(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 z-10"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <DigitalPass
              registration={viewingPassReg}
              onBack={() => setViewingPassReg(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
};
