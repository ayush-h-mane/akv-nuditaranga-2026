import { useEffect, useRef } from "react";

/**
 * Custom hook to synchronize modal/dialog visibility with browser history.
 * Ensures that pressing browser or phone hardware "Back" closes the modal first
 * without causing the page to navigate back or close the website.
 */
export function useHistoryModal(isOpen, onClose) {
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (typeof window !== "undefined" && window.history.state && window.history.state.akvModal) {
          window.history.back();
        }
      }
      return;
    }

    // Push modal state into browser history
    if (typeof window !== "undefined") {
      window.history.pushState({ akvModal: true, timestamp: Date.now() }, "");
      isPushedRef.current = true;
    }

    const handlePopState = () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        onClose?.();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    // Disable background scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);
}
