import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useModalAlert } from "../context/ModalAlertContext";
import { api } from "../services/api";
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  LogOut, 
  BarChart3, 
  Calendar, 
  MapPin, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle, 
  HeartHandshake, 
  UserCheck, 
  Compass, 
  Lock,
  ArrowRight,
  ShieldAlert,
  Camera,
  Scan,
  Trash2,
  Plus,
  Image as ImageIcon,
  CheckCheck,
  CheckSquare
} from "lucide-react";
import { CameraQRScanner } from "../components/CameraQRScanner";
import { EventImageUpload } from "../components/EventImageUpload";
import { MyProfileAttendance } from "../components/MyProfileAttendance";
import { RoleUpdatesBanner } from "../components/RoleUpdatesBanner";
import { AKV_DOMAINS } from "../config/institutesData";

export const AdminPage = ({ onNavigateHome, onOpenSuperAdmin }) => {
  const { user, role, logout } = useAuth();
  const { lang, t } = useLanguage();
  const { showError, showWarning, showSuccess, showInfo } = useModalAlert();
  
  const [activeTab, setActiveTab] = useState("attendance"); // "overview", "attendance", "checkin"
  const [overview, setOverview] = useState(null);
  const [myAccountData, setMyAccountData] = useState(null);
  const [myAccountLoading, setMyAccountLoading] = useState(false);
  const [myAccountError, setMyAccountError] = useState("");
  const [volunteers, setVolunteers] = useState([]);
  const [todayDate, setTodayDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [akvDeptFilter, setAkvDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coordinatorRefreshing, setCoordinatorRefreshing] = useState(false);

  // Official Attendance State (v2.1.2)
  const [attendanceDates, setAttendanceDates] = useState(() => {
    const cached = api.getCachedAttendanceConfigDates();
    return cached?.dates || [];
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const cached = api.getCachedAttendanceConfigDates();
    if (cached?.dates && cached.dates.length > 0) {
      const todayItem = cached.dates.find(d => d.is_today);
      return todayItem ? todayItem.date : (cached.current_date || cached.dates[0]?.date || "");
    }
    return "";
  });
  const [attendanceRoster, setAttendanceRoster] = useState([]);
  const [attendanceSession, setAttendanceSession] = useState({
    is_submitted: false,
    submitted_at: null,
    submitted_by: null,
    locked_for_admin: false
  });
  const [attendanceSummary, setAttendanceSummary] = useState({
    total_participants: 0,
    checked_in: 0,
    completed: 0,
    not_marked: 0,
    is_submitted: false
  });
  const [markingUserIds, setMarkingUserIds] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Check-In Desk State
  const [checkinId, setCheckinId] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [checkinMode, setCheckinMode] = useState("camera"); // "camera" or "manual"

  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const selectedDateIsFuture = Boolean(selectedDate && selectedDate > new Date().toISOString().slice(0, 10));

  // Volunteer Attendance QR Scanner State (v2.3.8)
  const [showVolunteerScanner, setShowVolunteerScanner] = useState(false);
  const [scannedVolunteerInfo, setScannedVolunteerInfo] = useState(null);
  const [scannerFeedback, setScannerFeedback] = useState("");
  const attendanceCutoffDate = "2026-11-05";
  const todayIstStr = new Date().toISOString().slice(0, 10);
  const isAttendanceWindowExpired = Boolean(todayIstStr > attendanceCutoffDate || (selectedDate && selectedDate > attendanceCutoffDate));

  // Cultural Gallery State
  const [galleryItems, setGalleryItems] = useState(() => api.getCachedGallery());
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryForm, setGalleryForm] = useState({
    title: "",
    description: "",
    event_date: "",
    image_url: "",
    category: "Cultural"
  });

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: "", text: "" }), 4000);
    if (type === "error") {
      showError(text, "Error / ತೊಂದರೆ");
    } else if (type === "warning") {
      showWarning(text, "Attention / ಎಚ್ಚರಿಕೆ");
    } else if (type === "info") {
      showInfo(text, "Information / ಮಾಹಿತಿ");
    }
  };

  const loadAttendanceDates = async (forceFresh = false) => {
    try {
      const res = await api.getAttendanceConfigDates(forceFresh);
      if (res && res.dates) {
        setAttendanceDates(res.dates);
        // Default to today if found, else first date
        if (!selectedDate) {
          const todayItem = res.dates.find(d => d.is_today);
          const initialDate = todayItem ? todayItem.date : (res.current_date || res.dates[0]?.date || "");
          setSelectedDate(initialDate);
          return initialDate;
        }
      }
    } catch (err) {
      console.warn("Could not load configured dates:", err);
    }
    return selectedDate;
  };

  const loadAttendanceRoster = async (dateOverride = null, forceFresh = false) => {
    const targetDate = dateOverride || selectedDate;
    if (!targetDate) return;
    try {
      setLoading(true);
      const adminDomain = role !== "SUPERADMIN" ? (user?.volunteer_domain || user?.akv_dept) : null;
      const effectiveAkvDept = adminDomain ? adminDomain : (akvDeptFilter !== "all" ? akvDeptFilter : "");

      const res = await api.getAttendance({
        date: targetDate,
        search: searchQuery,
        department: deptFilter !== "all" ? deptFilter : "",
        akv_dept: effectiveAkvDept,
        status_filter: statusFilter !== "all" ? statusFilter : ""
      }, forceFresh);

      if (res && res.success) {
        let participants = res.participants || [];
        if (adminDomain) {
          const domNorm = adminDomain.toLowerCase().replace(/s$/, "").trim();
          participants = participants.filter(p => {
            const pDom = (p.akv_dept || p.volunteer_domain || "").toLowerCase().trim();
            return pDom.includes(domNorm) || domNorm.includes(pDom.replace(/s$/, ""));
          });
        }
        setAttendanceRoster(participants);
        setAttendanceSession(res.session || {
          is_submitted: false,
          submitted_at: null,
          submitted_by: null,
          locked_for_admin: false
        });
        setAttendanceSummary(res.summary || {
          total_participants: participants.length,
          checked_in: 0,
          completed: 0,
          not_marked: 0,
          is_submitted: false
        });
        setTodayDate(res.date || targetDate);
      }
    } catch (err) {
      console.error("Attendance roster loading error:", err);
      notify("error", err.message || "Failed to load attendance roster.");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async (forceFresh = false) => {
    try {
      const activeDate = await loadAttendanceDates(forceFresh);
      const [overviewData] = await Promise.all([
        api.getAdminOverview(forceFresh).catch(() => null),
        loadAttendanceRoster(activeDate, forceFresh)
      ]);
      if (overviewData) setOverview(overviewData);
    } catch (err) {
      console.error("Admin data loading error:", err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [deptFilter, akvDeptFilter, statusFilter, selectedDate]);

  const loadMyAccount = async (forceFresh = false) => {
    setMyAccountLoading(true);
    setMyAccountError("");
    try {
      const data = await api.getStudentDashboard(forceFresh);
      setMyAccountData(data);
    } catch (err) {
      setMyAccountError(err.message || "Could not load your profile and attendance.");
    } finally {
      setMyAccountLoading(false);
    }
  };

  useEffect(() => {
    loadMyAccount();
  }, []);

  // Check-In Handler
  const handleCheckIn = async (participantUserId) => {
    if (markingUserIds.includes(participantUserId)) return;
    setMarkingUserIds(prev => [...prev, participantUserId]);
    try {
      const res = await api.markAttendanceCheckIn(participantUserId, selectedDate);
      notify("success", res.message || "Check-In recorded successfully!");
      // Update local state smoothly
      setAttendanceRoster(prev => prev.map(p => {
        if (p.user_id === participantUserId) {
          return {
            ...p,
            status: "CHECKED_IN",
            check_in_time: res.record?.check_in_time || "Checked In"
          };
        }
        return p;
      }));
      setAttendanceSummary(prev => ({
        ...prev,
        checked_in: prev.checked_in + 1,
        not_marked: Math.max(0, prev.not_marked - 1)
      }));
    } catch (err) {
      notify("error", err.message || "Check-In failed.");
    } finally {
      setMarkingUserIds(prev => prev.filter(id => id !== participantUserId));
    }
  };

  // Check-Out Handler
  const handleCheckOut = async (participantUserId) => {
    if (markingUserIds.includes(participantUserId)) return;
    setMarkingUserIds(prev => [...prev, participantUserId]);
    try {
      const res = await api.markAttendanceCheckOut(participantUserId, selectedDate);
      notify("success", res.message || "Check-Out recorded successfully!");
      // Update local state smoothly
      setAttendanceRoster(prev => prev.map(p => {
        if (p.user_id === participantUserId) {
          return {
            ...p,
            status: "COMPLETED",
            check_out_time: res.record?.check_out_time || "Completed",
            can_mark: false
          };
        }
        return p;
      }));
      setAttendanceSummary(prev => ({
        ...prev,
        checked_in: Math.max(0, prev.checked_in - 1),
        completed: prev.completed + 1
      }));
    } catch (err) {
      notify("error", err.message || "Check-Out failed.");
    } finally {
      setMarkingUserIds(prev => prev.filter(id => id !== participantUserId));
    }
  };

  // QR Scan Handler for Volunteers
  const handleScanVolunteerQR = (decodedText) => {
    if (!decodedText) return;
    try {
      let targetAuid = "";
      let targetUserId = null;
      let targetRegId = "";

      try {
        const parsed = JSON.parse(decodedText);
        targetAuid = (parsed.auid || "").trim().toUpperCase();
        targetUserId = parsed.user_id || parsed.id || null;
        targetRegId = (parsed.registration_id || parsed.reg_id || "").trim().toUpperCase();
      } catch (e) {
        const clean = decodedText.trim().toUpperCase();
        targetAuid = clean;
        targetRegId = clean;
        if (/^\d+$/.test(clean)) targetUserId = parseInt(clean, 10);
      }

      const match = attendanceRoster.find(p => 
        (targetUserId && p.user_id === targetUserId) ||
        (targetAuid && p.auid && p.auid.toUpperCase() === targetAuid) ||
        (targetRegId && p.registration_id && p.registration_id.toUpperCase() === targetRegId)
      );

      if (match) {
        setScannedVolunteerInfo(match);
        setScannerFeedback(`Found volunteer: ${match.name} (${match.auid})`);
      } else {
        setScannerFeedback(`Volunteer not found in current domain roster. Scanned: ${decodedText}`);
      }
    } catch (err) {
      setScannerFeedback(`Could not process QR code: ${err.message}`);
    }
  };

  // Submit Attendance Handler
  const handleSubmitAttendance = async () => {
    setSubmitLoading(true);
    try {
      const res = await api.submitAttendance(selectedDate, submitNotes);
      notify("success", res.message || "Attendance submitted and locked!");
      setShowSubmitModal(false);
      setSubmitNotes("");
      setAttendanceSession({
        is_submitted: true,
        submitted_at: res.submitted_at,
        submitted_by: res.submitted_by,
        locked_for_admin: role !== "SUPERADMIN"
      });
      setAttendanceSummary(prev => ({ ...prev, is_submitted: true }));
      // Reload roster to reflect locked state across all rows
      loadAttendanceRoster();
    } catch (err) {
      notify("error", err.message || "Failed to submit attendance.");
    } finally {
      setSubmitLoading(false);
    }
  };


  // Participant Check-in Handler
  const handleCheckInSubmit = async (eOrId) => {
    if (eOrId && typeof eOrId === "object" && eOrId.preventDefault) {
      eOrId.preventDefault();
    }
    const targetId = (typeof eOrId === "string" ? eOrId : checkinId).trim();
    if (!targetId) return;

    setCheckinLoading(true);
    setCheckinError("");
    setCheckinResult(null);

    try {
      const res = await api.checkIn(targetId, user?.name || "Fest Admin");
      setCheckinResult(res);
      notify("success", `Participant ${res.full_name || targetId} checked in!`);
      setCheckinId("");
    } catch (err) {
      setCheckinError(err.message || "Check-in failed. Please verify ID.");
    } finally {
      setCheckinLoading(false);
    }
  };

  // Cultural Gallery Handlers
  const loadGallery = async (forceFresh = false) => {
    try {
      setGalleryLoading(true);
      const data = await api.getGallery("all", forceFresh);
      setGalleryItems(data || []);
    } catch (err) {
      console.error("Failed to load gallery:", err);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleCoordinatorRefresh = async () => {
    try {
      setCoordinatorRefreshing(true);
      if (activeTab === "my-account") {
        await loadMyAccount(true);
      } else if (activeTab === "gallery") {
        await loadGallery(true);
      } else {
        await loadAdminData(true);
      }
    } catch (err) {
      console.warn("Coordinator refresh note:", err);
    } finally {
      setCoordinatorRefreshing(false);
    }
  };

  const handleAddGalleryItem = async (e) => {
    e.preventDefault();
    if (!galleryForm.image_url) {
      notify("error", "Please provide or upload an event image.");
      return;
    }
    if (!galleryForm.description) {
      notify("error", "Please provide an event description.");
      return;
    }
    if (!galleryForm.event_date) {
      notify("error", "Please select the date of the event.");
      return;
    }

    try {
      await api.createGalleryItem({
        title: galleryForm.title.trim() || "Cultural Event",
        description: galleryForm.description.trim(),
        event_date: galleryForm.event_date,
        image_url: galleryForm.image_url,
        category: "Cultural"
      });
      notify("success", "Photo added to Cultural Gallery successfully!");
      setGalleryForm({
        title: "",
        description: "",
        event_date: "",
        image_url: "",
        category: "Cultural"
      });
      loadGallery();
    } catch (err) {
      notify("error", err.message || "Failed to add photo to gallery.");
    }
  };

  const handleDeleteGalleryItem = async (id) => {
    if (!window.confirm("Are you sure you want to remove this image from the Cultural Gallery?")) return;
    try {
      await api.deleteGalleryItem(id);
      notify("success", "Cultural Gallery item removed.");
      setGalleryItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      notify("error", err.message || "Failed to remove gallery item.");
    }
  };

  const departments = [
    "Computer Science & Engineering",
    "Information Science & Engineering",
    "Electronics & Communication Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Artificial Intelligence & Machine Learning",
    "Master of Computer Applications (MCA)",
    "Master of Business Administration (MBA)"
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 bg-stone-100 text-stone-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Top Header & Context */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 text-kar-red" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-stone-900 tracking-tight">
                  Coordinator Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  Approved Admin
                </span>
                {(user?.volunteer_domain || user?.akv_dept) && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-kar-red border border-red-200 uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-kar-red" />
                    <span>{user?.volunteer_domain || user?.akv_dept} Lead</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Acharya Kannada Vedike • {user?.name || "Admin Coordinator"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role === "SUPERADMIN" && (
              <button
                onClick={onOpenSuperAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-kar-red hover:bg-red-700 rounded-xl shadow-xs transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                <span>Super Admin Portal</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCoordinatorRefresh}
              disabled={coordinatorRefreshing || loading || myAccountLoading || galleryLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Coordinator Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-kar-red ${coordinatorRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Acharya Kannada Vedike Website</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-kar-red" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback.text && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-xs ${
            feedback.type === "success" 
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-kar-red" />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback({ type: "", text: "" })}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Students</span>
            <p className="text-xl font-extrabold text-stone-900 mt-1">{overview?.total_students || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Volunteers</span>
            <p className="text-xl font-extrabold text-kar-red mt-1">{overview?.total_volunteers || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Participants</span>
            <p className="text-xl font-extrabold text-amber-600 mt-1">{overview?.total_participants || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Events</span>
            <p className="text-xl font-extrabold text-stone-800 mt-1">{overview?.total_events || 0}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Today Present</span>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">
              {overview?.today_attendance?.present || 0} / {overview?.total_volunteers || 0}
            </p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("my-account")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "my-account" ? "bg-stone-900 text-white shadow-xs" : "text-stone-600 hover:bg-white"
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>My Profile & Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "attendance"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-white"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Official Event Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab("checkin")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "checkin"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-white"
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Participant Check-In Desk</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("gallery");
              loadGallery();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "gallery"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-white"
            }`}
          >
            <Camera className="w-4 h-4 text-kar-red" />
            <span>Cultural Gallery</span>
          </button>
        </div>

        {/* Dedicated Admin Portal Updates Message Bar */}
        <RoleUpdatesBanner role="ADMIN" />

        {activeTab === "my-account" && (
          <MyProfileAttendance
            profile={myAccountData?.profile || user}
            attendanceData={myAccountData}
            loading={myAccountLoading}
            error={myAccountError}
            onRefresh={() => loadMyAccount(true)}
          />
        )}

        {/* ==================================================== */}
        {/* TAB 1: VOLUNTEER ATTENDANCE (TODAY ONLY)             */}
        {/* ==================================================== */}
        {activeTab === "attendance" && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-6">
            {/* Header & Submit/Export Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-kar-red" />
                    <span>Official Attendance — {selectedDate || "Select Date"}</span>
                  </h3>
                  {attendanceSession.is_submitted ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>SUBMITTED & LOCKED</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>OPEN FOR MARKING</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {(user?.volunteer_domain || user?.akv_dept)
                    ? `Marking attendance for ${user.volunteer_domain || user.akv_dept} Domain Volunteers. Two markings per volunteer per day.`
                    : "Official server-timestamped Check-In and Check-Out. Two markings per participant per day."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadAdminData(true)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  title="Refresh Attendance Roster and Counts"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-kar-red" : ""}`} />
                  <span>Refresh Roster</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScannedVolunteerInfo(null);
                    setScannerFeedback("");
                    setShowVolunteerScanner(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Scan Volunteer QR Pass"
                >
                  <Scan className="w-4 h-4 text-emerald-200" />
                  <span>Scan Volunteer QR</span>
                </button>

                {attendanceSession.is_submitted ? (
                  <div className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-500 bg-stone-100 border border-stone-200 flex items-center gap-1.5 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Attendance Submitted</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-kar-red hover:bg-red-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4 text-amber-300" />
                    <span>SUBMIT ATTENDANCE</span>
                  </button>
                )}
              </div>
            </div>

            {/* Event Date Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 max-w-4xl xl:max-w-5xl">
              <span className="text-xs font-extrabold text-stone-400 uppercase tracking-wider whitespace-nowrap mr-1">
                Event Date:
              </span>
              {attendanceDates.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d.date);
                    loadAttendanceRoster(d.date);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedDate === d.date
                      ? "bg-stone-900 text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200/80"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{d.date_formatted || d.date}</span>
                  {d.label && <span className="text-[10px] opacity-75 font-normal">({d.label})</span>}
                  {d.is_today && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Today" />
                  )}
                </button>
              ))}
            </div>

            {/* Submission Lock Banner */}
            {attendanceSession.is_submitted && (
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 max-w-4xl xl:max-w-5xl">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-sm">Attendance Submitted & Finalized</span>
                    <span className="text-stone-600 mt-0.5 block">
                      Submitted by <strong>{attendanceSession.submitted_by || "Admin"}</strong> on{" "}
                      <strong>{attendanceSession.submitted_at_ist || attendanceSession.submitted_at || "Recorded Time"}</strong>.
                      Records are locked for normal admins.
                    </span>
                  </div>
                </div>
                {role === "SUPERADMIN" && (
                  <span className="px-3 py-1 bg-amber-200/70 text-amber-900 font-extrabold rounded-lg shrink-0 self-start sm:self-auto text-[11px]">
                    Superadmin Override Active
                  </span>
                )}
              </div>
            )}

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl xl:max-w-5xl">
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                  Total Participants
                </span>
                <p className="text-xl font-extrabold text-stone-900 mt-1">
                  {attendanceSummary.total_participants}
                </p>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                  Checked In
                </span>
                <p className="text-xl font-extrabold text-emerald-800 mt-1">
                  {attendanceSummary.checked_in}
                </p>
              </div>

              <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">
                  Completed
                </span>
                <p className="text-xl font-extrabold text-blue-800 mt-1">
                  {attendanceSummary.completed}
                </p>
              </div>

              <div className="bg-stone-100/60 p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                  Not Marked
                </span>
                <p className="text-xl font-extrabold text-stone-700 mt-1">
                  {attendanceSummary.not_marked}
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                attendanceSession.is_submitted 
                  ? "bg-red-50 border-red-200 text-red-900" 
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}>
                <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                  Attendance Status
                </span>
                <p className="text-sm font-extrabold mt-1.5 flex items-center gap-1.5">
                  {attendanceSession.is_submitted ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-kar-red" />
                      <span>SUBMITTED</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>OPEN FOR MARKING</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 max-w-4xl xl:max-w-5xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search Reg ID, Name, AUID, Phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadAttendanceRoster()}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs w-48 sm:w-56"
                  />
                </div>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="py-1.5 px-2.5 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                >
                  <option value="all">All Academic Depts</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {role !== "SUPERADMIN" && (user?.volunteer_domain || user?.akv_dept) ? (
                  <div className="py-1.5 px-3 rounded-xl border border-kar-red/30 bg-red-50 text-xs font-bold text-kar-red flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-kar-red animate-pulse" />
                    <span>Domain: {user?.volunteer_domain || user?.akv_dept}</span>
                  </div>
                ) : (
                  <select
                    value={akvDeptFilter}
                    onChange={(e) => setAkvDeptFilter(e.target.value)}
                    className="py-1.5 px-2.5 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                  >
                    <option value="all">All AKV Domains</option>
                    {AKV_DOMAINS.map((dom) => (
                      <option key={dom} value={dom}>{dom}</option>
                    ))}
                  </select>
                )}

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-1.5 px-2.5 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="NOT_MARKED">Not Marked</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <button
                  type="button"
                  onClick={() => loadAdminData(true)}
                  disabled={loading}
                  className="p-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                  title="Refresh Roster and Statistics"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-kar-red" : ""}`} />
                </button>
              </div>

              <div className="text-xs text-stone-500 font-medium whitespace-nowrap">
                Showing <strong>{attendanceRoster.length}</strong> {role !== "SUPERADMIN" && (user?.volunteer_domain || user?.akv_dept) ? "domain volunteers" : "participants"}
              </div>
            </div>

            {/* Attendance Roster Table */}
            {attendanceRoster.length === 0 ? (
              <div className="text-center py-12 space-y-2 bg-stone-50/50 rounded-2xl border border-stone-100 max-w-4xl xl:max-w-5xl">
                <Users className="w-9 h-9 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-700">
                  {role !== "SUPERADMIN" && (user?.volunteer_domain || user?.akv_dept)
                    ? `No volunteers found in ${user.volunteer_domain || user.akv_dept} domain`
                    : "No participants found"}
                </p>
                <p className="text-xs text-stone-500">
                  Try adjusting your search criteria or select a different department.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white max-w-2xl mx-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <colgroup>
                    <col className="w-[62%]" />
                    <col className="w-[38%]" />
                  </colgroup>
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-extrabold border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3.5">
                        {role !== "SUPERADMIN" && (user?.volunteer_domain || user?.akv_dept) ? "Volunteer" : "Participant"}
                      </th>
                      <th className="py-2.5 px-3.5 text-right">Attendance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {attendanceRoster.map((p) => {
                      const isMarking = markingUserIds.includes(p.user_id);
                      const isLocked = attendanceSession.locked_for_admin && role !== "SUPERADMIN";

                      return (
                        <tr key={p.user_id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-stone-900 block text-sm leading-tight">{p.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {p.akv_dept && p.akv_dept !== "--" && (
                                <span className="text-[11px] text-kar-red font-semibold">
                                  {p.akv_dept}
                                </span>
                              )}
                              <span className="text-stone-300">•</span>
                              <span className="font-mono text-[11px] font-bold text-stone-600">
                                {p.auid}
                              </span>
                              {p.check_in_time && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-200">
                                  In: {p.check_in_time}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            {isAttendanceWindowExpired ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Closed (05/11/2026)</span>
                              </span>
                            ) : isLocked || selectedDateIsFuture ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold text-stone-400 bg-stone-100 border border-stone-200 cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5" />
                                <span>{selectedDateIsFuture ? "Future Date" : "Locked"}</span>
                              </span>
                            ) : p.status === "NOT_MARKED" ? (
                              <button
                                type="button"
                                onClick={() => handleCheckIn(p.user_id)}
                                disabled={isMarking}
                                className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 ml-auto disabled:opacity-50 cursor-pointer active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isMarking ? "Recording..." : "CHECK IN"}</span>
                              </button>
                            ) : p.status === "CHECKED_IN" ? (
                              <button
                                type="button"
                                onClick={() => handleCheckOut(p.user_id)}
                                disabled={isMarking || !p.check_in_time || (p.check_in_time && !p.check_out_available)}
                                className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs transition-all flex items-center gap-1.5 ml-auto disabled:opacity-50 cursor-pointer active:scale-95"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>{isMarking ? "Recording..." : p.check_out_available === false ? "AFTER 1 HR" : "CHECK OUT"}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200">
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: PARTICIPANT CHECK-IN DESK                     */}
        {/* ==================================================== */}
        {activeTab === "checkin" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-stone-900">Event Check-In Desk</h3>
              <p className="text-xs text-stone-500">
                Scan attendee digital pass QR code via camera or enter Registration Pass ID / AUID.
              </p>
            </div>

            {/* Check-In Mode Switcher */}
            <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-inner">
              <button
                type="button"
                onClick={() => setCheckinMode("camera")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  checkinMode === "camera"
                    ? "bg-white text-kar-red shadow-xs border border-stone-200/50"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera QR Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckinMode("manual")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  checkinMode === "manual"
                    ? "bg-white text-kar-red shadow-xs border border-stone-200/50"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Manual ID Entry</span>
              </button>
            </div>

            {checkinError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-kar-red" />
                <span>{checkinError}</span>
              </div>
            )}

            {/* Success Card when pass is checked in */}
            {checkinResult && (
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl space-y-3 text-xs animate-fade-in shadow-md">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="font-extrabold text-emerald-950 text-sm">{checkinResult.full_name || "Verified Attendee"}</h4>
                      <p className="text-[10px] text-emerald-700">Attendance marked successfully</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900 font-extrabold text-[11px] tracking-wide">
                    {checkinResult.status || "Checked In"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-stone-700 pt-1">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Registration ID</span>
                    <strong className="font-mono text-stone-900">{checkinResult.registration_id}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">AUID / USN</span>
                    <strong className="font-mono text-stone-900">{checkinResult.effective_auid || checkinResult.auid || checkinResult.usn || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Event</span>
                    <strong className="text-stone-900">{checkinResult.event?.title_en || checkinResult.event_id || "Festival Pass"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-bold block">Department</span>
                    <strong className="text-stone-900">{checkinResult.department || "Acharya"}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCheckinResult(null)}
                  className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Scan Next Attendee</span>
                </button>
              </div>
            )}

            {/* Mode A: Camera Scanner */}
            {checkinMode === "camera" && (
              <div className="space-y-3">
                <CameraQRScanner
                  onScanSuccess={(scannedId) => handleCheckInSubmit(scannedId)}
                  isLoading={checkinLoading}
                  autoStart={false}
                />
              </div>
            )}

            {/* Mode B: Manual Search */}
            {checkinMode === "manual" && (
              <form onSubmit={handleCheckInSubmit} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Registration ID / AUID / USN
                  </label>
                  <input
                    type="text"
                    required
                    value={checkinId}
                    onChange={(e) => setCheckinId(e.target.value.toUpperCase())}
                    placeholder="Enter Registration ID or AUID"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-300 text-sm font-mono uppercase focus:ring-2 focus:ring-kar-red"
                  />
                </div>

                <button
                  type="submit"
                  disabled={checkinLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {checkinLoading ? "Verifying Pass..." : "Verify & Check-In Attendee"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: CULTURAL GALLERY MANAGEMENT                   */}
        {/* ==================================================== */}
        {activeTab === "gallery" && (
          <div className="space-y-6 animate-fade-in">
            {/* Add Gallery Item Form */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-5">
              <div className="border-b border-stone-100 pb-4">
                <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-kar-red" />
                  <span>Add Photo to Cultural Gallery</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Upload an event image, enter the description and date of the cultural event to display on the fest gallery.
                </p>
              </div>

              <form onSubmit={handleAddGalleryItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event Image */}
                  <div>
                    <EventImageUpload
                      imageUrl={galleryForm.image_url}
                      onImageChange={(url) => setGalleryForm({ ...galleryForm, image_url: url })}
                      label="Event Image *"
                      required={true}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Event Title / Headline *
                      </label>
                      <input
                        type="text"
                        required
                        value={galleryForm.title}
                        onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                        placeholder="e.g. Dollu Kunitha Spectacular"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Date of Event *
                      </label>
                      <input
                        type="date"
                        required
                        value={galleryForm.event_date}
                        onChange={(e) => setGalleryForm({ ...galleryForm, event_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Event Description *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={galleryForm.description}
                        onChange={(e) => setGalleryForm({ ...galleryForm, description: e.target.value })}
                        placeholder="Describe the cultural event, performance highlights, performers, or atmosphere..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Cultural Gallery</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Existing Cultural Gallery Items Grid */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-kar-red" />
                  <h4 className="font-extrabold text-stone-900 text-sm sm:text-base">
                    Existing Cultural Gallery ({galleryItems.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => loadGallery(true)}
                  disabled={galleryLoading}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Refresh Cultural Gallery"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${galleryLoading ? "animate-spin text-kar-red" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {galleryLoading ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  Loading gallery items...
                </div>
              ) : galleryItems.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  No cultural gallery items yet. Add the first event photo above!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50 hover:shadow-md transition-shadow group flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-44 w-full overflow-hidden bg-stone-900 relative">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {item.event_date && (
                            <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              {item.event_date}
                            </span>
                          )}
                        </div>
                        <div className="p-3.5 space-y-1">
                          <h5 className="font-bold text-stone-900 text-sm line-clamp-1">{item.title}</h5>
                          <p className="text-xs text-stone-600 line-clamp-2">{item.description}</p>
                        </div>
                      </div>

                      <div className="p-3.5 pt-0 border-t border-stone-200/60 mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-stone-400 uppercase">
                          {item.category || "Cultural"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryItem(item.id)}
                          className="px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Attendance Confirmation Modal */}
        {showSubmitModal && (
          <div 
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={() => setShowSubmitModal(false)}
          >
            <div 
              className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-[92%] sm:w-full border border-stone-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 relative my-auto max-h-[85dvh] sm:max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-start gap-3.5 pr-8">
                <div className="p-3 bg-red-100 text-kar-red rounded-2xl shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-stone-900">
                    Submit Attendance for {selectedDate}
                  </h4>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Submitting attendance permanently saves all records for this date and locks them against any further edits by normal administrators.
                  </p>
                </div>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Selected Event Date:</span>
                  <strong className="text-stone-900 font-mono">{selectedDate}</strong>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Total Checked-In / Completed:</span>
                  <strong className="text-emerald-700">
                    {attendanceSummary.checked_in + attendanceSummary.completed} / {attendanceSummary.total_participants}
                  </strong>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Not Marked:</span>
                  <strong className="text-stone-700">{attendanceSummary.not_marked}</strong>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Submission Notes / Remarks (Optional):
                </label>
                <input
                  type="text"
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g., Session completed on schedule"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-kar-red"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={submitLoading}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-kar-red hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-300" />
                  <span>{submitLoading ? "Submitting & Locking..." : "Confirm & Submit Attendance"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Volunteer Attendance QR Scanner Modal */}
        {showVolunteerScanner && (
          <div 
            className="fixed inset-0 z-[110] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowVolunteerScanner(false)}
          >
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
              <div className="bg-gradient-to-r from-stone-900 to-stone-950 p-4 sm:p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-white">Scan Volunteer Attendance Pass</h4>
                    <p className="text-[10px] text-stone-400">Position volunteer profile QR code in camera view</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowVolunteerScanner(false); setScannedVolunteerInfo(null); setScannerFeedback(""); }} 
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                {!scannedVolunteerInfo ? (
                  <div>
                    <p className="text-xs text-stone-600 mb-3 text-center">
                      Point camera at the QR code displayed in the volunteer's profile pass:
                    </p>
                    <div className="rounded-2xl overflow-hidden border-2 border-dashed border-emerald-500/50 bg-stone-950/5 p-2">
                      <CameraQRScanner
                        onScanSuccess={handleScanVolunteerQR}
                        autoStart={true}
                      />
                    </div>
                    {scannerFeedback && (
                      <p className="mt-3 text-center text-xs font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        {scannerFeedback}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-center">
                      <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                      <h4 className="text-base font-extrabold text-stone-900">{scannedVolunteerInfo.name}</h4>
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="font-mono font-bold text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200">
                          {scannedVolunteerInfo.auid}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="font-extrabold text-kar-red bg-red-100/80 px-2 py-0.5 rounded">
                          {scannedVolunteerInfo.akv_dept || "Volunteer"}
                        </span>
                      </div>
                      <div className="pt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase inline-block ${
                          scannedVolunteerInfo.status === "COMPLETED" 
                            ? "bg-blue-100 text-blue-900 border border-blue-200" 
                            : scannedVolunteerInfo.status === "CHECKED_IN"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "bg-stone-100 text-stone-700 border border-stone-200"
                        }`}>
                          Current Status: {scannedVolunteerInfo.status}
                        </span>
                        {scannedVolunteerInfo.check_in_time && (
                          <p className="text-[11px] text-stone-500 font-mono mt-1 font-semibold">
                            Check-In recorded at {scannedVolunteerInfo.check_in_time}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {isAttendanceWindowExpired ? (
                        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-center text-xs font-bold">
                          Attendance window closed on 05/11/2026.
                        </div>
                      ) : scannedVolunteerInfo.status === "NOT_MARKED" ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleCheckIn(scannedVolunteerInfo.user_id);
                            setShowVolunteerScanner(false);
                            setScannedVolunteerInfo(null);
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                          <span>RECORD CHECK-IN FOR {scannedVolunteerInfo.name.toUpperCase()}</span>
                        </button>
                      ) : scannedVolunteerInfo.status === "CHECKED_IN" ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleCheckOut(scannedVolunteerInfo.user_id);
                            setShowVolunteerScanner(false);
                            setScannedVolunteerInfo(null);
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Clock className="w-4 h-4" />
                          <span>RECORD CHECK-OUT FOR {scannedVolunteerInfo.name.toUpperCase()}</span>
                        </button>
                      ) : (
                        <div className="p-3 bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-center text-xs font-bold">
                          ✓ Attendance already completed for today.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setScannedVolunteerInfo(null);
                          setScannerFeedback("");
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Scan Another Volunteer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
