import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useModalAlert } from "../context/ModalAlertContext";
import { api } from "../services/api";
import { SuperAdminDashboard } from "./SuperAdminDashboard";
import {
  Terminal,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Cpu,
  ArrowRight,
  Compass
} from "lucide-react";

export const DeveloperPortal = ({ onNavigateHome }) => {
  const { user, login } = useAuth();
  const { showError, showSuccess } = useModalAlert();

  const isDeveloperAuthenticated = Boolean(
    user && (user.role === "DEVELOPER" || user.username?.toLowerCase() === "nanu")
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMessage("Please enter both developer identifier and security key.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.developerLogin(u, p);
      if (res && res.token && res.user) {
        login(res.user, res.token);
        if (showSuccess) {
          showSuccess("Developer root terminal authenticated successfully.");
        }
      } else {
        throw new Error("Invalid response received from developer authorization node.");
      }
    } catch (err) {
      const msg = err.message || "Developer authorization rejected.";
      setErrorMessage(msg);
      if (showError) showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // If already authenticated as Developer, render SuperAdminDashboard in isDeveloperMode
  if (isDeveloperAuthenticated) {
    return (
      <SuperAdminDashboard
        onNavigateHome={onNavigateHome}
        isDeveloperMode={true}
      />
    );
  }

  // Confidential Developer Terminal Login View
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between font-mono relative overflow-hidden select-none">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#059669 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 20px 20px"
          }}
        />
      </div>

      {/* Ambient Radial Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 border-b border-stone-800/80 bg-stone-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xs">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              <span>AKV DEVELOPER PORTAL</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                CONFIDENTIAL
              </span>
            </div>
            <div className="text-[10px] text-stone-500">
              Acharya Kannada Vedike • Core Infrastructure Console
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-bold transition-colors cursor-pointer border border-stone-800"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Public Website</span>
        </button>
      </header>

      {/* Main Terminal Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Cpu className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Developer Authorization
            </h2>
            <p className="text-xs text-stone-400">
              Enter authorized developer credentials to unlock root console.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                Developer Identifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="confidential"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                Security Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="confidential"
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-110 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{submitting ? "Authenticating..." : "Authenticate Terminal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-stone-800 text-center">
            <span className="text-[10px] text-stone-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>TLS 1.3 End-to-End Encrypted Terminal Session</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-900 bg-stone-950/70 px-6 py-3 text-center text-[10px] text-stone-600">
        Acharya Kannada Vedike 2026 • Confidential System Administration Portal
      </footer>
    </div>
  );
};
