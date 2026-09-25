import React, { useState } from "react";
import { api } from "../services/api";
import { ACHARYA_EMAIL_ERROR, isAcharyaEmail } from "../utils/emailValidation";
import { Mail, AlertCircle, CheckCircle2, X, KeyRound } from "lucide-react";

export const ForgotPasswordModal = ({ isOpen, onClose, onOpenResetView }) => {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your AUID or Registered College Email.");
      return;
    }
    if (identifier.includes("@") && !isAcharyaEmail(identifier)) {
      setError(ACHARYA_EMAIL_ERROR);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.forgotPassword(identifier.trim());
      setMessage(res.message || "Password reset instructions have been sent to your college email.");
    } catch (err) {
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[backdropFade_0.2s_ease-out_forwards] transition-opacity"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-amber-200 overflow-hidden transform-gpu will-change-transform animate-[modalEnter_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-kar-red to-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-amber-300" />
            <h3 className="font-extrabold text-base tracking-tight">Forgot Password / ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದೀರಾ?</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-white/20 transition-all duration-150 active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {message ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Instructions Sent</p>
                  <p className="mt-1">{message}</p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                <p className="font-semibold text-amber-950">Security Notice:</p>
                <p className="mt-1 text-stone-600">
                  The link will expire in <strong>10 minutes</strong>. If you do not see the email from <strong>akv@acharya.ac.in</strong> in your inbox within 2 minutes, please check your spam or junk folder.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-sm transition-colors"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-stone-600">
                Enter the <strong>AUID</strong> or <strong>registered college email</strong> used during registration. We will send a secure 10-minute reset link from <strong>akv@acharya.ac.in</strong>.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  AUID or Registered College Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. AIT22CS001 or student@acharya.ac.in"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm font-medium"
                    style={{ color: "#1c1917", backgroundColor: "#ffffff" }}
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
                <span>🛡️ Single-use security token valid for <strong>10 minutes</strong> dispatched from <strong>akv@acharya.ac.in</strong>.</span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 font-bold text-sm text-stone-700 hover:bg-stone-50 active:scale-95 transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
