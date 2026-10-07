import React, { useState } from "react";
import { ArrowDown, MessageCircle, Sparkles } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export const FestivalMascot = () => {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const kannada = lang === "kn";

  const exploreSchedule = () => {
    document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-red-50" aria-label={kannada ? "ನುಡಿತರಂಗದ ಪರಿಚಯ" : "Meet the Nuditaranga festival guide"}>
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-0 px-4 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:px-8">
        <div className="relative z-10 py-10 sm:py-14 lg:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-white/75 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-900 shadow-sm">
            <Sparkles size={14} className="shrink-0 text-kar-red" />
            <span>{kannada ? "ನಿಮ್ಮ ನೋಗ್ರಾಜ್" : "Nimma NOGRAJ"}</span>
          </span>
          <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight text-stone-900 sm:text-4xl lg:text-5xl">
            {kannada ? "ಕರುನಾಡ ವೈಭವಕ್ಕೆ" : "Meet the spirit of"}<span className="block text-kar-red">{kannada ? "ಸ್ವಾಗತ!" : "Karunada Vaibhava"}</span>
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-700 sm:text-lg">
            {open
              ? (kannada ? "ನಮಸ್ಕಾರ! ನುಡಿತರಂಗದ ಐದು ದಿನಗಳ ಕಾರ್ಯಕ್ರಮವನ್ನು ನೋಡೋಣವೇ?" : "Namaskara! Ready to explore five days of Kannada culture, music and celebration?")
              : (kannada ? "ನಮ್ಮ ಹಬ್ಬದ ಗೆಳೆಯನನ್ನು ಭೇಟಿಯಾಗಿ — ನುಡಿತರಂಗದ ಕಾರ್ಯಕ್ರಮ, ಕಲೆ ಮತ್ತು ಸಂಭ್ರಮವನ್ನು ಒಟ್ಟಿಗೆ ಅನ್ವೇಷಿಸಿ." : "Meet your festival companion and discover the performances, traditions and celebrations of Nuditaranga.")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex items-center gap-2 rounded-xl border-2 border-kar-red bg-white px-5 py-3 text-sm font-extrabold text-kar-red shadow-sm transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kar-red">
              <MessageCircle size={17} />{open ? (kannada ? "ಧನ್ಯವಾದಗಳು!" : "Nice to meet you!") : (kannada ? "ಮಾತನಾಡಿ" : "Say hello")}
            </button>
            <button type="button" onClick={exploreSchedule} className="inline-flex items-center gap-2 rounded-xl bg-kar-red px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/15 transition hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kar-red">
              <ArrowDown size={17} />{kannada ? "ಕಾರ್ಯಕ್ರಮ ನೋಡಿ" : "Explore the schedule"}
            </button>
          </div>
        </div>
        <div className="relative mx-auto flex h-[330px] w-full max-w-[340px] items-end justify-center sm:h-[430px] sm:max-w-[440px] lg:h-[500px] lg:max-w-none">
          <div className="pointer-events-none absolute bottom-5 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-full bg-amber-900/15 blur-2xl" />
          <img src="/images/nograj.png?v=2026" alt={kannada ? "ಕರ್ನಾಟಕ ಧ್ವಜ ಹಿಡಿದಿರುವ ನೋಗ್ರಾಜ್" : "NOGRAJ holding the Karnataka flag"} className="relative z-10 h-full w-auto max-w-full object-contain object-bottom drop-shadow-[0_12px_16px_rgba(69,32,10,0.18)] motion-safe:animate-[float_5s_ease-in-out_infinite]" />
        </div>
      </div>
    </section>
  );
};
