import React, { useState } from "react";
import {
  Settings,
  ShieldAlert,
  Shield,
  Code2,
  Users,
  Mail,
  Phone,
  Copy,
  Check,
  ExternalLink,
  X,
  ArrowRight,
  MessageCircle,
  Building2,
  Sparkles,
  KeyRound
} from "lucide-react";

export const PortalSettingsModal = ({
  isOpen,
  onClose,
  onOpenSuperAdmin
}) => {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in text-left">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden transform transition-all animate-scale-up max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-900 via-neutral-900 to-amber-950 text-white p-5 relative overflow-hidden shrink-0 border-b border-amber-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
                <Settings className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    Portal Settings & Directory
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    ಸೆಟ್ಟಿಂಗ್ಸ್
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-0.5">
                  Superadmin Access & Executive Contacts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-stone-800">

          {/* ==================================================== */}
          {/* SECTION 1: SUPERADMIN LOGIN ACCESS (Moved from tabs)  */}
          {/* ==================================================== */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 via-neutral-900 to-stone-950 text-white border border-amber-500/30 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">
                    Restricted Access
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-red-600/80 text-white border border-red-500/50">
                  SUPERADMIN ONLY
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mb-1">
                Executive Superadmin Portal
              </h4>
              <p className="text-xs text-stone-300 leading-relaxed mb-4">
                Highest authority gateway for festival administrators. Authorized executive accounts can approve admins, manage activities, and view master telemetry.
              </p>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSuperAdmin();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Launch Super Admin Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ==================================================== */}
          {/* SECTION 2: OFFICIAL CONTACTS (DEVELOPER & SECRETARY) */}
          {/* ==================================================== */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
              <Sparkles className="w-4 h-4 text-kar-red" />
              <h4 className="text-xs font-black tracking-wider uppercase text-stone-800">
                Official Contact Directory • ಸಂಪರ್ಕ ವಿವರಗಳು
              </h4>
            </div>

            {/* 1. Lead Developer Contact Card */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 hover:border-amber-300 transition-all space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
                      Lead Developer & Architect
                    </span>
                    <h5 className="text-sm font-extrabold text-stone-900 mt-0.5">
                      Ayush H Mane
                    </h5>
                    <p className="text-[11px] text-stone-500 font-medium">
                      Full-Stack Architecture • Portal Engineering
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {/* Developer Email */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/70">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-kar-red shrink-0" />
                    <span className="text-[11px] font-mono text-stone-700 truncate" title="ayush@acharya.ac.in">
                      ayush@acharya.ac.in
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy("dev-email", "ayush@acharya.ac.in")}
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                      title="Copy Email"
                    >
                      {copiedKey === "dev-email" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href="mailto:ayush@acharya.ac.in?subject=AKV%20Portal%20Inquiry%20-%20Technical"
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-kar-red transition-colors"
                      title="Compose Email"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Developer Phone / WhatsApp */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/70">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-mono text-stone-700">
                      +91 98450 12345
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy("dev-phone", "+919845012345")}
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                      title="Copy Phone"
                    >
                      {copiedKey === "dev-phone" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href="tel:+919845012345"
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-emerald-600 transition-colors"
                      title="Call Developer"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                    <a
                      href="https://wa.me/919845012345?text=Hello%20Ayush,%20regarding%20AKV%20Nuditaranga%202026%20Portal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-emerald-600 transition-colors"
                      title="WhatsApp Chat"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. General Secretary Contact Card */}
            <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200/80 hover:border-red-300 transition-all space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-kar-red text-white flex items-center justify-center font-bold shadow-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 bg-red-100 text-red-900 rounded-md">
                      General Secretary & Secretariat
                    </span>
                    <h5 className="text-sm font-extrabold text-stone-900 mt-0.5">
                      Acharya Kannada Vedike Secretariat
                    </h5>
                    <p className="text-[11px] text-stone-500 font-medium">
                      Event Coordination • Registrations & Verification
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {/* Secretary Email */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/70">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-kar-red shrink-0" />
                    <span className="text-[11px] font-mono text-stone-700 truncate" title="akv@acharya.ac.in">
                      akv@acharya.ac.in
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy("sec-email", "akv@acharya.ac.in")}
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                      title="Copy Email"
                    >
                      {copiedKey === "sec-email" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href="mailto:akv@acharya.ac.in?subject=AKV%20Nuditaranga%202026%20-%20Secretariat%20Inquiry"
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-kar-red transition-colors"
                      title="Compose Email"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Secretary Phone */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/70">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-mono text-stone-700">
                      +91 98765 43210
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy("sec-phone", "+919876543210")}
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                      title="Copy Phone"
                    >
                      {copiedKey === "sec-phone" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href="tel:+919876543210"
                      className="p-1 rounded-md hover:bg-stone-100 text-stone-500 hover:text-emerald-600 transition-colors"
                      title="Call Secretariat"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Secretariat Venue note */}
              <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-1">
                <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                <span>Room 104, Central Secretariat, Acharya Campus, Bengaluru - 560107</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>Acharya Kannada Vedike • Nuditaranga 2026</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
