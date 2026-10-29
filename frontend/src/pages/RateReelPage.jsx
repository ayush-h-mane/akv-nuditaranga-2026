import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useModalAlert } from "../context/ModalAlertContext";
import { api } from "../services/api";
import { QRCodeSVG } from "qrcode.react";
import { 
  Star, Share2, ExternalLink, Award, CheckCircle, 
  AlertCircle, Sparkles, Clock, Eye, Heart, MessageSquare, 
  Copy, Check, User, ArrowLeft, RefreshCw, QrCode, Search, ShieldCheck
} from "lucide-react";
import { Instagram } from "../components/InstagramIcon";

// Official Contest Evaluation Deadline: November 4, 2026, 17:30 PM (5:30 PM IST)
const EVALUATION_DEADLINE_MS = new Date("2026-11-04T17:30:00+05:30").getTime();

export function RateReelPage({ initialRegId = "", onBackToHome = null }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { showSuccess, showError } = useModalAlert();

  // Extract ID from URL query string or props
  const [regId, setRegId] = useState(() => {
    if (initialRegId) return initialRegId;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("id") || params.get("reg_id") || params.get("registration_id") || "";
    }
    return "";
  });

  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Per-reel rating form states: { [reel_index]: { rating: 5, creativity: 5, heritage: 5, overall: 5, feedback: "", submitting: false } }
  const [ratingForms, setRatingForms] = useState({});

  // Guest rater fields if user is not logged in
  const [guestAuid, setGuestAuid] = useState("");
  const [guestName, setGuestName] = useState("");

  // Countdown timer to Nov 4th 2026 17:30 IST
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const updateCountdown = () => {
      const diff = EVALUATION_DEADLINE_MS - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, expired: false });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch participant reel submission
  const loadSubmission = useCallback(async (targetId) => {
    if (!targetId || !targetId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const viewerAuid = user?.auid || "";
      const result = await api.getReelContestSubmission(targetId.trim(), viewerAuid);
      setData(result);
      
      // Initialize rating form state for each reel
      const forms = {};
      (result.reels || []).forEach((r) => {
        forms[r.reel_index] = {
          rating: 5,
          creativity: 5,
          heritage: 5,
          overall: 5,
          feedback: "",
          submitting: false,
          showCriteria: false
        };
      });
      setRatingForms(forms);
    } catch (err) {
      setError(err.message || "Failed to load participant reel submission.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (regId) {
      loadSubmission(regId);
    }
  }, [regId, loadSubmission]);

  // Handle Search Input submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setRegId(searchInput.trim());
      if (typeof window !== "undefined") {
        const url = new URL(window.location);
        url.searchParams.set("id", searchInput.trim());
        window.history.replaceState({}, "", url);
      }
    }
  };

  // Submit rating for a specific reel
  const handleRatingSubmit = async (reelIndex) => {
    const form = ratingForms[reelIndex];
    if (!form) return;

    const raterAuid = user?.auid || guestAuid.trim();
    const raterName = user?.name || guestName.trim() || "Student Reviewer";

    if (!raterAuid) {
      showError("Please enter your Student AUID / USN to submit your verified rating.", "AUID Required");
      return;
    }

    setRatingForms((prev) => ({
      ...prev,
      [reelIndex]: { ...prev[reelIndex], submitting: true }
    }));

    try {
      const payload = {
        registration_id: data.registration_id,
        reel_index: reelIndex,
        rating: Number(form.rating) || 5,
        criteria_creativity: Number(form.creativity) || 5,
        criteria_heritage: Number(form.heritage) || 5,
        criteria_overall: Number(form.overall) || 5,
        feedback: form.feedback.trim(),
        rater_auid: raterAuid,
        rater_name: raterName
      };

      const res = await api.submitReelRating(payload);
      showSuccess(res.message || "Thank you! Your rating has been recorded.", "Rating Submitted ⭐");

      // Reload fresh data to update average score and lock the reel state
      await loadSubmission(data.registration_id);
    } catch (err) {
      showError(err.message || "Failed to submit rating.", "Rating Submission Error");
    } finally {
      setRatingForms((prev) => ({
        ...prev,
        [reelIndex]: { ...prev[reelIndex], submitting: false }
      }));
    }
  };

  // Copy rating link to clipboard
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/rate-reel?id=${encodeURIComponent(data?.registration_id || regId)}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      showSuccess("Rating link copied to clipboard! Share it with friends and classmates.", "Link Copied");
    }
  };

  const currentUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/rate-reel?id=${encodeURIComponent(data?.registration_id || regId)}`
    : "";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-20 relative overflow-hidden font-sans selection:bg-kar-red selection:text-white">
      {/* Background Decorative Kannada Glow Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 w-[700px] h-[700px] bg-kar-yellow/5 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 space-y-6">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (onBackToHome) onBackToHome();
              else if (typeof window !== "undefined") window.location.href = "/";
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-stone-300 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 text-kar-yellow" />
            <span>{lang === "kn" ? "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ" : "Back to Home"}</span>
          </button>

          {data && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                title="Show Participant QR Code"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Show QR</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition-all cursor-pointer"
                title="Copy Rating Page Link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiedLink ? "Copied" : "Share"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Evaluation Deadline Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-red-950/80 via-stone-900/90 to-amber-950/80 border border-red-500/30 p-5 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-32 bg-kar-yellow/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kar-red/20 border border-kar-red/40 text-[11px] font-black tracking-widest text-amber-300 uppercase">
                <Clock className="w-3.5 h-3.5 text-kar-yellow animate-spin" style={{ animationDuration: "12s" }} />
                <span>OFFICIAL EVALUATION DEADLINE • ಅಧಿಕೃತ ಮೌಲ್ಯಮಾಪನ</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                November 4th, 2026 at 5:30 PM IST (17:30)
              </h2>
              <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
                Final evaluation of participant reels will be conducted based on uploaded reel links, verified reach & insights, and community ratings.
              </p>
            </div>

            {/* Live Countdown Pills */}
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-2.5 px-3 self-start md:self-auto">
              {timeLeft.expired ? (
                <div className="px-3 py-1 text-xs font-black text-red-400 uppercase tracking-wider">
                  Evaluation Closed
                </div>
              ) : (
                <>
                  <div className="text-center min-w-[42px]">
                    <div className="text-base sm:text-lg font-black text-kar-yellow">{timeLeft.days}</div>
                    <div className="text-[9px] uppercase tracking-wider text-stone-400">Days</div>
                  </div>
                  <span className="text-stone-600 font-bold">:</span>
                  <div className="text-center min-w-[42px]">
                    <div className="text-base sm:text-lg font-black text-white">{timeLeft.hours}</div>
                    <div className="text-[9px] uppercase tracking-wider text-stone-400">Hrs</div>
                  </div>
                  <span className="text-stone-600 font-bold">:</span>
                  <div className="text-center min-w-[42px]">
                    <div className="text-base sm:text-lg font-black text-white">{timeLeft.minutes}</div>
                    <div className="text-[9px] uppercase tracking-wider text-stone-400">Min</div>
                  </div>
                  <span className="text-stone-600 font-bold">:</span>
                  <div className="text-center min-w-[42px]">
                    <div className="text-base sm:text-lg font-black text-red-400">{timeLeft.seconds}</div>
                    <div className="text-[9px] uppercase tracking-wider text-stone-400">Sec</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar if no ID or changing ID */}
        {(!regId || !data) && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-kar-red to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-kar-red/20">
              <Instagram className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Kannada Reel Contest Rating Portal
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
              Scan the participant's QR code or enter their Registration ID / AUID below to view their reels and submit your rating.
            </p>

            <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex gap-2 pt-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. AKV-NT-REEL-001 or AUID"
                className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-kar-yellow"
              />
              <button
                type="submit"
                disabled={loading || !searchInput.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-kar-red to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-xs shadow-lg shadow-kar-red/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Find Reels</span>
              </button>
            </form>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center justify-center gap-2 max-w-md mx-auto">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-kar-red/30 border-t-kar-yellow rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Loading Participant Reels & Ratings...</p>
          </div>
        )}

        {/* Participant Profile Card */}
        {data && !loading && (
          <div className="bg-stone-900/90 border border-white/10 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-lg">
                  <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-amber-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-kar-red/20 text-red-400 border border-kar-red/30">
                      Reel Contest Participant
                    </span>
                    <span className="text-xs font-mono text-stone-400">
                      ID: {data.registration_id}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    {data.participant_name}
                  </h1>
                  <p className="text-xs text-stone-400">
                    {data.institute} • {data.department || "Student"} {data.semester ? `(Sem ${data.semester})` : ""}
                  </p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <div className="px-3.5 py-2 rounded-2xl bg-black/40 border border-white/10 text-center">
                  <div className="text-xs text-stone-400 uppercase tracking-wider font-semibold">Total Reels</div>
                  <div className="text-lg font-black text-white">{data.total_reels_count} / 4</div>
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <div className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Overall Rating</div>
                  <div className="text-lg font-black text-kar-yellow flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-kar-yellow text-kar-yellow" />
                    <span>{data.overall_average_rating || "0.0"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social & Reach Insights Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {data.instagram_username && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-stone-300">
                    <Instagram className="w-4 h-4 text-rose-400" />
                    <span>Instagram Profile:</span>
                  </div>
                  <a
                    href={data.instagram_profile_link || `https://www.instagram.com/${data.instagram_username.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-300 hover:underline flex items-center gap-1"
                  >
                    @{data.instagram_username.replace(/^@/, "")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {data.reel_reach_insights && (
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 col-span-1 sm:col-span-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    <Eye className="w-3.5 h-3.5 text-kar-yellow" />
                    <span>Submitted Reach & Audience Insights</span>
                  </div>
                  <p className="text-xs text-stone-200 whitespace-pre-wrap leading-relaxed">
                    {data.reel_reach_insights}
                  </p>
                </div>
              )}
            </div>

            {/* Rater Profile Identity Banner */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                {user ? (
                  <span>
                    Rating as student profile: <strong className="text-white">{user.name}</strong> ({user.auid || user.email})
                  </span>
                ) : (
                  <span>
                    1 rating per student profile accepted. Enter your AUID/USN below when submitting your vote.
                  </span>
                )}
              </div>
              {!user && (
                <a
                  href="/student"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] transition-all text-center self-start sm:self-auto cursor-pointer"
                >
                  Login to Auto-Verify
                </a>
              )}
            </div>
          </div>
        )}

        {/* Reels List to Rate */}
        {data && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Submitted Contest Reels</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-stone-300">
                  {data.reels?.length || 0}
                </span>
              </h2>
              <span className="text-[11px] text-stone-400 font-medium">
                Rate each reel once with your student profile
              </span>
            </div>

            {(!data.reels || data.reels.length === 0) ? (
              <div className="p-8 rounded-3xl bg-stone-900 border border-white/10 text-center space-y-3">
                <Instagram className="w-8 h-8 text-stone-500 mx-auto" />
                <p className="text-sm text-stone-400">
                  This participant has not yet uploaded their Instagram reel links. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {data.reels.map((reel) => {
                  const form = ratingForms[reel.reel_index] || {
                    rating: 5,
                    creativity: 5,
                    heritage: 5,
                    overall: 5,
                    feedback: "",
                    submitting: false,
                    showCriteria: false
                  };

                  return (
                    <div
                      key={reel.reel_index}
                      className="rounded-3xl bg-stone-900/90 border border-white/10 p-6 backdrop-blur-xl shadow-xl space-y-5 transition-all hover:border-white/20"
                    >
                      {/* Reel Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-kar-yellow/20 text-kar-yellow border border-kar-yellow/30">
                              Reel #{reel.reel_index}
                            </span>
                            <span className="text-sm font-black text-white">
                              {reel.title || `Contest Entry #${reel.reel_index}`}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 font-mono truncate max-w-md">
                            {reel.url}
                          </p>
                        </div>

                        {/* Watch on Instagram Button */}
                        <a
                          href={reel.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-rose-500 to-amber-500 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-all cursor-pointer self-start sm:self-auto"
                        >
                          <Instagram className="w-4 h-4" />
                          <span>Watch Reel on Instagram</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Community Score Statistics */}
                      <div className="flex items-center justify-between gap-4 p-3 bg-black/40 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-kar-yellow font-black text-sm">
                            ★ {reel.average_rating || "0.0"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">
                              Average Rating: {reel.average_rating ? `${reel.average_rating} / 5.0` : "Not rated yet"}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              Based on {reel.ratings_count || 0} community review{reel.ratings_count === 1 ? "" : "s"}
                            </div>
                          </div>
                        </div>

                        {reel.has_rated && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                            <CheckCircle className="w-4 h-4" />
                            <span>Rated ({reel.my_rating}★)</span>
                          </div>
                        )}
                      </div>

                      {/* Rating Form or Rated Confirmation */}
                      {reel.has_rated ? (
                        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-200">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <strong>Your rating has been successfully verified & recorded!</strong>
                            <p className="text-[11px] text-emerald-300/80 mt-0.5">
                              Each student profile is permitted 1 rating per reel. Thank you for supporting Kannada talent at Nuditaranga 2026.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
                              <span>Rate this Reel (1 to 5 Stars):</span>
                              <span className="text-amber-300 font-extrabold text-sm">
                                {form.rating} / 5 Stars
                              </span>
                            </label>

                            {/* 5 Interactive Stars */}
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    setRatingForms((prev) => ({
                                      ...prev,
                                      [reel.reel_index]: { ...prev[reel.reel_index], rating: star }
                                    }));
                                  }}
                                  className="p-1 text-2xl transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                                >
                                  <Star
                                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                      star <= form.rating
                                        ? "fill-kar-yellow text-kar-yellow drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                        : "text-stone-600 hover:text-stone-400"
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="text-xs text-stone-400 font-medium ml-2">
                                {form.rating === 5 && "⭐ Outstanding!"}
                                {form.rating === 4 && "👍 Very Good"}
                                {form.rating === 3 && "👌 Good"}
                                {form.rating === 2 && "⚡ Fair"}
                                {form.rating === 1 && "🔨 Needs Work"}
                              </span>
                            </div>
                          </div>

                          {/* Toggle Detailed Criteria */}
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setRatingForms((prev) => ({
                                  ...prev,
                                  [reel.reel_index]: {
                                    ...prev[reel.reel_index],
                                    showCriteria: !prev[reel.reel_index].showCriteria
                                  }
                                }));
                              }}
                              className="text-[11px] font-bold text-kar-yellow hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>{form.showCriteria ? "− Hide Evaluation Criteria" : "+ Add Specific Criteria (Creativity, Kannada Heritage, Editing)"}</span>
                            </button>

                            {form.showCriteria && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-black/40 rounded-2xl border border-white/5 mt-2.5 text-xs">
                                <div>
                                  <label className="text-[11px] text-stone-400 block mb-1">
                                    Creativity & Concept ({form.creativity}/5):
                                  </label>
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.5"
                                    value={form.creativity}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setRatingForms((prev) => ({
                                        ...prev,
                                        [reel.reel_index]: { ...prev[reel.reel_index], creativity: val }
                                      }));
                                    }}
                                    className="w-full accent-kar-red"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-stone-400 block mb-1">
                                    Kannada Heritage ({form.heritage}/5):
                                  </label>
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.5"
                                    value={form.heritage}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setRatingForms((prev) => ({
                                        ...prev,
                                        [reel.reel_index]: { ...prev[reel.reel_index], heritage: val }
                                      }));
                                    }}
                                    className="w-full accent-kar-yellow"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-stone-400 block mb-1">
                                    Editing & Audio ({form.overall}/5):
                                  </label>
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="0.5"
                                    value={form.overall}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setRatingForms((prev) => ({
                                        ...prev,
                                        [reel.reel_index]: { ...prev[reel.reel_index], overall: val }
                                      }));
                                    }}
                                    className="w-full accent-rose-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Feedback Input */}
                          <div>
                            <input
                              type="text"
                              value={form.feedback}
                              onChange={(e) => {
                                const txt = e.target.value;
                                setRatingForms((prev) => ({
                                  ...prev,
                                  [reel.reel_index]: { ...prev[reel.reel_index], feedback: txt }
                                }));
                              }}
                              placeholder="Optional: Leave encouraging feedback or appreciation..."
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-kar-yellow"
                            />
                          </div>

                          {/* Guest Reviewer Input if unauthenticated */}
                          {!user && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              <div>
                                <input
                                  type="text"
                                  value={guestAuid}
                                  onChange={(e) => setGuestAuid(e.target.value)}
                                  placeholder="Your Student AUID / USN *"
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-kar-yellow font-mono uppercase"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                  placeholder="Your Name (Optional)"
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-kar-yellow"
                                />
                              </div>
                            </div>
                          )}

                          {/* Submit Rating Button */}
                          <button
                            type="button"
                            disabled={form.submitting}
                            onClick={() => handleRatingSubmit(reel.reel_index)}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-kar-red via-red-600 to-amber-600 hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-kar-red/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            {form.submitting ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Submitting Verified Rating...</span>
                              </>
                            ) : (
                              <>
                                <Star className="w-4 h-4 fill-white" />
                                <span>Submit Rating for Reel #{reel.reel_index} ({form.rating}★)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* QR Code Modal to display on screen for easy scanning by peers */}
      {showQrModal && data && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-kar-red/20 text-red-400 border border-kar-red/30">
                Official Contest QR
              </span>
              <h3 className="text-lg font-black text-white">{data.participant_name}</h3>
              <p className="text-xs text-stone-400">Scan to rate all {data.total_reels_count} submitted reels</p>
            </div>

            {/* QR SVG */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <QRCodeSVG
                value={currentUrl}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Link Copied!" : "Copy Rating Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RateReelPage;
