import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { generalRules } from "../config/generalRules";
import { BookOpen, ArrowLeft } from "lucide-react";

export const RulesPage = ({ onBack }) => {
  const { lang } = useLanguage();
  const rules = lang === "kn" ? generalRules.kn : generalRules.en;

  return (
    <section className="min-h-screen bg-stone-50 pt-28 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-kar-red hover:text-red-800 mb-8">
          <ArrowLeft className="w-4 h-4" />
          {lang === "kn" ? "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ" : "Back to website"}
        </button>
        <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-6 sm:p-10">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-kar-red flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black tracking-[0.18em] uppercase text-amber-700">Acharya Kannada Vedike</p>
              <h1 className="text-2xl sm:text-4xl font-black text-stone-900 mt-1">
                {lang === "kn" ? "ಸಾಮಾನ್ಯ ನಿಯಮಗಳು, ನಿಯಮಾವಳಿಗಳು ಮತ್ತು ಸೂಚನೆಗಳು" : "General Rules, Regulations & Instructions"}
              </h1>
            </div>
          </div>
          <ol className="space-y-4 list-decimal list-outside pl-5 text-sm sm:text-base text-stone-700 leading-relaxed">
            {rules.map((rule, index) => <li key={index} className="pl-2">{rule}</li>)}
          </ol>
        </div>
      </div>
    </section>
  );
};
