import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
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
  Image as ImageIcon
} from "lucide-react";
import { CameraQRScanner } from "../components/CameraQRScanner";
import { EventImageUpload } from "../components/EventImageUpload";

export const AdminPage = ({ onNavigateHome, onOpenSuperAdmin }) => {
  const { user, role, logout } = useAuth();
  const { lang, t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState("attendance"); // "overview", "attendance", "checkin"
  const [overview, setOverview] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [todayDate, setTodayDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Check-In Desk State
  const [checkinId, setCheckinId] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [checkinMode, setCheckinMode] = useState("camera"); // "camera" or "manual"

  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // Cultural Gallery State
  const [galleryItems, setGalleryItems] = useState([]);
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
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [overviewData, volsData] = await Promise.all([
        api.getAdminOverview(),
        api.getTodayVolunteers({
          department: deptFilter !== "all" ? deptFilter : "",
          search: searchQuery
        })
      ]);

      setOverview(overviewData);
      setVolunteers(volsData.volunteers || []);
      setTodayDate(volsData.date || "");
    } catch (err) {
      console.error("Admin data loading error:", err);
      notify("error", err.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [deptFilter]);

  const loadGallery = async () => {
    try {
      setGalleryLoading(true);
      const data = await api.getGallery();
      setGalleryItems(data || []);
    } catch (err) {
      console.error("Failed to load gallery:", err);
    } finally {
      setGalleryLoading(false);
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

  // Mark Volunteer Attendance Handler
  const handleMarkAttendance = async (volunteerUserId, statusVal) => {
    try {
      const res = await api.markVolunteerAttendance(volunteerUserId, statusVal);
      notify("success", res.message || `Attendance updated to ${statusVal}`);
      
      // Update local state smoothly
      setVolunteers(prev => prev.map(v => {
        if (v.user_id === volunteerUserId) {
          return {
            ...v,
            attendance_status: statusVal,
            check_in_time: statusVal === "PRESENT" ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
          };
        }
        return v;
      }));

      // Update overview count
      if (overview) {
        setOverview(prev => ({
          ...prev,
          today_attendance: {
            ...prev.today_attendance,
            present: statusVal === "PRESENT" ? prev.today_attendance.present + 1 : Math.max(0, prev.today_attendance.present - 1),
            absent: statusVal === "ABSENT" ? prev.today_attendance.absent + 1 : Math.max(0, prev.today_attendance.absent - 1)
          }
        }));
      }
    } catch (err) {
      notify("error", err.message || "Failed to mark attendance.");
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
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>AKV Website</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
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
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Spectators</span>
            <p className="text-xl font-extrabold text-stone-700 mt-1">{overview?.total_spectators || 0}</p>
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
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "attendance"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:bg-white"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Today's Volunteer Attendance</span>
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

        {/* ==================================================== */}
        {/* TAB 1: VOLUNTEER ATTENDANCE (TODAY ONLY)             */}
        {/* ==================================================== */}
        {activeTab === "attendance" && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-kar-red" />
                  <span>Volunteer Attendance — {todayDate || "Today"}</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Roster auto-generated from student registrations. Mark volunteers Present or Absent.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search volunteer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadAdminData()}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs w-44 sm:w-52"
                  />
                </div>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="py-1.5 px-3 rounded-xl border border-stone-300 text-xs bg-white font-bold text-stone-700"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <button
                  onClick={loadAdminData}
                  className="p-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Attendance Privacy Alert */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Attendance Privacy Policy:</strong> Approved admins can verify and mark today's attendance. Historical attendance records, audit logs, and spreadsheet exports are restricted to the Super Administrator.
              </div>
            </div>

            {/* Volunteers Table */}
            {volunteers.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Users className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-700">No volunteers found</p>
                <p className="text-xs text-stone-500">
                  Students who register as 'Volunteer' will automatically appear in this table.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-3">Volunteer</th>
                      <th className="py-3 px-3">AUID</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Current Status</th>
                      <th className="py-3 px-3 text-right">Attendance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {volunteers.map((v) => (
                      <tr key={v.user_id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-stone-900 block">{v.name}</span>
                          <span className="text-[11px] text-stone-400">{v.email}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-800">
                          {v.auid}
                        </td>
                        <td className="py-3 px-3 text-stone-600 font-medium">
                          {v.department}
                        </td>
                        <td className="py-3 px-3 text-stone-600 font-mono">
                          {v.contact}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            v.attendance_status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : v.attendance_status === "ABSENT"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-stone-100 text-stone-500"
                          }`}>
                            {v.attendance_status === "PRESENT" && "PRESENT ✅"}
                            {v.attendance_status === "ABSENT" && "ABSENT ❌"}
                            {v.attendance_status === "NOT_MARKED" && "NOT MARKED"}
                          </span>
                          {v.check_in_time && (
                            <span className="block text-[10px] text-stone-400 font-mono mt-0.5">
                              {v.check_in_time}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleMarkAttendance(v.user_id, "PRESENT")}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                                v.attendance_status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Present</span>
                            </button>

                            <button
                              onClick={() => handleMarkAttendance(v.user_id, "ABSENT")}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                                v.attendance_status === "ABSENT"
                                  ? "bg-kar-red text-white shadow-xs"
                                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Absent</span>
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
                    placeholder="e.g. AKV26001 or AIT22CS001"
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
                  onClick={loadGallery}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${galleryLoading ? "animate-spin" : ""}`} />
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

      </div>
    </div>
  );
};
