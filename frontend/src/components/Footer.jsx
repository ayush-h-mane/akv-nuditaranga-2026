import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { MapPin, Mail, Phone, Heart, ArrowUp } from "lucide-react";

const InstagramIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

export const Footer = ({ setCurrentView }) => {
  const { lang, t } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-stone-900 text-stone-300 pt-14 pb-8 overflow-hidden">
      {/* Karnataka Flag Accent Top Strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5 karnataka-ribbon" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          
          {/* Column 1: Organization & Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/images/acharya-logo-white.png?v=2026"
                alt="Acharya Institutes"
                className="h-11 w-auto object-contain drop-shadow"
              />
              <img
                src="/images/akv-logo.png"
                alt="Acharya Kannada Vedike"
                className="h-12 w-auto object-contain drop-shadow"
              />
              <div>
                <h3 className="font-extrabold text-white text-base tracking-tight leading-tight">
                  {lang === "kn" ? siteConfig.name.kn : siteConfig.name.en}
                </h3>
                <p className="text-xs text-amber-400 font-medium">
                  {lang === "kn" ? "ನುಡಿತರಂಗ ೨೦೨೬ • ಕರುನಾಡ ವೈಭವ" : "Nuditaranga 2026 • Karunada Vaibhava"}
                </p>
              </div>
            </div>

            <p className="text-sm text-stone-400 leading-relaxed font-kannada">
              {lang === "kn"
                ? "ಕನ್ನಡದ ಕಂಪು, ಸಂಸ್ಕೃತಿಯ ಸೊಬಗು ಹಾಗೂ ಯುವ ಪ್ರತಿಭೆಗಳ ಅನಾವರಣಕ್ಕೆ ಸಮರ್ಪಿತವಾದ ಅಧಿಕೃತ ಸಾಂಸ್ಕೃತಿಕ ವೇದಿಕೆ."
                : "Dedicated to nurturing Kannada literature, Karnataka's heritage, and youth talent across engineering and arts."}
            </p>

            <div className="pt-2">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
              >
                <InstagramIcon className="w-4 h-4" />
                <span>{t("social.followBtn")}</span>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase border-b border-stone-800 pb-2">
              {lang === "kn" ? "ತ್ವರಿತ ಕೊಂಡಿಗಳು" : "Quick Links"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => { setCurrentView("home"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  {t("nav.home")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setCurrentView("about"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  {t("nav.about")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setCurrentView("nuditaranga"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  {t("nav.nuditaranga")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setCurrentView("events"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  {t("nav.events")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setCurrentView("gallery"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  {t("nav.gallery")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setCurrentView("contact"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  {t("nav.contact")}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Fest */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase border-b border-stone-800 pb-2">
              {lang === "kn" ? "ನುಡಿತರಂಗ ೨೦೨೬ ಪೋರ್ಟಲ್" : "Nuditaranga Portals"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => { setCurrentView("register"); scrollToTop(); }}
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  → {t("nav.registerNow")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setCurrentView("checkin"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  → {t("nav.checkIn")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setCurrentView("admin"); scrollToTop(); }}
                  className="hover:text-kar-yellow transition-colors"
                >
                  → {t("nav.admin")}
                </button>
              </li>
              <li className="pt-2 text-xs text-stone-400">
                <span className="font-semibold text-stone-300">
                  {lang === "kn" ? "ಧೈಯವಾಕ್ಯ: " : "Theme: "}
                </span>
                {lang === "kn" ? siteConfig.festival.theme.kn : siteConfig.festival.theme.en}
              </li>
              <li className="text-xs text-stone-400">
                <span className="font-semibold text-stone-300">
                  {lang === "kn" ? "ದಿನಾಂಕ: " : "Dates: "}
                </span>
                {lang === "kn" ? siteConfig.festival.displayDate.kn : siteConfig.festival.displayDate.en}
              </li>
            </ul>
          </div>

          {/* Column 4: College Campus Address */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wider uppercase border-b border-stone-800 pb-2">
              {lang === "kn" ? "ಸ್ಥಳ & ವಿಳಾಸ" : "Campus Location"}
            </h4>
            <div className="space-y-2 text-xs text-stone-400 leading-relaxed">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-kar-red flex-shrink-0 mt-0.5" />
                <span>
                  {lang === "kn" ? siteConfig.institution.address.kn : siteConfig.institution.address.en}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <a href={`mailto:${siteConfig.social.email}`} className="hover:text-white transition-colors">
                  {siteConfig.social.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Quote & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p className="font-kannada text-center md:text-left text-amber-200/90 font-medium">
            {t("footer.quote")}
          </p>

          <div className="flex items-center gap-4">
            <p className="text-center">
              © {lang === "kn" ? "೨೦೨೬" : "2026"} {lang === "kn" ? siteConfig.name.kn : siteConfig.name.en}. {t("footer.rights")}
            </p>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title={lang === "kn" ? "ಮೇಲಕ್ಕೆ ಹೋಗಿ" : "Back to Top"}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
