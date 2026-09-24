import React, { useRef } from "react";
import { Camera, Upload, X, User } from "lucide-react";

export const CandidatePhotoUpload = ({ photoUrl, onPhotoChange, label = "Upload Candidate Photo" }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: warning if > 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize down to max 400x400 on canvas for fast storage & crisp display
        const canvas = document.createElement("canvas");
        const maxDim = 400;
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

        // Convert to webp/jpeg data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        onPhotoChange(dataUrl);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onPhotoChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
        {label} <span className="text-stone-400 font-normal lowercase">(for ID card & pass)</span>
      </label>

      <div className="flex items-center gap-4">
        {/* Photo Preview / Placeholder */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 hover:border-kar-red transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group shrink-0 shadow-xs"
          title="Click to select photo"
        >
          {photoUrl ? (
            <>
              <img 
                src={photoUrl} 
                alt="Candidate Preview" 
                className="w-full h-full object-cover" 
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1 bg-stone-900/80 hover:bg-red-600 text-white rounded-full transition-colors shadow-xs"
                title="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-amber-700 group-hover:text-kar-red transition-colors">
              <Camera className="w-6 h-6 stroke-[1.5]" />
              <span className="text-[10px] font-bold mt-0.5">Add</span>
            </div>
          )}
        </div>

        {/* Upload Instruction */}
        <div className="text-xs text-stone-500 leading-tight space-y-1.5">
          <p className="font-medium text-stone-700">
            {photoUrl ? "Photo ready for profile, badge & pass." : "Upload passport-style face photo."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3 h-3 text-kar-red" />
              <span>{photoUrl ? "Change Photo" : "Choose File"}</span>
            </button>
            {photoUrl && (
              <span className="text-[11px] font-semibold text-emerald-600">Attached</span>
            )}
          </div>
        </div>

        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileSelect} 
        />
      </div>
    </div>
  );
};
