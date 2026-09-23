import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, 
  CameraOff, 
  FlipHorizontal, 
  Zap, 
  ZapOff, 
  AlertCircle, 
  Scan, 
  CheckCircle2, 
  RefreshCw 
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export const CameraQRScanner = ({ 
  onScanSuccess, 
  isLoading = false,
  autoStart = false 
}) => {
  const { lang, t } = useLanguage();
  const [isScanning, setIsScanning] = useState(autoStart);
  const [errorMessage, setErrorMessage] = useState("");
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" (back) or "user" (front)
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  
  const qrScannerRef = useRef(null);
  const readerId = useRef(`akv-qr-reader-${Math.random().toString(36).substring(2, 9)}`).current;

  // Sound generator using Web Audio API (no external asset needed)
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Crisp A5 tone
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      // Audio autoplay might be restricted before first click
    }
  };

  // Detect camera devices on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Prefer back/rear camera if available
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("rear") || 
            d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("Camera enumeration error:", err);
      });
  }, []);

  // Manage camera scanning lifecycle
  useEffect(() => {
    if (!isScanning) {
      if (qrScannerRef.current) {
        qrScannerRef.current
          .stop()
          .then(() => {
            qrScannerRef.current.clear();
            qrScannerRef.current = null;
          })
          .catch((err) => {
            console.warn("Failed to stop scanner cleanly:", err);
            qrScannerRef.current = null;
          });
      }
      return;
    }

    setErrorMessage("");
    const scanner = new Html5Qrcode(readerId);
    qrScannerRef.current = scanner;

    const cameraConfig = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: facingMode };
    const scanConfig = {
      fps: 15,
      qrbox: (viewWidth, viewHeight) => {
        const minDim = Math.min(viewWidth, viewHeight);
        return {
          width: Math.floor(minDim * 0.72),
          height: Math.floor(minDim * 0.72)
        };
      },
      aspectRatio: 1.0
    };

    scanner.start(
      cameraConfig,
      scanConfig,
      (decodedText) => {
        // Debounce if same code is rapidly re-read
        if (decodedText === lastScannedCode) return;
        setLastScannedCode(decodedText);

        // Feedback
        playBeep();
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        // Parse JSON or plain ID
        let cleanId = decodedText;
        try {
          if (decodedText.trim().startsWith("{") && decodedText.trim().endsWith("}")) {
            const parsed = JSON.parse(decodedText.trim());
            cleanId = parsed.reg_id || parsed.auid || parsed.usn || decodedText;
          }
        } catch (e) {
          cleanId = decodedText;
        }

        if (onScanSuccess) {
          onScanSuccess(cleanId, decodedText);
        }

        // Reset debounce after 3 seconds so same pass can be scanned again later if needed
        setTimeout(() => {
          setLastScannedCode(null);
        }, 3000);
      },
      (error) => {
        // stream frame misses are normal, omit logging
      }
    )
    .then(() => {
      // Check torch capability
      try {
        const track = scanner.getRunningTrack();
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }
    })
    .catch((err) => {
      console.error("Camera startup failed:", err);
      setIsScanning(false);
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
        setErrorMessage(
          lang === "kn"
            ? "ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ನೀಡಿ."
            : "Camera permission denied. Please grant camera access in your browser."
        );
      } else if (err?.name === "NotFoundError" || err?.message?.includes("device")) {
        setErrorMessage(
          lang === "kn"
            ? "ಯಾವುದೇ ಕ್ಯಾಮೆರಾ ಪತ್ತೆಯಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಸಾಧನವನ್ನು ಪರಿಶೀಲಿಸಿ."
            : "No camera device detected on this device."
        );
      } else {
        setErrorMessage(
          lang === "kn"
            ? "ಕ್ಯಾಮೆರಾ ಪ್ರಾರಂಭಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪುಟವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ."
            : "Could not access camera feed. Please check device permissions."
        );
      }
    });

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(() => {}).finally(() => {
          scanner.clear();
        });
      }
    };
  }, [isScanning, selectedCameraId, facingMode]);

  // Flip Camera between back and front
  const handleFlipCamera = () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].id);
    } else {
      setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
    }
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = () => {
    if (!qrScannerRef.current || !hasTorch) return;
    try {
      qrScannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn }]
      }).then(() => {
        setTorchOn(!torchOn);
      }).catch(console.error);
    } catch (e) {}
  };

  return (
    <div className="w-full space-y-3">
      {/* Camera Action Buttons & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-100/90 p-2 rounded-2xl border border-stone-200">
        <button
          type="button"
          onClick={() => setIsScanning(!isScanning)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isScanning
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gradient-to-r from-kar-red to-red-600 text-white hover:shadow-md"
          }`}
        >
          {isScanning ? (
            <>
              <CameraOff className="w-4 h-4" />
              <span>{lang === "kn" ? "ಕ್ಯಾಮೆರಾ ನಿಲ್ಲಿಸಿ" : "Stop Camera Scanner"}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>{lang === "kn" ? "ಕ್ಯಾಮೆರಾ ಸ್ಕ್ಯಾನರ್ ಪ್ರಾರಂಭಿಸಿ" : "Start Camera Scanner"}</span>
            </>
          )}
        </button>

        {isScanning && (
          <div className="flex items-center gap-1.5">
            {/* Flip Camera Button */}
            <button
              type="button"
              onClick={handleFlipCamera}
              title="Switch Camera (Front / Rear)"
              className="p-2 rounded-xl bg-white hover:bg-stone-200 text-stone-700 border border-stone-300 transition-colors shadow-2xs"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>

            {/* Flashlight / Torch Button (if supported) */}
            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                title={torchOn ? "Turn Torch Off" : "Turn Torch On"}
                className={`p-2 rounded-xl border transition-colors shadow-2xs ${
                  torchOn 
                    ? "bg-amber-400 text-stone-900 border-amber-500" 
                    : "bg-white hover:bg-stone-200 text-stone-700 border-stone-300"
                }`}
              >
                {torchOn ? <Zap className="w-4 h-4 fill-stone-900" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Message if camera failed */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-kar-red" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Video Viewport Container */}
      {isScanning && (
        <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-amber-400 shadow-xl aspect-square max-w-sm mx-auto flex items-center justify-center">
          {/* HTML5 QR Container */}
          <div id={readerId} className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

          {/* Futuristic Viewfinder Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
            {/* Top guide banner */}
            <div className="bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-white/20 text-[11px] font-extrabold text-amber-300 tracking-wide">
              {lang === "kn" ? "ಪಾಸ್ ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ" : "Aim at Student Pass QR"}
            </div>

            {/* Target Reticle with 4 Corner Brackets */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-kar-red rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-kar-yellow rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-kar-yellow rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-kar-red rounded-br-lg" />

              {/* Pulsing center crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <Scan className="w-12 h-12 text-white animate-pulse" />
              </div>

              {/* Animated Vertical Laser Sweep Beam */}
              <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-bounce" />
            </div>

            {/* Bottom Status Tip */}
            <div className="bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-white/20 text-[10px] text-stone-300">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Recording Check-In...
                </span>
              ) : (
                <span>Auto-detects pass on focus</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
