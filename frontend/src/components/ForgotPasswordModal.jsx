import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { ACHARYA_EMAIL_ERROR, isAcharyaEmail } from "../utils/emailValidation";
import { 
  Mail, 
  Smartphone,
  AlertCircle, 
  CheckCircle2, 
  X, 
  KeyRound, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  ArrowLeft,
  Sparkles
} from "lucide-react";

export const ForgotPasswordModal = ({ isOpen, onClose, onOpenResetView }) => {
  // Step 1: IDENTIFY | Step 2: OTP | Step 3: NEW_PASSWORD | Step 4: SUCCESS
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Timer for OTP resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setMessage("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setMaskedEmail("");
      setMaskedPhone("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // STEP 1: Request 6-digit OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your Registered Mobile Number, AUID, or College Email.");
      return;
    }
    if (cleanId.includes("@") && !isAcharyaEmail(cleanId)) {
      setError(ACHARYA_EMAIL_ERROR);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setDevOtp(null);

    try {
      const res = await api.forgotPassword(cleanId);
      setMaskedEmail(res.masked_email || (cleanId.includes("@") ? cleanId : "your college email"));
      setMaskedPhone(res.masked_phone || "");
      setMessage(res.message || "A 6-digit OTP has been dispatched to your registered mobile number.");
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setCooldown(30);
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the complete 6-digit OTP sent to your registered mobile.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.verifyResetOtp(identifier.trim(), cleanOtp);
      setMessage(res.message || "OTP verified! Please set your new password.");
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Set New Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.resetPasswordWithOtp(
        identifier.trim(),
        otp.trim(),
        newPassword,
        confirmPassword
      );
      setMessage(res.message || "Your password has been successfully reset!");
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-[backdropFade_0.2s_ease-out_forwards] transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-[94%] sm:w-full border border-amber-200 overflow-hidden transform-gpu will-change-transform animate-[modalEnter_0.28s_cubic-bezier(0.16,1,0.3,1)_forwards] my-auto max-h-[88dvh] sm:max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-kar-red to-red-600 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            {step === 1 && <KeyRound className="w-5 h-5 text-amber-300" />}
            {step === 2 && <ShieldCheck className="w-5 h-5 text-amber-300" />}
            {step === 3 && <Lock className="w-5 h-5 text-amber-300" />}
            {step === 4 && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
            
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                {step === 1 && "Forgot Password / ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದೀರಾ?"}
                {step === 2 && "Enter OTP / ಒಟಿಪಿ ನಮೂದಿಸಿ"}
                {step === 3 && "Set New Password / ಹೊಸ ಪಾಸ್‌ವರ್ಡ್"}
                {step === 4 && "Password Reset Complete"}
              </h3>
              <p className="text-[11px] text-amber-100/90 font-medium">
                {step === 1 && "Step 1 of 3: Identify Account"}
                {step === 2 && "Step 2 of 3: Verification Code"}
                {step === 3 && "Step 3 of 3: Choose New Password"}
                {step === 4 && "Verified & Updated Successfully"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-white/20 transition-all duration-150 active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: Enter Mobile, AUID, or College Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-sm text-stone-600 leading-relaxed">
                Enter your <strong>Registered Mobile Number</strong>, <strong>AUID</strong>, or <strong>College Email</strong>. We will dispatch a secure 6-digit OTP directly to your registered mobile phone via SMS.
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
                  Mobile Number / AUID / College Email
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 9876543210 or AIT23BEAI129"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm font-medium"
                    style={{ color: "#1c1917", backgroundColor: "#ffffff" }}
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-center gap-2">
                <span>📱 6-digit OTP will be dispatched directly to your registered mobile number via SMS.</span>
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
                  {loading ? "Sending OTP..." : "Send OTP / ಒಟಿಪಿ ಕಳುಹಿಸಿ"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter & Verify 6-digit OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 text-xs leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-kar-red">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>OTP Dispatched • ಒಟಿಪಿ ಕಳುಹಿಸಲಾಗಿದೆ</span>
                </p>
                <p className="text-stone-700">
                  {maskedPhone ? (
                    <>We sent a 6-digit verification code to your registered mobile <strong>{maskedPhone}</strong>{maskedEmail ? <> (and backup email <strong>{maskedEmail}</strong>)</> : null}. Please enter the OTP below within 10 minutes.</>
                  ) : (
                    <>We have sent a 6-digit verification code to <strong>{maskedEmail}</strong>. Please enter the OTP below within 10 minutes.</>
                  )}
                </p>
              </div>

              {devOtp && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs">
                  <p className="font-bold flex items-center gap-1 text-emerald-800">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Development Testing OTP: <span className="font-mono text-sm underline">{devOtp}</span></span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="mt-1.5 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold"
                  >
                    Click to Auto-Fill OTP ({devOtp})
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-kar-red" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit OTP / ೬-ಅಂಕಿಯ ಒಟಿಪಿ ನಮೂದಿಸಿ
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="w-4/5 py-3 text-center font-mono text-2xl sm:text-3xl font-black tracking-[0.35em] sm:tracking-[0.5em] rounded-xl border-2 border-stone-300 focus:border-kar-red focus:outline-hidden focus:ring-4 focus:ring-red-100 bg-stone-50 text-stone-900"
                    style={{ color: "#1c1917" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  className="font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Number / Email</span>
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleRequestOtp()}
                  className="font-bold text-kar-red hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>{cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP / ಮರುಕಳುಹಿಸಿ"}</span>
                </button>
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
                  disabled={loading || otp.trim().length !== 6}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                  {loading ? "Verifying OTP..." : "Verify OTP / ದೃಢೀಕರಿಸಿ"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>OTP Verified! Enter your new password below.</span>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-kar-red" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  New Password / ಹೊಸ ಪಾಸ್‌ವರ್ಡ್
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm font-medium"
                    style={{ color: "#1c1917", backgroundColor: "#ffffff" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password / ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-kar-red text-sm font-medium"
                    style={{ color: "#1c1917", backgroundColor: "#ffffff" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                  <span>⚠️ Passwords do not match.</span>
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 font-bold text-sm text-stone-700 hover:bg-stone-50 active:scale-95 transition-all duration-150"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword || newPassword !== confirmPassword}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-kar-red to-red-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all duration-150 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Reset Password / ಉಳಿಸಿ"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success confirmation */}
          {step === 4 && (
            <div className="space-y-5 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="font-extrabold text-lg text-emerald-950">
                  Password Reset Successful!
                </h4>
                <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                  ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಗಿದೆ. Your password has been updated. You can now log in to the portal with your new credentials.
                </p>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700">
                <span>Account ID: <strong>{identifier.toUpperCase()}</strong></span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 bg-gradient-to-r from-kar-red to-red-600 hover:brightness-105 text-white rounded-xl font-extrabold text-sm shadow-md active:scale-95 transition-all duration-150 flex items-center justify-center gap-2"
              >
                <span>Proceed to Login / ಲಾಗಿನ್ ಮಾಡಿ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
