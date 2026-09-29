import React, { useState, useEffect, useCallback } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ModalAlertProvider, useModalAlert } from "./context/ModalAlertContext";
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

export function AppContent() {
  const { user, role, loading } = useAuth();
  
  // Application Entry Point: Default to public website home or state from history
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== "undefined" && window.history.state && window.history.state.akvView) {
      return window.history.state.akvView;
    }
    return "home";
  }); 

  const [authInitialTab, setAuthInitialTab] = useState("student-login");
  const [resetToken, setResetToken] = useState("");
  
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [confirmedRegistration, setConfirmedRegistration] = useState(null);

  // Background prefetch all catalog and schedule data so every subsequent navigation is instant (0ms delay)
  useEffect(() => {
    api.prefetchAll(user);
  }, [user]);

  // Synchronize browser history and handle Back button navigation (popstate)
  useEffect(() => {
    // Ensure initial entry has base state and active state so back button never closes app unexpectedly
    if (!window.history.state || !window.history.state.akvView) {
      window.history.replaceState(
        { akvView: "home", isBase: true },
        "",
        window.location.pathname + window.location.search + window.location.hash
      );
      window.history.pushState(
        { akvView: currentView || "home", timestamp: Date.now() },
        "",
        window.location.pathname + window.location.search + window.location.hash
      );
    }

    const handlePopState = (event) => {
      // If modal dialog is open, its own popstate handler handles closing it
      if (event.state && event.state.akvModalAlert) return;
      if (event.state && event.state.akvModal) return;

      if (event.state && event.state.akvView) {
        if (event.state.isBase) {
          // Re-arm base state so pressing back on home page stays within app
          setCurrentView("home");
          window.history.pushState(
            { akvView: "home", timestamp: Date.now() },
            "",
            window.location.pathname + window.location.search + window.location.hash
          );
        } else {
          setCurrentView(event.state.akvView);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Fallback safely to home view instead of closing
        setCurrentView("home");
        window.history.pushState(
          { akvView: "home", timestamp: Date.now() },
          "",
          window.location.pathname + window.location.search + window.location.hash
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Navigate view with automatic browser history entry so single back press goes to recent page
  const navigateView = useCallback((nextView, options = {}) => {
    setCurrentView(prevView => {
      if (prevView === nextView) return prevView;
      const stateObj = { akvView: nextView, timestamp: Date.now() };
      if (options.replace) {
        window.history.replaceState(stateObj, "", window.location.pathname + window.location.search + window.location.hash);
      } else {
        window.history.pushState(stateObj, "", window.location.pathname + window.location.search + window.location.hash);
      }
      return nextView;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Detect #reset-token in URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes("reset-token=")) {
        const token = hash.split("reset-token=")[1]?.split("&")[0];
        if (token) {
          setResetToken(token);
          navigateView("reset-password");
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [navigateView]);

  // Redirect to home if user logs out or unauthorized user navigates to protected views
  useEffect(() => {
    if (!user && (currentView === "student-dashboard" || currentView === "admin-dashboard" || currentView === "superadmin-dashboard")) {
      navigateView("home", { replace: true });
    }
    // Organizer Check-In Desk is restricted to administrators only
    if (currentView === "checkin" && (!user || (role !== "ADMIN" && role !== "SUPERADMIN"))) {
      navigateView("home", { replace: true });
    }
  }, [user, role, currentView, navigateView]);

  // When user successfully authenticates
  const handleAuthSuccess = (authenticatedUser) => {
    if (authenticatedUser.role === "SUPERADMIN") {
      navigateView("superadmin-dashboard");
    } else if (authenticatedUser.role === "ADMIN") {
      navigateView("admin-dashboard");
    } else {
      navigateView("student-dashboard");
    }
  };

  // Public visitor explores main website
  const handleExplorePublic = () => {
    navigateView("home");
  };

  const handleRegisterNav = (eventId = null) => {
    setSelectedEventId(eventId);
    if (user) {
      navigateView("student-dashboard");
    } else {
      setAuthInitialTab("student-register");
      navigateView("auth");
    }
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
          navigateView("reset-password");
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
          navigateView("auth");
        }}
      />
    );
  }

  if (currentView === "superadmin-dashboard") {
    return (
      <SuperAdminDashboard
        onNavigateHome={() => navigateView("home")}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
      <Navbar
        currentView={currentView}
        setCurrentView={navigateView}
        onOpenAuthTab={(tab) => {
          setAuthInitialTab(tab);
          navigateView("auth");
        }}
      />

      <main className="flex-1" key={currentView}>
        <div className="animate-page-enter transform-gpu min-h-full">
          {/* Student Dashboard */}
          {currentView === "student-dashboard" && (
            <StudentDashboard
              onNavigateHome={() => navigateView("home")}
            />
          )}

          {/* Admin Dashboard */}
          {currentView === "admin-dashboard" && (
            <AdminPage
              onNavigateHome={() => navigateView("home")}
              onOpenSuperAdmin={() => navigateView("superadmin-dashboard")}
            />
          )}

          {/* Public Website Views */}
          {currentView === "home" && (
            <HomePage
              setCurrentView={navigateView}
              setSelectedEventId={setSelectedEventId}
              onOpenAuthTab={(tab) => {
                setAuthInitialTab(tab);
                navigateView("auth");
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
                onViewEvents={() => navigateView("events")}
              />
            </div>
          )}

          {currentView === "events" && (
            <EventsPage
              setCurrentView={navigateView}
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

          {currentView === "rules" && (
            <RulesPage onBack={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigateView("home");
              }
            }} />
          )}

          {currentView === "register" && (
            <RegisterPage
              selectedEventId={selectedEventId}
              setSelectedEventId={setSelectedEventId}
              setCurrentView={navigateView}
              setConfirmedRegistration={setConfirmedRegistration}
            />
          )}

          {currentView === "confirmation" && (
            <ConfirmationPage
              confirmedRegistration={confirmedRegistration}
              setCurrentView={navigateView}
            />
          )}

          {currentView === "checkin" && (
            user && (role === "ADMIN" || role === "SUPERADMIN") ? (
              <CheckInPage />
            ) : null
          )}
        </div>
      </main>

      <Footer setCurrentView={navigateView} />
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
