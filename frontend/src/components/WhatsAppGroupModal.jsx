import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext";
import { useHistoryModal } from "../utils/useHistoryModal";
import { X, ExternalLink, Copy, Check, MessageCircle, Sparkles, ShieldCheck } from "lucide-react";

export const WhatsAppGroupModal = ({ group, onClose, eventTitle }) => {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  useHistoryModal(Boolean(group), onClose);

  if (!group || !group.url) return null;

  const title = eventTitle || (lang === "kn" ? (group.nameKn || group.name) : (group.name || group.nameKn));

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(group.url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = group.url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn("Copy failed:", e);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-[92%] sm:w-full max-w-md bg-stone-950 rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/50 my-auto flex flex-col animate-scale-up text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Karnataka Top Ribbon */}
        <div className="h-1.5 w-full karnataka-ribbon shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer z-10 border border-stone-800"
          aria-label={lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* WhatsApp Icon Glowing Badge */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="relative w-18 h-18 rounded-3xl bg-gradient-to-tr from-emerald-600 to-green-400 p-0.5 shadow-xl shadow-emerald-600/30">
              <div className="w-full h-full bg-stone-950 rounded-[22px] flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-emerald-400 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.125.556 4.122 1.53 5.857l-1.624 5.927 6.074-1.593c1.674.914 3.59 1.439 5.626 1.439 6.627 0 12-5.373 12-12s-5.373-12-12-12zm0 21.6c-1.871 0-3.619-.526-5.111-1.439l-.366-.223-3.601.944.961-3.509-.245-.39c-1.002-1.596-1.538-3.454-1.538-5.383 0-5.293 4.307-9.6 9.6-9.6s9.6 4.307 9.6 9.6-4.307 9.6-9.6 9.6z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Registration Confirmed Banner */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === "kn" ? "ನೋಂದಣಿ ಯಶಸ್ವಿಯಾಗಿದೆ!" : "Registration Confirmed!"}</span>
            </div>
            
            <h3 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
              {lang === "kn" ? "ಅಧಿಕೃತ ವಾಟ್ಸಾಪ್ ಗ್ರೂಪ್‌ಗೆ ಸೇರಿ" : "Join Official WhatsApp Group"}
            </h3>

            {/* Event Name Tag */}
            <div className="mt-2.5 inline-block px-4 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 font-extrabold text-xs sm:text-sm shadow-inner">
              🎯 {title}
            </div>
          </div>

          <p className="text-stone-300 text-xs sm:text-sm font-kannada leading-relaxed max-w-sm mx-auto">
            {lang === "kn" 
              ? "ಸ್ಪರ್ಧೆಯ ಸಂಯೋಜಕರೊಂದಿಗೆ ಸಂಪರ್ಕದಲ್ಲಿರಲು, ಸಮಯ, ಸ್ಥಳ, ನಿಯಮಗಳು ಮತ್ತು ಮಹತ್ವದ ಮಾಹಿತಿಯ ತ್ವರಿತ ಅಪ್‌ಡೇಟ್‌ಗಾಗಿ ವಾಟ್ಸಾಪ್ ಗ್ರೂಪ್‌ಗೆ ಸೇರಿಕೊಳ್ಳಿ."
              : "Connect with event coordinators to receive live slot numbers, venue rules, reporting schedules, and fest updates."}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <a
              href={group.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/30 hover:shadow-2xl hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              <span>{lang === "kn" ? "ವಾಟ್ಸಾಪ್ ಗ್ರೂಪ್‌ಗೆ ಸೇರಿ" : "Join WhatsApp Group"}</span>
              <ExternalLink className="w-4 h-4 ml-0.5" />
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-bold transition-all border border-stone-800 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copied ? (lang === "kn" ? "ಲಿಂಕ್ ಕಾಪಿ ಆಗಿದೆ!" : "Link Copied!") : (lang === "kn" ? "ಲಿಂಕ್ ಕಾಪಿ ಮಾಡಿ" : "Copy Group Link")}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs font-bold transition-all border border-stone-800 cursor-pointer"
              >
                {lang === "kn" ? "ನಂತರ" : "Dismiss"}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-900 flex items-center justify-center gap-1.5 text-[10px] text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-kar-yellow" />
            <span>{lang === "kn" ? "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ ಅಧಿಕೃತ ಗ್ರೂಪ್" : "Official Acharya Kannada Vedike Group"}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
};
