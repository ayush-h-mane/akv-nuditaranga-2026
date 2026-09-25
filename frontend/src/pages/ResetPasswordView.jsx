import React, { useState } from "react";
import { api } from "../services/api";
import { KeyRound, Lock, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

export const ResetPasswordView = ({ token, onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center bg-stone-50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-amber-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-kar-red to-red-600 p-6 text-center text-white">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Create New Password</h2>
          <p className="text-xs text-amber-100 mt-1 font-medium">
            AKV Nuditaranga 2026 • ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಹೊಂದಿಸಿ
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-stone-900">Password Reset Successful!</h3>
              <p className="text-sm text-stone-600">
                Your account password has been updated. You can now log in using your AUID and new password.
              </p>
              <button
                onClick={onBackToLogin}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all"
              >
                Proceed to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm font-medium"
                    style={{ color: "#1c1917", backgroundColor: "#ffffff" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm font-medium"
                    style={{ color: "#1c1917", backgroundColor: "#ffffff" }}
                  />
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-500 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Single-use security token verification (10-minute link from akv@acharya.ac.in). Old password is permanently invalidated.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Resetting Password..." : "Update Password"}
              </button>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-2.5 text-xs text-stone-600 font-bold hover:text-kar-red flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel and Back to Login</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
