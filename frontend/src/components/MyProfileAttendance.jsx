import React from "react";
import { CalendarDays, Clock3, UserRound, RefreshCw } from "lucide-react";

const Field = ({ label, value }) => (
  <div className="rounded-xl border border-stone-100 bg-stone-50 p-3">
    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</span>
    <span className="mt-1 block break-words text-sm font-semibold text-stone-900">{value || "—"}</span>
  </div>
);

export const MyProfileAttendance = ({ profile, attendanceData, loading, error, onRefresh }) => {
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
  const domainLabel = profile?.is_working_committee
    ? (profile?.volunteer_domain || profile?.akv_dept || profile?.working_committee_role || "General")
    : (profile?.volunteer_domain || profile?.role);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
          <UserRound className="h-5 w-5 text-kar-red" />
          <h2 className="font-extrabold text-stone-900">My Profile</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={profile?.name} />
          <Field label="AUID" value={profile?.auid} />
          <Field label="Registration ID" value={profile?.registration_id} />
          <Field label="Email" value={profile?.email} />
          <Field label="Phone" value={profile?.phone} />
          <Field label="AKV_DOMAIN" value={domainLabel} />
          <Field label="Institute" value={profile?.institute} />
          <Field label="Department" value={profile?.department} />
          <Field label="Semester" value={profile?.semester ? `Sem ${profile.semester}` : "—"} />
          {(profile?.admin_type || profile?.faculty_id) && (
            <Field label="Assignment / ID" value={[profile?.admin_type, profile?.faculty_id].filter(Boolean).join(" • ")} />
          )}
        </div>
      </section>

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
    </div>
  );
};
