import React, { useState, useEffect, useCallback } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ModalAlertProvider } from "./context/ModalAlertContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";

// Authentication & Specialized Dashboards
import { AuthPortal } from "./pages/AuthPortal";
import { ResetPasswordView } from "./pages/ResetPasswordView";
import { StudentDashboard } from "./pages/StudentDashboard";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import { AdminPage } from "./pages/AdminPage";

// Public Pages & Events
import { HomePage } from "./pages/HomePage";
import { EventsPage } from "./pages/EventsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { CheckInPage } from "./pages/CheckInPage";
import { RulesPage } from "./pages/RulesPage";

// Direct Sections
import { AboutSection } from "./sections/AboutSection";
import { ActivitiesSection } from "./sections/ActivitiesSection";
import { NuditarangaHero } from "./sections/NuditarangaHero";
import { KarunadaVaibhavaSchedule } from "./components/KarunadaVaibhavaSchedule";
import { GallerySection } from "./sections/GallerySection";
import { ContactSection } from "./sections/ContactSection";
import { api } from "./services/api";

import { ShieldAlert } from "lucide-react";

/**
 * Access Denied & Wrong Portal Component
 * Displays a clear, branded notice if an authenticated user accesses the wrong portal.
 */
function AccessDeniedCard({ title, message, currentRole, requiredRole, onGoToDashboard, dashboardLabel, onLogout, onGoHome }) {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-kar-red/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full bg-white text-stone-900 rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        <div className="bg-gradient-to-r from-kar-red to-red-700 p-6 text-white text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <ShieldAlert className="w-8 h-8 text-amber-300" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase bg-black/25 text-amber-200 border border-white/20 mb-2">
            ACCESS NOTICE • ಪ್ರವೇಶ ಗಮನಿಸಿ
          </span>
          <h2 className="text-xl sm:text-2xl font-black">{title}</h2>
        </div>

        <div className="p-6 space-y-4 text-center">
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            {message}
          </p>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
            <div>Signed-in Role: <strong className="text-kar-red uppercase">{currentRole}</strong></div>
            {requiredRole && <div>Target Portal Role: <strong className="text-stone-900 uppercase">{requiredRole}</strong></div>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {onGoToDashboard && (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-bold text-xs shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                {dashboardLabel || "Go to Your Dashboard"}
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Logout / Switch Account
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onGoHome}
            className="text-xs font-bold text-stone-500 hover:text-kar-red hover:underline pt-2 block mx-auto cursor-pointer"
          >
            ← Return to Acharya Kannada Vedike Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Route parser from browser window location
 */
const parseRouteFromLocation = () => {
  if (typeof window === "undefined") {
    return { path: "/", portal: null, subMode: "login" };
  }
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const searchParams = new URLSearchParams(window.location.search);
  const modeParam = searchParams.get("mode") || "login";

  if (pathname === "/student") {
    return { path: "/student", portal: "student", subMode: modeParam === "register" ? "register" : "login" };
  }
  if (pathname === "/admin") {
    return { path: "/admin", portal: "admin", subMode: modeParam === "register" ? "register" : "login" };
  }
  if (pathname === "/superadmin") {
    return { path: "/superadmin", portal: "superadmin", subMode: "login" };
  }
  if (pathname === "/faculty") {
    return { path: "/faculty", portal: "faculty", subMode: modeParam === "register" ? "register" : "login" };
  }

  const validPublicPaths = [
    "/about", "/activities", "/nuditaranga", "/events", 
    "/rules", "/gallery", "/contact", "/register", 
    "/confirmation", "/checkin"
  ];
  if (validPublicPaths.includes(pathname)) {
    return { path: pathname, portal: null, subMode: "login" };
  }

  return { path: "/", portal: null, subMode: "login" };
};

export function AppContent() {
  const { user, role, logout } = useAuth();
  
  // Primary URL Route State
  const [route, setRoute] = useState(parseRouteFromLocation);
  const [resetToken, setResetToken] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState(null);

  // Background prefetch all catalog and schedule data
  useEffect(() => {
    api.prefetchAll(user);
  }, [user]);

  // Navigate URL Path with browser history synchronization
  const navigatePath = useCallback((target, options = {}) => {
    let normalized = target || "/";
    let subMode = options.subMode || "login";

    // Handle legacy view names if passed from child components
    if (!normalized.startsWith("/")) {
      if (normalized === "home") normalized = "/";
      else if (normalized === "student-dashboard" || normalized === "student") normalized = "/student";
      else if (normalized === "admin-dashboard" || normalized === "admin") normalized = "/admin";
      else if (normalized === "superadmin-dashboard" || normalized === "superadmin") normalized = "/superadmin";
      else if (normalized === "faculty") normalized = "/faculty";
      else if (normalized === "auth") {
        normalized = "/student";
      } else {
        normalized = `/${normalized}`;
      }
    }

    let urlToPush = normalized;
    if (subMode === "register" && (normalized === "/student" || normalized === "/admin" || normalized === "/faculty")) {
      urlToPush = `${normalized}?mode=register`;
    }

    const nextPortal = (normalized === "/student") ? "student"
      : (normalized === "/admin") ? "admin"
      : (normalized === "/superadmin") ? "superadmin"
      : (normalized === "/faculty") ? "faculty"
      : null;

    if (options.replace) {
      window.history.replaceState({ path: normalized, portal: nextPortal, subMode, timestamp: Date.now() }, "", urlToPush);
    } else {
      window.history.pushState({ path: normalized, portal: nextPortal, subMode, timestamp: Date.now() }, "", urlToPush);
    }

    setRoute({ path: normalized, portal: nextPortal, subMode });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Synchronize browser history and handle Back/Forward button navigation (popstate)
  useEffect(() => {
    const handlePopState = (event) => {
      // If modal dialog is open, let its own handler handle closing it
      if (event.state && (event.state.akvModalAlert || event.state.akvModal)) return;

      const currentParsed = parseRouteFromLocation();
      setRoute(currentParsed);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Detect #reset-token in URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes("reset-token=")) {
        const token = hash.split("reset-token=")[1]?.split("&")[0];
        if (token) {
          setResetToken(token);
          setRoute({ path: "/reset-password", portal: null, subMode: "login" });
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // When user successfully authenticates
  const handleAuthSuccess = (authenticatedUser) => {
    if (route.portal === "superadmin" || authenticatedUser.role === "SUPERADMIN") {
      navigatePath("/superadmin");
    } else if (route.portal === "faculty") {
      navigatePath("/faculty");
    } else if (route.portal === "admin" || authenticatedUser.role === "ADMIN") {
      navigatePath("/admin");
    } else {
      navigatePath("/student");
    }
  };

  const handleRegisterNav = (eventId = null) => {
    setSelectedEventId(eventId);
    if (user) {
      if (role === "ADMIN") navigatePath("/admin");
      else if (role === "SUPERADMIN") navigatePath("/superadmin");
      else navigatePath("/student");
    } else {
      navigatePath("/student", { subMode: "register" });
    }
  };

  // ====================================================
  // 1. DEDICATED PASSWORD RESET VIEW
  // ====================================================
  if (route.path === "/reset-password" || resetToken) {
    return (
      <ResetPasswordView
        token={resetToken}
        onBackToLogin={() => {
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
          setResetToken("");
          navigatePath("/student");
        }}
      />
    );
  }

  // ====================================================
  // 2. DEDICATED PORTAL: /student
  // ====================================================
  if (route.portal === "student") {
    if (!user) {
      return (
        <AuthPortal
          portalType="student"
          initialSubMode={route.subMode}
          onExplorePublic={() => navigatePath("/")}
          onAuthSuccess={handleAuthSuccess}
          onOpenResetView={(tok) => {
            setResetToken(tok);
            setRoute({ path: "/reset-password", portal: null, subMode: "login" });
          }}
        />
      );
    }

    // Role check: If logged in as Admin or Superadmin, show access notice
    if (role === "ADMIN" || role === "SUPERADMIN") {
      return (
        <AccessDeniedCard
          title="Administrator Session Active"
          message={`You are signed in as an Administrator (${user.name}). The Student Portal is reserved for participants and volunteers. Please use the Admin Portal or sign out to use Student Login.`}
          currentRole={role}
          requiredRole="Student / Participant"
          dashboardLabel="Go to Administrator Portal"
          onGoToDashboard={() => navigatePath(role === "SUPERADMIN" ? "/superadmin" : "/admin")}
          onLogout={logout}
          onGoHome={() => navigatePath("/")}
        />
      );
    }

    // Authenticated Student/Participant/Volunteer Dashboard
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
        <Navbar
          currentView="student"
          setCurrentView={navigatePath}
          onOpenAuthTab={() => navigatePath("/student")}
        />
        <main className="flex-1">
          <StudentDashboard
            onNavigateHome={() => navigatePath("/")}
          />
        </main>
        <Footer setCurrentView={navigatePath} />
      </div>
    );
  }

  // ====================================================
  // 3. DEDICATED PORTAL: /admin
  // ====================================================
  if (route.portal === "admin") {
    if (!user) {
      return (
        <AuthPortal
          portalType="admin"
          initialSubMode={route.subMode}
          onExplorePublic={() => navigatePath("/")}
          onAuthSuccess={handleAuthSuccess}
          onOpenResetView={(tok) => {
            setResetToken(tok);
            setRoute({ path: "/reset-password", portal: null, subMode: "login" });
          }}
        />
      );
    }

    // Role check: Only ADMIN and SUPERADMIN can access
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return (
        <AccessDeniedCard
          title="Admin Access Restricted"
          message={`The Admin Portal is restricted to authorized Working Committee and Faculty Coordinators. Your account (${user.name} • ${user.auid}) has student participation privileges.`}
          currentRole={role}
          requiredRole="Admin / Coordinator"
          dashboardLabel="Go to Student Dashboard"
          onGoToDashboard={() => navigatePath("/student")}
          onLogout={logout}
          onGoHome={() => navigatePath("/")}
        />
      );
    }

    // Authenticated Coordinator Dashboard
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
        <Navbar
          currentView="admin"
          setCurrentView={navigatePath}
          onOpenAuthTab={() => navigatePath("/admin")}
        />
        <main className="flex-1">
          <AdminPage
            onNavigateHome={() => navigatePath("/")}
            onOpenSuperAdmin={() => navigatePath("/superadmin")}
          />
        </main>
        <Footer setCurrentView={navigatePath} />
      </div>
    );
  }

  // ====================================================
  // 4. DEDICATED PORTAL: /faculty
  // ====================================================
  if (route.portal === "faculty") {
    if (!user) {
      return (
        <AuthPortal
          portalType="faculty"
          initialSubMode={route.subMode}
          onExplorePublic={() => navigatePath("/")}
          onAuthSuccess={handleAuthSuccess}
          onOpenResetView={(tok) => {
            setResetToken(tok);
            setRoute({ path: "/reset-password", portal: null, subMode: "login" });
          }}
        />
      );
    }

    // Role check: Only ADMIN and SUPERADMIN
    if (role !== "ADMIN" && role !== "SUPERADMIN") {
      return (
        <AccessDeniedCard
          title="Faculty Portal Restricted"
          message={`The Faculty Coordinator Portal is reserved for faculty coordinators and staff. Your account (${user.name} • ${user.auid}) has student participation privileges.`}
          currentRole={role}
          requiredRole="Faculty Coordinator"
          dashboardLabel="Go to Student Dashboard"
          onGoToDashboard={() => navigatePath("/student")}
          onLogout={logout}
          onGoHome={() => navigatePath("/")}
        />
      );
    }

    // Authenticated Faculty Coordinator Dashboard (AdminPage)
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
        <Navbar
          currentView="faculty"
          setCurrentView={navigatePath}
          onOpenAuthTab={() => navigatePath("/faculty")}
        />
        <main className="flex-1">
          <AdminPage
            onNavigateHome={() => navigatePath("/")}
            onOpenSuperAdmin={() => navigatePath("/superadmin")}
          />
        </main>
        <Footer setCurrentView={navigatePath} />
      </div>
    );
  }

  // ====================================================
  // 5. DEDICATED PORTAL: /superadmin
  // ====================================================
  if (route.portal === "superadmin") {
    if (!user) {
      return (
        <AuthPortal
          portalType="superadmin"
          initialSubMode="login"
          onExplorePublic={() => navigatePath("/")}
          onAuthSuccess={handleAuthSuccess}
          onOpenResetView={(tok) => {
            setResetToken(tok);
            setRoute({ path: "/reset-password", portal: null, subMode: "login" });
          }}
        />
      );
    }

    // Role check: Strictly SUPERADMIN only
    if (role !== "SUPERADMIN") {
      return (
        <AccessDeniedCard
          title="Superadmin Access Restricted"
          message={`The Superadmin Master Portal is restricted strictly to authorized AKV Super Administrators. You are signed in as (${user.name} • ${role}).`}
          currentRole={role}
          requiredRole="Superadmin"
          dashboardLabel={role === "ADMIN" ? "Go to Admin Portal" : "Go to Student Dashboard"}
          onGoToDashboard={() => navigatePath(role === "ADMIN" ? "/admin" : "/student")}
          onLogout={logout}
          onGoHome={() => navigatePath("/")}
        />
      );
    }

    // Authenticated Superadmin Full-Screen Master Workspace
    return (
      <SuperAdminDashboard
        onNavigateHome={() => navigatePath("/")}
      />
    );
  }

  // ====================================================
  // 6. DEDICATED DESK: /checkin
  // ====================================================
  if (route.path === "/checkin") {
    if (!user || (role !== "ADMIN" && role !== "SUPERADMIN")) {
      return (
        <AccessDeniedCard
          title="Desk Check-In Restricted"
          message="The Organizer Check-In Desk is exclusively available to administrators and organizers."
          currentRole={role || "Guest (Logged Out)"}
          requiredRole="Admin / Superadmin"
          dashboardLabel={user ? (role === "STUDENT" ? "Go to Student Dashboard" : "Go to Admin Portal") : "Admin Login"}
          onGoToDashboard={() => navigatePath(user ? (role === "STUDENT" ? "/student" : "/admin") : "/admin")}
          onLogout={user ? logout : null}
          onGoHome={() => navigatePath("/")}
        />
      );
    }
  }

  // ====================================================
  // 7. PUBLIC WEBSITE VIEWS (/, /about, /events, etc.)
  // ====================================================
  const publicNavId = route.path.replace(/^\//, "") || "home";

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
      <Navbar
        currentView={publicNavId}
        setCurrentView={navigatePath}
        onOpenAuthTab={(tab) => {
          if (tab === "student-register") {
            navigatePath("/student", { subMode: "register" });
          } else {
            navigatePath("/student");
          }
        }}
      />

      <main className="flex-1" key={route.path}>
        <div className="animate-page-enter transform-gpu min-h-full">
          {/* Public Home Page */}
          {route.path === "/" && (
            <HomePage
              setCurrentView={navigatePath}
              setSelectedEventId={setSelectedEventId}
              onOpenAuthTab={(tab) => {
                if (tab === "student-register") {
                  navigatePath("/student", { subMode: "register" });
                } else {
                  navigatePath("/student");
                }
              }}
            />
          )}

          {route.path === "/about" && (
            <div className="pt-24 min-h-screen">
              <AboutSection />
            </div>
          )}

          {route.path === "/activities" && (
            <div className="pt-24 min-h-screen">
              <ActivitiesSection />
            </div>
          )}

          {route.path === "/nuditaranga" && (
            <div className="pt-24 min-h-screen bg-stone-950">
              <KarunadaVaibhavaSchedule
                onRegisterClick={() => handleRegisterNav(null)}
              />
              <NuditarangaHero
                onRegister={() => handleRegisterNav(null)}
                onViewEvents={() => navigatePath("/events")}
              />
            </div>
          )}

          {route.path === "/events" && (
            <EventsPage
              setCurrentView={navigatePath}
              setSelectedEventId={setSelectedEventId}
            />
          )}

          {route.path === "/gallery" && (
            <div className="pt-24 min-h-screen">
              <GallerySection />
            </div>
          )}

          {route.path === "/contact" && (
            <div className="pt-24 min-h-screen">
              <ContactSection />
            </div>
          )}

          {route.path === "/rules" && (
            <RulesPage onBack={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigatePath("/");
              }
            }} />
          )}

          {route.path === "/register" && (
            <RegisterPage
              selectedEventId={selectedEventId}
              setSelectedEventId={setSelectedEventId}
              setCurrentView={navigatePath}
              setConfirmedRegistration={setConfirmedRegistration}
            />
          )}

          {route.path === "/confirmation" && (
            <ConfirmationPage
              confirmedRegistration={confirmedRegistration}
              setCurrentView={navigatePath}
            />
          )}

          {route.path === "/checkin" && (
            <CheckInPage />
          )}
        </div>
      </main>

      <Footer setCurrentView={navigatePath} />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-stone-800 border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <span className="text-2xl font-black">!</span>
            </div>
            <h2 className="text-xl font-bold text-white">Application Notice</h2>
            <p className="text-xs text-stone-300">
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="px-4 py-2 bg-gradient-to-r from-kar-red to-red-600 text-white rounded-xl text-xs font-bold shadow-md hover:brightness-110 cursor-pointer"
              >
                Go to Homepage
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <ModalAlertProvider>
            <AppContent />
          </ModalAlertProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
