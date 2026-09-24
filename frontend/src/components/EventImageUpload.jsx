import React, { useRef, useState } from "react";
import { Image as ImageIcon, Upload, X, Link as LinkIcon } from "lucide-react";

export const EventImageUpload = ({ imageUrl, onImageChange, label = "Event / Activity Image", required = false }) => {
  const fileInputRef = useRef(null);
  const [useUrlMode, setUseUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Please select an image smaller than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200; // high quality for gallery/activity display
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        onImageChange(dataUrl);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onImageChange(urlInput.trim());
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onImageChange("");
    setUrlInput("");
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
          onClick={() => setUseUrlMode(!useUrlMode)}
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
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
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
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-36 rounded-2xl border-2 border-dashed border-stone-300 hover:border-kar-red bg-stone-50 hover:bg-amber-50/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group text-stone-500 hover:text-kar-red p-4"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-stone-200 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5 text-kar-red" />
          </div>
          <div className="text-center">
            <span className="text-xs font-bold block text-stone-700 group-hover:text-kar-red">
              Click to select or drag & drop photo
            </span>
            <span className="text-[11px] text-stone-400">JPG, PNG, WebP up to 10MB</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}
    </div>
  );
};
