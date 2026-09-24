import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal";
import {
  Sparkles,
  User,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Compass,
  HeartHandshake,
  Trophy,
  Users,
  ShieldAlert,
  KeyRound
} from "lucide-react";

export const AuthPortal = ({ onExplorePublic, onAuthSuccess, onOpenResetView, initialTab = "student-login" }) => {
  const { login } = useAuth();

  const getInitialActiveTab = (tab) => {
    if (tab === "student-register" || tab === "student-login" || tab === "student") return "student";
    if (tab === "admin-portal" || tab === "admin") return "admin";
    if (tab === "superadmin") return "superadmin";
    return "student";
  };

  const getInitialStudentMode = (tab) => {
    if (tab === "student-register") return "register";
    return "login";
  };

  const [activeTab, setActiveTab] = useState(() => getInitialActiveTab(initialTab)); // "student", "admin", "superadmin"
  const [studentMode, setStudentMode] = useState(() => getInitialStudentMode(initialTab)); // "login" or "register"
  const [adminMode, setAdminMode] = useState("login"); // "login" or "register"
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuperadminPassword, setShowSuperadminPassword] = useState(false);

  // Status & Error
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null); // For student registration success card
  const [adminNotice, setAdminNotice] = useState(null); // For admin registration pending approval notice

  // Sync if initialTab prop changes
  useEffect(() => {
    setActiveTab(getInitialActiveTab(initialTab));
    setStudentMode(getInitialStudentMode(initialTab));
    setErrorMessage("");
  }, [initialTab]);

  // Student Login State
  const [studentLoginForm, setStudentLoginForm] = useState({
    auid: "",
    password: ""
  });

  // Superadmin Form State
  const [superadminForm, setSuperadminForm] = useState({
    username: "akv-nt-2026",
    password: ""
  });

  // Student Register State
  const [studentRegisterForm, setStudentRegisterForm] = useState({
    fullName: "",
    auid: "",
    email: "",
    phone: "",
    institute: "Acharya Institute of Technology",
    department: "Computer Science & Engineering",
    semester: 6,
    section: "A",
    gender: "Male",
    role: "PARTICIPANT", // VOLUNTEER, PARTICIPANT, SPECTATOR
    password: "",
    confirmPassword: ""
  });

  // Admin Form State
  const [adminForm, setAdminForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    institute: "Acharya Institute of Technology",
    department: "Computer Science & Engineering",
    password: "",
    confirmPassword: ""
  });

  const departmentList = [
    "Computer Science & Engineering",
    "Information Science & Engineering",
    "Electronics & Communication Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Artificial Intelligence & Machine Learning",
    "Master of Computer Applications (MCA)",
    "Master of Business Administration (MBA)",
  ];

  // 1. Student Login Handler
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await api.studentLogin(studentLoginForm.auid.trim(), studentLoginForm.password);
      login(res.user, res.token);
      if (onAuthSuccess) {
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "AUID or password is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Student Register Handler
  const handleStudentRegister = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (studentRegisterForm.password !== studentRegisterForm.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (studentRegisterForm.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: studentRegisterForm.fullName.trim(),
        auid: studentRegisterForm.auid.trim().toUpperCase(),
        email: studentRegisterForm.email.trim().toLowerCase(),
        phone: studentRegisterForm.phone.trim(),
        institute: studentRegisterForm.institute.trim(),
        department: studentRegisterForm.department.trim(),
        semester: Number(studentRegisterForm.semester) || 6,
        section: studentRegisterForm.section.trim().toUpperCase() || "A",
        gender: studentRegisterForm.gender,
        role: studentRegisterForm.role,
        password: studentRegisterForm.password,
        confirm_password: studentRegisterForm.confirmPassword
      };

      const res = await api.studentRegister(payload);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccessData(res);
      // Log user in automatically so they can transition directly to dashboard
      login(res.user, res.token);
    } catch (err) {
      setErrorMessage(err.message || "Registration failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Admin Login Handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await api.adminLogin(adminForm.username.trim(), adminForm.password);
      login(res.user, res.token);
      if (onAuthSuccess) {
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Admin Register Handler
  const handleAdminRegister = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (adminForm.password !== adminForm.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (adminForm.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: adminForm.fullName.trim(),
        username: adminForm.username.trim().toLowerCase(),
        email: adminForm.email.trim().toLowerCase(),
        phone: adminForm.phone.trim(),
        institute: adminForm.institute.trim(),
        department: adminForm.department.trim(),
        password: adminForm.password,
        confirm_password: adminForm.confirmPassword
      };

      const res = await api.adminRegister(payload);
      setAdminNotice(res);
    } catch (err) {
      setErrorMessage(err.message || "Admin registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Superadmin Login Handler
  const handleSuperadminLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await api.adminLogin(superadminForm.username.trim(), superadminForm.password);
      if (res.user && res.user.role !== "SUPERADMIN") {
        throw new Error("Access restricted: This account does not possess Superadmin privileges.");
      }
      login(res.user, res.token);
      if (onAuthSuccess) {
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid Superadmin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-stone-900 text-stone-100 font-sans selection:bg-kar-red selection:text-white">
      {/* Background Ambience with Karnataka red & gold gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-kar-red/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-5" />
      </div>

      {/* Top Banner Navigation */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/images/acharya-logo.png?v=2026"
            alt="Acharya Institutes"
            className="h-9 sm:h-11 w-auto object-contain filter drop-shadow-sm brightness-110"
          />
          <div className="h-6 w-px bg-stone-700 hidden sm:block" />
          <img
            src="/images/akv-logo.png"
            alt="Acharya Kannada Vedike"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-md"
          />
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight tracking-tight">
              ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ
            </h1>
            <p className="text-[10px] sm:text-xs text-amber-400 font-semibold tracking-wide">
              ನುಡಿತರಂಗ ೨೦೨೬ • Nuditaranga 2026
            </p>
          </div>
        </div>

        {/* Small option for visitors who only want to view public information */}
        <button
          onClick={onExplorePublic}
          className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-200 bg-stone-800/90 hover:bg-stone-700 border border-amber-400/30 transition-all hover:border-amber-400 shadow-sm"
          title="Browse festival schedule, gallery, and public information"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
          <span className="hidden sm:inline">Explore AKV Website</span>
          <span className="sm:hidden">Explore</span>
          <ArrowRight className="w-3 h-3 text-amber-400" />
        </button>
      </header>

      {/* Main Authentication Portal Card Container */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 py-6 my-auto">
        <div className="bg-white text-stone-900 rounded-3xl shadow-2xl border border-amber-200/50 overflow-hidden backdrop-blur-md">

          {/* Karnataka Flag Colored Heraldic Header */}
          <div className="bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-black/25 text-amber-200 mb-2 border border-white/20">
              AUTHENTICATION PORTAL
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ನುಡಿತರಂಗ ೨೦೨೬
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1">
              Acharya Kannada Vedike • Secure Portal Access
            </p>
          </div>

          {/* Tab Selection Switcher: 3 Options (Student Portal, Admin Portal, Superadmin) */}
          <div className="flex border-b border-stone-200 bg-stone-50/80 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("student");
                setErrorMessage("");
                setSuccessData(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-98 ${activeTab === "student"
                ? "bg-white text-kar-red shadow-xs border border-stone-200/70"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/60"
                }`}
            >
              <User className="w-4 h-4 text-kar-red" />
              <span>Student Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setErrorMessage("");
                setAdminNotice(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-98 ${activeTab === "admin"
                ? "bg-white text-kar-red shadow-xs border border-stone-200/70"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/60"
                }`}
            >
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Admin Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("superadmin");
                setErrorMessage("");
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-98 ${activeTab === "superadmin"
                ? "bg-stone-900 text-amber-300 shadow-xs border border-stone-800"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/60"
                }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Superadmin</span>
            </button>
          </div>

          {/* Form Content Area */}
          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm font-semibold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-kar-red" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* OPTION 1: STUDENT PORTAL (UNIFIED LOGIN & REGISTER)  */}
            {/* ==================================================== */}
            {activeTab === "student" && (
              <div className="space-y-4">
                {/* Seamless Sub-mode switcher for Student */}
                {!successData && (
                  <div className="flex bg-stone-100 p-1 rounded-2xl mb-5 max-w-xs mx-auto border border-stone-200 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentMode("login");
                        setErrorMessage("");
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${studentMode === "login"
                        ? "bg-white text-kar-red shadow-xs border border-stone-200/50"
                        : "text-stone-600 hover:text-stone-900"
                        }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Student Login</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentMode("register");
                        setErrorMessage("");
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${studentMode === "register"
                        ? "bg-white text-kar-red shadow-xs border border-stone-200/50"
                        : "text-stone-600 hover:text-stone-900"
                        }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>New Register</span>
                    </button>
                  </div>
                )}

                {/* Sub-view A: Student Login */}
                {studentMode === "login" && (
                  <form onSubmit={handleStudentLogin} className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Acharya University ID (AUID) or College Email
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          required
                          value={studentLoginForm.auid}
                          onChange={(e) => setStudentLoginForm({ ...studentLoginForm, auid: e.target.value })}
                          placeholder="e.g. AIT22CS001 or student@acharya.ac.in"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Enter your college AUID, registered college email, or AKV Registration ID.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowForgotModal(true)}
                          className="text-xs font-bold text-kar-red hover:underline focus:outline-hidden"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={studentLoginForm.password}
                          onChange={(e) => setStudentLoginForm({ ...studentLoginForm, password: e.target.value })}
                          placeholder="Enter your student password"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Fast-fill Demo Student Helper */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="text-stone-700">
                        <span className="font-bold text-stone-900">Demo Student:</span>{" "}
                        <code className="bg-white px-2 py-0.5 rounded text-[11px] font-mono font-bold text-stone-800 border border-stone-200">
                          AIT22IS045
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStudentLoginForm({ auid: "AIT22IS045", password: "Password123!" })}
                        className="px-2.5 py-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        Fill Credentials
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 rounded-xl text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      {loading ? (
                        <span>Verifying Credentials...</span>
                      ) : (
                        <>
                          <span>Login to Student Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="pt-4 border-t border-stone-100 text-center">
                      <p className="text-xs text-stone-600">
                        New to Acharya Kannada Vedike?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setStudentMode("register");
                            setErrorMessage("");
                          }}
                          className="font-extrabold text-kar-red hover:underline ml-1"
                        >
                          New Student? Register here
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* Sub-view B: Student Register */}
                {studentMode === "register" && (
                  <div className="animate-fade-in">
                    {successData ? (
                      /* Registration Successful Card */
                      <div className="text-center space-y-4 py-2 animate-fade-in">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                          <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                          REGISTRATION SUCCESSFUL
                        </span>

                        <h3 className="text-xl font-extrabold text-stone-900 tracking-tight">
                          ನಮಸ್ಕಾರ, {successData.user.name}!
                        </h3>

                        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-left space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between border-b border-amber-200/60 pb-1.5">
                            <span className="text-stone-500 font-semibold">Registration ID:</span>
                            <span className="font-mono font-bold text-kar-red text-sm">{successData.user.registration_id}</span>
                          </div>
                          <div className="flex justify-between border-b border-amber-200/60 pb-1.5">
                            <span className="text-stone-500 font-semibold">AUID:</span>
                            <span className="font-mono font-bold text-stone-900">{successData.user.auid}</span>
                          </div>
                          <div className="flex justify-between border-b border-amber-200/60 pb-1.5">
                            <span className="text-stone-500 font-semibold">College Email:</span>
                            <span className="font-bold text-stone-900">{successData.user.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500 font-semibold">Registered Role:</span>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-kar-red text-white uppercase">
                              {successData.user.role}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed">
                          A confirmation email has been dispatched to your college email.
                          {successData.user.role === "VOLUNTEER" && " As a volunteer, your information has been automatically synchronized into the Volunteer Attendance System."}
                        </p>

                        <button
                          onClick={() => {
                            if (onAuthSuccess) onAuthSuccess(successData.user);
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all"
                        >
                          Enter Student Dashboard &rarr;
                        </button>
                      </div>
                    ) : (
                      /* Detailed Registration Form */
                      <form onSubmit={handleStudentRegister} className="space-y-4 text-left">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={studentRegisterForm.fullName}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, fullName: e.target.value })}
                              placeholder="e.g. Prajwal Gowda"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              AUID (College ID) *
                            </label>
                            <input
                              type="text"
                              required
                              value={studentRegisterForm.auid}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, auid: e.target.value.toUpperCase() })}
                              placeholder="e.g. AIT22CS001"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm font-mono uppercase"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              College Email ID *
                            </label>
                            <input
                              type="email"
                              required
                              value={studentRegisterForm.email}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, email: e.target.value })}
                              placeholder="student@acharya.ac.in"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              Contact Number *
                            </label>
                            <input
                              type="tel"
                              required
                              value={studentRegisterForm.phone}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, phone: e.target.value })}
                              placeholder="10-digit mobile number"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              Institute *
                            </label>
                            <input
                              type="text"
                              required
                              value={studentRegisterForm.institute}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, institute: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              Department *
                            </label>
                            <select
                              value={studentRegisterForm.department}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, department: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm bg-white"
                            >
                              {departmentList.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Participation Type Section: Radio Cards */}
                        <div className="pt-2">
                          <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
                            How are you registering? / ಭಾಗವಹಿಸುವಿಕೆ ವಿಧಾನ *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* Option A: Volunteer */}
                            <div
                              onClick={() => setStudentRegisterForm({ ...studentRegisterForm, role: "VOLUNTEER" })}
                              className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center ${studentRegisterForm.role === "VOLUNTEER"
                                ? "border-kar-red bg-red-50/70 shadow-sm"
                                : "border-stone-200 hover:border-amber-300 bg-white"
                                }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${studentRegisterForm.role === "VOLUNTEER" ? "bg-kar-red text-white" : "bg-stone-100 text-stone-600"
                                }`}>
                                <HeartHandshake className="w-5 h-5" />
                              </div>
                              <span className="font-extrabold text-xs sm:text-sm text-stone-900">Volunteer</span>
                              <span className="text-[10px] text-amber-900 font-bold mt-0.5">ಸ್ವಯಂಸೇವಕ</span>
                              <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                                Event coordination & daily attendance roster.
                              </p>
                            </div>

                            {/* Option B: Participant */}
                            <div
                              onClick={() => setStudentRegisterForm({ ...studentRegisterForm, role: "PARTICIPANT" })}
                              className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center ${studentRegisterForm.role === "PARTICIPANT"
                                ? "border-kar-red bg-red-50/70 shadow-sm"
                                : "border-stone-200 hover:border-amber-300 bg-white"
                                }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${studentRegisterForm.role === "PARTICIPANT" ? "bg-kar-red text-white" : "bg-stone-100 text-stone-600"
                                }`}>
                                <Trophy className="w-5 h-5" />
                              </div>
                              <span className="font-extrabold text-xs sm:text-sm text-stone-900">Participant</span>
                              <span className="text-[10px] text-amber-900 font-bold mt-0.5">ಸ್ಪರ್ಧಿ</span>
                              <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                                Compete in Nuditaranga cultural events.
                              </p>
                            </div>

                            {/* Option C: Spectator */}
                            <div
                              onClick={() => setStudentRegisterForm({ ...studentRegisterForm, role: "SPECTATOR" })}
                              className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center ${studentRegisterForm.role === "SPECTATOR"
                                ? "border-kar-red bg-red-50/70 shadow-sm"
                                : "border-stone-200 hover:border-amber-300 bg-white"
                                }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${studentRegisterForm.role === "SPECTATOR" ? "bg-kar-red text-white" : "bg-stone-100 text-stone-600"
                                }`}>
                                <Users className="w-5 h-5" />
                              </div>
                              <span className="font-extrabold text-xs sm:text-sm text-stone-900">Spectator</span>
                              <span className="text-[10px] text-amber-900 font-bold mt-0.5">ವೀಕ್ಷಕ</span>
                              <p className="text-[10px] text-stone-500 mt-1 leading-tight">
                                Audience pass to support and watch.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Account Passwords */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              Password *
                            </label>
                            <input
                              type="password"
                              required
                              minLength={6}
                              value={studentRegisterForm.password}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, password: e.target.value })}
                              placeholder="Min. 6 characters"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                              Confirm Password *
                            </label>
                            <input
                              type="password"
                              required
                              minLength={6}
                              value={studentRegisterForm.confirmPassword}
                              onChange={(e) => setStudentRegisterForm({ ...studentRegisterForm, confirmPassword: e.target.value })}
                              placeholder="Re-enter password"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          {loading ? "Processing Registration..." : "Complete Student Registration"}
                        </button>

                        <div className="pt-4 border-t border-stone-100 text-center">
                          <p className="text-xs text-stone-600">
                            Already registered for Nuditaranga 2026?{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setStudentMode("login");
                                setErrorMessage("");
                              }}
                              className="font-extrabold text-kar-red hover:underline ml-1"
                            >
                              Sign In here
                            </button>
                          </p>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* OPTION 2: ADMIN PORTAL                              */}
            {/* ==================================================== */}
            {activeTab === "admin" && (
              <div>
                {/* Admin Mode Switcher */}
                <div className="flex border-b border-stone-200 mb-5 pb-2 justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMode("login");
                      setErrorMessage("");
                      setAdminNotice(null);
                    }}
                    className={`text-xs font-extrabold uppercase tracking-wider pb-1 transition-colors ${adminMode === "login"
                      ? "text-kar-red border-b-2 border-kar-red"
                      : "text-stone-400 hover:text-stone-700"
                      }`}
                  >
                    Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMode("register");
                      setErrorMessage("");
                      setAdminNotice(null);
                    }}
                    className={`text-xs font-extrabold uppercase tracking-wider pb-1 transition-colors ${adminMode === "register"
                      ? "text-kar-red border-b-2 border-kar-red"
                      : "text-stone-400 hover:text-stone-700"
                      }`}
                  >
                    Register as Admin
                  </button>
                </div>

                {/* Sub-view A: Admin Registration Pending Alert */}
                {adminNotice ? (
                  <div className="text-center space-y-4 py-4 animate-fade-in">
                    <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <Shield className="w-8 h-8" />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      ADMIN REGISTRATION SUBMITTED
                    </span>
                    <h3 className="text-lg font-extrabold text-stone-900">
                      Awaiting Super Admin Approval
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed max-w-md mx-auto">
                      Your administrator request for username <strong>{adminNotice.username}</strong> has been registered.
                      Per AKV security governance, an approval alert has been transmitted to the Super Administrator.
                      You will be notified by email once approved.
                    </p>
                    <button
                      onClick={() => setAdminMode("login")}
                      className="mt-2 py-2.5 px-6 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
                    >
                      Return to Admin Login
                    </button>
                  </div>
                ) : adminMode === "login" ? (
                  /* Admin Login */
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Username or College Email
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          required
                          value={adminForm.username}
                          onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value.toLowerCase() })}
                          placeholder="e.g. ayush_h_mane or ayush@acharya.ac.in"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Admin Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="password"
                          required
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="Enter admin password"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm"
                        />
                      </div>
                    </div>

                    {/* Fast-fill Coordinator Admin Helper */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="text-stone-700">
                        <span className="font-bold text-stone-900">Coordinator Admin:</span>{" "}
                        <code className="bg-white px-2 py-0.5 rounded text-[11px] font-mono font-bold text-stone-800 border border-stone-200">
                          ayush_h_mane
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdminForm({ ...adminForm, username: "ayush_h_mane", password: "AcharyaAKV2026" })}
                        className="px-2.5 py-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        Fill Credentials
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 rounded-xl bg-stone-900 hover:bg-black text-white font-extrabold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-kar-red" />
                      <span>{loading ? "Authenticating..." : "Login to Coordinator Dashboard"}</span>
                    </button>
                  </form>
                ) : (
                  /* Register as Admin Form */
                  <form onSubmit={handleAdminRegister} className="space-y-3.5 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminForm.fullName}
                          onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                          placeholder="Faculty / Lead Name"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Desired Username *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminForm.username}
                          onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value.toLowerCase() })}
                          placeholder="e.g. suresh_rao"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          College Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={adminForm.email}
                          onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                          placeholder="faculty@acharya.ac.in"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Contact Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={adminForm.phone}
                          onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                          placeholder="10-digit number"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Institute *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminForm.institute}
                          onChange={(e) => setAdminForm({ ...adminForm, institute: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Department *
                        </label>
                        <select
                          value={adminForm.department}
                          onChange={(e) => setAdminForm({ ...adminForm, department: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm bg-white"
                        >
                          {departmentList.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="Min. 6 characters"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={adminForm.confirmPassword}
                          onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                          placeholder="Re-enter password"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-tight">
                      ⚠️ Submitted admin registrations require Super Admin review and approval before login access is granted.
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {loading ? "Submitting Admin Request..." : "Submit Admin Application"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* OPTION 3: SUPERADMIN DEDICATED SECTION               */}
            {/* ==================================================== */}
            {activeTab === "superadmin" && (
              <div className="space-y-5 animate-fade-in text-left">
                {/* Executive Restricted Notice */}
                <div className="p-4 bg-gradient-to-r from-stone-900 via-neutral-900 to-red-950 text-white rounded-2xl border border-amber-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black tracking-widest text-amber-400 uppercase">
                          Executive Master Portal
                        </h4>
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-red-600 text-white tracking-wider">
                          SUPERADMIN ONLY
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                        Highest authority portal for Acharya Kannada Vedike Nuditaranga 2026. Grants database oversight, administrator approval privileges, and executive controls.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSuperadminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Superadmin Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={superadminForm.username}
                        onChange={(e) => setSuperadminForm({ ...superadminForm, username: e.target.value.toLowerCase() })}
                        placeholder="akv-nt-2026"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm font-mono font-bold text-stone-900 bg-stone-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Superadmin Master Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type={showSuperadminPassword ? "text" : "password"}
                        required
                        value={superadminForm.password}
                        onChange={(e) => setSuperadminForm({ ...superadminForm, password: e.target.value })}
                        placeholder="Enter superadmin password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm font-mono text-stone-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSuperadminPassword(!showSuperadminPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-hidden"
                      >
                        {showSuperadminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Fast-fill Master Credentials helper */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                    <div className="text-stone-700">
                      <span className="font-bold text-stone-900">Festival Master:</span>{" "}
                      <code className="bg-white px-2 py-0.5 rounded text-[11px] font-mono font-bold text-stone-800 border border-stone-200">
                        akv-nt-2026
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSuperadminForm({ username: "akv-nt-2026", password: "akv.nt@2026" })}
                      className="px-2.5 py-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors shadow-2xs"
                    >
                      Fill Credentials
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-stone-900 via-neutral-900 to-amber-950 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-extrabold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-98"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>{loading ? "Authenticating Master Security..." : "Authorize Superadmin Access"}</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Navigation Note */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 py-4 text-center text-xs text-stone-500">
        <p>
          Acharya Kannada Vedike (AKV) • Nuditaranga 2026 Cultural Fest • Protected by Role-Based Access Control
        </p>
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onOpenResetView={onOpenResetView}
      />
    </div>
  );
};
