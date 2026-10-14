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
  ShieldCheck,
  Briefcase,
  Sparkles
} from "lucide-react";
import {
  ACHARYA_INSTITUTES,
  STANDARD_DEPARTMENTS,
  AKV_DOMAINS
} from "../config/institutesData";

export const EditAdminModal = ({
  admin,
  isOpen,
  onClose,
  onSuccess,
  isDeveloperMode = false,
  showError,
  showSuccess
}) => {
  if (!isOpen || !admin) return null;

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    auid: "",
    faculty_id: "",
    institute: "",
    department: "",
    admin_type: "WORKING_COMMITTEE",
    volunteer_domain: "",
    approval_status: "APPROVED",
    account_status: "ACTIVE",
    password: "",
    photo_url: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (admin) {
      setForm({
        full_name: admin.full_name || admin.name || "",
        username: admin.username || "",
        email: admin.email || "",
        phone: admin.phone || "",
        auid: admin.auid || admin.faculty_id || "",
        faculty_id: admin.faculty_id || admin.auid || "",
        institute: admin.institute || "Acharya Institute of Technology",
        department: admin.department || "",
        admin_type: admin.admin_type || (admin.role === "SUPERADMIN" ? "SUPERADMIN" : "WORKING_COMMITTEE"),
        volunteer_domain: admin.volunteer_domain || admin.akv_domain || admin.akv_dept || "",
        approval_status: admin.approval_status || "APPROVED",
        account_status: admin.account_status || "ACTIVE",
        password: "",
        photo_url: admin.photo_url || ""
      });
      setErrorMsg("");
      setShowPassword(false);
    }
  }, [admin, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.full_name.trim()) {
      setErrorMsg("Administrator full name is required.");
      return;
    }
    if (!form.username.trim()) {
      setErrorMsg("Administrator username is required.");
      return;
    }
    if (!form.email.trim()) {
      setErrorMsg("Administrator email is required.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        full_name: form.full_name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        auid: form.auid.trim().toUpperCase(),
        faculty_id: (form.faculty_id || form.auid).trim().toUpperCase(),
        institute: form.institute.trim(),
        department: form.department.trim(),
        admin_type: form.admin_type,
        volunteer_domain: form.volunteer_domain.trim() || null,
        approval_status: form.approval_status,
        account_status: form.account_status,
        photo_url: form.photo_url?.trim() || null
      };

      if (form.password && form.password.trim()) {
        payload.password = form.password.trim();
      }

      const adminId = admin.id || admin.admin_id || admin.user_id;
      const res = isDeveloperMode
        ? await api.updateDeveloperAdminProfile(adminId, payload)
        : await api.updateAdminProfile(adminId, payload);

      if (showSuccess) {
        showSuccess(res.message || `Administrator profile for "${payload.full_name}" updated successfully.`);
      }

      if (onSuccess) {
        onSuccess(res.admin || { ...admin, ...payload });
      }
      onClose();
    } catch (err) {
      const msg = err.message || "Failed to update administrator profile.";
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
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-base shadow-sm shrink-0">
              {form.photo_url ? (
                <img src={form.photo_url} alt={form.full_name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span>{(form.full_name || "A").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  Edit Administrator Profile
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isDeveloperMode ? "DEVELOPER OVERRIDE" : "SUPERADMIN"}
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                Username: <strong className="text-stone-200">{admin.username || "N/A"}</strong>
                {(admin.auid || admin.faculty_id) && (
                  <span> • ID: <strong className="text-amber-300">{admin.faculty_id || admin.auid}</strong></span>
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

          {/* Section: Core Identity */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>Core Identity & Credentials</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-stone-900 bg-stone-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value.toLowerCase())}
                  placeholder="e.g. ramesh_ait"
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
                  placeholder="e.g. rameshkumar@acharya.ac.in"
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

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  College AUID / Faculty ID
                </label>
                <input
                  type="text"
                  value={form.auid}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    handleChange("auid", val);
                    handleChange("faculty_id", val);
                  }}
                  placeholder="e.g. AIT2024FAC01 or ADM-MANE"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono text-stone-900 bg-stone-50/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Admin Designation / Role
                </label>
                <select
                  value={form.admin_type}
                  onChange={(e) => handleChange("admin_type", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-stone-800 bg-stone-50/50"
                >
                  <option value="FACULTY_COORDINATOR">Faculty Coordinator</option>
                  <option value="WORKING_COMMITTEE">Working Committee Head</option>
                  <option value="ADMIN">General Administrator</option>
                  {isDeveloperMode && <option value="SUPERADMIN">Super Administrator</option>}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Academic Affiliation & Domain */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <Building className="w-3.5 h-3.5 text-stone-500" />
              <span>Academic Affiliation & Vedike Domain</span>
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

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  AKV Assigned Domain / Committee Area
                </label>
                <div className="flex gap-2">
                  <select
                    value={AKV_DOMAINS.includes(form.volunteer_domain) ? form.volunteer_domain : "CUSTOM"}
                    onChange={(e) => {
                      if (e.target.value !== "CUSTOM") handleChange("volunteer_domain", e.target.value);
                    }}
                    className="w-1/2 px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-kar-red bg-stone-50/50"
                  >
                    <option value="">-- No Domain Assigned --</option>
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
            </div>
          </div>

          {/* Section: Status & Governance */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5 border-b border-stone-100 pb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
              <span>Approval & Account Governance</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Approval Status
                </label>
                <select
                  value={form.approval_status}
                  onChange={(e) => handleChange("approval_status", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden ${
                    form.approval_status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : form.approval_status === "PENDING_APPROVAL"
                      ? "bg-amber-50 text-amber-900 border-amber-300"
                      : "bg-red-50 text-red-800 border-red-300"
                  }`}
                >
                  <option value="APPROVED">APPROVED (Active Coordinator Access)</option>
                  <option value="PENDING_APPROVAL">PENDING_APPROVAL (Under Review)</option>
                  <option value="REJECTED">REJECTED (Access Revoked)</option>
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
                      ? "bg-stone-50 text-stone-900 border-stone-300"
                      : "bg-red-50 text-red-800 border-red-300"
                  }`}
                >
                  <option value="ACTIVE">ACTIVE (Can Log In)</option>
                  <option value="DISABLED">DISABLED (Account Suspended)</option>
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
              <span className="text-[10px] text-stone-500 font-medium">Quick presets:</span>
              <button
                type="button"
                onClick={() => handleChange("password", "AkvAdmin@2026")}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-mono font-bold cursor-pointer"
              >
                AkvAdmin@2026
              </button>
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
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-kar-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Save className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`} />
            <span>{submitting ? "Saving Profile..." : "Save Admin Profile"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
