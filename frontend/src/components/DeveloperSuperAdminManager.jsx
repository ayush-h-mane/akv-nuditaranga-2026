import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { EditAdminModal } from "./EditAdminModal";
import { EditVolunteerModal } from "./EditVolunteerModal";
import {
  ShieldAlert,
  UserPlus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Mail,
  Phone,
  Building,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Users,
  GraduationCap,
  Sparkles
} from "lucide-react";
import { AKV_DOMAINS } from "../config/institutesData";

export const DeveloperSuperAdminManager = ({ showError, showSuccess }) => {
  // Navigation Sub-Tabs: "superadmins" | "admins" | "volunteers"
  const [activeSubTab, setActiveSubTab] = useState("superadmins");

  // 1. SUPERADMINS STATE
  const [superadmins, setSuperadmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Visibility toggle for plaintext passwords by id
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Superadmin Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Superadmin Form States
  const [createForm, setCreateForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    auid: "",
    phone: "",
    department: "Department of Kannada Vedike",
    institute: "Acharya Institute of Technology"
  });

  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    password: "",
    email: "",
    auid: "",
    phone: "",
    department: "",
    institute: "",
    account_status: "ACTIVE"
  });

  // 2. ADMINS & FACULTY STATE
  const [adminsList, setAdminsList] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminApprovalFilter, setAdminApprovalFilter] = useState("all");
  const [editingAdminTarget, setEditingAdminTarget] = useState(null);

  // 3. VOLUNTEERS STATE
  const [volunteersList, setVolunteersList] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [volunteerDomainFilter, setVolunteerDomainFilter] = useState("all");
  const [editingVolunteerTarget, setEditingVolunteerTarget] = useState(null);

  // ==========================================
  // DATA LOADERS
  // ==========================================
  const loadSuperAdmins = async () => {
    try {
      setLoading(true);
      const data = await api.getDeveloperSuperAdmins(true);
      const cleanList = (data || []).filter(
        (a) => a.username?.toLowerCase() !== "nanu" && a.auid !== "DEV-NANU"
      );
      setSuperadmins(cleanList);
    } catch (err) {
      if (showError) showError(err.message || "Failed to load superadmin list.");
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      setAdminsLoading(true);
      const data = await api.listAdmins(true);
      const cleanList = (data || []).filter(
        (a) =>
          a.username !== "akv-nt-2026" &&
          a.email !== "akv@acharya.ac.in" &&
          a.username?.toLowerCase() !== "nanu" &&
          a.auid !== "DEV-NANU"
      );
      setAdminsList(cleanList);
    } catch (err) {
      if (showError) showError(err.message || "Failed to load administrators.");
    } finally {
      setAdminsLoading(false);
    }
  };

  const loadVolunteers = async () => {
    try {
      setVolunteersLoading(true);
      const data = await api.listAllVolunteers({}, true);
      const cleanList = (data || []).filter(
        (v) => v.auid !== "DEV-NANU" && v.role !== "DEVELOPER"
      );
      setVolunteersList(cleanList);
    } catch (err) {
      if (showError) showError(err.message || "Failed to load volunteers.");
    } finally {
      setVolunteersLoading(false);
    }
  };

  useEffect(() => {
    loadSuperAdmins();
    loadAdmins();
    loadVolunteers();
  }, []);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // ==========================================
  // SUPERADMIN ACTIONS
  // ==========================================
  const handleOpenCreate = () => {
    setCreateForm({
      name: "",
      username: "",
      password: "",
      email: "",
      auid: "",
      phone: "",
      department: "Department of Kannada Vedike",
      institute: "Acharya Institute of Technology"
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.username || !createForm.password || !createForm.email || !createForm.auid) {
      if (showError) showError("Please fill in all required fields.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.createDeveloperSuperAdmin(createForm);
      if (showSuccess) showSuccess(res.message || "Superadmin profile created successfully.");
      setCreateModalOpen(false);
      loadSuperAdmins();
    } catch (err) {
      if (showError) showError(err.message || "Failed to create superadmin profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name || "",
      username: admin.username || "",
      password: "",
      email: admin.email || "",
      auid: admin.auid || "",
      phone: admin.phone || "",
      department: admin.department || "",
      institute: admin.institute || "",
      account_status: admin.account_status || "ACTIVE"
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      setSubmitting(true);
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      const res = await api.updateDeveloperSuperAdmin(selectedAdmin.id, payload);
      if (showSuccess) showSuccess(res.message || "Superadmin profile updated successfully.");
      setEditModalOpen(false);
      setSelectedAdmin(null);
      loadSuperAdmins();
    } catch (err) {
      if (showError) showError(err.message || "Failed to update superadmin profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (admin) => {
    setSelectedAdmin(admin);
    setDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedAdmin) return;
    try {
      setSubmitting(true);
      const res = await api.deleteDeveloperSuperAdmin(selectedAdmin.id);
      if (showSuccess) showSuccess(res.message || "Superadmin profile deleted successfully.");
      setDeleteModalOpen(false);
      setSelectedAdmin(null);
      loadSuperAdmins();
    } catch (err) {
      if (showError) showError(err.message || "Failed to delete superadmin profile.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Superadmins
  const filteredSuperadmins = superadmins.filter((sa) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      sa.name?.toLowerCase().includes(q) ||
      sa.username?.toLowerCase().includes(q) ||
      sa.auid?.toLowerCase().includes(q) ||
      sa.email?.toLowerCase().includes(q) ||
      sa.department?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && sa.account_status === "ACTIVE") ||
      (statusFilter === "inactive" && sa.account_status !== "ACTIVE");

    return matchesSearch && matchesStatus;
  });

  // Filtered Admins
  const filteredAdmins = adminsList.filter((adm) => {
    const q = adminSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      adm.full_name?.toLowerCase().includes(q) ||
      adm.username?.toLowerCase().includes(q) ||
      adm.auid?.toLowerCase().includes(q) ||
      adm.email?.toLowerCase().includes(q) ||
      adm.department?.toLowerCase().includes(q) ||
      adm.phone?.toLowerCase().includes(q);

    const matchesApproval =
      adminApprovalFilter === "all" ||
      (adminApprovalFilter === "pending" && adm.approval_status === "PENDING_APPROVAL") ||
      (adminApprovalFilter === "approved" && adm.approval_status === "APPROVED") ||
      (adminApprovalFilter === "rejected" && adm.approval_status === "REJECTED");

    return matchesSearch && matchesApproval;
  });

  // Filtered Volunteers
  const filteredVolunteers = volunteersList.filter((vol) => {
    const q = volunteerSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      vol.name?.toLowerCase().includes(q) ||
      vol.auid?.toLowerCase().includes(q) ||
      vol.email?.toLowerCase().includes(q) ||
      vol.department?.toLowerCase().includes(q) ||
      vol.phone?.toLowerCase().includes(q) ||
      vol.volunteer_domain?.toLowerCase().includes(q);

    const matchesDomain =
      volunteerDomainFilter === "all" ||
      (vol.volunteer_domain || "").toLowerCase() === volunteerDomainFilter.toLowerCase();

    return matchesSearch && matchesDomain;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Tabs Navigation */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-black text-white p-6 rounded-3xl border border-stone-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Developer Profiles & Accounts Manager
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DEVELOPER PRIVILEGED
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Direct authority to inspect credentials, view plain passwords, and edit profiles of all Volunteers, Admins, and Superadmins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (activeSubTab === "superadmins") loadSuperAdmins();
                else if (activeSubTab === "admins") loadAdmins();
                else loadVolunteers();
              }}
              disabled={loading || adminsLoading || volunteersLoading}
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Current Directory"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading || adminsLoading || volunteersLoading ? "animate-spin text-amber-400" : ""
                }`}
              />
            </button>
            {activeSubTab === "superadmins" && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Superadmin Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Directory Sub-Tabs Selector */}
        <div className="mt-6 flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("superadmins")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "superadmins"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-white hover:bg-stone-800/60"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Superadmin Profiles ({superadmins.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("admins")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "admins"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-white hover:bg-stone-800/60"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Admins & Faculty Profiles ({adminsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("volunteers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "volunteers"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-white hover:bg-stone-800/60"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Volunteer Profiles ({volunteersList.length})</span>
          </button>
        </div>

        {/* Search & Filter Bar Based on Active SubTab */}
        <div className="mt-4">
          {activeSubTab === "superadmins" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, username, AUID, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Statuses ({superadmins.length})</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          )}

          {activeSubTab === "admins" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search administrators by name, username, AUID, email, department..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={adminApprovalFilter}
                  onChange={(e) => setAdminApprovalFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Approvals ({adminsList.length})</option>
                  <option value="approved">Approved Only</option>
                  <option value="pending">Pending Approval</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}

          {activeSubTab === "volunteers" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search volunteers by name, AUID, domain, email, department..."
                  value={volunteerSearch}
                  onChange={(e) => setVolunteerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={volunteerDomainFilter}
                  onChange={(e) => setVolunteerDomainFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Domains ({volunteersList.length})</option>
                  {AKV_DOMAINS.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom} Domain
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUB-TAB 1: SUPERADMINS TABLE                         */}
      {/* ==================================================== */}
      {activeSubTab === "superadmins" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs font-bold">Querying Superadmin credentials...</span>
            </div>
          ) : filteredSuperadmins.length === 0 ? (
            <div className="p-12 text-center text-stone-500 space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-bold text-stone-700">No Superadmin profiles found</p>
              <p className="text-xs text-stone-400">
                Try adjusting your search criteria or create a new Superadmin profile.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase border-b border-stone-200 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Superadmin Details</th>
                    <th className="py-3.5 px-4">Official AUID</th>
                    <th className="py-3.5 px-4">Contact & Dept</th>
                    <th className="py-3.5 px-4">Credentials & Password</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  {filteredSuperadmins.map((sa) => {
                    const isVisible = visiblePasswords[sa.id];
                    const isCopied = copiedId === sa.id;
                    const displayPw = sa.plain_password || "[Hashed/Uncached]";

                    return (
                      <tr key={sa.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                              {sa.name?.[0]?.toUpperCase() || "S"}
                            </div>
                            <div>
                              <div className="font-extrabold text-stone-900 text-sm">{sa.name}</div>
                              <div className="text-[11px] font-mono text-amber-700 font-bold">
                                @{sa.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            {sa.auid || "N/A"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-stone-600">
                            <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="text-[11px] truncate max-w-[180px]">{sa.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-stone-600">
                            <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="text-[11px]">{sa.phone || "N/A"}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 truncate max-w-[180px]">
                            {sa.department}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-xl max-w-[210px]">
                            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="font-mono text-xs font-bold text-stone-900 truncate">
                              {isVisible ? displayPw : "••••••••"}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(sa.id)}
                                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
                                title={isVisible ? "Hide password" : "Show password"}
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(sa.plain_password || sa.username, sa.id)}
                                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
                                title="Copy password"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              sa.account_status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            {sa.account_status || "ACTIVE"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(sa)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                              title="Edit / Modify Superadmin Profile"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-700" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleOpenDelete(sa)}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-red-100 hover:text-red-700 text-stone-600 transition-colors cursor-pointer"
                              title="Delete Superadmin Profile"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 2: ADMINS & FACULTY TABLE                    */}
      {/* ==================================================== */}
      {activeSubTab === "admins" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          {adminsLoading ? (
            <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs font-bold">Querying Administrator accounts...</span>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-12 text-center text-stone-500 space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-bold text-stone-700">No Administrators found</p>
              <p className="text-xs text-stone-400">Try adjusting your search criteria or approval filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase border-b border-stone-200 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Admin Details</th>
                    <th className="py-3.5 px-4">AUID / Faculty ID</th>
                    <th className="py-3.5 px-4">Role & Domain</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Password</th>
                    <th className="py-3.5 px-4">Approval Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  {filteredAdmins.map((adm) => {
                    const isVisible = visiblePasswords[adm.id];
                    const isCopied = copiedId === adm.id;
                    const displayPw = adm.plain_password || "[Hashed/Uncached]";

                    return (
                      <tr key={adm.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {adm.photo_url ? (
                              <img
                                src={adm.photo_url}
                                alt={adm.full_name}
                                className="w-9 h-9 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center text-amber-300 font-black text-sm shrink-0 shadow-xs">
                                {(adm.full_name || "A").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-stone-900 text-sm">{adm.full_name}</div>
                              <div className="text-[11px] font-mono text-stone-500">
                                @{adm.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                          {adm.faculty_id || adm.auid || "N/A"}
                        </td>

                        <td className="py-3.5 px-4 space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            {adm.admin_type === "FACULTY_COORDINATOR"
                              ? "Faculty Coordinator"
                              : adm.role === "SUPERADMIN"
                              ? "Super Admin"
                              : "Working Committee"}
                          </span>
                          {adm.volunteer_domain && (
                            <div className="text-[10px] text-kar-red font-bold">
                              Domain: {adm.volunteer_domain}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="text-[11px] text-stone-700">{adm.email}</div>
                          <div className="text-[11px] font-mono text-stone-500">{adm.phone || "N/A"}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-xl max-w-[190px]">
                            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="font-mono text-xs font-bold text-stone-900 truncate">
                              {isVisible ? displayPw : "••••••••"}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(adm.id)}
                                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
                                title={isVisible ? "Hide password" : "Show password"}
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(adm.plain_password || adm.username, adm.id)}
                                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
                                title="Copy password"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              adm.approval_status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : adm.approval_status === "PENDING_APPROVAL"
                                ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            {adm.approval_status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingAdminTarget(adm)}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 3: VOLUNTEERS TABLE                          */}
      {/* ==================================================== */}
      {activeSubTab === "volunteers" && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          {volunteersLoading ? (
            <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs font-bold">Querying Volunteer accounts...</span>
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="p-12 text-center text-stone-500 space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-bold text-stone-700">No Volunteers found</p>
              <p className="text-xs text-stone-400">Try adjusting your search criteria or domain filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-extrabold uppercase border-b border-stone-200 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Volunteer Details</th>
                    <th className="py-3.5 px-4">AUID</th>
                    <th className="py-3.5 px-4">Assigned Domain</th>
                    <th className="py-3.5 px-4">Department & Sem</th>
                    <th className="py-3.5 px-4">Password</th>
                    <th className="py-3.5 px-4">Attendance</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  {filteredVolunteers.map((vol) => {
                    const isVisible = visiblePasswords[vol.id];
                    const isCopied = copiedId === vol.id;
                    const displayPw = vol.plain_password || "[Hashed/Uncached]";

                    return (
                      <tr key={vol.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {vol.photo_url ? (
                              <img
                                src={vol.photo_url}
                                alt={vol.name}
                                className="w-9 h-9 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-kar-red to-red-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                                {(vol.name || "V").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-stone-900 text-sm">{vol.name}</div>
                              <div className="text-[11px] text-stone-500 truncate max-w-[170px]">
                                {vol.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                          {vol.auid || "N/A"}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-kar-red bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-md text-[11px] inline-block">
                            {vol.volunteer_domain || "General Volunteer"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="text-stone-800 font-bold truncate max-w-[180px]">
                            {vol.department}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            Sem {vol.semester || "1"} • Sec {vol.section || "A"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-2.5 py-1.5 rounded-xl max-w-[190px]">
                            <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="font-mono text-xs font-bold text-stone-900 truncate">
                              {isVisible ? displayPw : "••••••••"}
                            </span>
                            <div className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(vol.id)}
                                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
                                title={isVisible ? "Hide password" : "Show password"}
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(vol.plain_password || vol.auid, vol.id)}
                                className="p-1 hover:bg-stone-200 rounded text-stone-500 cursor-pointer"
                                title="Copy password"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              vol.today_attendance === "PRESENT"
                                ? "bg-emerald-100 text-emerald-800"
                                : vol.today_attendance === "ABSENT"
                                ? "bg-red-100 text-red-800"
                                : "bg-stone-100 text-stone-500"
                            }`}
                          >
                            {vol.today_attendance || "NOT MARKED"}
                          </span>
                          <div className="text-[10px] text-stone-500 font-bold">
                            Total: {vol.total_days_present || 0} days
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingVolunteerTarget(vol)}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT ADMIN MODAL                                     */}
      {/* ==================================================== */}
      {editingAdminTarget && (
        <EditAdminModal
          admin={editingAdminTarget}
          isOpen={Boolean(editingAdminTarget)}
          onClose={() => setEditingAdminTarget(null)}
          onSuccess={(updated) => {
            setAdminsList((prev) =>
              prev.map((a) =>
                a.id === updated.id || a.user_id === updated.user_id
                  ? { ...a, ...updated }
                  : a
              )
            );
          }}
          isDeveloperMode={true}
          showError={showError}
          showSuccess={showSuccess}
        />
      )}

      {/* ==================================================== */}
      {/* EDIT VOLUNTEER MODAL                                 */}
      {/* ==================================================== */}
      {editingVolunteerTarget && (
        <EditVolunteerModal
          volunteer={editingVolunteerTarget}
          isOpen={Boolean(editingVolunteerTarget)}
          onClose={() => setEditingVolunteerTarget(null)}
          onSuccess={(updated) => {
            setVolunteersList((prev) =>
              prev.map((v) =>
                v.id === updated.id || v.user_id === updated.user_id
                  ? { ...v, ...updated }
                  : v
              )
            );
          }}
          isDeveloperMode={true}
          showError={showError}
          showSuccess={showSuccess}
        />
      )}

      {/* ==================================================== */}
      {/* SUPERADMIN CREATE MODAL                              */}
      {/* ==================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-stone-900">New Superadmin Profile</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    placeholder="e.g. Dr. Ramesh Kumar"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    placeholder="e.g. akvsaramesh"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    placeholder="e.g. ramesh@acharya.ac.in"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Official AUID / ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.auid}
                    onChange={(e) => setCreateForm({ ...createForm, auid: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold font-mono focus:outline-hidden focus:border-amber-500"
                    placeholder="e.g. AIT2024FAC01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Security Password *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-semibold focus:outline-hidden focus:border-amber-500"
                  placeholder="Minimum 4 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    placeholder="9999999999"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Superadmin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUPERADMIN EDIT MODAL                                */}
      {/* ==================================================== */}
      {editModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    Edit Superadmin: {selectedAdmin.name}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">@{selectedAdmin.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    AUID
                  </label>
                  <input
                    type="text"
                    value={editForm.auid}
                    onChange={(e) => setEditForm({ ...editForm, auid: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Set New Password (optional)
                </label>
                <input
                  type="text"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave blank to retain current password"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-semibold focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.account_status}
                    onChange={(e) => setEditForm({ ...editForm, account_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUPERADMIN DELETE CONFIRM MODAL                      */}
      {/* ==================================================== */}
      {deleteModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-black text-base text-stone-900">
                Purge Superadmin Account?
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Are you sure you want to delete profile for <strong>{selectedAdmin.name}</strong> (@
                {selectedAdmin.username})? This action will permanently remove their superadmin privileges.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
