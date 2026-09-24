import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { 
  Menu, 
  X, 
  Globe, 
  Sparkles, 
  UserCheck, 
  Shield, 
  LogOut, 
  LayoutDashboard,
  ShieldAlert
} from "lucide-react";

export const Navbar = ({ currentView, setCurrentView, onOpenAuthTab }) => {
  const { lang, toggleLang, t } = useLanguage();
  const { user, role, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "home", label: t("nav.home") },
    { id: "about", label: t("nav.about") },
    { id: "activities", label: t("nav.activities") },
    { id: "nuditaranga", label: lang === "kn" ? "ಕರುನಾಡ ವೈಭವ" : "Karunada Vaibhava" },
    { id: "events", label: t("nav.events") },
    { id: "gallery", label: t("nav.gallery") },
    { id: "contact", label: t("nav.contact") },
  ];

  const handleNavClick = (id) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDashboardNav = () => {
    if (!user) {
      if (onOpenAuthTab) onOpenAuthTab("student-login");
      setCurrentView("auth");
      return;
    }

    if (role === "SUPERADMIN") {
      setCurrentView("superadmin-dashboard");
    } else if (role === "ADMIN") {
      setCurrentView("admin-dashboard");
    } else {
      setCurrentView("student-dashboard");
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRegisterCTA = () => {
    if (user) {
      // If already logged in as student, navigate directly to dashboard
      handleDashboardNav();
    } else {
      // If not logged in, open Auth Portal with registration tab
      if (onOpenAuthTab) onOpenAuthTab("student-register");
      setCurrentView("auth");
      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,box-shadow,padding,border-color] duration-300 ease-out transform-gpu ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-amber-100 py-2.5"
          : "bg-white/85 backdrop-blur-sm border-b border-transparent py-3 sm:py-4"
      }`}
    >
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-3">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => handleNavClick("home")} 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0 active:scale-98 transition-transform duration-150"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img
              src="/images/acharya-logo.png?v=2026"
              alt="Acharya Institutes"
              className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105 shrink-0"
            />
            <div className="h-6 w-px bg-stone-300 shrink-0 hidden sm:block" />
            <img
              src="/images/akv-logo.png"
              alt="Acharya Kannada Vedike"
              className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-sm shrink-0"
            />
          </div>

          <div className="shrink-0 flex flex-col justify-center">
            <span className="font-extrabold text-xs sm:text-base text-stone-900 tracking-tight leading-tight whitespace-nowrap block">
              {lang === "kn" ? "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ" : "Acharya Kannada Vedike"}
            </span>
            <p className="text-[9px] sm:text-[11px] text-amber-900 font-semibold tracking-wide whitespace-nowrap block mt-0.5">
              {lang === "kn" 
                ? "ನುಡಿತರಂಗ ೨೦೨೬ • ಕರುನಾಡ ವೈಭವ" 
                : "Nuditaranga 2026 • Karunada Vaibhava"}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? "text-kar-red bg-red-50 border border-red-100"
                    : "text-stone-700 hover:text-kar-red hover:bg-stone-100/70"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Lang, Auth States, Checkin & CTA */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {/* Language Toggle Button */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-amber-200/80 bg-amber-50/80 text-amber-900 hover:bg-amber-100 transition-colors shadow-xs"
            title="Switch Language / ಭಾಷೆ ಬದಲಿಸಿ"
          >
            <Globe className="w-3.5 h-3.5 text-kar-red" />
            <span className="font-extrabold">{lang === "kn" ? "ENG" : "ಕನ್ನಡ"}</span>
          </button>

          {/* User Logged In State */}
          {user && (
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl p-1">
              <button
                onClick={handleDashboardNav}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold text-stone-900 hover:bg-white transition-colors"
                title="Go to Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-kar-red" />
                <span className="max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
                <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold bg-kar-red text-white uppercase">
                  {role}
                </span>
              </button>

              <button
                onClick={logout}
                className="p-1 rounded-lg text-stone-400 hover:text-kar-red transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Check-In Desk Link - Available to Admins only */}
          {user && (role === "ADMIN" || role === "SUPERADMIN") && (
            <button
              onClick={() => handleNavClick("checkin")}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors border ${
                currentView === "checkin" 
                  ? "bg-amber-100 text-amber-900 border-amber-300" 
                  : "text-stone-600 hover:bg-amber-50/70 hover:text-amber-800 border-stone-200/80"
              }`}
              title={t("nav.checkIn")}
            >
              <UserCheck className="w-4 h-4 text-amber-600" />
            </button>
          )}

          {/* Primary CTA: Login/Register */}
          <button
            onClick={handleRegisterCTA}
            className="shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-white shadow-md hover:shadow-lg transition-all transform active:scale-95 bg-gradient-to-r from-kar-red via-red-600 to-kar-yellow flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{user ? "My Dashboard" : t("nav.registerNow")}</span>
          </button>
        </div>

        {/* Mobile Hamburger & Lang Button */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border border-amber-200 bg-amber-50 text-amber-900"
          >
            <Globe className="w-3 h-3 text-kar-red" />
            <span>{lang === "kn" ? "ENG" : "ಕನ್ನಡ"}</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-stone-700 hover:bg-stone-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-kar-red" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/98 backdrop-blur-lg border-b border-amber-100 shadow-xl px-4 pt-3 pb-6 space-y-2 animate-fade-in">
          {user && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-3 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-sm text-stone-900 block">{user.name}</span>
                <span className="text-xs text-kar-red font-bold uppercase">{role}</span>
              </div>
              <button
                onClick={logout}
                className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-xs font-bold text-kar-red"
              >
                Logout
              </button>
            </div>
          )}

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                currentView === item.id
                  ? "bg-red-50 text-kar-red border-l-4 border-kar-red"
                  : "text-stone-800 hover:bg-stone-50"
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}

          <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
            {user && (
              <button
                onClick={handleDashboardNav}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100"
              >
                <LayoutDashboard className="w-4 h-4 text-kar-red" />
                <span>My Dashboard</span>
              </button>
            )}

            {user && (role === "ADMIN" || role === "SUPERADMIN") && (
              <button
                onClick={() => handleNavClick("checkin")}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100"
              >
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>{t("nav.checkIn")}</span>
              </button>
            )}

            <button
              onClick={handleRegisterCTA}
              className="w-full mt-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-kar-red to-kar-yellow shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{user ? "My Dashboard" : t("nav.registerNow")}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
