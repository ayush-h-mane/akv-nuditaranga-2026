import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from "lucide-react";

const ModalAlertContext = createContext(null);

export const ModalAlertProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "info", // "error" | "warning" | "info" | "success"
    title: "",
    message: "",
    onClose: null
  });

  const isPushedRef = useRef(false);

  const closeModal = useCallback(() => {
    setModalState(prev => {
      if (!prev.isOpen) return prev;
      if (prev.onClose && typeof prev.onClose === "function") {
        try {
          prev.onClose();
        } catch (e) {
          console.error("Error in modal onClose callback:", e);
        }
      }
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (typeof window !== "undefined" && window.history.state && window.history.state.akvModalAlert) {
          window.history.back();
        }
      }
      return { ...prev, isOpen: false };
    });
  }, []);

  // Synchronize modal open state with history & background scroll
  useEffect(() => {
    if (!modalState.isOpen) return;

    if (typeof window !== "undefined") {
      window.history.pushState({ akvModalAlert: true, timestamp: Date.now() }, "");
      isPushedRef.current = true;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handlePopState = () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        setModalState((prev) => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalState.isOpen]);

  const showAlert = useCallback(({ type = "info", title = "", message = "", onClose = null }) => {
    // If message is an Error object or contains error string
    const text = typeof message === "string" ? message : (message?.message || String(message));
    
    let defaultTitle = "Notice";
    if (type === "error") defaultTitle = "Error / ದೋಷ";
    else if (type === "warning") defaultTitle = "Attention / ಎಚ್ಚರಿಕೆ";
    else if (type === "info") defaultTitle = "Information / ಮಾಹಿತಿ";
    else if (type === "success") defaultTitle = "Success / ಯಶಸ್ವಿ";

    setModalState({
      isOpen: true,
      type,
      title: title || defaultTitle,
      message: text,
      onClose
    });
  }, []);

  const showError = useCallback((message, title = "") => {
    showAlert({ type: "error", title: title || "Error / ದೋಷ", message });
  }, [showAlert]);

  const showWarning = useCallback((message, title = "") => {
    showAlert({ type: "warning", title: title || "Attention / ಎಚ್ಚರಿಕೆ", message });
  }, [showAlert]);

  const showInfo = useCallback((message, title = "") => {
    showAlert({ type: "info", title: title || "Information / ಮಾಹಿತಿ", message });
  }, [showAlert]);

  const showSuccess = useCallback((message, title = "") => {
    showAlert({ type: "success", title: title || "Success / ಯಶಸ್ವಿ", message });
  }, [showAlert]);

  // Handle escape key and hook global window alerts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && modalState.isOpen) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Make available globally for vanilla scripts / services
    window.__showModalAlert = (type, message, title) => {
      showAlert({ type, message, title });
    };

    // Override browser window.alert to use our modal dialog
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlert({ type: "info", message: String(msg) });
    };

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.alert = originalAlert;
      delete window.__showModalAlert;
    };
  }, [modalState.isOpen, closeModal, showAlert]);

  // Visual Theme Mapping
  const typeConfigs = {
    error: {
      badgeBg: "bg-red-100 text-red-700 border-red-200",
      accentBorder: "border-red-500/30",
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      btnBg: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-600/30",
      ringColor: "ring-red-500/20"
    },
    warning: {
      badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
      accentBorder: "border-amber-500/30",
      icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
      btnBg: "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-amber-600/30",
      ringColor: "ring-amber-500/20"
    },
    info: {
      badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
      accentBorder: "border-blue-500/30",
      icon: <Info className="w-6 h-6 text-blue-600" />,
      btnBg: "bg-gradient-to-r from-stone-900 to-stone-800 hover:from-black hover:to-stone-900 text-white shadow-stone-900/30",
      ringColor: "ring-blue-500/20"
    },
    success: {
      badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      accentBorder: "border-emerald-500/30",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
      btnBg: "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/30",
      ringColor: "ring-emerald-500/20"
    }
  };

  const currentConfig = typeConfigs[modalState.type] || typeConfigs.info;

  return (
    <ModalAlertContext.Provider value={{ showAlert, showError, showWarning, showInfo, showSuccess, closeModal }}>
      {children}

      {/* Full-screen Backdrop & Centered Modal Dialog */}
      {modalState.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop that disables background interactions completely */}
          <div
            onClick={closeModal}
            className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          {/* Modal Container Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-[92%] sm:w-full max-w-md bg-white rounded-3xl shadow-2xl border ${currentConfig.accentBorder} overflow-hidden transform transition-all animate-scale-up z-10 my-auto max-h-[85dvh] sm:max-h-[92vh] flex flex-col`}
          >
            {/* Top Karnataka Decorative Ribbon */}
            <div className="h-1.5 w-full karnataka-ribbon shrink-0" />

            <div className="p-5 sm:p-6 overflow-y-auto flex flex-col flex-1">
              {/* Header with Type Icon, Title & Close 'X' */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border ${currentConfig.badgeBg} shrink-0`}>
                    {currentConfig.icon}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight leading-snug">
                      {modalState.title}
                    </h3>
                    <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                      Acharya Kannada Vedike • AKV 2026
                    </span>
                  </div>
                </div>

                {/* Close 'X' Button */}
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1.5 rounded-xl text-stone-600 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message Body */}
              <div className="my-4 max-h-[60vh] overflow-y-auto pr-1">
                <p className="text-sm sm:text-base font-semibold text-stone-700 leading-relaxed font-sans whitespace-pre-line break-words">
                  {modalState.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  autoFocus
                  onClick={closeModal}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-extrabold shadow-md transition-all transform active:scale-95 cursor-pointer ${currentConfig.btnBg}`}
                >
                  Close / ಸರಿ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalAlertContext.Provider>
  );
};

export const useModalAlert = () => {
  const context = useContext(ModalAlertContext);
  if (!context) {
    return {
      showAlert: (opts) => {
        if (typeof window !== "undefined" && window.__showModalAlert) {
          window.__showModalAlert(opts.type || "info", opts.message, opts.title);
        } else {
          console.warn("ModalAlert: Context not mounted", opts);
        }
      },
      showError: (msg, title) => {
        if (typeof window !== "undefined" && window.__showModalAlert) {
          window.__showModalAlert("error", msg, title);
        } else {
          console.error("ModalAlert Error:", msg);
        }
      },
      showWarning: (msg, title) => {
        if (typeof window !== "undefined" && window.__showModalAlert) {
          window.__showModalAlert("warning", msg, title);
        }
      },
      showInfo: (msg, title) => {
        if (typeof window !== "undefined" && window.__showModalAlert) {
          window.__showModalAlert("info", msg, title);
        }
      },
      showSuccess: (msg, title) => {
        if (typeof window !== "undefined" && window.__showModalAlert) {
          window.__showModalAlert("success", msg, title);
        }
      },
      closeModal: () => {}
    };
  }
  return context;
};
