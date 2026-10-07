import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Cpu,
  Activity,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Server,
  Zap,
  Terminal
} from "lucide-react";

export const DeveloperDiagnostics = ({ showError, showSuccess }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flushingCache, setFlushingCache] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.getDeveloperSystemHealth();
      if (res && res.metrics) {
        setHealthData(res.metrics);
      }
    } catch (err) {
      if (showError) showError(err.message || "Failed to fetch developer system diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleFlushCache = async () => {
    try {
      setFlushingCache(true);
      const res = await api.flushDeveloperCache();
      if (showSuccess) showSuccess(res.message || "Cache successfully flushed across all nodes.");
      await fetchHealth();
    } catch (err) {
      if (showError) showError(err.message || "Failed to flush system cache.");
    } finally {
      setFlushingCache(false);
    }
  };

  const handleClearClientCache = () => {
    try {
      localStorage.removeItem("akv_events_cache_v2");
      localStorage.removeItem("akv_registrations_cache_v2");
      localStorage.removeItem("akv_users_cache_v2");
      localStorage.removeItem("akv_admins_cache_v2");
      localStorage.removeItem("akv_attendance_cache_v2");
      localStorage.removeItem("akv_audit_logs_cache_v2");
      localStorage.removeItem("akv_activities_cache_v2");
      localStorage.removeItem("akv_gallery_cache_v2");
      localStorage.removeItem("akv_schedule_cache_v2");
      localStorage.removeItem("akv_reels_cache_v2");
      if (showSuccess) showSuccess("Client localStorage cache cleared. Reloading memory cache.");
    } catch (err) {
      if (showError) showError("Failed to clear local cache.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-6 rounded-3xl border border-stone-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Developer Diagnostics & Infrastructure
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Real-time database statistics, engine telemetry, and server cache management.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Metrics</span>
            </button>
            <button
              onClick={handleFlushCache}
              disabled={flushingCache}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${flushingCache ? "animate-bounce" : ""}`} />
              <span>{flushingCache ? "Flushing..." : "Flush Server Cache"}</span>
            </button>
            <button
              onClick={handleClearClientCache}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
              title="Clear Local Client Storage"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Engine and Node Info */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-stone-950/70 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Database Dialect</span>
            <div className="font-mono text-sm font-extrabold text-amber-400 mt-0.5 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>{healthData?.database_engine?.toUpperCase() || "SQLITE / POSTGRES"}</span>
            </div>
          </div>

          <div className="p-3 bg-stone-950/70 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Operational Status</span>
            <div className="font-mono text-sm font-extrabold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>{healthData?.status || "OPERATIONAL (200 OK)"}</span>
            </div>
          </div>

          <div className="p-3 bg-stone-950/70 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-bold text-stone-400 uppercase">Server Time (UTC)</span>
            <div className="font-mono text-xs font-bold text-stone-300 mt-0.5 truncate">
              {healthData?.timestamp ? new Date(healthData.timestamp).toUTCString() : "Live Sync"}
            </div>
          </div>

          <div className="p-3 bg-stone-950/70 rounded-2xl border border-stone-800/80">
            <span className="text-[10px] font-bold text-stone-400 uppercase">System Session</span>
            <div className="font-mono text-sm font-extrabold text-cyan-400 mt-0.5 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>ROOT-NANU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Database Counts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Registered Users", val: healthData?.users_total ?? "-", icon: Users, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Student Participants", val: healthData?.students_total ?? "-", icon: Users, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Registered Volunteers", val: healthData?.volunteers_total ?? "-", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Faculty / Committee Admins", val: healthData?.admins_total ?? "-", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "SuperAdmin Profiles", val: healthData?.superadmins_total ?? "-", icon: Server, color: "text-rose-500", bg: "bg-rose-50" },
          { label: "Configured Events", val: healthData?.events_total ?? "-", icon: Calendar, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Event Registrations", val: healthData?.registrations_total ?? "-", icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Daily Attendance Scans", val: healthData?.volunteer_attendance_total ?? "-", icon: Clock, color: "text-teal-500", bg: "bg-teal-50" },
          { label: "Working Committee Records", val: healthData?.wc_attendance_total ?? "-", icon: CheckCircle2, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Security Audit Records", val: healthData?.audit_logs_total ?? "-", icon: Activity, color: "text-red-500", bg: "bg-red-50" }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase block">{item.label}</span>
                <p className="text-2xl font-black text-stone-900 mt-1 font-mono">{item.val}</p>
              </div>
              <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
