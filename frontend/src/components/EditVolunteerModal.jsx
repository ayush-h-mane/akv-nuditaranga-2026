import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  X,
  Check,
  AlertCircle,
  Save,
  Lock,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { VolunteerIDCardModal } from "./VolunteerIDCardModal";
import {
  ACHARYA_INSTITUTES,
  STANDARD_DEPARTMENTS,
  AKV_DOMAINS
} from "../config/institutesData";

export const EditVolunteerModal = ({
  volunteer,
  isOpen,
  onClose,
  onSuccess,
  isDeveloperMode = false,
  showError,
  showSuccess
}) => {
  if (!isOpen || !volunteer) return null;

  const [form, setForm] = useState({
    name: "",
    auid: "",
    email: "",
    phone: "",
    institute: "",
    department: "",
    semester: 1,
    section: "A",
    gender: "Male",
    volunteer_domain: "",
    role: "VOLUNTEER",
    account_status: "ACTIVE",
    password: "",
    photo_url: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showIdPreview, setShowIdPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (volunteer) {
      setForm({
        name: volunteer.name || volunteer.full_name || "",
        auid: volunteer.auid || "",
        email: volunteer.email || "",
        phone: volunteer.phone || "",
        institute: volunteer.institute || "Acharya Institute of Technology",
        department: volunteer.department || "",
        semester: volunteer.semester ? Number(volunteer.semester) : 1,
        section: volunteer.section || "A",
        gender: volunteer.gender || "Male",
        volunteer_domain: volunteer.volunteer_domain || "General Volunteer",
        role: volunteer.role || "VOLUNTEER",
        account_status: volunteer.account_status || "ACTIVE",
        password: "",
        photo_url: volunteer.photo_url || ""
      });
      setErrorMsg("");
      setShowPassword(false);
    }
  }, [volunteer, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.name.trim()) {
      setErrorMsg("Volunteer name is required.");
      return;
    }
    if (!form.auid.trim()) {
      setErrorMsg("College AUID is required.");
      return;
    }
    if (!form.email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        auid: form.auid.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        institute: form.institute.trim(),
        department: form.department.trim(),
        semester: Number(form.semester) || 1,
        section: form.section.trim().toUpperCase(),
        gender: form.gender,
        volunteer_domain: form.volunteer_domain.trim() || null,
        role: form.role,
        account_status: form.account_status,
        photo_url: form.photo_url?.trim() || null
      };

      if (form.password && form.password.trim()) {
        payload.password = form.password.trim();
      }

      const volunteerId = volunteer.id || volunteer.user_id;
      const res = isDeveloperMode
        ? await api.updateDeveloperVolunteerProfile(volunteerId, payload)
        : await api.updateVolunteerProfile(volunteerId, payload);

      if (showSuccess) {
        showSuccess(res.message || `Volunteer profile for "${payload.name}" updated successfully.`);
      }

      if (onSuccess) {
        onSuccess(res.volunteer || { ...volunteer, ...payload });
      }
      onClose();
    } catch (err) {
      const msg = err.message || "Failed to update volunteer profile.";
      setErrorMsg(msg);
      if (showError) showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-5 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-kar-red/30 border border-red-500/40 flex items-center justify-center text-white font-black text-base shadow-sm shrink-0">
              {form.photo_url ? (
                <img src={form.photo_url} alt={form.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span>{(form.name || "V").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  Edit Volunteer Profile
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-kar-red/30 text-red-300 border border-red-500/40">
                  {isDeveloperMode ? "DEVELOPER OVERRIDE" : "VOLUNTEER"}
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                AUID: <strong className="text-amber-300">{volunteer.auid || "N/A"}</strong>
                {volunteer.registration_id && (
                  <span> • Reg ID: <strong className="text-stone-200">{volunteer.registration_id}</strong></span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2.5 font-bold">
              <AlertCircle className="w-4 h-4 text-kar-red shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Personal Info */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>Volunteer Identity & Contact</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Ayush Mane"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-stone-900 bg-stone-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  College AUID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.auid}
                  onChange={(e) => handleChange("auid", e.target.value.toUpperCase())}
                  placeholder="e.g. AIT23BEAI129"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono text-stone-900 bg-stone-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value.toLowerCase())}
                  placeholder="e.g. student@acharya.ac.in"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-stone-900 bg-stone-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono text-stone-900 bg-stone-50/50"
                />
              </div>
            </div>
          </div>

          {/* Section: Academic Details */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-stone-500" />
              <span>Academic Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Institute
                </label>
                <select
                  value={form.institute}
                  onChange={(e) => handleChange("institute", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-stone-800 bg-stone-50/50"
                >
                  {ACHARYA_INSTITUTES.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Department / Branch
                </label>
                <select
                  value={STANDARD_DEPARTMENTS.includes(form.department) ? form.department : "CUSTOM"}
                  onChange={(e) => {
                    if (e.target.value !== "CUSTOM") handleChange("department", e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-stone-800 bg-stone-50/50"
                >
                  {STANDARD_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  <option value="CUSTOM">Custom / Other Department...</option>
                </select>
                {(!STANDARD_DEPARTMENTS.includes(form.department) || form.department === "") && (
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => handleChange("department", e.target.value)}
                    placeholder="Type custom department name"
                    className="w-full mt-1.5 px-3 py-1.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-xs text-stone-900 bg-white"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={form.semester}
                    onChange={(e) => handleChange("semester", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-stone-900 bg-stone-50/50"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={form.section}
                    onChange={(e) => handleChange("section", e.target.value.toUpperCase())}
                    placeholder="A / B / C"
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-stone-900 bg-stone-50/50 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-stone-900 bg-stone-50/50"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Volunteer Domain & System Roles */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-kar-red" />
              <span>AKV Volunteer Domain & Role</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Volunteer Assigned Domain
                </label>
                <div className="flex gap-2">
                  <select
                    value={AKV_DOMAINS.includes(form.volunteer_domain) ? form.volunteer_domain : "CUSTOM"}
                    onChange={(e) => {
                      if (e.target.value !== "CUSTOM") handleChange("volunteer_domain", e.target.value);
                    }}
                    className="w-1/2 px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-kar-red bg-stone-50/50"
                  >
                    <option value="General Volunteer">General Volunteer</option>
                    {AKV_DOMAINS.map((dom) => (
                      <option key={dom} value={dom}>
                        {dom} Domain
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Domain...</option>
                  </select>
                  <input
                    type="text"
                    value={form.volunteer_domain}
                    onChange={(e) => handleChange("volunteer_domain", e.target.value)}
                    placeholder="Enter or customize domain name"
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-stone-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  System Account Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-stone-800 bg-stone-50/50"
                >
                  <option value="VOLUNTEER">VOLUNTEER (Official Festival Duty)</option>
                  <option value="PARTICIPANT">PARTICIPANT (General Student)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Account Status
                </label>
                <select
                  value={form.account_status}
                  onChange={(e) => handleChange("account_status", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden ${
                    form.account_status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-red-50 text-red-800 border-red-300"
                  }`}
                >
                  <option value="ACTIVE">ACTIVE (Can Log In & Check In)</option>
                  <option value="DISABLED">DISABLED (Suspended)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Optional Password Reset */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Assign New Password (Optional)</span>
              </label>
              <span className="text-[10px] text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full font-bold">
                Leave blank to keep unchanged
              </span>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Enter new password to reset (min 4 characters)"
                className="w-full px-3 py-2 pr-10 rounded-xl border border-amber-300 text-stone-900 bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] text-stone-500 font-medium">Quick preset:</span>
              <button
                type="button"
                onClick={() => handleChange("password", "Akv@2026")}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-mono font-bold cursor-pointer"
              >
                Akv@2026
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowIdPreview(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-stone-800 font-bold text-xs border border-stone-300 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
              title="Preview Updated Official ID Card"
            >
              <CreditCard className="w-3.5 h-3.5 text-kar-red" />
              <span>Preview ID Card</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Save className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`} />
            <span>{submitting ? "Saving Profile..." : "Save Volunteer Profile"}</span>
          </button>
        </div>
      </div>

      {/* Volunteer ID Card Preview Modal */}
      <VolunteerIDCardModal
        volunteer={{
          ...volunteer,
          ...form,
          name: form.name || volunteer.name,
          auid: form.auid || volunteer.auid,
          department: form.department || volunteer.department,
          volunteer_domain: form.volunteer_domain || volunteer.volunteer_domain,
          phone: form.phone || volunteer.phone,
          photo_url: form.photo_url || volunteer.photo_url
        }}
        isOpen={showIdPreview}
        onClose={() => setShowIdPreview(false)}
        isPreview={true}
      />
    </div>
  );
};
