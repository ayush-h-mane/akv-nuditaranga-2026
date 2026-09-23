import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { formatKannadaDate, formatKannadaTime, formatKannadaVenue, formatKannadaStatus, toKannadaDigits } from "../utils/kannadaUtils";
import { Printer, Download, CheckCircle, Calendar, MapPin, Clock, User, ShieldCheck, ArrowLeft } from "lucide-react";

export const DigitalPass = ({ registration, onBack }) => {
  const { lang, t } = useLanguage();
  const passRef = useRef(null);

  if (!registration) return null;

  const eventTitle = registration.event 
    ? (lang === "kn" ? registration.event.title_kn : registration.event.title_en)
    : registration.event_id;

  const venue = registration.event 
    ? (lang === "kn" ? (registration.event.venue_kn || formatKannadaVenue(registration.event.venue)) : registration.event.venue)
    : (lang === "kn" ? "ಆಚಾರ್ಯ ಆವರಣ" : "Acharya Campus");

  const eventDate = registration.event 
    ? (lang === "kn" ? formatKannadaDate(registration.event.event_date) : registration.event.event_date) 
    : (lang === "kn" ? "ಮಾರ್ಚ್ ೨೦೨೬" : "March 2026");
  const eventTime = registration.event 
    ? (lang === "kn" ? formatKannadaTime(registration.event.event_time) : registration.event.event_time) 
    : (lang === "kn" ? "ಬೆಳಗಿನ ಅವಧಿ" : "Morning Session");
  const reportingTime = registration.event 
    ? (lang === "kn" ? formatKannadaTime(registration.event.reporting_time) : registration.event.reporting_time) 
    : (lang === "kn" ? "೩೦ ನಿಮಿಷ ಮುಂಚಿತವಾಗಿ" : "30 mins prior");

  const qrPayload = JSON.stringify({
    reg_id: registration.registration_id,
    auid: registration.auid || registration.usn,
    name: registration.full_name,
    institute: registration.institute || "Acharya Institute of Technology",
    event: registration.event_id
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-2xl mx-auto my-8 px-4 animate-fade-in">
      {/* Control Actions Header (hidden in print) */}
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-bold hover:bg-stone-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("registration.backToEvents")}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors shadow-md"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>{t("registration.printPass")}</span>
          </button>
        </div>
      </div>

      {/* Official Pass Container - High contrast, sharp edges on all 4 corners */}
      <div 
        id="printable-pass"
        ref={passRef}
        className="relative bg-white rounded-3xl border-2 border-stone-900 shadow-[0_10px_35px_-8px_rgba(0,0,0,0.18)] overflow-hidden"
      >
        {/* Top Flag Ribbon - Curves flush with top-left & top-right container corners */}
        <div className="h-3.5 w-full flex border-b-2 border-stone-900 rounded-t-[22px] overflow-hidden">
          <div className="w-1/2 bg-[#dc2626]" />
          <div className="w-1/2 bg-[#f59e0b]" />
        </div>

        <div className="p-6 sm:p-8 relative">
          {/* Subtle Institutional Acharya Emblem Watermark in Center (clean, non-blurring) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] overflow-hidden">
            <img
              src="/images/acharya-logo.png?v=2026"
              alt=""
              className="w-96 h-96 object-contain"
            />
          </div>

          {/* Pass Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-dashed border-stone-300 relative z-10">
            <div className="flex items-center gap-3">
              {/* Dual Brand Logos with crisp contrast frame */}
              <div className="flex items-center gap-2.5 bg-stone-50/80 p-2 rounded-2xl border border-stone-200/90 shadow-xs shrink-0">
                <img
                  src="/images/acharya-logo.png?v=2026"
                  alt="Acharya Institutes"
                  className="h-13 sm:h-14 w-auto object-contain shrink-0 filter-none"
                  style={{ minWidth: "46px" }}
                />
                <div className="h-9 w-[1.5px] bg-stone-300 shrink-0" />
                <img
                  src="/images/akv-logo.png?v=2026"
                  alt="Acharya Kannada Vedike"
                  className="h-13 sm:h-14 w-auto object-contain shrink-0 drop-shadow-xs"
                  style={{ minWidth: "42px" }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-kar-red text-white uppercase tracking-wider">
                    {lang === "kn" ? "ಕರುನಾಡ ವೈಭವ ೨೦೨೬" : "Karunada Vaibhava 2026"}
                  </span>
                  <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-300">
                    <CheckCircle className="w-3 h-3" />
                    <span>{lang === "kn" ? formatKannadaStatus(registration.status) : registration.status}</span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 font-display tracking-tight mt-1">
                  {lang === "kn" ? siteConfig.name.kn : siteConfig.name.en}
                </h2>
                <p className="text-[11px] text-amber-900 font-semibold">
                  {lang === "kn" ? "ನುಡಿತರಂಗ - ೨೦೨೬" : "Nuditaranga - 2026"}
                </p>
              </div>
            </div>

            {/* Unique Registration ID Badge */}
            <div className="sm:text-right bg-amber-50 p-3 rounded-2xl border border-amber-300 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                {t("registration.regIdLabel")}
              </span>
              <span className="text-base sm:text-lg font-black text-kar-red font-mono tracking-wide">
                {registration.registration_id}
              </span>
            </div>
          </div>

          {/* Middle Content: Participant & Event Details + QR Code */}
          <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Details Column (2 Cols) */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                  {t("pass.participantName")}
                </span>
                <p className="text-lg sm:text-xl font-black text-stone-900 font-display">
                  {registration.full_name}
                </p>
                <div className="space-y-0.5 mt-1">
                  <p className="text-xs font-bold text-kar-red font-mono">
                    {lang === "kn" ? "ಎಯುಐಡಿ (AUID)" : "AUID"}: {registration.auid || registration.usn}
                  </p>
                  <p className="text-xs font-bold text-stone-800">
                    {registration.institute || (lang === "kn" ? "ಆಚಾರ್ಯ ಇನ್‌ಸ್ಟಿಟ್ಯೂಟ್ ಆಫ್ ಟೆಕ್ನಾಲಜಿ" : "Acharya Institute of Technology")}
                  </p>
                  <p className="text-xs text-stone-600 font-semibold">
                    {registration.department} • {lang === "kn" ? `${toKannadaDigits(registration.semester)}ನೇ ಸೆಮಿಸ್ಟರ್ (ವಿಭಾಗ ${registration.section})` : `Sem ${registration.semester} (Sec ${registration.section})`}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <div>
                  <span className="text-stone-400 block font-semibold">{t("pass.event")}</span>
                  <span className="font-extrabold text-stone-900 text-sm">{eventTitle}</span>
                </div>

                {registration.is_team && (
                  <div>
                    <span className="text-stone-400 block font-semibold">{t("pass.team")}</span>
                    <span className="font-bold text-amber-900">
                      {registration.team_name || (lang === "kn" ? "ನೋಂದಾಯಿತ ತಂಡ" : "Team Registered")}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200">
                  <div>
                    <span className="text-stone-400 block font-medium">{t("pass.date")}</span>
                    <span className="font-bold text-stone-800">{eventDate} • {eventTime}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block font-medium">{t("pass.reporting")}</span>
                    <span className="font-bold text-kar-red">{reportingTime}</span>
                  </div>
                </div>

                <div>
                  <span className="text-stone-400 block font-medium">{t("pass.venue")}</span>
                  <span className="font-semibold text-stone-800">{venue}</span>
                </div>
              </div>
            </div>

            {/* QR Code Column (1 Col) */}
            <div className="flex flex-col items-center justify-center p-4 bg-amber-50/70 rounded-2xl border-2 border-stone-200 text-center shadow-sm">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-stone-300">
                <QRCodeSVG
                  value={qrPayload}
                  size={140}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-[10px] font-bold text-stone-700 mt-2 leading-tight">
                {t("pass.scanInstruction")}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                <ShieldCheck className="w-3 h-3 text-kar-red" />
                <span>{t("pass.verifiedStamp")}</span>
              </div>
            </div>
          </div>

          {/* Pass Footer Security Bar */}
          <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-600 font-medium relative z-10">
            <span className="font-semibold">{lang === "kn" ? `${siteConfig.festival.nameKn} • ${siteConfig.festival.editionKn}` : `${siteConfig.festival.name} • ${siteConfig.festival.edition}`}</span>
            {/* Bottom Right: Official Authentication Seal with Acharya Emblem */}
            <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-300 shadow-xs shrink-0">
              <img
                src="/images/acharya-logo.png?v=2026"
                alt="Acharya Seal"
                className="h-5 w-auto object-contain filter-none shrink-0"
              />
              <div className="h-3.5 w-[1px] bg-stone-300 shrink-0" />
              <img
                src="/images/akv-logo.png?v=2026"
                alt="AKV Seal"
                className="h-5 w-auto object-contain shrink-0"
              />
              <span className="font-mono text-stone-900 font-extrabold text-[11px] tracking-wide ml-0.5">
                {lang === "kn" ? "ಮುದ್ರೆ: ಆಕಂವೇ-೨೦೨೬" : "SEAL: AKV-AUTH-2026"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
