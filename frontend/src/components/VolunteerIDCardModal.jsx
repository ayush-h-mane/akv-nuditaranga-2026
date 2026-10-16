import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  Download,
  X,
  User,
  CreditCard,
  Building,
  Code2,
  Users,
  Phone,
  ShieldCheck,
  Check,
  Share2
} from "lucide-react";
import { api } from "../services/api";

export const VolunteerIDCardModal = ({ volunteer, isOpen, onClose, isPreview = false }) => {
  const [activeSide, setActiveSide] = useState("both"); // "front" | "back" | "both"
  const [showLanyard, setShowLanyard] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !volunteer) return null;

  const name = volunteer.name || volunteer.full_name || "Nograj";
  const auid = (volunteer.auid || volunteer.usn || "AIT23BEAI129").toUpperCase();
  const regId = (volunteer.registration_id || volunteer.reg_id || `AKVNT${String(volunteer.id || "0046").padStart(4, "0")}`).toUpperCase();
  const institute = volunteer.institute || "Acharya Institute of Technology";
  const department = volunteer.department || "Artificial Intelligence & Machine Learning";
  const team = volunteer.volunteer_domain || volunteer.team || "Developer";
  const role = "ಸ್ವಯಂಸೇವಕ (Volunteer)";
  const contact = volunteer.phone || volunteer.contact || "9900887766";
  const photoUrl = volunteer.photo_url || 
    (volunteer.name?.toLowerCase().includes("nograj") || isPreview || !volunteer.photo_url ? "/images/nograj.png" : null);

  const qrPayload = JSON.stringify({
    type: "AKV_VOLUNTEER_ID",
    reg_id: regId,
    auid: auid,
    name: name,
    institute: institute,
    dept: department,
    domain: team,
    role: "ಸ್ವಯಂಸೇವಕ",
    contact: contact,
    verified_by: "Acharya Kannada Vedike Nuditaranga 2026"
  });

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const sourceType = volunteer.source_type || "user";
      const sourceId = volunteer.source_id || volunteer.id || volunteer.auid;
      try {
        await api.downloadMyIdCard();
      } catch (e1) {
        if (api.downloadSuperAdminIdCard) {
          await api.downloadSuperAdminIdCard(sourceType, sourceId);
        } else {
          throw e1;
        }
      }
    } catch (err) {
      console.warn("Direct download error, triggering browser print fallback:", err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `AKV Nuditaranga 2026 Volunteer ID Card - ${name}`,
        text: `Official Volunteer ID Card for ${name} (${auid}) - ${team} Domain.`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${name} • ${auid} • AKV Volunteer ID: ${regId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Print Specific CSS Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #akv-printable-volunteer-id-cards,
          #akv-printable-volunteer-id-cards * {
            visibility: visible !important;
          }
          #akv-printable-volunteer-id-cards {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            gap: 25px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Modal Container */}
      <div className="relative w-full max-w-5xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="no-print flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xs font-black text-amber-400">ಅಕವೇ</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                <span>Official Volunteer ID Card</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600/20 text-red-400 border border-red-600/30">
                  NUDITARANGA 2026
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Official Festival Access Badge • ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Toolbar Controls */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-stone-900/90 border-b border-stone-800 text-xs">
          {/* Side Toggle */}
          <div className="flex items-center p-1 bg-stone-950 rounded-xl border border-stone-800">
            <button
              onClick={() => setActiveSide("both")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSide === "both"
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Both Sides
            </button>
            <button
              onClick={() => setActiveSide("front")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSide === "front"
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Front Side (ಮುಂಭಾಗ)
            </button>
            <button
              onClick={() => setActiveSide("back")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSide === "back"
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "text-stone-400 hover:text-white"
              }`}
            >
              Back Side (ಹಿಂಭಾಗ)
            </button>
          </div>

          {/* Lanyard Toggle & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLanyard(!showLanyard)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showLanyard
                  ? "bg-stone-800 border-amber-500/40 text-amber-300"
                  : "bg-stone-950 border-stone-800 text-stone-400 hover:text-white"
              }`}
            >
              {showLanyard ? "Hide Lanyard" : "Show Lanyard"}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Card</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Preparing..." : "Download PDF"}</span>
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
              title="Share / Copy Info"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ID Cards Showcase Area */}
        <div className="p-4 sm:p-8 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center min-h-[620px] overflow-x-auto">
          <div
            id="akv-printable-volunteer-id-cards"
            className="flex flex-wrap items-start justify-center gap-6 sm:gap-10"
          >
            {/* ========================================================= */}
            {/* OFFICIAL PRINTED LANYARD STRAP                             */}
            {/* ========================================================= */}
            {showLanyard && (activeSide === "front" || activeSide === "both") && (
              <div className="no-print hidden md:flex flex-col items-center shrink-0">
                {/* Woven Lanyard Ribbon Strap */}
                <div className="w-14 h-[480px] rounded-2xl bg-gradient-to-b from-red-800 via-amber-400 to-red-800 shadow-2xl border-x-2 border-amber-300/60 relative overflow-hidden flex flex-col justify-between items-center py-4 text-center select-none">
                  {/* Subtle woven texture overlay */}
                  <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,#000,#000_2px,transparent_2px,transparent_6px)] pointer-events-none" />

                  {/* Top: Acharya Crest Logo */}
                  <div className="relative z-10 flex flex-col items-center">
                    <img
                      src="/images/acharya-logo-white.png"
                      alt="Acharya"
                      className="h-8 object-contain drop-shadow"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    <span className="text-[7px] font-black uppercase tracking-widest text-white mt-1 drop-shadow">
                      ACHARYA
                    </span>
                  </div>

                  {/* Middle Yellow Band: Kannada & English Vedike Branding */}
                  <div className="relative z-10 -rotate-90 whitespace-nowrap flex items-center gap-3 my-auto">
                    <span className="text-[11px] font-black tracking-wider text-red-900 font-sans">
                      ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-stone-900">
                      ACHARYA KANNADA VEDIKE
                    </span>
                  </div>

                  {/* Lower Red Band: Festival Name & Silhouette */}
                  <div className="relative z-10 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-200 drop-shadow">
                      NUDITARANGA
                    </span>
                    <span className="text-[8px] font-black text-amber-100">
                      2026
                    </span>
                    <svg className="w-8 h-7 text-amber-200/40 mt-1" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M50 10 L60 35 L80 35 L85 90 L15 90 L20 35 L40 35 Z" />
                    </svg>
                  </div>
                </div>

                {/* Swivel Chrome Lobster Clasp */}
                <div className="flex flex-col items-center -mt-2">
                  <div className="w-7 h-4 bg-gradient-to-r from-stone-400 via-stone-200 to-stone-500 rounded-sm shadow border border-stone-400" />
                  <div className="w-6 h-6 rounded-full border-2 border-stone-300 shadow-inner -mt-1" />
                  <div className="w-4 h-8 bg-gradient-to-b from-stone-300 via-white to-stone-400 rounded-b-md shadow-lg border border-stone-400 -mt-2 flex items-center justify-center">
                    <div className="w-1 h-3 bg-stone-600 rounded-full" />
                  </div>
                </div>

                <span className="text-[10px] font-bold text-stone-400 mt-2">Official Lanyard</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* CARD 1: FRONT SIDE (Exact Auid.png Layout Design)         */}
            {/* ========================================================= */}
            {(activeSide === "front" || activeSide === "both") && (
              <div className="flex flex-col items-center">
                {/* Lanyard Top Attachment Clip */}
                {showLanyard && (
                  <div className="no-print flex flex-col items-center -mb-3 z-30">
                    <div className="w-10 h-7 bg-gradient-to-r from-stone-300 via-white to-stone-400 rounded-md shadow-lg border border-stone-400 flex items-center justify-center">
                      <div className="w-5 h-2 bg-stone-700 rounded-xs" />
                    </div>
                    <div className="w-3.5 h-3 bg-stone-400 rounded-b-full shadow-inner -mt-0.5" />
                  </div>
                )}

                {/* Physical Card Container (Front) - Authentic Auid.png Template */}
                <div
                  className="relative w-[340px] sm:w-[360px] h-[510px] sm:h-[540px] rounded-[28px] border-2 border-amber-900/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden select-none"
                  style={{
                    backgroundImage: `url(/images/auid-clean.png)`,
                    backgroundSize: "100% 100%",
                    backgroundRepeat: "no-repeat"
                  }}
                >
                  {/* Top Badge Slot Cutout (For Lanyard Clip) */}
                  <div className="w-14 h-2.5 rounded-full bg-stone-300/80 border border-stone-400/60 mx-auto mt-2 shadow-inner relative z-20" />

                  {/* Candidate Photo Frame Overlay */}
                  <div
                    className="absolute rounded-[18px] sm:rounded-[20px] overflow-hidden bg-stone-100 flex items-center justify-center shadow-inner"
                    style={{
                      left: "35.5%",
                      top: "28.9%",
                      width: "27.5%",
                      height: "19.3%",
                    }}
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-stone-100 to-stone-200 text-stone-400">
                        <User className="w-10 h-10 text-stone-400 mb-0.5" />
                        <span className="text-[8px] font-black uppercase text-stone-500 tracking-wider">
                          AKV Photo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Volunteer Name */}
                  <div
                    className="absolute left-0 right-0 text-center"
                    style={{
                      top: "50.1%",
                    }}
                  >
                    <h3 className="text-base sm:text-lg font-black text-[#5A1212] tracking-tight font-serif drop-shadow-xs">
                      {name}
                    </h3>
                  </div>

                  {/* Identity Card Values: AUID, Institute, Domain */}
                  {/* Row 1: AUID */}
                  <div
                    className="absolute flex items-center"
                    style={{
                      left: "30.5%",
                      top: "63.2%",
                    }}
                  >
                    <span className="font-mono font-black text-xs sm:text-[13px] text-stone-950 tracking-wider">
                      {auid}
                    </span>
                  </div>

                  {/* Row 2: Institute */}
                  <div
                    className="absolute flex items-center"
                    style={{
                      left: "30.5%",
                      top: "67.5%",
                      right: "5%",
                    }}
                  >
                    <span className="font-bold text-[10.5px] sm:text-xs text-stone-900 truncate" title={institute}>
                      {institute}
                    </span>
                  </div>

                  {/* Row 3: Domain */}
                  <div
                    className="absolute flex items-center"
                    style={{
                      left: "30.5%",
                      top: "71.9%",
                      right: "5%",
                    }}
                  >
                    <span className="font-extrabold text-xs sm:text-[13px] text-stone-950 truncate">
                      {team}
                    </span>
                  </div>
                </div>

                <span className="no-print text-xs font-bold text-stone-400 mt-2">
                  Front Side (ಮುಂಭಾಗ - Auid Layout)
                </span>
              </div>
            )}

            {/* ========================================================= */}
            {/* CARD 2: BACK SIDE (QR Verification, Rules, Guidelines)    */}
            {/* ========================================================= */}
            {(activeSide === "back" || activeSide === "both") && (
              <div className="flex flex-col items-center">
                {/* Lanyard Top Attachment Clip for Back View */}
                {showLanyard && (
                  <div className="no-print flex flex-col items-center -mb-3 z-30">
                    <div className="w-10 h-7 bg-gradient-to-r from-stone-300 via-white to-stone-400 rounded-md shadow-lg border border-stone-400 flex items-center justify-center">
                      <div className="w-5 h-2 bg-stone-700 rounded-xs" />
                    </div>
                    <div className="w-3.5 h-3 bg-stone-400 rounded-b-full shadow-inner -mt-0.5" />
                  </div>
                )}

                {/* Physical Card Container (Back) */}
                <div
                  className="relative w-[340px] sm:w-[360px] h-[510px] sm:h-[540px] bg-[#FFFDF7] rounded-[28px] border-2 border-stone-200 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-between text-stone-900 select-none"
                  style={{
                    backgroundImage: `radial-gradient(#fbf0d8 1px, transparent 1px)`,
                    backgroundSize: "20px 20px"
                  }}
                >
                  {/* Top Badge Slot Cutout */}
                  <div className="w-14 h-2.5 rounded-full bg-stone-300/80 border border-stone-400/60 mx-auto mt-2 -mb-2 shadow-inner relative z-20" />

                  {/* Vidhana Soudha Top-Right Architectural Watermark */}
                  <div className="absolute top-2 right-0 w-44 h-48 pointer-events-none opacity-[0.09] z-0">
                    <svg viewBox="0 0 200 200" fill="currentColor" className="text-amber-900 w-full h-full">
                      <path d="M100 20 L105 40 L135 40 L135 60 L155 60 L155 180 L45 180 L45 60 L65 60 L65 40 L95 40 Z M100 45 A25 25 0 0 1 125 70 L75 70 A25 25 0 0 1 100 45 Z" />
                    </svg>
                  </div>

                  {/* Top Branding Section */}
                  <div className="relative z-10 pt-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-0.5">
                      <img
                        src="/images/acharya-logo.png?v=2026"
                        alt="Acharya"
                        className="h-6 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <h4 className="text-xs font-black text-red-800 tracking-tight">
                      ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆ
                    </h4>
                    <p className="text-[7.5px] font-black uppercase tracking-widest text-stone-600">
                      ACHARYA KANNADA VEDIKE
                    </p>

                    <h3 className="text-lg font-black text-red-800 tracking-tight font-serif mt-0.5">
                      NUDITARANGA
                    </h3>
                    <div className="flex items-center justify-center gap-2 text-red-800 -mt-0.5">
                      <span className="w-6 h-[1.5px] bg-red-800/60" />
                      <span className="text-[10px] font-black">2026</span>
                      <span className="w-6 h-[1.5px] bg-red-800/60" />
                    </div>
                  </div>

                  {/* Middle Row: QR Code + Volunteer Info Table */}
                  <div className="relative z-10 px-5 grid grid-cols-12 gap-3 items-center">
                    {/* Left: Scannable QR Code Box */}
                    <div className="col-span-5 flex flex-col items-center">
                      <div className="p-2 bg-white rounded-2xl border-2 border-stone-800 shadow-md">
                        <QRCodeSVG
                          value={qrPayload}
                          size={105}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <span className="mt-1.5 font-mono text-xs font-black tracking-wider text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                        {regId}
                      </span>
                    </div>

                    {/* Right: Structured Volunteer Info */}
                    <div className="col-span-7 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-stone-900">
                        <User className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span className="font-bold text-stone-600 w-16">Name:</span>
                        <span className="font-black text-stone-950 truncate flex-1">{name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-stone-900">
                        <CreditCard className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span className="font-bold text-stone-600 w-16">AUID:</span>
                        <span className="font-mono font-bold text-stone-900 flex-1">{auid}</span>
                      </div>

                      <div className="flex items-start gap-1.5 text-stone-900">
                        <Building className="w-3.5 h-3.5 text-red-700 shrink-0 mt-0.5" />
                        <span className="font-bold text-stone-600 w-16">Institute:</span>
                        <span className="font-bold text-stone-800 text-[10.5px] leading-tight flex-1 line-clamp-2">
                          {institute}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-stone-900">
                        <Code2 className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span className="font-bold text-stone-600 w-16">Domain:</span>
                        <span className="font-extrabold text-stone-950 flex-1 truncate">{team}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-stone-900">
                        <Users className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span className="font-bold text-stone-600 w-16">Role:</span>
                        <span className="font-black text-red-700 flex-1 text-[11px]">{role}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-stone-900">
                        <Phone className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span className="font-bold text-stone-600 w-16">Contact:</span>
                        <span className="font-mono font-bold text-stone-900 flex-1">{contact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Important Information Callout Box */}
                  <div className="relative z-10 mx-5 p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-stone-800 shadow-xs">
                    <h5 className="text-[10.5px] font-black text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span>Important Information</span>
                    </h5>
                    <ul className="text-[9.5px] space-y-0.5 text-stone-700 leading-tight">
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-700 font-bold">•</span>
                        <span>This ID card is <strong>non-transferable</strong>.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-700 font-bold">•</span>
                        <span>Wear this card at all times inside the event premises.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-700 font-bold">•</span>
                        <span>Use QR code for quick verification & daily attendance.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-red-700 font-bold">•</span>
                        <span>In case of emergency, contact the given number.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Bottom Karnataka Monument Silhouette & Motto */}
                  <div className="relative z-10 w-full">
                    {/* Silhouette of Hampi & Karnataka Temples */}
                    <div className="w-full h-10 overflow-hidden -mb-1">
                      <svg
                        viewBox="0 0 360 50"
                        fill="currentColor"
                        className="w-full h-full text-red-800"
                        preserveAspectRatio="none"
                      >
                        <path d="M0 50 L0 35 L15 35 L20 20 L25 35 L40 35 L45 10 L50 35 L70 35 L75 25 L80 35 L100 35 L110 5 L120 35 L140 35 L150 15 L160 35 L180 35 L190 20 L200 35 L220 35 L230 10 L240 35 L260 35 L270 20 L280 35 L300 35 L310 15 L320 35 L340 35 L350 25 L360 35 L360 50 Z" />
                      </svg>
                    </div>

                    {/* Bottom Golden Ribbon with Kannada Motto */}
                    <div className="w-full bg-gradient-to-r from-red-800 via-amber-600 to-red-800 py-1.5 text-center text-white border-t border-amber-400/40">
                      <p className="text-[9.5px] font-black tracking-wider font-sans">
                        ನಮ್ಮ ನಾಡು &nbsp;|&nbsp; ನಮ್ಮ ಭಾಷೆ &nbsp;|&nbsp; ನಮ್ಮ ಹೆಮ್ಮೆ
                      </p>
                    </div>
                  </div>
                </div>

                <span className="no-print text-xs font-bold text-stone-400 mt-2">
                  Back Side (ಹಿಂಭಾಗ)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Help Bar */}
        <div className="no-print px-5 py-3 bg-stone-950/80 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Official Identity Document • Acharya Kannada Vedike Nuditaranga 2026</span>
          </div>
          <span className="text-[11px] text-stone-500 font-mono">
            {regId} • {auid}
          </span>
        </div>
      </div>
    </div>
  );
};
