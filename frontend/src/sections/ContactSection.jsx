import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { siteConfig } from "../config/siteConfig";
import { api } from "../services/api";
import { MapPin, Mail, Phone, Send, CheckCircle, UserCheck } from "lucide-react";

export const ContactSection = () => {
  const { lang, t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message || sending) return;
    setSending(true);
    setSendError("");
    try {
      await api.sendContactMessage(formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      setSendError(error.message || (lang === "kn" ? "ಸಂದೇಶ ಕಳುಹಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ." : "Message could not be sent. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-stone-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
            {t("contact.badge")}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 font-display mt-3 mb-2">
            {t("contact.heading")}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-kannada">
            {t("contact.subheading")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Faculty & Student Coordinators (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Faculty Advisors */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 font-display mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-kar-red" />
                <span>{t("contact.facultyTitle")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {siteConfig.coordinators.faculty.map((c, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-sm notranslate" translate="no">
                    {c.nameEn === "Ayush H Mane" ? (
                      <a href={c.portfolio} target="_blank" rel="noreferrer" className="text-sm font-bold text-stone-900 block font-display hover:text-kar-red hover:underline underline-offset-2 notranslate" translate="no">
                        {lang === "kn" ? c.nameKn : c.nameEn}
                      </a>
                    ) : (
                      <span className="text-sm font-bold text-stone-900 block font-display notranslate" translate="no">
                        {lang === "kn" ? c.nameKn : c.nameEn}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-kar-red block mt-0.5 notranslate" translate="no">
                      {lang === "kn" ? c.roleKn : c.roleEn}
                    </span>
                    <span className="text-[11px] text-stone-500 block mt-1 notranslate" translate="no">
                      {lang === "kn" ? (c.deptKn || c.dept) : (c.deptEn || c.dept)}
                    </span>
                    <a 
                      href={`tel:${c.contact.replace(/\s+/g, '')}`} 
                      className="mt-3 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-xs text-stone-700 font-mono hover:text-kar-red transition-colors group notranslate"
                      translate="no"
                      title={lang === "kn" ? `${c.nameKn} ಅವರಿಗೆ ಕರೆ ಮಾಡಿ` : `Call ${c.nameEn}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span className="group-hover:underline">{c.contact}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Coordinators */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 font-display mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-kar-yellow" />
                <span>{t("contact.studentTitle")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {siteConfig.coordinators.students.map((c, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-sm notranslate" translate="no">
                    <span className="text-sm font-bold text-stone-900 block font-display notranslate" translate="no">
                      {lang === "kn" ? c.nameKn : c.nameEn}
                    </span>
                    <span className="text-xs font-semibold text-amber-800 block mt-0.5 notranslate" translate="no">
                      {lang === "kn" ? c.roleKn : c.roleEn}
                    </span>
                    <span className="text-[11px] text-stone-500 block mt-1 notranslate" translate="no">
                      {lang === "kn" ? (c.deptKn || c.dept) : (c.deptEn || c.dept)}
                    </span>
                    <div className="mt-3 pt-2 border-t border-stone-100 space-y-1.5 text-xs text-stone-700 font-mono notranslate" translate="no">
                      <a 
                        href={`tel:${c.contact.replace(/\s+/g, '')}`} 
                        className="flex items-center gap-1.5 hover:text-kar-red transition-colors group"
                        title={lang === "kn" ? `${c.nameKn} ಅವರಿಗೆ ಕರೆ ಮಾಡಿ` : `Call ${c.nameEn}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-kar-red group-hover:scale-110 transition-transform" />
                        <span className="group-hover:underline">{c.contact}</span>
                      </a>
                      {c.email && (
                        <a 
                          href={`mailto:${c.email}`} 
                          className="flex items-center gap-1.5 hover:text-kar-red transition-colors group truncate text-[11px]"
                          title={`Email ${c.nameEn}`}
                        >
                          <Mail className="w-3.5 h-3.5 text-stone-400 group-hover:text-kar-red transition-colors shrink-0" />
                          <span className="group-hover:underline truncate">{c.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campus Address Card */}
            <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-sm space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                {t("contact.addressTitle")}
              </h4>
              <p className="text-sm font-bold text-stone-900">
                {lang === "kn" ? siteConfig.institution.kn : siteConfig.institution.en}
              </p>
              <div className="flex items-start gap-2 text-xs text-stone-600 pt-1">
                <MapPin className="w-4 h-4 text-kar-red flex-shrink-0 mt-0.5" />
                <span>
                  {lang === "kn" ? siteConfig.institution.address.kn : siteConfig.institution.address.en}
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Contact Message Form (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-stone-900 font-display mb-1">
                {t("contact.formTitle")}
              </h3>
              <p className="text-xs text-stone-500 mb-6 font-kannada">
                {lang === "kn" ? "ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ನಮಗೆ ರವಾನಿಸಿ, ನಾವು ಶೀಘ್ರದಲ್ಲೇ ಸಂಪರ್ಕಿಸುತ್ತೇವೆ." : "Leave us a message and our coordinator team will respond promptly."}
              </p>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-green-50 border border-green-200 text-center space-y-2 animate-fade-in">
                  <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
                  <h4 className="text-base font-bold text-green-900">
                    {t("contact.sentSuccess")}
                  </h4>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                  {sendError && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {sendError}
                    </div>
                  )}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t("contact.formName")}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Prajwal Kumar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t("contact.formEmail")}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. yourname@acharya.ac.in"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t("contact.formSubject")}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. Nuditaranga Registration Query"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {t("contact.formMessage")}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Type your message here..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-kar-red/20 focus:border-kar-red"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-3 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-kar-red to-kar-yellow shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sending ? (lang === "kn" ? "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ..." : "Sending...") : t("contact.sendBtn")}</span>
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
