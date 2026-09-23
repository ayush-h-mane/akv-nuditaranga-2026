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
  History, 
  RefreshCw, 
  Sparkles,
  MapPin,
  Check,
  X,
  Compass,
  ChevronRight,
  ShieldCheck,
  UserX
} from "lucide-react";

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

  // Search & Filters
  const [studentSearch, setStudentSearch] = useState("");
  const [studentRoleFilter, setStudentRoleFilter] = useState("ALL");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("");
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

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

  const loadAttendance = async () => {
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
      const data = await api.getAuditLogs({
        action: auditActionFilter !== "all" ? auditActionFilter : ""
      });
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Master refresh depending on active section
  const refreshCurrentSection = () => {
    loadStats();
    if (activeSection === "admins") loadAdmins();
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
    if (!window.confirm(`Permanently remove admin '${uname}'?`)) return;
    try {
      await api.deleteAdmin(id);
      notify("success", `Admin '${uname}' removed.`);
      loadAdmins();
    } catch (err) {
      notify("error", err.message);
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
      await api.createEvent(newEvent);
      notify("success", `Event '${newEvent.title_en}' created successfully.`);
      setEventModal(null);
      loadEvents();
    } catch (err) {
      notify("error", err.message || "Failed to create event");
    }
  };

  const handleEditEventSubmit = async (e) => {
    e.preventDefault();
    if (!editEvent || !editEvent.id) return;
    try {
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
        is_team: Boolean(editEvent.is_team),
        min_team_size: parseInt(editEvent.min_team_size) || (editEvent.is_team ? 2 : 1),
        max_team_size: parseInt(editEvent.max_team_size) || (editEvent.is_team ? 15 : 1),
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
                      {adminsList.map((adm) => (
                        <tr key={adm.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-stone-900 block">{adm.full_name}</span>
                            <span className="text-[11px] text-stone-400">{adm.email}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-stone-800">
                            {adm.username}
                          </td>
                          <td className="py-3 px-3 text-stone-600 font-medium">
                            {adm.department}
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
                                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                                    title="Approve Admin"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectAdmin(adm.id, adm.username)}
                                    className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-kar-red text-[11px] font-bold flex items-center gap-1"
                                    title="Reject Admin"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}

                              {adm.approval_status === "APPROVED" && (
                                <button
                                  onClick={() => handleToggleAdmin(adm.id)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                    adm.account_status === "ACTIVE"
                                      ? "border-stone-300 text-stone-600 hover:bg-stone-100"
                                      : "border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                                  }`}
                                >
                                  {adm.account_status === "ACTIVE" ? "Deactivate" : "Activate"}
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteAdmin(adm.id, adm.username)}
                                className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete Admin"
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
          {/* SECTION 5: DAILY ATTENDANCE OVERSIGHT & EDIT         */}
          {/* ==================================================== */}
          {activeSection === "attendance" && (
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Complete Volunteer Daily Attendance</h3>
                  <p className="text-xs text-stone-500">Super Admin oversight, manual corrections, and date-based filtering</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={attendanceDateFilter}
                    onChange={(e) => setAttendanceDateFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-stone-300 text-xs bg-white font-bold"
                  >
                    <option value="">All Dates</option>
                    {attendanceData.available_dates.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setMarkAttendanceModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Attendance</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Volunteer</th>
                      <th className="py-3 px-3">AUID</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Check-In</th>
                      <th className="py-3 px-3">Marked By</th>
                      <th className="py-3 px-3 text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {attendanceData.records.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50/80">
                        <td className="py-3 px-3 font-mono font-bold text-stone-800">
                          {r.date}
                        </td>
                        <td className="py-3 px-3 font-bold text-stone-900">
                          {r.volunteer_name}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600">
                          {r.auid}
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {r.department}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            r.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "ABSENT"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-900"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-500 font-mono">
                          {r.check_in_time}
                        </td>
                        <td className="py-3 px-3 text-stone-500">
                          {r.marked_by}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setEditAttendance({ ...r })}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-kar-red"
                            title="Edit Record"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <h4 className="font-extrabold text-base text-stone-900">Volunteer Attendance Spreadsheet (.xlsx)</h4>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      Formatted Microsoft Excel document with Karnataka Red header styling, bold columns, and status color highlights.
                    </p>
                  </div>
                  <button
                    onClick={() => api.exportAttendanceXlsx(attendanceDateFilter || "all")}
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official XLSX Report</span>
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
                  <h3 className="font-extrabold text-base text-stone-900">Immutable Security Audit Trail</h3>
                  <p className="text-xs text-stone-500">Complete log of all administrative actions, approvals, and attendance alterations</p>
                </div>
                <button
                  onClick={loadAuditLogs}
                  className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 self-start"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

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
                    onChange={(e) => setNewEvent({ ...newEvent, format: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white"
                  >
                    <option value="solo">Solo</option>
                    <option value="duet">Duet</option>
                    <option value="group">Group / Team</option>
                  </select>
                </div>
              </div>

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
                        min_team_size: isTeam ? (editEvent.min_team_size > 1 ? editEvent.min_team_size : 2) : 1,
                        max_team_size: isTeam ? (editEvent.max_team_size > 1 ? editEvent.max_team_size : 15) : 1
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 mt-1 bg-white font-medium"
                  >
                    <option value="solo">Solo (ಏಕವ್ಯಕ್ತಿ)</option>
                    <option value="duet">Duet (ಇಬ್ಬರು)</option>
                    <option value="group">Group / Team (ತಂಡ)</option>
                  </select>
                </div>
              </div>

              {/* Team Size configuration if team/group event */}
              {editEvent.is_team && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div>
                    <label className="font-bold text-amber-950 uppercase text-[10px]">Min Team Members</label>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      value={editEvent.min_team_size || 2}
                      onChange={(e) => setEditEvent({ ...editEvent, min_team_size: parseInt(e.target.value) || 2 })}
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

    </div>
  );
};
