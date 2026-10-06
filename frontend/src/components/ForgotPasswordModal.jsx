import React, { useState } from "react";
import { api } from "../services/api";
import { ACHARYA_EMAIL_ERROR, isAcharyaEmail } from "../utils/emailValidation";
import { Mail, AlertCircle, CheckCircle2, X, KeyRound, ArrowRight } from "lucide-react";

export const ForgotPasswordModal = ({ isOpen, onClose, onOpenResetView }) => {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState(null);

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
    setDevToken(null);

    try {
      const res = await api.forgotPassword(identifier.trim());
      setMessage(res.message || "Password reset instructions have been sent to your college email.");
      if (res.dev_reset_token) {
        setDevToken(res.dev_reset_token);
      }
    } catch (err) {
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-[backdropFade_0.2s_ease-out_forwards] transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-[92%] sm:w-full border border-amber-200 overflow-hidden transform-gpu will-change-transform animate-[modalEnter_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards] my-auto max-h-[85dvh] sm:max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-kar-red to-red-600 px-6 py-4 text-white flex items-center justify-between shrink-0">
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
        <div className="p-6 overflow-y-auto flex-1">
          {message ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Instructions Sent</p>
                  <p className="mt-1">{message}</p>
                </div>
              </div>

              {devToken && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs">
                  <p className="font-bold text-amber-950 flex items-center gap-1.5">
                    <span>⚡ Development Reset Token Active</span>
                  </p>
                  <p className="mt-1 text-stone-600">
                    Live email dispatched from <strong>akv@acharya.ac.in</strong>. In local development, you can test directly by clicking below:
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenResetView) {
                        onOpenResetView(devToken);
                      } else {
                        window.location.hash = `#reset-token=${devToken}`;
                      }
                    }}
                    className="mt-2.5 w-full py-2 px-3 bg-gradient-to-r from-kar-red to-amber-600 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
                  >
                    <span>Open Password Reset Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

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
                <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-red-700 text-xs leading-relaxed space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-kar-red" />
                    <span className="font-medium text-red-800 break-words">{error}</span>
                  </div>
                  <div className="pt-2 border-t border-red-200/60 flex items-center justify-between text-[11px] text-red-700">
                    <span>ಸಹಾಯ ಬೇಕೇ? / Need coordinator help?</span>
                    <a
                      href="mailto:akv@acharya.ac.in?subject=AKV%20Password%20Reset%20Assistance"
                      className="font-bold underline text-kar-red hover:text-red-950"
                    >
                      akv@acharya.ac.in
                    </a>
                  </div>
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
