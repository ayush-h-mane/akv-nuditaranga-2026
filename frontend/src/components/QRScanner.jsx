import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useLanguage } from "../context/LanguageContext";
import { Camera, CameraOff, Search, CheckCircle, AlertTriangle } from "lucide-react";

export const QRScanner = ({ onScanSuccess }) => {
  const { lang, t } = useLanguage();
  const [manualInput, setManualInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrcodeScanner = null;

    if (isScanning) {
      // Initialize html5-qrcode scanner
      html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          try {
            // Handle parsed JSON QR or plain string
            let regId = decodedText;
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.reg_id) regId = parsed.reg_id;
            } catch (e) {
              // use direct decodedText
            }
            onScanSuccess(regId);
            setIsScanning(false);
            if (html5QrcodeScanner) {
              html5QrcodeScanner.clear().catch(console.error);
            }
          } catch (err) {
            setScanError(lang === "kn" ? "ಕ್ಯೂಆರ್ ಕೋಡ್ ಮಾಹಿತಿ ಓದಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ." : "Failed to parse QR Code data.");
          }
        },
        (error) => {
          // ignore stream frame scan misses
        }
      );

      scannerRef.current = html5QrcodeScanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScanning, onScanSuccess]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onScanSuccess(manualInput.trim());
    setManualInput("");
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 uppercase tracking-wider">
          {t("checkin.badge")}
        </span>
        <h3 className="text-xl font-extrabold text-stone-900 font-display mt-2">
          {t("checkin.heading")}
        </h3>
        <p className="text-xs text-stone-500 font-kannada mt-1">
          {t("checkin.subheading")}
        </p>
      </div>

      {/* Camera Scanner Toggle */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={() => setIsScanning(!isScanning)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all ${
            isScanning
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gradient-to-r from-kar-red to-kar-yellow text-white hover:shadow-lg"
          }`}
        >
          {isScanning ? (
            <>
              <CameraOff className="w-4 h-4" />
              <span>{t("checkin.stopScanBtn")}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>{t("checkin.scanBtn")}</span>
            </>
          )}
        </button>
      </div>

      {/* Scanner Viewport */}
      {isScanning && (
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-300 p-2 bg-stone-50">
          <div id="reader" className="w-full" />
        </div>
      )}

      {scanError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {/* Manual Search Form */}
      <form onSubmit={handleManualSubmit} className="pt-4 border-t border-stone-100">
        <label className="text-xs font-bold text-stone-700 block mb-1.5">
          {lang === "kn" ? "ಅಥವಾ ಕೈಯಾರೆ ನೋಂದಣಿ ಐಡಿ ನಮೂದಿಸಿ" : "Or Search Manually by Registration ID / USN"}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={t("checkin.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 shadow transition-colors"
          >
            {t("checkin.searchBtn")}
          </button>
        </div>
      </form>
    </div>
  );
};
