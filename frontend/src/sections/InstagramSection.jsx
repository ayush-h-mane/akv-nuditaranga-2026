import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { toKannadaDigits } from "../utils/kannadaUtils";
import { ExternalLink, Heart, MessageCircle, Send, Play } from "lucide-react";

const InstagramIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const ReelsBadgeIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 3h-15C3.1 3 2 4.1 2 5.5v13C2 19.9 3.1 21 4.5 21h15c1.4 0 2.5-1.1 2.5-2.5v-13C22 4.1 20.9 3 19.5 3zm-9.5 12.5v-7l6 3.5-6 3.5z" />
  </svg>
);

export const InstagramSection = () => {
  const { lang, t } = useLanguage();

  const originalReels = [
    {
      id: 1,
      type: "reel",
      url: "https://www.instagram.com/reel/DO0nSDlD3hT/",
      likes: "1,420",
      views: "18.5K",
      comments: "68",
      captionEn: "Looking for passionate volunteers & cultural performers! Catch the rehearsal energy, stage preparations, and vibrant spirit of Acharya Kannada Vedike. Tap to watch the full reel! 🎭✨ #AcharyaKannadaVedike #Nuditaranga #CampusLife",
      captionKn: "ಆಚಾರ್ಯ ಕನ್ನಡ ವೇದಿಕೆಯ ಉತ್ಸಾಹಿ ಕಾರ್ಯಕರ್ತರು ಮತ್ತು ಕಲಾವಿದರ ಭರ್ಜರಿ ತಾಲೀಮು! ಸಂಪೂರ್ಣ ರೀಲ್ ವೀಕ್ಷಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ! 🎭✨ #AcharyaKannadaVedike #Nuditaranga",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=80"
    },
    {
      id: 2,
      type: "reel",
      url: "https://www.instagram.com/reel/DBDFM2sCYBH/",
      likes: "2,180",
      views: "27.3K",
      comments: "142",
      captionEn: "Grand Nuditaranga cultural festival celebrations on the main Acharya stadium stage! Unmatched euphoria and youth passion. 🚩🔥 #Nuditaranga2026 #Rajyotsava #AKV",
      captionKn: "ಆಚಾರ್ಯ ಮುಖ್ಯ ವೇದಿಕೆಯಲ್ಲಿ ನುಡಿತರಂಗ ಸಾಂಸ್ಕೃತಿಕ ಹಬ್ಬದ ಸಂಭ್ರಮ! ಕನ್ನಡದ ಕಂಪು, ಯುವಜನತೆಯ ಅದ್ಭುತ ಉತ್ಸಾಹ. 🚩🔥 #Nuditaranga2026 #AKV",
      image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=700&q=80"
    },
    {
      id: 3,
      type: "reel",
      url: "https://www.instagram.com/reel/DEzA7hJo3HS/",
      likes: "1,890",
      views: "22.1K",
      comments: "98",
      captionEn: "Thunderous beats of traditional Dollu Kunitha and Veeragase folk dance echoing across Acharya campus! Pure cultural pride. 🥁💛❤️ #DolluKunitha #Veeragase #AcharyaInstitutes",
      captionKn: "ಆಚಾರ್ಯ ಕ್ರೀಡಾಂಗಣದಲ್ಲಿ ಪ್ರತಿಧ್ವನಿಸಿದ ಗಂಡುಗಲೆಯ ಡೊಳ್ಳು ಕುಣಿತ ಮತ್ತು ವೀರಗಾಸೆ ನೃತ್ಯ ವೈಭವ! ಶುದ್ಧ ಜಾನಪದ ಸೊಬಗು. 🥁💛❤️ #DolluKunitha",
      image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=700&q=80"
    }
  ];

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200 uppercase tracking-wider">
              {t("social.badge")}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 font-display mt-3 mb-2">
              {t("social.heading")}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-kannada">
              {t("social.subheading")}
            </p>
          </div>

          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          >
            <InstagramIcon className="w-5 h-5" />
            <span>{t("social.followBtn")}</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>

        {/* Instagram Interactive Reel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {originalReels.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              title={lang === "kn" ? "Instagram ನಲ್ಲಿ ಈ ರೀಲ್ ವೀಕ್ಷಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ" : "Tap to watch this reel on Instagram"}
              className="group rounded-3xl border border-stone-200/90 bg-white shadow-sm hover:shadow-2xl hover:border-pink-300 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer transform hover:-translate-y-1.5 block no-underline"
            >
              {/* Instagram Card Header */}
              <div className="p-3.5 flex items-center justify-between border-b border-stone-100 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-xs">
                    <img
                      src="/images/akv-logo.png"
                      alt="Acharya Kannada Vedike"
                      className="w-full h-full object-contain rounded-full bg-white p-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block leading-tight group-hover:text-pink-600 transition-colors">
                      acharyakannadavedike
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {lang === "kn" ? "ಆಚಾರ್ಯ ಆವರಣ, ಬೆಂಗಳೂರು" : "Acharya Campus, Bengaluru"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-pink-600">
                  <InstagramIcon className="w-4 h-4" />
                </div>
              </div>

              {/* Reel Media Container with Overlay */}
              <div className="relative h-64 bg-stone-950 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.captionEn}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100"
                  loading="lazy"
                />

                {/* Reels Badge */}
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white flex items-center gap-1.5 shadow-md">
                  <ReelsBadgeIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[10px] font-black tracking-wider uppercase">
                    {lang === "kn" ? "ರೀಲ್" : "Reel"}
                  </span>
                </div>

                {/* Views Counter */}
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-white text-white" />
                  <span>{lang === "kn" ? toKannadaDigits(post.views) : post.views}</span>
                </div>

                {/* Center Play Overlay on Hover */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-pink-600 shadow-2xl transform scale-75 group-hover:scale-100 transition-all duration-300">
                    <Play className="w-6 h-6 fill-pink-600 text-pink-600 ml-0.5" />
                  </div>
                </div>

                {/* Subtle Gradient Shadow */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              </div>

              {/* Social Engagement Stats & Captions */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between bg-white">
                <div>
                  <div className="flex items-center gap-3 text-stone-700 mb-2">
                    <span className="text-red-500">
                      <Heart className="w-5 h-5 fill-red-500" />
                    </span>
                    <span className="text-stone-700">
                      <MessageCircle className="w-5 h-5" />
                    </span>
                    <span className="text-stone-700">
                      <Send className="w-4 h-4" />
                    </span>
                  </div>

                  <span className="text-xs font-bold text-stone-900 block mb-1">
                    {lang === "kn" ? `${toKannadaDigits(post.likes)} ಮೆಚ್ಚುಗೆಗಳು` : `${post.likes} likes`}
                  </span>

                  <p className="text-xs text-stone-700 font-kannada leading-relaxed line-clamp-3">
                    <span className="font-bold text-stone-900 mr-1.5">acharyakannadavedike</span>
                    {lang === "kn" ? post.captionKn : post.captionEn}
                  </p>
                </div>

                {/* Tap to redirect button */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-pink-600 group-hover:text-pink-700 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <InstagramIcon className="w-3.5 h-3.5" />
                    <span>{t("social.watchReel")}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 transform group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
};
