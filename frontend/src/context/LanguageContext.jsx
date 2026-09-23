import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../config/translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("akv_preferred_lang") || "kn"; // default to Kannada as requested
  });

  useEffect(() => {
    localStorage.setItem("akv_preferred_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => (prev === "kn" ? "en" : "kn"));
  };

  // Helper to fetch nested translation string: t("nav.home")
  const t = (path) => {
    if (!path) return "";
    const keys = path.split(".");
    let current = translations[lang] || translations["kn"];
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to english if missing in current
        let fallback = translations["en"];
        for (const fbKey of keys) {
          if (fallback && fallback[fbKey] !== undefined) {
            fallback = fallback[fbKey];
          } else {
            return path;
          }
        }
        return fallback;
      }
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
