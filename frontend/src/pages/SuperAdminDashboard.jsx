import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { 
  ShieldAlert, 
  Users, 
  UserCheck, 
  Calendar, 
  Download, 
  Search, 
  Filter, 
  Plus, 
  Pencil, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  BarChart3, 
  Clock, 
  Eye, 
  LogOut, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Sparkles,
  MapPin,
  Check,
  X,
  Compass,
  ChevronRight,
  ShieldCheck,
  UserX,
  Film,
  Share2,
  Heart,
  ExternalLink,
  History,
  Image as ImageIcon,
  Lock,
  Unlock,
  RotateCcw,
  CheckCheck,
  CheckSquare
} from "lucide-react";
import { EventImageUpload } from "../components/EventImageUpload";

export const SuperAdminDashboard = ({ onNavigateHome }) => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("overview"); 
  // Sections: overview, admins, students, volunteers, attendance, exports, events, audit-logs

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [adminsList, setAdminsList] = useState([]);
  const [studentsData, setStudentsData] = useState({ total: 0, students: [] });
  const [volunteersList, setVolunteersList] = useState([]);
  const [attendanceData, setAttendanceData] = useState({ records: [], available_dates: [] });
  const [eventsList, setEventsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Major Activities State (v2.1.0)
  const [activitiesList, setActivitiesList] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityModal, setActivityModal] = useState(null); // null, "new", "edit"
  const [currentActivity, setCurrentActivity] = useState({
    id: null,
    title: "",
    activity_date: "",
    description: "",
    image_url: "",
    category: "Major Activity"
  });

  // Reels & Social Posts State (v2.1.0)
  const [reelsList, setReelsList] = useState([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [reelModal, setReelModal] = useState(null); // null, "new", "edit"
  const [currentReel, setCurrentReel] = useState({
    id: null,
    type: "REEL",
    url: "",
    likes: 0,
    description: "",
    cover_image: "",
    views: "",
    comments: "",
    is_active: true
  });

  // Search & Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentRoleFilter, setStudentRoleFilter] = useState("ALL");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("");
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // Official Multi-Day Attendance State (v2.1.2)
  const [attendanceConfigDates, setAttendanceConfigDates] = useState([]);
  const [selectedOfficialDate, setSelectedOfficialDate] = useState("");
  const [officialAttendanceRoster, setOfficialAttendanceRoster] = useState([]);
  const [officialAttendanceSession, setOfficialAttendanceSession] = useState({
    is_submitted: false,
    submitted_at: null,
    submitted_by: null,
    is_unlocked: false
  });
  const [officialAttendanceSummary, setOfficialAttendanceSummary] = useState({
    total_participants: 0,
    checked_in: 0,
    completed: 0,
    not_marked: 0,
    is_submitted: false
  });
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");
  const [attendanceAkvDeptFilter, setAttendanceAkvDeptFilter] = useState("all");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const [attendanceAuditLogs, setAttendanceAuditLogs] = useState([]);
  const [activeAuditTab, setActiveAuditTab] = useState("attendance"); // "attendance" or "security"
  const [editRecordModal, setEditRecordModal] = useState(null);
  const [unlockModal, setUnlockModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [officialExportLoading, setOfficialExportLoading] = useState(false);

  // Modals & Edit States
  const [editStudent, setEditStudent] = useState(null);
  const [editAttendance, setEditAttendance] = useState(null);
  const [markAttendanceModal, setMarkAttendanceModal] = useState(false);
  const [markData, setMarkData] = useState({ volunteer_user_id: "", date: new Date().toISOString().split("T")[0], status: "PRESENT", notes: "" });
  const [eventModal, setEventModal] = useState(null); // null, "new", or "edit"
  const [editEvent, setEditEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title_en: "",
    title_kn: "",
    category: "cultural",
    category_kn: "ಸಾಂಸ್ಕೃತಿಕ",
    description_en: "",
    description_kn: "",
    venue: "Main Auditorium, Acharya IT",
    venue_kn: "ಮುಖ್ಯ ಸಭಾಂಗಣ, ಆಚಾರ್ಯ ಐ.ಟಿ",
    event_date: "November 01, 2026",
    event_time: "10:00 AM - 01:00 PM",
    reporting_time: "09:30 AM",
    max_slots: 50,
    format: "solo",
    is_team: false,
    min_team_size: 1,
    max_team_size: 1,
    rules_en: "1. Respect all event time limits.\n2. Judge decisions are final.",
    rules_kn: "೧. ಸಮಯ ಮಿತಿಯನ್ನು ಪಾಲಿಸಬೇಕು.\n೨. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮ."
  });

  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const notify = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: "", text: "" }), 5000);
  };

  // Load section-specific data
  const loadStats = async () => {
    try {
      const res = await api.getSuperAdminStats();
      if (res.success) setMetrics(res.metrics);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdmins = async () => {
    try {
      const data = await api.listAdmins();
      setAdminsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await api.listStudents({
        search: studentSearch,
        role: studentRoleFilter
      });
      setStudentsData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadVolunteers = async () => {
    try {
      const data = await api.listAllVolunteers();
      setVolunteersList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadOfficialAttendance = async (dateOverride = null) => {
    try {
      setAttendanceActionLoading(true);
      let activeDate = dateOverride || selectedOfficialDate;
      if (!activeDate) {
        const datesRes = await api.getAttendanceConfigDates();
        if (datesRes && datesRes.dates) {
          setAttendanceConfigDates(datesRes.dates);
          const todayItem = datesRes.dates.find(d => d.is_today);
          activeDate = todayItem ? todayItem.date : (datesRes.current_date || datesRes.dates[0]?.date || "");
          setSelectedOfficialDate(activeDate);
        }
      }
      if (!activeDate) return;

      const res = await api.getAttendance({
        date: activeDate,
        search: attendanceSearchQuery,
        department: attendanceDeptFilter !== "all" ? attendanceDeptFilter : "",
        akv_dept: attendanceAkvDeptFilter !== "all" ? attendanceAkvDeptFilter : "",
        status_filter: attendanceStatusFilter !== "all" ? attendanceStatusFilter : ""
      });

      if (res && res.success) {
        setOfficialAttendanceRoster(res.participants || []);
        setOfficialAttendanceSession(res.session || {
          is_submitted: false,
          submitted_at: null,
          submitted_by: null,
          is_unlocked: false
        });
        setOfficialAttendanceSummary(res.summary || {
          total_participants: res.participants?.length || 0,
          checked_in: 0,
          completed: 0,
          not_marked: 0,
          is_submitted: false
        });
      }
    } catch (err) {
      console.error("Superadmin attendance loading error:", err);
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const loadAttendance = async (dateOverride = null) => {
    loadOfficialAttendance(dateOverride);
    try {
      const data = await api.getSuperAdminAttendance({
        date: attendanceDateFilter || "all",
        department: attendanceDeptFilter !== "all" ? attendanceDeptFilter : ""
      });
      setAttendanceData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await api.getEvents("all", false);
      setEventsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const [generalLogs, attendanceAuditRes] = await Promise.all([
        api.getAuditLogs({ action: auditActionFilter !== "all" ? auditActionFilter : "" }).catch(() => []),
        api.getAttendanceAudit().catch(() => ({ audit_logs: [] }))
      ]);
      setAuditLogs(generalLogs || []);
      setAttendanceAuditLogs(attendanceAuditRes?.audit_logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadActivities = async () => {
    try {
      setActivitiesLoading(true);
      const data = await api.getActivities("all", false);
      setActivitiesList(data || []);
    } catch (e) {
      console.error("Error loading activities:", e);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadReels = async () => {
    try {
      setReelsLoading(true);
      const data = await api.getReels("all");
      setReelsList(data || []);
    } catch (e) {
      console.error("Error loading reels:", e);
    } finally {
      setReelsLoading(false);
    }
  };

  // Master refresh depending on active section
  const refreshCurrentSection = () => {
    loadStats();
    if (activeSection === "admins") loadAdmins();
    else if (activeSection === "activities") loadActivities();
    else if (activeSection === "reels") loadReels();
    else if (activeSection === "students") loadStudents();
    else if (activeSection === "volunteers") loadVolunteers();
    else if (activeSection === "attendance") loadAttendance();
    else if (activeSection === "events") loadEvents();
    else if (activeSection === "audit-logs") loadAuditLogs();
  };

  useEffect(() => {
    refreshCurrentSection();
  }, [activeSection, studentRoleFilter, attendanceDateFilter, attendanceDeptFilter, auditActionFilter]);

  // Handlers for Admin Approvals
  const handleApproveAdmin = async (id, uname) => {
    try {
      await api.approveAdmin(id);
      notify("success", `Admin '${uname}' approved successfully.`);
      loadAdmins();
      loadStats();
    } catch (err) {
      notify("error", err.message || "Approval failed.");
    }
  };

  const handleRejectAdmin = async (id, uname) => {
    try {
      await api.rejectAdmin(id);
      notify("success", `Admin '${uname}' rejected.`);
      loadAdmins();
      loadStats();
    } catch (err) {
      notify("error", err.message || "Rejection failed.");
    }
  };

  const handleToggleAdmin = async (id) => {
    try {
      const res = await api.toggleAdminStatus(id);
      notify("success", res.message || "Status updated.");
      loadAdmins();
    } catch (err) {
      notify("error", err.message);
    }
  };

  const handleDeleteAdmin = async (id, uname) => {
    if (uname === "akv-nt-2026" || uname === "superadmin") {
      notify("error", "The Super Administrator profile cannot be deleted.");
      return;
    }
    if (!window.confirm(`Permanently remove admin '${uname}'?`)) return;
    try {
      await api.deleteAdmin(id);
      notify("success", `Admin '${uname}' removed.`);
      loadAdmins();
    } catch (err) {
      notify("error", err.message);
    }
  };

  // Handlers for Major Activities (v2.1.0)
  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!currentActivity.title || !currentActivity.description || !currentActivity.activity_date) {
      notify("error", "Please fill in Activity Name, Date of Activity, and Description.");
      return;
    }
    if (!currentActivity.image_url) {
      notify("error", "Please upload or provide an Activity Image.");
      return;
    }
    try {
      if (activityModal === "new") {
        await api.createActivity({
          title: currentActivity.title.trim(),
          description: currentActivity.description.trim(),
          activity_date: currentActivity.activity_date,
          image_url: currentActivity.image_url,
          category: currentActivity.category || "Major Activity"
        });
        notify("success", "Major Activity added successfully!");
      } else if (activityModal === "edit") {
        await api.updateActivity(currentActivity.id, {
          title: currentActivity.title.trim(),
          description: currentActivity.description.trim(),
          activity_date: currentActivity.activity_date,
          image_url: currentActivity.image_url,
          category: currentActivity.category || "Major Activity"
        });
        notify("success", "Major Activity updated successfully!");
      }
      setActivityModal(null);
      loadActivities();
    } catch (err) {
      notify("error", err.message || "Failed to save activity.");
    }
  };

  const handleDeleteActivity = async (id, title) => {
    if (!window.confirm(`Permanently remove major activity '${title}'?`)) return;
    try {
      await api.deleteActivity(id);
      notify("success", `Activity '${title}' removed.`);
      loadActivities();
    } catch (err) {
      notify("error", err.message || "Failed to delete activity.");
    }
  };

  // Handlers for Reels & Posts (v2.1.0)
  const handleSaveReel = async (e) => {
    e.preventDefault();
    if (!currentReel.url || !currentReel.description) {
      notify("error", "Please provide Reel/Post Link and Description.");
      return;
    }
    if (currentReel.type === "REEL" && !currentReel.cover_image) {
      notify("error", "A Cover Image is required when adding a Reel.");
      return;
    }
    try {
      const payload = {
        type: currentReel.type,
        url: currentReel.url.trim(),
        likes: parseInt(currentReel.likes) || 0,
        description: currentReel.description.trim(),
        cover_image: currentReel.cover_image || null,
        views: currentReel.views ? String(currentReel.views) : null,
        comments: currentReel.comments ? String(currentReel.comments) : null,
        is_active: currentReel.is_active !== false
      };

      if (reelModal === "new") {
        await api.createReel(payload);
        notify("success", `${currentReel.type === "REEL" ? "Reel" : "Post"} added successfully!`);
      } else if (reelModal === "edit") {
        await api.updateReel(currentReel.id, payload);
        notify("success", `${currentReel.type === "REEL" ? "Reel" : "Post"} updated successfully!`);
      }
      setReelModal(null);
      loadReels();
    } catch (err) {
      notify("error", err.message || "Failed to save reel/post.");
    }
  };

  const handleDeleteReel = async (id) => {
    if (!window.confirm("Permanently remove this Reel/Post?")) return;
    try {
      await api.deleteReel(id);
      notify("success", "Reel/Post removed.");
      loadReels();
    } catch (err) {
      notify("error", err.message || "Failed to delete reel.");
    }
  };

  // Handlers for Students
  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updateStudent(editStudent.id, {
        name: editStudent.name,
        email: editStudent.email,
        phone: editStudent.phone,
        department: editStudent.department,
        role: editStudent.role,
        account_status: editStudent.account_status
      });
      notify("success", "Student updated successfully.");
      setEditStudent(null);
      loadStudents();
    } catch (err) {
      notify("error", err.message);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Permanently delete account for '${name}'? This cannot be undone.`)) return;
    try {
      await api.deleteStudent(id);
      notify("success", `Student '${name}' deleted.`);
      loadStudents();
    } catch (err) {
      notify("error", err.message);
    }
  };

  // Handlers for Attendance Edit
  const handleSaveAttendanceEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updateAttendanceRecord(editAttendance.id, editAttendance.status, editAttendance.notes || "Super Admin edit");
      notify("success", "Attendance record updated.");
      setEditAttendance(null);
      loadAttendance();
    } catch (err) {
      notify("error", err.message);
    }
  };

  const handleMarkAttendanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.markAttendanceForDate(
        markData.volunteer_user_id,
        markData.date,
        markData.status,
        markData.notes
      );
      notify("success", "Attendance record saved.");
      setMarkAttendanceModal(false);
      loadAttendance();
    } catch (err) {
      notify("error", err.message);
    }
  };

  // Official Multi-Day Attendance Action Handlers (v2.1.2)
  const handleSuperAdminCheckIn = async (participantUserId) => {
    try {
      const res = await api.markAttendanceCheckIn(participantUserId, selectedOfficialDate);
      notify("success", res.message || "Check-In recorded in IST.");
      loadOfficialAttendance();
    } catch (err) {
      notify("error", err.message || "Check-In failed.");
    }
  };

  const handleSuperAdminCheckOut = async (participantUserId) => {
    try {
      const res = await api.markAttendanceCheckOut(participantUserId, selectedOfficialDate);
      notify("success", res.message || "Check-Out recorded in IST.");
      loadOfficialAttendance();
    } catch (err) {
      notify("error", err.message || "Check-Out failed.");
    }
  };

  const handleSaveOfficialAttendanceEdit = async (e) => {
    e.preventDefault();
    if (!editRecordModal?.record_id) return;
    try {
      await api.editAttendanceRecord(editRecordModal.record_id, {
        check_in_time: editRecordModal.check_in_time || null,
        check_out_time: editRecordModal.check_out_time || null,
        reason: editRecordModal.reason || "Superadmin correction"
      });
      notify("success", "Attendance times updated and logged to audit trail.");
      setEditRecordModal(null);
      loadOfficialAttendance();
      loadAuditLogs();
    } catch (err) {
      notify("error", err.message || "Failed to update record.");
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!resetModal?.record_id) return;
    try {
      await api.resetAttendanceRecord(resetModal.record_id, resetModal.reason || "Superadmin reset");
      notify("success", "Attendance record reset to NOT MARKED.");
      setResetModal(null);
      loadOfficialAttendance();
      loadAuditLogs();
    } catch (err) {
      notify("error", err.message || "Failed to reset record.");
    }
  };

  const handleConfirmUnlock = async (e) => {
    e.preventDefault();
    if (!unlockModal?.date) return;
    try {
      await api.unlockAttendanceSession(unlockModal.date, unlockModal.reason || "Superadmin unlocked session");
      notify("success", `Attendance for ${unlockModal.date} unlocked! Normal admins can now mark attendance.`);
      setUnlockModal(null);
      loadOfficialAttendance();
      loadAuditLogs();
    } catch (err) {
      notify("error", err.message || "Failed to unlock session.");
    }
  };

  const handleOfficialExcelExport = async () => {
    setOfficialExportLoading(true);
    try {
      await api.exportOfficialAttendanceExcel({
        department: attendanceDeptFilter !== "all" ? attendanceDeptFilter : "",
        akv_dept: attendanceAkvDeptFilter !== "all" ? attendanceAkvDeptFilter : ""
      });
      notify("success", "Official Attendance Excel sheet downloaded!");
    } catch (err) {
      notify("error", err.message || "Failed to export Excel report.");
    } finally {
      setOfficialExportLoading(false);
    }
  };

  const categoryMapping = {
    cultural: "ಸಾಂಸ್ಕೃತಿಕ",
    traditional: "ಜಾನಪದ & ಸಾಂಪ್ರದಾಯಿಕ",
    literary: "ಸಾಹಿತ್ಯ",
    fine_arts: "ಲಲಿತಕಲೆ",
    theatre: "ರಂಗಭೂಮಿ",
    music: "ಸಂಗೀತ"
  };

  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    try {
      const isTeam = newEvent.format === "group" || newEvent.format === "both" || newEvent.format === "duet";
      const payload = {
        ...newEvent,
        is_team: isTeam,
        min_team_size: newEvent.format === "solo" ? 1 : (newEvent.format === "duet" ? 2 : (parseInt(newEvent.min_team_size) || (newEvent.format === "both" ? 1 : 2))),
        max_team_size: newEvent.format === "solo" ? 1 : (newEvent.format === "duet" ? 2 : (parseInt(newEvent.max_team_size) || 15)),
        category_kn: categoryMapping[newEvent.category] || newEvent.category_kn || "ಸಾಂಸ್ಕೃತಿಕ",
        venue_kn: newEvent.venue_kn || newEvent.venue,
        description_kn: newEvent.description_kn || newEvent.description_en,
        rules_kn: newEvent.rules_kn || newEvent.rules_en
      };
      await api.createEvent(payload);
      notify("success", `Event '${newEvent.title_en}' created successfully.`);
      setEventModal(null);
      setNewEvent({
        title_en: "",
        title_kn: "",
        category: "cultural",
        category_kn: "ಸಾಂಸ್ಕೃತಿಕ",
        description_en: "",
        description_kn: "",
        venue: "Main Auditorium, Acharya IT",
        venue_kn: "ಮುಖ್ಯ ಸಭಾಂಗಣ, ಆಚಾರ್ಯ ಐ.ಟಿ",
        event_date: "November 01, 2026",
        event_time: "10:00 AM - 01:00 PM",
        reporting_time: "09:30 AM",
        max_slots: 50,
        format: "solo",
        is_team: false,
        min_team_size: 1,
        max_team_size: 1,
        rules_en: "1. Respect all event time limits.\n2. Judge decisions are final.",
        rules_kn: "೧. ಸಮಯ ಮಿತಿಯನ್ನು ಪಾಲಿಸಬೇಕು.\n೨. ತೀರ್ಪುಗಾರರ ತೀರ್ಮಾನವೇ ಅಂತಿಮ."
      });
      loadEvents();
    } catch (err) {
      notify("error", err.message || "Failed to create event");
    }
  };

  const handleEditEventSubmit = async (e) => {
    e.preventDefault();
    if (!editEvent || !editEvent.id) return;
    try {
      const isTeam = editEvent.format === "group" || editEvent.format === "both" || editEvent.format === "duet" || Boolean(editEvent.is_team);
      await api.updateEvent(editEvent.id, {
        title_en: editEvent.title_en,
        title_kn: editEvent.title_kn,
        category: editEvent.category,
        category_kn: editEvent.category_kn || categoryMapping[editEvent.category] || "ಸಾಂಸ್ಕೃತಿಕ",
        description_en: editEvent.description_en,
        description_kn: editEvent.description_kn,
        venue: editEvent.venue,
        venue_kn: editEvent.venue_kn,
        event_date: editEvent.event_date,
        event_time: editEvent.event_time,
        reporting_time: editEvent.reporting_time,
        max_slots: parseInt(editEvent.max_slots) || 50,
        format: editEvent.format,
        is_team: isTeam,
        min_team_size: editEvent.format === "solo" ? 1 : (editEvent.format === "duet" ? 2 : (parseInt(editEvent.min_team_size) || (editEvent.format === "both" ? 1 : 2))),
        max_team_size: editEvent.format === "solo" ? 1 : (editEvent.format === "duet" ? 2 : (parseInt(editEvent.max_team_size) || 15)),
        rules_en: editEvent.rules_en,
        rules_kn: editEvent.rules_kn,
        is_active: Boolean(editEvent.is_active)
      });
      notify("success", `Event '${editEvent.title_en}' updated successfully.`);
      setEventModal(null);
      setEditEvent(null);
      loadEvents();
    } catch (err) {
      notify("error", err.message || "Failed to update event");
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
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Super Admin Top Banner */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-kar-red to-red-700 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight">
                  SUPER ADMIN PORTAL
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-950 text-amber-300 border border-red-800 uppercase">
                  Highest Authority
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Acharya Kannada Vedike • Nuditaranga 2026 Core Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">View Public Website</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-kar-red hover:bg-red-700 rounded-xl transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-1 bg-white p-3 rounded-3xl border border-stone-200 shadow-xs self-start">
          <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
            System Modules
          </div>

          {[
            { id: "overview", label: "Dashboard Overview", icon: BarChart3 },
            { id: "admins", label: `Admin Approvals ${metrics?.pending_admins ? `(${metrics.pending_admins})` : ""}`, icon: ShieldCheck, alert: metrics?.pending_admins > 0 },
            { id: "activities", label: "Major AKV Activities", icon: Sparkles },
            { id: "reels", label: "Reels & Posts", icon: Film },
            { id: "students", label: "Student Directory", icon: Users },
            { id: "volunteers", label: "Volunteer Management", icon: UserCheck },
            { id: "attendance", label: "Daily Attendance Records", icon: Clock },
            { id: "exports", label: "Attendance & Data Exports", icon: FileSpreadsheet },
            { id: "events", label: "Event Configuration", icon: Calendar },
            { id: "audit-logs", label: "Security Audit Trail", icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-kar-red to-red-600 text-white shadow-sm"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-200" : "text-stone-500"}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </aside>

        {/* Workspace Content */}
        <main className="flex-1 space-y-6">
          
          {/* Notifications */}
          {feedback.text && (
            <div className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-xs ${
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

          {/* ==================================================== */}
          {/* SECTION 1: OVERVIEW METRICS                          */}
          {/* ==================================================== */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-400 uppercase">Total Students</span>
                  <p className="text-2xl font-extrabold text-stone-900 mt-1">{metrics?.total_students || 0}</p>
                  <span className="text-[10px] text-stone-500 font-semibold">Registered in Portal</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-400 uppercase">Volunteers</span>
                  <p className="text-2xl font-extrabold text-kar-red mt-1">{metrics?.total_volunteers || 0}</p>
                  <span className="text-[10px] text-stone-500 font-semibold">Automatic Volunteer Roster</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-400 uppercase">Participants</span>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{metrics?.total_participants || 0}</p>
                  <span className="text-[10px] text-stone-500 font-semibold">Fest Competitors</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-400 uppercase">Spectators</span>
                  <p className="text-2xl font-extrabold text-stone-700 mt-1">{metrics?.total_spectators || 0}</p>
                  <span className="text-[10px] text-stone-500 font-semibold">Audience Passes</span>
                </div>
              </div>

              {/* Today's Attendance & Admin Approval Queue Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-kar-red" />
                      <span>Today's Volunteer Attendance</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-stone-400">
                      {metrics?.today_attendance?.date}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="block text-xl font-extrabold text-emerald-700">
                        {metrics?.today_attendance?.present || 0}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-emerald-800">Present</span>
                    </div>

                    <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                      <span className="block text-xl font-extrabold text-kar-red">
                        {metrics?.today_attendance?.absent || 0}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-red-800">Absent</span>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="block text-xl font-extrabold text-stone-700">
                        {metrics?.today_attendance?.total_volunteers || 0}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-stone-500">Total Volunteers</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveSection("attendance")}
                    className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>View Complete Attendance Records &rarr;</span>
                  </button>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      <span>Admin Approval Queue</span>
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      metrics?.pending_admins > 0 ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-500"
                    }`}>
                      {metrics?.pending_admins || 0} Pending
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Faculty coordinators and committee heads who submit admin registration must be approved before gaining access to coordinator desks.
                  </p>

                  <button
                    onClick={() => setActiveSection("admins")}
                    className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Manage Admin Approvals ({metrics?.pending_admins || 0})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 2: ADMIN APPROVALS & ROSTER                 */}
          {/* ==================================================== */}
          {activeSection === "admins" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Administrator Approval Workflow</h3>
                  <p className="text-xs text-stone-500">Approve or reject faculty and fest coordinator accounts</p>
                </div>
                <button
                  onClick={loadAdmins}
                  className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 self-start"
                  title="Refresh List"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {adminsList.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center italic">No registered administrators found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-extrabold">
                        <th className="py-3 px-3">Admin</th>
                        <th className="py-3 px-3">Username</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3">Contact</th>
                        <th className="py-3 px-3">Approval Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {adminsList.map((adm) => {
                        const isSuperAdmin = adm.role === "SUPERADMIN" || adm.username === "superadmin" || adm.username === "akv-nt-2026";
                        return (
                          <tr key={adm.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                {adm.photo_url ? (
                                  <img
                                    src={adm.photo_url}
                                    alt={adm.full_name}
                                    className="w-9 h-9 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 font-bold text-xs shrink-0">
                                    {(adm.full_name || "A").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-stone-900 block">{adm.full_name}</span>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span className="text-[11px] text-stone-400">{adm.email}</span>
                                    {adm.admin_type === "FACULTY_COORDINATOR" ? (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                        Faculty ({adm.faculty_id || "ID N/A"})
                                      </span>
                                    ) : isSuperAdmin ? (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-50 text-kar-red border border-red-200">
                                        Super Admin
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-stone-100 text-stone-700 border border-stone-200">
                                        Committee Member
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-stone-800">
                              {adm.username}
                            </td>
                            <td className="py-3 px-3 text-stone-600 font-medium">
                              <div>{adm.institute || "Acharya"}</div>
                              <div className="text-[11px] text-stone-400">{adm.department}</div>
                            </td>
                            <td className="py-3 px-3 text-stone-600 font-mono">
                              {adm.phone}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                                adm.approval_status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : adm.approval_status === "PENDING_APPROVAL"
                                  ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}>
                                {adm.approval_status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {adm.approval_status === "PENDING_APPROVAL" && (
                                  <>
                                    <button
                                      onClick={() => handleApproveAdmin(adm.id, adm.username)}
                                      className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                                      title="Approve Admin"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectAdmin(adm.id, adm.username)}
                                      className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-kar-red text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      title="Reject Admin"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                )}

                                {adm.approval_status === "APPROVED" && !isSuperAdmin && (
                                  <button
                                    onClick={() => handleToggleAdmin(adm.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                      adm.account_status === "ACTIVE"
                                        ? "border-stone-300 text-stone-600 hover:bg-stone-100"
                                        : "border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                                    }`}
                                  >
                                    {adm.account_status === "ACTIVE" ? "Deactivate" : "Activate"}
                                  </button>
                                )}

                                {!isSuperAdmin ? (
                                  <button
                                    onClick={() => handleDeleteAdmin(adm.id, adm.username)}
                                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete Admin"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-stone-100 text-stone-500 border border-stone-200">
                                    Protected
                                  </span>
                                )}
                              </div>
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
          {/* SECTION: MAJOR AKV ACTIVITIES (v2.1.0)               */}
          {/* ==================================================== */}
          {activeSection === "activities" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Major AKV Activities ({activitiesList.length})</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Manage key flagship activities, cultural drives, and annual milestones displayed across the website.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadActivities}
                    className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                    title="Refresh List"
                  >
                    <RefreshCw className={`w-4 h-4 ${activitiesLoading ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentActivity({
                        id: null,
                        title: "",
                        activity_date: new Date().toISOString().split("T")[0],
                        description: "",
                        image_url: "",
                        category: "Major Activity"
                      });
                      setActivityModal("new");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Major Activity</span>
                  </button>
                </div>
              </div>

              {activitiesLoading ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  Loading activities...
                </div>
              ) : activitiesList.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  No major activities configured yet. Click "Add Major Activity" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activitiesList.map((act) => (
                    <div
                      key={act.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50/50 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-44 w-full bg-stone-900 overflow-hidden">
                          <img
                            src={act.image || act.image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80"}
                            alt={act.title || act.title_en}
                            className="w-full h-full object-cover"
                          />
                          {act.activity_date && (
                            <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              {act.activity_date}
                            </span>
                          )}
                        </div>
                        <div className="p-4 space-y-1.5">
                          <h4 className="font-extrabold text-stone-900 text-sm">
                            {act.title || act.title_en}
                          </h4>
                          <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                            {act.description || act.desc_en}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-0 border-t border-stone-200/60 mt-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-400 uppercase">
                          {act.category || "Major Activity"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setCurrentActivity({
                                id: act.id,
                                title: act.title || act.title_en || "",
                                activity_date: act.activity_date || "",
                                description: act.description || act.desc_en || "",
                                image_url: act.image || act.image_url || "",
                                category: act.category || "Major Activity"
                              });
                              setActivityModal("edit");
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-200 text-stone-700 cursor-pointer"
                            title="Edit Activity"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(act.id, act.title || act.title_en)}
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                            title="Delete Activity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION: REELS & SOCIAL POSTS (v2.1.0)               */}
          {/* ==================================================== */}
          {activeSection === "reels" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                    <Film className="w-5 h-5 text-pink-600" />
                    <span>Instagram Reels & Social Posts ({reelsList.length})</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Add, edit, or remove featured Instagram reels and cultural posts displayed in the social section.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadReels}
                    className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                    title="Refresh List"
                  >
                    <RefreshCw className={`w-4 h-4 ${reelsLoading ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentReel({
                        id: null,
                        type: "REEL",
                        url: "",
                        likes: 1200,
                        description: "",
                        cover_image: "",
                        views: "15K",
                        comments: "45",
                        is_active: true
                      });
                      setReelModal("new");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Reel / Post</span>
                  </button>
                </div>
              </div>

              {reelsLoading ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  Loading reels...
                </div>
              ) : reelsList.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  No custom reels or posts added yet. Default fest reels are shown on the website.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {reelsList.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50/50 hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        {/* Cover Image for Reel */}
                        <div className="relative h-48 w-full bg-stone-900 overflow-hidden">
                          {post.cover_image ? (
                            <img
                              src={post.cover_image}
                              alt="Reel Cover"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 gap-1 bg-gradient-to-br from-stone-800 to-stone-950">
                              <Film className="w-8 h-8 text-pink-500" />
                              <span className="text-[11px]">No Cover Image</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-extrabold bg-black/75 text-white uppercase backdrop-blur-xs">
                            {post.type}
                          </span>
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-pink-600/90 text-white backdrop-blur-xs flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-current" />
                            {post.likes ? post.likes.toLocaleString() : 0} Likes
                          </span>
                        </div>

                        <div className="p-4 space-y-2">
                          <p className="text-xs text-stone-700 line-clamp-3 leading-relaxed">
                            {post.description}
                          </p>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-700 underline truncate max-w-full"
                          >
                            <span>Watch on Instagram</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      <div className="p-4 pt-0 border-t border-stone-200/60 mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-stone-400">
                          {post.views ? `${post.views} views` : "Active"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setCurrentReel({
                                id: post.id,
                                type: post.type || "REEL",
                                url: post.url || "",
                                likes: post.likes || 0,
                                description: post.description || "",
                                cover_image: post.cover_image || "",
                                views: post.views || "",
                                comments: post.comments || "",
                                is_active: post.is_active !== false
                              });
                              setReelModal("edit");
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-200 text-stone-700 cursor-pointer"
                            title="Edit Reel"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReel(post.id)}
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                            title="Delete Reel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 3: STUDENT MANAGEMENT                       */}
          {/* ==================================================== */}
          {activeSection === "students" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Student Directory & Profiles</h3>
                  <p className="text-xs text-stone-500">Manage student roles, credentials, and participation status</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search AUID, Name, Dept..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadStudents()}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs w-48 sm:w-56 focus:outline-hidden"
                    />
                  </div>

                  <select
                    value={studentRoleFilter}
                    onChange={(e) => setStudentRoleFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="PARTICIPANT">Participant</option>
                    <option value="SPECTATOR">Spectator</option>
                  </select>

                  <button
                    onClick={loadStudents}
                    className="p-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">AUID</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {studentsData.students.map((st) => (
                      <tr key={st.id} className="hover:bg-stone-50/80">
                        <td className="py-3 px-3">
                          <span className="font-bold text-stone-900 block">{st.name}</span>
                          <span className="text-[11px] text-stone-400 font-mono">{st.registration_id}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-800">
                          {st.auid}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {st.department}
                        </td>
                        <td className="py-3 px-3 text-stone-600 font-mono">
                          {st.phone}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            st.role === "VOLUNTEER"
                              ? "bg-red-100 text-kar-red"
                              : st.role === "PARTICIPANT"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-stone-100 text-stone-700"
                          }`}>
                            {st.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            st.account_status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {st.account_status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditStudent({ ...st })}
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-kar-red hover:border-kar-red"
                              title="Edit Student"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(st.id, st.name)}
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-300"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 4: VOLUNTEER ROSTER (AUTO-GENERATED)         */}
          {/* ==================================================== */}
          {activeSection === "volunteers" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Volunteer Directory (Auto-Populated)</h3>
                  <p className="text-xs text-stone-500">
                    Sourced directly from student registrations where <code>role = VOLUNTEER</code>
                  </p>
                </div>
                <button
                  onClick={loadVolunteers}
                  className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 self-start"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-3">Volunteer Name</th>
                      <th className="py-3 px-3">AUID</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Today's Status</th>
                      <th className="py-3 px-3">Total Days Present</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {volunteersList.map((vol) => (
                      <tr key={vol.user_id} className="hover:bg-stone-50/80">
                        <td className="py-3 px-3 font-bold text-stone-900">
                          {vol.name}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-700">
                          {vol.auid}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {vol.department}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600">
                          {vol.phone}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            vol.today_attendance === "PRESENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : vol.today_attendance === "ABSENT"
                              ? "bg-red-100 text-red-800"
                              : "bg-stone-100 text-stone-500"
                          }`}>
                            {vol.today_attendance}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-stone-800">
                          {vol.total_days_present} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 5: OFFICIAL ATTENDANCE OVERSIGHT & EDIT      */}
          {/* ==================================================== */}
          {activeSection === "attendance" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-kar-red" />
                      <span>Official Event Attendance — {selectedOfficialDate || "Select Date"}</span>
                    </h3>
                    {officialAttendanceSession.is_submitted ? (
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
                    Superadmin controls: Indian Standard Time (IST) timestamps, edit check-in/out times, unlock submitted sessions, and audit logging.
                  </p>
                </div>

                {/* Superadmin Actions: Export & Unlock */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOfficialExcelExport}
                    disabled={officialExportLoading}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>{officialExportLoading ? "Exporting..." : "Export Attendance Excel"}</span>
                  </button>

                  {officialAttendanceSession.is_submitted && (
                    <button
                      type="button"
                      onClick={() => setUnlockModal({ date: selectedOfficialDate, reason: "" })}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Unlock className="w-4 h-4 text-amber-700" />
                      <span>Unlock Session</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Event Date Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-extrabold text-stone-400 uppercase tracking-wider whitespace-nowrap mr-1">
                  Event Date:
                </span>
                {attendanceConfigDates.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      setSelectedOfficialDate(d.date);
                      loadOfficialAttendance(d.date);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedOfficialDate === d.date
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

              {/* Submission Status Banner */}
              {officialAttendanceSession.is_submitted && (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-sm">Attendance Submitted & Locked for Normal Admins</span>
                      <span className="text-stone-600 mt-0.5 block">
                        Submitted by <strong>{officialAttendanceSession.submitted_by || "Admin"}</strong> on{" "}
                        <strong>{officialAttendanceSession.submitted_at_ist || officialAttendanceSession.submitted_at || "Recorded Time"}</strong>.
                        Normal admins cannot modify. As Superadmin, you can edit times, reset records, or unlock this session.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnlockModal({ date: selectedOfficialDate, reason: "" })}
                    className="px-3.5 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-extrabold rounded-xl shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock For Admins</span>
                  </button>
                </div>
              )}

              {/* Metrics Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                    Total Participants
                  </span>
                  <p className="text-xl font-extrabold text-stone-900 mt-1">
                    {officialAttendanceSummary.total_participants}
                  </p>
                </div>

                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                    Checked In
                  </span>
                  <p className="text-xl font-extrabold text-emerald-800 mt-1">
                    {officialAttendanceSummary.checked_in}
                  </p>
                </div>

                <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">
                    Completed
                  </span>
                  <p className="text-xl font-extrabold text-blue-800 mt-1">
                    {officialAttendanceSummary.completed}
                  </p>
                </div>

                <div className="bg-stone-100/60 p-3.5 rounded-2xl border border-stone-200">
                  <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block">
                    Not Marked
                  </span>
                  <p className="text-xl font-extrabold text-stone-700 mt-1">
                    {officialAttendanceSummary.not_marked}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  officialAttendanceSession.is_submitted 
                    ? "bg-red-50 border-red-200 text-red-900" 
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                    Attendance Status
                  </span>
                  <p className="text-sm font-extrabold mt-1.5 flex items-center gap-1.5">
                    {officialAttendanceSession.is_submitted ? (
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

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search Reg ID, Name, AUID, Phone..."
                      value={attendanceSearchQuery}
                      onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadOfficialAttendance()}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs w-52 sm:w-64"
                    />
                  </div>

                  <select
                    value={attendanceDeptFilter}
                    onChange={(e) => setAttendanceDeptFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                  >
                    <option value="all">All Departments</option>
                    <option value="Computer Science & Engineering">CSE</option>
                    <option value="Information Science & Engineering">ISE</option>
                    <option value="Electronics & Communication Engineering">ECE</option>
                    <option value="Mechanical Engineering">ME</option>
                    <option value="Civil Engineering">Civil</option>
                    <option value="Artificial Intelligence & Machine Learning">AIML</option>
                    <option value="Master of Computer Applications (MCA)">MCA</option>
                    <option value="Master of Business Administration (MBA)">MBA</option>
                  </select>

                  <select
                    value={attendanceAkvDeptFilter}
                    onChange={(e) => setAttendanceAkvDeptFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                  >
                    <option value="all">All AKV Depts</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Stage">Stage</option>
                    <option value="Hospitality">Hospitality</option>
                    <option value="Discipline">Discipline</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Technical">Technical</option>
                  </select>

                  <select
                    value={attendanceStatusFilter}
                    onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                  >
                    <option value="all">All Statuses</option>
                    <option value="NOT_MARKED">Not Marked</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => loadOfficialAttendance()}
                    className="p-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 cursor-pointer"
                    title="Refresh Roster"
                  >
                    <RefreshCw className={`w-4 h-4 ${attendanceActionLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="text-xs text-stone-500 font-medium">
                  Showing <strong>{officialAttendanceRoster.length}</strong> participants
                </div>
              </div>

              {/* Roster Table */}
              {officialAttendanceRoster.length === 0 ? (
                <div className="text-center py-12 space-y-2 bg-stone-50/50 rounded-2xl border border-stone-100">
                  <Users className="w-9 h-9 text-stone-300 mx-auto" />
                  <p className="text-sm font-bold text-stone-700">No participants found</p>
                  <p className="text-xs text-stone-500">Try adjusting your filters or date selection.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-400 uppercase tracking-wider font-extrabold border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-3">Reg ID</th>
                        <th className="py-3 px-3">Participant</th>
                        <th className="py-3 px-3">AUID</th>
                        <th className="py-3 px-3">Dept / AKV Dept</th>
                        <th className="py-3 px-3">Check-In</th>
                        <th className="py-3 px-3">Check-Out</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Superadmin Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {officialAttendanceRoster.map((p) => (
                        <tr key={p.user_id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-stone-900">
                            {p.reg_id}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-stone-900 block">{p.name}</span>
                            <span className="text-[11px] text-stone-400">{p.email}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-stone-700 font-semibold">
                            {p.auid}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-stone-800 block truncate max-w-[140px]" title={p.department}>
                              {p.department || "--"}
                            </span>
                            {p.akv_department && (
                              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                {p.akv_department}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold">
                            {p.check_in_time ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                {p.check_in_time}
                              </span>
                            ) : (
                              <span className="text-stone-300">--</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold">
                            {p.check_out_time ? (
                              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {p.check_out_time}
                              </span>
                            ) : (
                              <span className="text-stone-300">--</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              p.status === "COMPLETED"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : p.status === "CHECKED_IN"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-stone-100 text-stone-500"
                            }`}>
                              {p.status === "COMPLETED" && "COMPLETED"}
                              {p.status === "CHECKED_IN" && "CHECKED IN"}
                              {p.status === "NOT_MARKED" && "NOT MARKED"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Mark controls for Superadmin */}
                              {p.status === "NOT_MARKED" && (
                                <button
                                  type="button"
                                  onClick={() => handleSuperAdminCheckIn(p.user_id)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                                  title="Superadmin Check-In"
                                >
                                  Check In
                                </button>
                              )}
                              {p.status === "CHECKED_IN" && (
                                <button
                                  type="button"
                                  onClick={() => handleSuperAdminCheckOut(p.user_id)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-xs cursor-pointer"
                                  title="Superadmin Check-Out"
                                >
                                  Check Out
                                </button>
                              )}

                              {/* Edit Modal Button */}
                              {p.record_id && (
                                <button
                                  type="button"
                                  onClick={() => setEditRecordModal({
                                    record_id: p.record_id,
                                    user_id: p.user_id,
                                    name: p.name,
                                    reg_id: p.reg_id,
                                    auid: p.auid,
                                    date: selectedOfficialDate,
                                    check_in_time: p.check_in_time || "",
                                    check_out_time: p.check_out_time || "",
                                    reason: ""
                                  })}
                                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer"
                                  title="Edit Timestamps"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Reset Button */}
                              {p.record_id && (
                                <button
                                  type="button"
                                  onClick={() => setResetModal({
                                    record_id: p.record_id,
                                    name: p.name,
                                    auid: p.auid,
                                    date: selectedOfficialDate,
                                    reason: ""
                                  })}
                                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-red-50 text-red-600 cursor-pointer"
                                  title="Reset Record"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 6: ATTENDANCE & DATA EXPORTS                */}
          {/* ==================================================== */}
          {activeSection === "exports" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
              <div>
                <h3 className="font-extrabold text-lg text-stone-900">Attendance & Festival Reports Export</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Super Admin exclusive export suite. Standardized formats ready for festival committee audits.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Excel XLSX Export Card */}
                <div className="p-6 rounded-3xl border-2 border-emerald-200 bg-emerald-50/40 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-stone-900">Official Festival Attendance Workbook (.xlsx)</h4>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      Standardized committee format with bold headers, frozen top row, borders, and auto-adjusted columns. Generates Indian Standard Time (IST) Time In & Time Out columns for all event dates, Total Days Present calculation, and participant details.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOfficialExcelExport}
                    disabled={officialExportLoading}
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{officialExportLoading ? "Generating Official Workbook..." : "Download Official XLSX Report"}</span>
                  </button>
                </div>

                {/* CSV Export Card */}
                <div className="p-6 rounded-3xl border border-stone-200 bg-stone-50/50 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-stone-900">Raw Attendance CSV (.csv)</h4>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      Clean CSV export containing raw volunteer check-in records, marked-by credentials, and exact UTC timestamps.
                    </p>
                  </div>
                  <button
                    onClick={() => api.exportAttendanceCsv(attendanceDateFilter || "all")}
                    className="w-full py-3 rounded-xl bg-stone-900 hover:bg-black text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV Attendance Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 7: EVENT MANAGEMENT                         */}
          {/* ==================================================== */}
          {activeSection === "events" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Event Configuration & Capacity</h3>
                  <p className="text-xs text-stone-500">Enable/disable events, adjust slots, venues, and timings</p>
                </div>

                <button
                  onClick={() => setEventModal("new")}
                  className="px-3.5 py-2 rounded-xl bg-kar-red text-white text-xs font-bold shadow-xs flex items-center gap-1.5 self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Event</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {eventsList.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-stone-500">{ev.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        ev.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}>
                        {ev.is_active ? "Active" : "Closed"}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-stone-900">{ev.title_en}</h4>
                    <p className="text-xs text-amber-900 font-bold font-kannada">{ev.title_kn}</p>

                    <div className="text-[11px] text-stone-600 space-y-1 pt-1">
                      <p>Venue: <strong>{ev.venue}</strong></p>
                      <p>Date & Time: <strong>{ev.event_date} ({ev.event_time})</strong></p>
                      <p>Capacity: <strong>{ev.registered_count} / {ev.max_slots} slots</strong></p>
                      <p>Format: <strong className="uppercase text-amber-900">{ev.format === "both" ? "Both (Solo & Group)" : (ev.format || (ev.is_team ? "Group" : "Solo"))}</strong> {ev.is_team && `(${ev.min_team_size || (ev.format === "both" ? 1 : 2)}-${ev.max_team_size || 15} members)`}</p>
                    </div>

                    <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditEvent({ ...ev });
                          setEventModal("edit");
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Edit Event Details"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.updateEvent(ev.id, { is_active: !ev.is_active });
                          loadEvents();
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border border-stone-300 hover:bg-stone-100 transition-colors cursor-pointer"
                      >
                        {ev.is_active ? "Close Registrations" : "Re-open"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Delete event '${ev.title_en}'?`)) {
                            await api.deleteEvent(ev.id);
                            loadEvents();
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 8: AUDIT TRAIL                              */}
          {/* ==================================================== */}
          {activeSection === "audit-logs" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Immutable Security & Attendance Audit Trail</h3>
                  <p className="text-xs text-stone-500">Official log of all attendance modifications, timestamp alterations, and security operations</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("attendance")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeAuditTab === "attendance" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"}`}
                    >
                      Attendance Modifications ({attendanceAuditLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAuditTab("security")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeAuditTab === "security" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"}`}
                    >
                      Security Logs ({auditLogs.length})
                    </button>
                  </div>
                  <button
                    onClick={loadAuditLogs}
                    className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 self-start cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activeAuditTab === "attendance" ? (
                attendanceAuditLogs.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-sm">
                    No attendance modifications recorded yet. All changes by Superadmin will be logged here with reason and exact timestamps.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-extrabold">
                          <th className="py-3 px-3">Modified At (IST)</th>
                          <th className="py-3 px-3">Participant</th>
                          <th className="py-3 px-3">Event Date</th>
                          <th className="py-3 px-3">Action</th>
                          <th className="py-3 px-3">Old Time</th>
                          <th className="py-3 px-3">New Time</th>
                          <th className="py-3 px-3">Modified By</th>
                          <th className="py-3 px-3">Reason / Audit Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {attendanceAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-stone-50/80">
                            <td className="py-3 px-3 font-mono text-stone-600 font-bold whitespace-nowrap">
                              {log.modified_at}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-stone-900 block">{log.user_name}</span>
                              <span className="text-[10px] text-stone-400 font-mono">{log.reg_id || log.auid}</span>
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-stone-700">
                              {log.attendance_date_dmy || log.attendance_date}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold ${
                                log.action === "SUPERADMIN_RESET" ? "bg-red-100 text-red-800" :
                                log.action === "SUPERADMIN_UNLOCK" ? "bg-amber-100 text-amber-900" :
                                "bg-emerald-100 text-emerald-800"
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-stone-500">
                              {log.old_check_in || log.old_check_out ? (
                                <span>In: {log.old_check_in || "--"} | Out: {log.old_check_out || "--"}</span>
                              ) : "--"}
                            </td>
                            <td className="py-3 px-3 font-mono text-stone-900 font-bold">
                              {log.new_check_in || log.new_check_out ? (
                                <span>In: {log.new_check_in || "--"} | Out: {log.new_check_out || "--"}</span>
                              ) : "--"}
                            </td>
                            <td className="py-3 px-3 font-medium text-stone-700">
                              {log.modified_by}
                            </td>
                            <td className="py-3 px-3 text-stone-600 italic">
                              {log.reason || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-extrabold">
                        <th className="py-3 px-3">Timestamp</th>
                        <th className="py-3 px-3">Actor</th>
                        <th className="py-3 px-3">Action</th>
                        <th className="py-3 px-3">Previous Value</th>
                        <th className="py-3 px-3">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50/80">
                          <td className="py-3 px-3 font-mono text-stone-500 whitespace-nowrap">
                            {log.timestamp}
                          </td>
                          <td className="py-3 px-3 font-bold text-stone-900">
                            {log.actor_name}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-stone-100 text-stone-800">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-stone-500 text-[11px] max-w-xs truncate">
                            {log.previous_value || "—"}
                          </td>
                          <td className="py-3 px-3 font-medium text-stone-800 text-[11px] max-w-xs truncate">
                            {log.new_value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl">
            <h3 className="font-extrabold text-base text-stone-900 mb-4">Edit Student Information</h3>
            <form onSubmit={handleSaveStudentEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={editStudent.name}
                  onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Email</label>
                <input
                  type="email"
                  required
                  value={editStudent.email}
                  onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Phone</label>
                <input
                  type="tel"
                  required
                  value={editStudent.phone}
                  onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Role</label>
                <select
                  value={editStudent.role}
                  onChange={(e) => setEditStudent({ ...editStudent, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white"
                >
                  <option value="VOLUNTEER">VOLUNTEER</option>
                  <option value="PARTICIPANT">PARTICIPANT</option>
                  <option value="SPECTATOR">SPECTATOR</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Account Status</label>
                <select
                  value={editStudent.account_status}
                  onChange={(e) => setEditStudent({ ...editStudent, account_status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="flex-1 py-2 rounded-xl border border-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-kar-red text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendance Record Modal */}
      {editAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl">
            <h3 className="font-extrabold text-base text-stone-900 mb-1">Modify Attendance Record</h3>
            <p className="text-xs text-stone-500 mb-4">{editAttendance.volunteer_name} ({editAttendance.date})</p>

            <form onSubmit={handleSaveAttendanceEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 uppercase">Status</label>
                <select
                  value={editAttendance.status}
                  onChange={(e) => setEditAttendance({ ...editAttendance, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white font-bold"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LATE">LATE</option>
                  <option value="EXCUSED">EXCUSED</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Reason / Audit Note</label>
                <input
                  type="text"
                  placeholder="e.g. Medical excuse or coordinator correction"
                  value={editAttendance.notes || ""}
                  onChange={(e) => setEditAttendance({ ...editAttendance, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditAttendance(null)}
                  className="flex-1 py-2 rounded-xl border border-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-kar-red text-white font-bold"
                >
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Attendance for Date Modal */}
      {markAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl">
            <h3 className="font-extrabold text-base text-stone-900 mb-4">Log Volunteer Attendance</h3>
            <form onSubmit={handleMarkAttendanceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 uppercase">Select Volunteer</label>
                <select
                  required
                  value={markData.volunteer_user_id}
                  onChange={(e) => setMarkData({ ...markData, volunteer_user_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white"
                >
                  <option value="">-- Choose Volunteer --</option>
                  {volunteersList.map((v) => (
                    <option key={v.user_id} value={v.user_id}>{v.name} ({v.auid})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={markData.date}
                  onChange={(e) => setMarkData({ ...markData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Attendance Status</label>
                <select
                  value={markData.status}
                  onChange={(e) => setMarkData({ ...markData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white font-bold"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LATE">LATE</option>
                  <option value="EXCUSED">EXCUSED</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMarkAttendanceModal(false)}
                  className="flex-1 py-2 rounded-xl border border-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-kar-red text-white font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Event Modal */}
      {eventModal === "new" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-stone-200 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-extrabold text-base text-stone-900">Create New Fest Event</h3>
              <button
                type="button"
                onClick={() => setEventModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEventSubmit} className="space-y-3.5 text-xs pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Title (English)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bhavageethe"
                    value={newEvent.title_en}
                    onChange={(e) => setNewEvent({ ...newEvent, title_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Title (ಕನ್ನಡ)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ಭಾವಗೀತೆ"
                    value={newEvent.title_kn}
                    onChange={(e) => setNewEvent({ ...newEvent, title_kn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-kannada"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Category</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white"
                  >
                    <option value="cultural">Cultural (ಸಾಂಸ್ಕೃತಿಕ)</option>
                    <option value="literary">Literary (ಸಾಹಿತ್ಯ)</option>
                    <option value="fine_arts">Fine Arts (ಲಲಿತಕಲೆ)</option>
                    <option value="theatre">Theatre (ರಂಗಭೂಮಿ)</option>
                    <option value="music">Music (ಸಂಗೀತ)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Format</label>
                  <select
                    value={newEvent.format}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      const isTeam = fmt !== "solo";
                      setNewEvent({
                        ...newEvent,
                        format: fmt,
                        is_team: isTeam,
                        min_team_size: fmt === "duet" ? 2 : (fmt === "both" ? 1 : (isTeam ? 2 : 1)),
                        max_team_size: fmt === "duet" ? 2 : (isTeam ? 15 : 1)
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white font-medium"
                  >
                    <option value="solo">Solo</option>
                    <option value="group">Group</option>
                    <option value="both">Both (Solo & Group)</option>
                    <option value="duet">Duet</option>
                  </select>
                </div>
              </div>

              {/* Team Size configuration if team/group/both event */}
              {(newEvent.format === "group" || newEvent.format === "both") && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div>
                    <label className="font-bold text-amber-950 uppercase text-[10px]">
                      {newEvent.format === "both" ? "Min Team Members (for Group)" : "Min Team Members"}
                    </label>
                    <input
                      type="number"
                      min={newEvent.format === "both" ? "1" : "2"}
                      max="50"
                      value={newEvent.min_team_size || (newEvent.format === "both" ? 1 : 2)}
                      onChange={(e) => setNewEvent({ ...newEvent, min_team_size: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-950 uppercase text-[10px]">Max Team Members</label>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={newEvent.max_team_size || 15}
                      onChange={(e) => setNewEvent({ ...newEvent, max_team_size: parseInt(e.target.value) || 15 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white mt-1 text-xs"
                    />
                  </div>
                  {newEvent.format === "both" && (
                    <p className="col-span-2 text-[10px] text-amber-800 font-semibold italic">
                      * Allows participants to register either individually (Solo) or as a Team/Group.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Date</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. November 01, 2026"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM - 01:00 PM"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Venue</label>
                  <input
                    type="text"
                    required
                    placeholder="Main Auditorium"
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Max Slots</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={newEvent.max_slots}
                    onChange={(e) => setNewEvent({ ...newEvent, max_slots: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Description (English)</label>
                <textarea
                  rows="2"
                  value={newEvent.description_en}
                  onChange={(e) => setNewEvent({ ...newEvent, description_en: e.target.value })}
                  placeholder="Short description of the competition"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Rules & Guidelines</label>
                <textarea
                  rows="3"
                  value={newEvent.rules_en}
                  onChange={(e) => setNewEvent({ ...newEvent, rules_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEventModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-kar-red hover:bg-red-700 text-white font-bold shadow-md transition-colors"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Existing Event Modal */}
      {eventModal === "edit" && editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-stone-200 shadow-2xl my-8 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Edit Fest Event</h3>
                  <p className="text-[11px] font-mono text-stone-500 font-bold">{editEvent.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEventModal(null);
                  setEditEvent(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditEventSubmit} className="space-y-3.5 text-xs pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Title (English)</label>
                  <input
                    type="text"
                    required
                    value={editEvent.title_en || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, title_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Title (ಕನ್ನಡ)</label>
                  <input
                    type="text"
                    required
                    value={editEvent.title_kn || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, title_kn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-kannada font-bold text-amber-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Category</label>
                  <select
                    value={editEvent.category || "cultural"}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setEditEvent({
                        ...editEvent,
                        category: cat,
                        category_kn: categoryMapping[cat] || editEvent.category_kn
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white font-medium"
                  >
                    <option value="cultural">Cultural (ಸಾಂಸ್ಕೃತಿಕ)</option>
                    <option value="traditional">Traditional (ಜಾನಪದ & ಸಾಂಪ್ರದಾಯಿಕ)</option>
                    <option value="literary">Literary (ಸಾಹಿತ್ಯ)</option>
                    <option value="fine_arts">Fine Arts (ಲಲಿತಕಲೆ)</option>
                    <option value="theatre">Theatre (ರಂಗಭೂಮಿ)</option>
                    <option value="music">Music (ಸಂಗೀತ)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Format</label>
                  <select
                    value={editEvent.format || (editEvent.is_team ? "group" : "solo")}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      const isTeam = fmt !== "solo";
                      setEditEvent({
                        ...editEvent,
                        format: fmt,
                        is_team: isTeam,
                        min_team_size: fmt === "duet" ? 2 : (fmt === "both" ? 1 : (isTeam ? (editEvent.min_team_size > 1 ? editEvent.min_team_size : 2) : 1)),
                        max_team_size: fmt === "duet" ? 2 : (isTeam ? (editEvent.max_team_size > 1 ? editEvent.max_team_size : 15) : 1)
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white font-medium"
                  >
                    <option value="solo">Solo</option>
                    <option value="group">Group</option>
                    <option value="both">Both (Solo & Group)</option>
                    <option value="duet">Duet</option>
                  </select>
                </div>
              </div>

              {/* Team Size configuration if team/group/both event */}
              {(editEvent.format === "group" || editEvent.format === "both" || (editEvent.is_team && editEvent.format !== "duet")) && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div>
                    <label className="font-bold text-amber-950 uppercase text-[10px]">
                      {editEvent.format === "both" ? "Min Team Members (for Group)" : "Min Team Members"}
                    </label>
                    <input
                      type="number"
                      min={editEvent.format === "both" ? "1" : "2"}
                      max="50"
                      value={editEvent.min_team_size || (editEvent.format === "both" ? 1 : 2)}
                      onChange={(e) => setEditEvent({ ...editEvent, min_team_size: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-950 uppercase text-[10px]">Max Team Members</label>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={editEvent.max_team_size || 15}
                      onChange={(e) => setEditEvent({ ...editEvent, max_team_size: parseInt(e.target.value) || 15 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white mt-1 text-xs"
                    />
                  </div>
                  {editEvent.format === "both" && (
                    <p className="col-span-2 text-[10px] text-amber-800 font-semibold italic">
                      * Allows participants to register either individually (Solo) or as a Team/Group.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Date</label>
                  <input
                    type="text"
                    required
                    value={editEvent.event_date || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, event_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Time</label>
                  <input
                    type="text"
                    required
                    value={editEvent.event_time || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, event_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Reporting Time</label>
                  <input
                    type="text"
                    value={editEvent.reporting_time || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, reporting_time: e.target.value })}
                    placeholder="e.g. 09:30 AM"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Max Slots Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={editEvent.max_slots || 50}
                    onChange={(e) => setEditEvent({ ...editEvent, max_slots: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Venue (English)</label>
                  <input
                    type="text"
                    required
                    value={editEvent.venue || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, venue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 uppercase">Venue (ಕನ್ನಡ)</label>
                  <input
                    type="text"
                    value={editEvent.venue_kn || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, venue_kn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-kannada"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Description (English)</label>
                <textarea
                  rows="2"
                  value={editEvent.description_en || ""}
                  onChange={(e) => setEditEvent({ ...editEvent, description_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Description (ಕನ್ನಡ)</label>
                <textarea
                  rows="2"
                  value={editEvent.description_kn || ""}
                  onChange={(e) => setEditEvent({ ...editEvent, description_kn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-kannada"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Rules & Guidelines (English)</label>
                <textarea
                  rows="3"
                  value={editEvent.rules_en || ""}
                  onChange={(e) => setEditEvent({ ...editEvent, rules_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Rules & Guidelines (ಕನ್ನಡ)</label>
                <textarea
                  rows="3"
                  value={editEvent.rules_kn || ""}
                  onChange={(e) => setEditEvent({ ...editEvent, rules_kn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 font-kannada text-[11px]"
                />
              </div>

              {/* Active / Closed Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-100 border border-stone-200">
                <div>
                  <span className="font-bold text-stone-800 block text-xs">Event Registration Status</span>
                  <span className="text-[11px] text-stone-500">Allow or freeze new student registrations</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditEvent({ ...editEvent, is_active: !editEvent.is_active })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    editEvent.is_active 
                      ? "bg-emerald-600 text-white" 
                      : "bg-red-600 text-white"
                  }`}
                >
                  {editEvent.is_active ? "Registration Open" : "Registration Closed"}
                </button>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEventModal(null);
                    setEditEvent(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-red-600 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT MAJOR ACTIVITY (v2.1.0)            */}
      {/* ==================================================== */}
      {activityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>{activityModal === "new" ? "Add Major AKV Activity" : "Edit Major AKV Activity"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivityModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
              {/* Activity Image */}
              <EventImageUpload
                imageUrl={currentActivity.image_url}
                onImageChange={(url) => setCurrentActivity({ ...currentActivity, image_url: url })}
                label="Activity Image *"
                required={true}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Activity Name *</label>
                  <input
                    type="text"
                    required
                    value={currentActivity.title}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, title: e.target.value })}
                    placeholder="e.g. Grand Kannada Rajyotsava Celebrations"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 text-sm focus:ring-2 focus:ring-kar-red"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 uppercase">Date of Activity *</label>
                  <input
                    type="date"
                    required
                    value={currentActivity.activity_date}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, activity_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 text-sm focus:ring-2 focus:ring-kar-red"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Description *</label>
                <textarea
                  rows={4}
                  required
                  value={currentActivity.description}
                  onChange={(e) => setCurrentActivity({ ...currentActivity, description: e.target.value })}
                  placeholder="Comprehensive details of the activity, participation highlights, or institutional significance..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 text-sm focus:ring-2 focus:ring-kar-red"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setActivityModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-red-600 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{activityModal === "new" ? "Save Activity" : "Update Activity"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT REEL / POST (v2.1.0)               */}
      {/* ==================================================== */}
      {reelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                <Film className="w-5 h-5 text-pink-600" />
                <span>{reelModal === "new" ? "Add Reel / Social Post" : "Edit Reel / Social Post"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReelModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReel} className="space-y-4 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="font-bold text-stone-700 uppercase mb-1 block">Post Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentReel({ ...currentReel, type: "REEL" })}
                    className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                      currentReel.type === "REEL"
                        ? "bg-pink-50 border-pink-500 text-pink-700 shadow-xs"
                        : "bg-white border-stone-200 text-stone-600"
                    }`}
                  >
                    Instagram Reel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentReel({ ...currentReel, type: "POST" })}
                    className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                      currentReel.type === "POST"
                        ? "bg-pink-50 border-pink-500 text-pink-700 shadow-xs"
                        : "bg-white border-stone-200 text-stone-600"
                    }`}
                  >
                    Standard Post
                  </button>
                </div>
              </div>

              {/* Cover Image for Reels */}
              <EventImageUpload
                imageUrl={currentReel.cover_image}
                onImageChange={(url) => setCurrentReel({ ...currentReel, cover_image: url })}
                label={currentReel.type === "REEL" ? "Cover Image for Reel *" : "Post Image (Optional)"}
                required={currentReel.type === "REEL"}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 uppercase">Reel / Post Link *</label>
                  <input
                    type="url"
                    required
                    value={currentReel.url}
                    onChange={(e) => setCurrentReel({ ...currentReel, url: e.target.value })}
                    placeholder="https://www.instagram.com/reel/..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 text-sm focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 uppercase">Original Like Count *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={currentReel.likes}
                    onChange={(e) => setCurrentReel({ ...currentReel, likes: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 1850"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 text-sm focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase">Description / Caption *</label>
                <textarea
                  rows={3}
                  required
                  value={currentReel.description}
                  onChange={(e) => setCurrentReel({ ...currentReel, description: e.target.value })}
                  placeholder="Reel caption, performer credits, hashtags..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 text-sm focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setReelModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{reelModal === "new" ? "Save Reel / Post" : "Update Reel / Post"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT ATTENDANCE RECORD (SUPERADMIN)           */}
      {/* ==================================================== */}
      {editRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Modify Attendance Timestamps</h3>
                  <p className="text-[11px] text-stone-500 font-mono">Date: {editRecordModal.date}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditRecordModal(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Participant:</span>
                <strong className="text-stone-900">{editRecordModal.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Reg ID / AUID:</span>
                <strong className="text-stone-700 font-mono">{editRecordModal.reg_id} / {editRecordModal.auid}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveOfficialAttendanceEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-700 uppercase block mb-1">
                  Check-In Time (IST)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09:35:22 AM or 09:35:22"
                  value={editRecordModal.check_in_time || ""}
                  onChange={(e) => setEditRecordModal({ ...editRecordModal, check_in_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-sm focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">Format: hh:mm:ss AM/PM</span>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase block mb-1">
                  Check-Out Time (IST)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 04:42:17 PM or 16:42:17"
                  value={editRecordModal.check_out_time || ""}
                  onChange={(e) => setEditRecordModal({ ...editRecordModal, check_out_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-sm focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">Leave blank if check-out not applicable</span>
              </div>

              <div>
                <label className="font-bold text-stone-700 uppercase block mb-1">
                  Audit Reason / Correction Note *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Correction requested by coordinator / timing error"
                  value={editRecordModal.reason || ""}
                  onChange={(e) => setEditRecordModal({ ...editRecordModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">This note is permanently recorded in the audit trail.</span>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditRecordModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Update & Log Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: UNLOCK ATTENDANCE SESSION                     */}
      {/* ==================================================== */}
      {unlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-stone-900">
                  Unlock Attendance for {unlockModal.date}
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Unlocking this session will allow normal administrators to mark Check-In and Check-Out again until re-submitted.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmUnlock} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-700 uppercase block mb-1">
                  Reason for Unlocking *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Additional volunteers reporting late / admin correction"
                  value={unlockModal.reason || ""}
                  onChange={(e) => setUnlockModal({ ...unlockModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setUnlockModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Confirm Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: RESET ATTENDANCE RECORD                       */}
      {/* ==================================================== */}
      {resetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-red-100 text-kar-red rounded-2xl shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-stone-900">
                  Reset Attendance for {resetModal.name}
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Resetting clears both Check-In and Check-Out timestamps for <strong>{resetModal.date}</strong> and returns status to <strong>NOT MARKED</strong>.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReset} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-700 uppercase block mb-1">
                  Reason for Resetting *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accidental mark / student was absent"
                  value={resetModal.reason || ""}
                  onChange={(e) => setResetModal({ ...resetModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-kar-red"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setResetModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-kar-red hover:bg-red-700 text-white font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirm Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
