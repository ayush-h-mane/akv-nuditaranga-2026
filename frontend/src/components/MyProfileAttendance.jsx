import React, { useState } from "react";
import {
  CalendarDays,
  Clock3,
  UserRound,
  RefreshCw,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  Save,
  Info
} from "lucide-react";
import { InstituteDepartmentSelect } from "./InstituteDepartmentSelect";
import { CandidatePhotoUpload } from "./CandidatePhotoUpload";
import { AKV_DOMAINS } from "../config/institutesData";
import { api } from "../services/api";

const Field = ({ label, value }) => (
  <div className="rounded-xl border border-stone-100 bg-stone-50 p-3">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</span>
    <span className="mt-1 block break-words text-sm font-semibold text-stone-900">{value || "—"}</span>
  </div>
);

export const MyProfileAttendance = ({ profile, attendanceData, loading, error, onRefresh }) => {
  const [localProfile, setLocalProfile] = useState(profile);
  const activeProfile = localProfile || profile;

  // Deadline: October 5, 2026, 11:59 PM IST (23:59:59)
  const deadline = new Date("2026-10-05T23:59:59+05:30");
  const isExpired = new Date() > deadline;
  const hasEdited = Boolean(activeProfile?.profile_edited_once);
  const canEdit = !hasEdited && !isExpired;

  // Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmedOneTime, setConfirmedOneTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const [form, setForm] = useState({
    name: activeProfile?.name || "",
    auid: activeProfile?.auid || "",
    email: activeProfile?.email || "",
    phone: activeProfile?.phone || "",
    institute: activeProfile?.institute || "Acharya Institute of Technology",
    department: activeProfile?.department || "",
    semester: activeProfile?.semester || 6,
    section: activeProfile?.section || "A",
    gender: activeProfile?.gender || "Male",
    role: activeProfile?.role || "PARTICIPANT",
    volunteer_domain: activeProfile?.volunteer_domain || "",
    photo_url: activeProfile?.photo_url || "",
    admin_type: activeProfile?.admin_type || "WORKING_COMMITTEE",
    faculty_id: activeProfile?.faculty_id || ""
  });

  const handleOpenModal = () => {
    setForm({
      name: activeProfile?.name || "",
      auid: activeProfile?.auid || "",
      email: activeProfile?.email || "",
      phone: activeProfile?.phone || "",
      institute: activeProfile?.institute || "Acharya Institute of Technology",
      department: activeProfile?.department || "",
      semester: activeProfile?.semester || 6,
      section: activeProfile?.section || "A",
      gender: activeProfile?.gender || "Male",
      role: activeProfile?.role || "PARTICIPANT",
      volunteer_domain: activeProfile?.volunteer_domain || "",
      photo_url: activeProfile?.photo_url || "",
      admin_type: activeProfile?.admin_type || "WORKING_COMMITTEE",
      faculty_id: activeProfile?.faculty_id || ""
    });
    setConfirmedOneTime(false);
    setEditError("");
    setEditSuccess("");
    setShowEditModal(true);
  };

  const handleSaveOneTime = async (e) => {
    e.preventDefault();
    if (!confirmedOneTime) {
      setEditError("Please check the confirmation box acknowledging that this is a ONE-TIME edit.");
      return;
    }
    setSubmitting(true);
    setEditError("");
    try {
      const payload = {
        name: form.name.trim(),
        auid: form.auid.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        institute: form.institute.trim(),
        department: form.department.trim(),
        semester: Number(form.semester) || 6,
        section: form.section.trim() || "A",
        gender: form.gender,
        role: form.role,
        volunteer_domain: form.volunteer_domain ? form.volunteer_domain.trim() : null,
        photo_url: form.photo_url || null
      };

      if (activeProfile?.role === "ADMIN" || activeProfile?.role === "SUPERADMIN") {
        if (form.admin_type) payload.admin_type = form.admin_type;
        if (form.faculty_id) payload.faculty_id = form.faculty_id.trim();
      }

      const res = await api.updateProfileOneTime(payload);
      if (res.user) {
        setLocalProfile(res.user);
      }
      setEditSuccess("Your details have been successfully updated! This one-time edit is now locked.");
      setTimeout(() => {
        setShowEditModal(false);
        if (onRefresh) onRefresh();
      }, 1500);
    } catch (err) {
      setEditError(err.message || "Failed to update profile details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const rows = [
    ...(attendanceData?.registered_events || []).map((record) => ({
      date: record.event_date || record.registered_at,
      kind: record.event_title_en ? `Event check-in • ${record.event_title_en}` : "Event check-in",
      status: record.status || "REGISTERED",
      check_in_time: record.checkin_time,
      check_out_time: null,
    })),
    ...(attendanceData?.attendance_records || []).map((record) => ({ ...record, kind: "Official attendance" })),
    ...(attendanceData?.volunteer_info?.attendance_history || []).map((record) => ({
      ...record,
      kind: "Volunteer attendance",
      check_out_time: null,
    })),
    ...(attendanceData?.working_committee_info?.attendance_history || []).map((record) => ({
      ...record,
      kind: "Working committee attendance",
    })),
  ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const domainLabel = activeProfile?.is_working_committee
    ? (activeProfile?.volunteer_domain || activeProfile?.akv_dept || activeProfile?.working_committee_role || "General")
    : (activeProfile?.volunteer_domain || activeProfile?.role);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. ONE-TIME PROFILE EDIT OPPORTUNITY BANNER               */}
      {/* ========================================================= */}
      {canEdit && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-500 p-2.5 text-white shadow-xs shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-extrabold text-amber-950">One-Time Profile Details Update Available</h4>
                <span className="rounded-full bg-amber-200 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase tracking-wide">
                  Single Chance
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed max-w-2xl">
                You have a one-time opportunity to update all your account details (Name, AUID, Email, Phone, Dept, Sem, etc.).
                This window is strictly valid until <strong>October 5, 2026, 11:59 PM IST (05/10/2026)</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-kar-red px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 cursor-pointer transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Edit3 className="h-4 w-4" />
            Edit My Details (1-Time)
          </button>
        </div>
      )}

      {hasEdited && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs text-emerald-900">
            <span className="font-bold">One-Time Profile Update Completed</span>: Your details have been permanently recorded and locked
            {activeProfile?.profile_edited_at ? ` on ${new Date(activeProfile.profile_edited_at).toLocaleDateString()}` : ""}.
          </div>
        </div>
      )}

      {isExpired && !hasEdited && (
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3.5 shadow-xs">
          <Clock3 className="h-5 w-5 text-stone-500 shrink-0" />
          <div className="text-xs text-stone-600">
            <span className="font-bold">Profile Update Window Closed</span>: The one-time details update deadline ended on October 5, 2026, 11:59 PM.
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PROFILE CARD                                           */}
      {/* ========================================================= */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-kar-red" />
            <h2 className="font-extrabold text-stone-900">My Profile</h2>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleOpenModal}
              className="text-xs font-bold text-kar-red hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Details
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={activeProfile?.name} />
          <Field label="AUID" value={activeProfile?.auid} />
          <Field label="Registration ID" value={activeProfile?.registration_id} />
          <Field label="Email" value={activeProfile?.email} />
          <Field label="Phone" value={activeProfile?.phone} />
          <Field label="AKV_DOMAIN" value={domainLabel} />
          <Field label="Institute" value={activeProfile?.institute} />
          <Field label="Department" value={activeProfile?.department} />
          <Field label="Semester" value={activeProfile?.semester ? `Sem ${activeProfile.semester}` : "—"} />
          {(activeProfile?.admin_type || activeProfile?.faculty_id) && (
            <Field label="Assignment / ID" value={[activeProfile?.admin_type, activeProfile?.faculty_id].filter(Boolean).join(" • ")} />
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. ATTENDANCE HISTORY                                     */}
      {/* ========================================================= */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-kar-red" />
            <div>
              <h2 className="font-extrabold text-stone-900">My Attendance</h2>
              <p className="text-xs text-stone-500">Your attendance history, including check-in and check-out times.</p>
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-50 transition-colors"
              title="Refresh My Attendance & Profile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-kar-red" : ""}`} />
            </button>
          )}
        </div>
        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>
        ) : loading ? (
          <p className="p-5 text-center text-sm font-semibold text-stone-500">Loading your profile and attendance…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-stone-50 p-6 text-center">
            <Clock3 className="mx-auto mb-2 h-6 w-6 text-stone-400" />
            <p className="font-bold text-stone-700">No attendance records yet</p>
            <p className="mt-1 text-xs text-stone-500">Your records will appear here after attendance is marked.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Attendance</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Check-in</th>
                  <th className="px-3 py-3">Check-out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((record, index) => (
                  <tr key={`${record.kind}-${record.date}-${index}`}>
                    <td className="px-3 py-3 font-semibold text-stone-800">{record.date_dmy || record.date || "—"}</td>
                    <td className="px-3 py-3 text-stone-700">{record.kind}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">{record.status || "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-stone-700">{record.check_in_time || "—"}</td>
                    <td className="px-3 py-3 text-stone-700">{record.check_out_time || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 4. ONE-TIME PROFILE EDIT MODAL                            */}
      {/* ========================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-amber-100 p-2 text-amber-700">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-xl font-extrabold text-stone-900">One-Time Profile Update</h3>
                  <p className="text-xs font-bold text-amber-800">
                    Window Deadline: October 5, 2026, 11:59 PM IST (05/10/2026)
                  </p>
                </div>
              </div>

              {/* Warning Banner */}
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Important Notice:</strong> You can only submit this update <strong>once</strong>. After saving,
                  your profile details will be permanently locked and cannot be edited again. Please verify all information carefully.
                </span>
              </div>
            </div>

            {/* Error / Success Alerts */}
            {editError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {editError}
              </div>
            )}
            {editSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {editSuccess}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveOneTime} className="space-y-4">
              {/* Profile Photo Upload */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <CandidatePhotoUpload
                  photoUrl={form.photo_url}
                  onPhotoChange={(url) => setForm({ ...form, photo_url: url })}
                  label="Candidate / Profile Photo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    AUID (College ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.auid}
                    onChange={(e) => setForm({ ...form, auid: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono uppercase focus:ring-2 focus:ring-kar-red focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    College Email ID *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Institute & Department Selector */}
              <InstituteDepartmentSelect
                institute={form.institute}
                onInstituteChange={(inst) => setForm({ ...form, institute: inst })}
                department={form.department}
                onDepartmentChange={(dept) => setForm({ ...form, department: dept })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm uppercase focus:ring-2 focus:ring-kar-red focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Role and AKV domain selection for students/volunteers */}
              {activeProfile?.role !== "ADMIN" && activeProfile?.role !== "SUPERADMIN" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Participation Role
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden bg-white"
                    >
                      <option value="PARTICIPANT">Participant (General Fest Competitor)</option>
                      <option value="VOLUNTEER">Volunteer (AKV Event Support)</option>
                      <option value="SPECTATOR">Spectator (Audience Member)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      AKV Domain {form.role === "VOLUNTEER" ? "*" : "(Optional)"}
                    </label>
                    <select
                      value={form.volunteer_domain || ""}
                      onChange={(e) => setForm({ ...form, volunteer_domain: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden bg-white"
                    >
                      <option value="">-- Select AKV Domain --</option>
                      {AKV_DOMAINS.map((dom) => (
                        <option key={dom} value={dom}>
                          {dom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Admin specific fields if applicable */}
              {(activeProfile?.role === "ADMIN" || activeProfile?.role === "SUPERADMIN") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100 pt-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Admin Type
                    </label>
                    <select
                      value={form.admin_type}
                      onChange={(e) => setForm({ ...form, admin_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden bg-white"
                    >
                      <option value="WORKING_COMMITTEE">Working Committee</option>
                      <option value="FACULTY_COORDINATOR">Faculty Coordinator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      AKV Domain
                    </label>
                    <select
                      value={form.volunteer_domain || ""}
                      onChange={(e) => setForm({ ...form, volunteer_domain: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden bg-white"
                    >
                      <option value="">-- Select AKV Domain --</option>
                      {AKV_DOMAINS.map((dom) => (
                        <option key={dom} value={dom}>
                          {dom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.admin_type === "FACULTY_COORDINATOR" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                        Faculty ID
                      </label>
                      <input
                        type="text"
                        value={form.faculty_id}
                        onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
                        placeholder="e.g. AIT-FAC-01"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-kar-red focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Checkbox */}
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={confirmedOneTime}
                    onChange={(e) => setConfirmedOneTime(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-stone-300 text-kar-red focus:ring-kar-red"
                  />
                  <span className="text-xs font-bold text-red-950 leading-relaxed">
                    I confirm that I want to update my details now. I understand that this is a <strong>ONE-TIME</strong> update
                    and my account details will be permanently locked after saving.
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !confirmedOneTime}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-kar-red text-xs font-bold text-white shadow-xs hover:bg-red-700 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save My Details (Lock Update)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
