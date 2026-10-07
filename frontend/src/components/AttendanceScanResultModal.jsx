import React from "react";
import { 
  CheckCircle2, 
  CheckCheck, 
  Clock, 
  Lock, 
  AlertCircle, 
  X, 
  Scan, 
  UserCheck, 
  ShieldCheck, 
  Sparkles,
  Calendar,
  Check
} from "lucide-react";

export const AttendanceScanResultModal = ({ 
  isOpen, 
  onClose, 
  onScanNext, 
  onConfirmCheckOut,
  checkOutLoading = false,
  result, 
  date 
}) => {
  if (!isOpen || !result) return null;

  const isCheckIn = result.action === "CHECK_IN";
  const isLocked = result.action === "LOCKED";
  const isReadyForCheckOut = result.action === "READY_FOR_CHECK_OUT";
  const isCheckOut = result.action === "CHECK_OUT";
  const isAlreadyCompleted = result.action === "ALREADY_COMPLETED";
  const isError = !result.success && result.action !== "LOCKED" && !isReadyForCheckOut;

  const volunteer = result.volunteer || {};

  return (
    <div 
      className="fixed inset-0 z-[130] bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-scale-up">
        {/* MODAL HEADER */}
        {isCheckIn && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
                  Scan 1 Check-In
                </span>
                <h3 className="font-black text-lg text-white leading-tight">
                  Check in successful
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {isLocked && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 block">
                  1-Hour Lock Active
                </span>
                <h3 className="font-black text-lg text-white leading-tight">
                  Check-Out Locked
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {isReadyForCheckOut && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 block">
                  1-Hour Shift Satisfied
                </span>
                <h3 className="font-black text-lg text-white leading-tight">
                  Ready for Check-Out
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {isCheckOut && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <CheckCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
                  Scan 2 Check-Out
                </span>
                <h3 className="font-black text-base sm:text-lg text-white leading-tight">
                  Checkout successful and attendance is submitted for today
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {isAlreadyCompleted && (
          <div className="bg-gradient-to-r from-stone-800 to-stone-900 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                  Already Recorded
                </span>
                <h3 className="font-black text-lg text-white leading-tight">
                  Attendance Finalized
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {isError && (
          <div className="bg-gradient-to-r from-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-200 block">
                  Attendance Not Marked
                </span>
                <h3 className="font-black text-lg text-white leading-tight">
                  Scan Not Completed
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Volunteer Info Card */}
          {volunteer.name && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-black text-base text-stone-900 leading-tight">
                    {volunteer.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-white text-stone-700 border border-stone-200">
                      {volunteer.auid || volunteer.registration_id}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-50 text-kar-red border border-red-200/60">
                      {volunteer.domain || volunteer.akv_dept || "Volunteer"} Domain
                    </span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                  isCheckOut || isAlreadyCompleted
                    ? "bg-blue-100 text-blue-900 border border-blue-200"
                    : isReadyForCheckOut
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                }`}>
                  {result.status || (isCheckOut ? "COMPLETED" : isReadyForCheckOut ? "READY FOR CHECK OUT" : "CHECKED IN")}
                </span>
              </div>

              {volunteer.department && volunteer.department !== "--" && (
                <p className="text-[11px] text-stone-500 font-medium">
                  Academic Dept: <strong className="text-stone-700">{volunteer.department}</strong>
                </p>
              )}
            </div>
          )}

          {/* STATE 1: CHECK IN SUCCESS */}
          {isCheckIn && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Check-In Time:</span>
                </div>
                <strong className="font-mono text-sm text-emerald-950 font-black">
                  {result.check_in_time}
                </strong>
              </div>

              {/* 1-Hour Lockout Informational Card */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300/80 space-y-2 text-amber-950 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pass Locked for 1 Hour</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  This volunteer's QR pass is locked for the next <strong>60 minutes</strong>. 
                  Check-out scanning will automatically unlock at:
                </p>
                <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200 font-mono text-center font-black text-amber-950 text-xs shadow-2xs">
                  🔓 Unlocks at: {result.locked_until || "After 1 Hour"}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: LOCKED NOTICE (SCANNED DURING 1 HOUR) */}
          {isLocked && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2 text-center">
                <Clock className="w-8 h-8 text-amber-600 mx-auto animate-spin" style={{ animationDuration: '6s' }} />
                <h4 className="font-extrabold text-sm text-amber-950">
                  Please wait {result.lock_remaining_minutes} more minute{result.lock_remaining_minutes === 1 ? "" : "s"}
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The volunteer checked in at <strong className="font-mono">{result.check_in_time}</strong>. 
                  Under the 1-hour rule, check-out scan will be available at:
                </p>
                <div className="p-2 rounded-xl bg-white border border-amber-200 font-mono font-black text-sm text-amber-900 shadow-2xs">
                  {result.locked_until}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2.5: READY FOR CHECK OUT (1-HOUR PASSED - MANUAL REVIEW & CONFIRMATION) */}
          {isReadyForCheckOut && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50/60 border-2 border-emerald-300 space-y-2.5">
                <div className="flex items-center gap-2 text-stone-900 font-extrabold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1-Hour Shift Satisfied</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 font-bold block">Check-In Time</span>
                    <strong className="font-mono text-xs text-stone-900">{result.check_in_time}</strong>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-500 font-bold block">Shift Duration</span>
                    <strong className="font-mono text-xs text-emerald-700">{result.duration_hours || "1.0+"} hrs</strong>
                  </div>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed pt-1">
                  Click the button below to review and confirm check-out for this volunteer:
                </p>
              </div>

              {onConfirmCheckOut && (
                <button
                  type="button"
                  onClick={() => onConfirmCheckOut(volunteer.user_id || result.record?.user_id)}
                  disabled={checkOutLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>{checkOutLoading ? "Recording Check-Out..." : "CONFIRM & MARK CHECK-OUT"}</span>
                </button>
              )}
            </div>
          )}

          {/* STATE 3: CHECK OUT SUCCESS (ATTENDANCE SUBMITTED FOR TODAY) */}
          {isCheckOut && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Attendance Submitted for Today!</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Checkout successful and attendance is submitted for today.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-stone-500 font-bold block">Check-In</span>
                    <strong className="font-mono text-xs text-stone-900">{result.check_in_time}</strong>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-stone-500 font-bold block">Check-Out</span>
                    <strong className="font-mono text-xs text-emerald-700">{result.check_out_time}</strong>
                  </div>
                </div>

                {result.duration_hours && (
                  <div className="text-[11px] text-stone-600 font-semibold text-center pt-0.5">
                    Total Session Duration: <strong className="font-mono text-stone-900">{result.duration_hours} hrs</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATE 4: ALREADY COMPLETED */}
          {isAlreadyCompleted && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <p className="text-stone-700 leading-relaxed">
                This volunteer's full attendance is already recorded and finalized for today.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 block font-sans">Check-In</span>
                  <strong>{result.check_in_time || "Recorded"}</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-400 block font-sans">Check-Out</span>
                  <strong className="text-emerald-700">{result.check_out_time || "Recorded"}</strong>
                </div>
              </div>
            </div>
          )}

          {/* STATE 5: ERROR */}
          {isError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2 text-xs">
              <p className="text-red-800 font-semibold">
                {result.detail || result.message || "Failed to mark attendance. Please check that volunteer domain matches."}
              </p>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="space-y-2 pt-2">
            {onScanNext && (
              <button
                type="button"
                onClick={onScanNext}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Scan className="w-4 h-4 text-emerald-200" />
                <span>SCAN NEXT VOLUNTEER</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceScanResultModal;
