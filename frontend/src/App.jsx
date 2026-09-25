import React, { useState, useEffect } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

// Direct Sections
import { AboutSection } from "./sections/AboutSection";
import { ActivitiesSection } from "./sections/ActivitiesSection";
import { NuditarangaHero } from "./sections/NuditarangaHero";
import { KarunadaVaibhavaSchedule } from "./components/KarunadaVaibhavaSchedule";
import { GallerySection } from "./sections/GallerySection";
import { ContactSection } from "./sections/ContactSection";

export function AppContent() {
  const { user, role, loading } = useAuth();
  
  // Application Entry Point: Default to public website home
  const [currentView, setCurrentView] = useState("home"); 
  const [authInitialTab, setAuthInitialTab] = useState("student-login");
  const [resetToken, setResetToken] = useState("");
  
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState(null);

  // Detect #reset-token in URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes("reset-token=")) {
        const token = hash.split("reset-token=")[1]?.split("&")[0];
        if (token) {
          setResetToken(token);
          setCurrentView("reset-password");
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Redirect to home if user logs out or unauthorized user navigates to protected views
  useEffect(() => {
    if (!user && (currentView === "student-dashboard" || currentView === "admin-dashboard" || currentView === "superadmin-dashboard")) {
      setCurrentView("home");
    }
    // Organizer Check-In Desk is restricted to administrators only
    if (currentView === "checkin" && (!user || (role !== "ADMIN" && role !== "SUPERADMIN"))) {
      setCurrentView("home");
    }
  }, [user, role, currentView]);

  // When user successfully authenticates
  const handleAuthSuccess = (authenticatedUser) => {
    if (authenticatedUser.role === "SUPERADMIN") {
      setCurrentView("superadmin-dashboard");
    } else if (authenticatedUser.role === "ADMIN") {
      setCurrentView("admin-dashboard");
    } else {
      setCurrentView("student-dashboard");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Public visitor explores main website
  const handleExplorePublic = () => {
    setCurrentView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRegisterNav = (eventId = null) => {
    setSelectedEventId(eventId);
    if (user) {
      setCurrentView("student-dashboard");
    } else {
      setAuthInitialTab("student-register");
      setCurrentView("auth");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Dedicated full-screen portal views (without standard public navbar/footer)
  if (currentView === "auth") {
    return (
      <AuthPortal
        initialTab={authInitialTab}
        onExplorePublic={handleExplorePublic}
        onAuthSuccess={handleAuthSuccess}
        onOpenResetView={(tok) => {
          setResetToken(tok);
          setCurrentView("reset-password");
        }}
      />
    );
  }

  if (currentView === "reset-password") {
    return (
      <ResetPasswordView
        token={resetToken}
        onBackToLogin={() => {
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
          setResetToken("");
          setAuthInitialTab("student-login");
          setCurrentView("auth");
        }}
      />
    );
  }

  if (currentView === "superadmin-dashboard") {
    return (
      <SuperAdminDashboard
        onNavigateHome={() => setCurrentView("home")}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenAuthTab={(tab) => {
          setAuthInitialTab(tab);
          setCurrentView("auth");
        }}
      />

      <main className="flex-1" key={currentView}>
        <div className="animate-page-enter transform-gpu min-h-full">
          {/* Student Dashboard */}
          {currentView === "student-dashboard" && (
            <StudentDashboard
              onNavigateHome={() => setCurrentView("home")}
            />
          )}

          {/* Admin Dashboard */}
          {currentView === "admin-dashboard" && (
            <AdminPage
              onNavigateHome={() => setCurrentView("home")}
              onOpenSuperAdmin={() => setCurrentView("superadmin-dashboard")}
            />
          )}

          {/* Public Website Views */}
          {currentView === "home" && (
            <HomePage
              setCurrentView={setCurrentView}
              setSelectedEventId={setSelectedEventId}
              onOpenAuthTab={(tab) => {
                setAuthInitialTab(tab);
                setCurrentView("auth");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          {currentView === "about" && (
            <div className="pt-24 min-h-screen">
              <AboutSection />
            </div>
          )}

          {currentView === "activities" && (
            <div className="pt-24 min-h-screen">
              <ActivitiesSection />
            </div>
          )}

          {currentView === "nuditaranga" && (
            <div className="pt-24 min-h-screen bg-stone-950">
              <KarunadaVaibhavaSchedule
                onRegisterClick={() => handleRegisterNav(null)}
              />
              <NuditarangaHero
                onRegister={() => handleRegisterNav(null)}
                onViewEvents={() => {
                  setCurrentView("events");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}

          {currentView === "events" && (
            <EventsPage
              setCurrentView={setCurrentView}
              setSelectedEventId={setSelectedEventId}
            />
          )}

          {currentView === "gallery" && (
            <div className="pt-24 min-h-screen">
              <GallerySection />
            </div>
          )}

          {currentView === "contact" && (
            <div className="pt-24 min-h-screen">
              <ContactSection />
            </div>
          )}

          {currentView === "register" && (
            <RegisterPage
              selectedEventId={selectedEventId}
              setSelectedEventId={setSelectedEventId}
              setCurrentView={setCurrentView}
              setConfirmedRegistration={setConfirmedRegistration}
            />
          )}

          {currentView === "confirmation" && (
            <ConfirmationPage
              confirmedRegistration={confirmedRegistration}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === "checkin" && (
            user && (role === "ADMIN" || role === "SUPERADMIN") ? (
              <CheckInPage />
            ) : null
          )}
        </div>
      </main>

      <Footer setCurrentView={setCurrentView} />
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
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
