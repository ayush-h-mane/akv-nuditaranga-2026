import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { api } from "../services/api";
import { X, ZoomIn, Image as ImageIcon } from "lucide-react";

export const GallerySection = () => {
  const { lang, t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await api.getGallery();
      setGallery(data || []);
    } catch (err) {
      console.warn("Failed to load gallery items:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="gallery" className="py-20 bg-stone-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-red-50 text-kar-red border border-red-200 uppercase tracking-wider">
            {t("gallery.badge")}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 font-display mt-3 mb-2">
            {t("gallery.heading")}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 font-kannada">
            {t("gallery.subheading")}
          </p>
        </div>

        {/* Gallery Grid */}
        {gallery.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((photo) => {
              const title = lang === "kn" ? (photo.title_kn || photo.titleKn || photo.title_en) : (photo.title_en || photo.titleEn);
              const desc = lang === "kn" ? (photo.desc_kn || photo.descKn || photo.desc_en) : (photo.desc_en || photo.descEn);

              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedImage(photo)}
                  className="group relative h-64 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer border border-stone-200/80 bg-stone-900"
                >
                  <img
                    src={photo.image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                    loading="lazy"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                  {/* Zoom Icon */}
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transform group-hover:scale-100 scale-75 transition-all">
                    <ZoomIn className="w-4 h-4" />
                  </div>

                  {/* Event Name & Description only (No taglines) */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h4 className="text-base font-bold font-display leading-tight mb-1">
                      {title}
                    </h4>
                    {desc && (
                      <p className="text-xs text-stone-300 font-kannada line-clamp-2">
                        {desc}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-stone-300 max-w-xl mx-auto shadow-sm">
            <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800 mb-1">
              {lang === "kn" ? "ಚಿತ್ರಶಾಲೆಗೆ ಇನ್ನೂ ಫೋಟೋಗಳನ್ನು ಸೇರಿಸಲಾಗಿಲ್ಲ" : "No Photos in the Gallery Yet"}
            </h3>
            <p className="text-xs text-stone-500 font-kannada">
              {lang === "kn"
                ? "ಆಡಳಿತ ಪೋರ್ಟಲ್‌ನಿಂದ ಫೋಟೋಗಳನ್ನು ಸೇರಿಸಿದಾಗ ಅವು ಇಲ್ಲಿ ಪ್ರದರ್ಶನಗೊಳ್ಳುತ್ತವೆ."
                : "Photos added by the administrator from the Admin portal will appear here."}
            </p>
          </div>
        )}

      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-stone-950 rounded-3xl overflow-hidden border border-stone-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={selectedImage.image}
              alt={lang === "kn" ? (selectedImage.title_kn || selectedImage.titleKn) : (selectedImage.title_en || selectedImage.titleEn)}
              className="w-full max-h-[65vh] object-cover"
            />

            <div className="p-6 bg-stone-900 text-white">
              <h3 className="text-xl font-bold font-display mb-2">
                {lang === "kn" ? (selectedImage.title_kn || selectedImage.titleKn || selectedImage.title_en) : (selectedImage.title_en || selectedImage.titleEn)}
              </h3>
              {(selectedImage.desc_en || selectedImage.desc_kn || selectedImage.descEn || selectedImage.descKn) && (
                <p className="text-sm text-stone-300 font-kannada">
                  {lang === "kn" ? (selectedImage.desc_kn || selectedImage.descKn || selectedImage.desc_en) : (selectedImage.desc_en || selectedImage.descEn)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
