import React, { useRef, useState } from "react";
import { Image as ImageIcon, Upload, X, Link as LinkIcon, Loader2 } from "lucide-react";
import { api } from "../services/api";

export const EventImageUpload = ({ imageUrl, onImageChange, label = "Event / Activity Image", required = false }) => {
  const fileInputRef = useRef(null);
  const [useUrlMode, setUseUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFileSelect = async (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    setUploadError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Please select a JPEG, PNG, or WebP image.");
      input.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Please select an image smaller than 10MB.");
      input.value = "";
      return;
    }

    setUploading(true);

    try {
      const uploadedUrl = await api.uploadImage(file);
      // Store the URL
      onImageChange(uploadedUrl);
    } catch (err) {
      console.warn("Cloud image upload failed, falling back to local data URL:", err);
      try {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onImageChange(ev.target.result);
            setUploadError("");
          } else {
            setUploadError(err.message || "Image upload failed.");
          }
        };
        reader.onerror = () => {
          setUploadError(err.message || "Image upload failed.");
        };
        reader.readAsDataURL(file);
      } catch (_) {
        setUploadError(err.message || "Image upload failed.");
      }
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onImageChange(urlInput.trim());
      setUploadError("");
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onImageChange("");
    setUrlInput("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
          {label} {required && <span className="text-kar-red">*</span>}
        </label>
        <button
          type="button"
          onClick={() => {
            setUseUrlMode(!useUrlMode);
            setUploadError("");
          }}
          className="text-[11px] font-bold text-amber-800 hover:text-kar-red underline cursor-pointer"
        >
          {useUrlMode ? "Upload File instead" : "Paste Image URL instead"}
        </button>
      </div>

      {imageUrl ? (
        <div className="relative w-full h-44 rounded-2xl border border-stone-200 overflow-hidden bg-stone-900 group">
          <img
            src={imageUrl}
            alt="Event Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Remove Image</span>
            </button>
          </div>
        </div>
      ) : useUrlMode ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://images.unsplash.com/... or any image link"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-kar-red"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Apply URL
          </button>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!uploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`w-full h-36 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group p-4 ${
            uploading
              ? "border-amber-400 bg-amber-50/70 cursor-wait"
              : "border-stone-300 hover:border-kar-red bg-stone-50 hover:bg-amber-50/40 text-stone-500 hover:text-kar-red"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-stone-200 flex items-center justify-center group-hover:scale-105 transition-transform">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-kar-red animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-kar-red" />
            )}
          </div>
          <div className="text-center">
            <span className="text-xs font-bold block text-stone-700 group-hover:text-kar-red">
              {uploading
                ? "Uploading and optimizing image..."
                : "Click to select or drag & drop photo"}
            </span>
            <span className="text-[11px] text-stone-400">JPG, PNG, WebP up to 10MB</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={handleFileSelect}
          />
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 font-medium" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
};
