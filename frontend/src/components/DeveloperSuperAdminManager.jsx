import React, { useState, useEffect } from "react";
import { api } from "../services/api";
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
  KeyRound
} from "lucide-react";

export const DeveloperSuperAdminManager = ({ showError, showSuccess }) => {
  const [superadmins, setSuperadmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Visibility toggle for plaintext passwords by admin id
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
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

  const loadSuperAdmins = async () => {
    try {
      setLoading(true);
      const data = await api.getDeveloperSuperAdmins();
      // Ensure developer 'nanu' is strictly excluded
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

  useEffect(() => {
    loadSuperAdmins();
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

  const filteredAdmins = superadmins.filter((sa) => {
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-black text-white p-6 rounded-3xl border border-stone-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Superadmin Profiles Manager
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DEVELOPER PRIVILEGED
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Full authority to keep, modify credentials, plain passwords, and purge Superadmin accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadSuperAdmins}
              disabled={loading}
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Superadmin Profile</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </div>

      {/* Superadmins Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs font-bold">Querying Superadmin credentials...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-2">
            <ShieldAlert className="w-10 h-10 mx-auto text-stone-300" />
            <p className="text-sm font-bold text-stone-700">No Superadmin profiles found</p>
            <p className="text-xs text-stone-400">Try adjusting your search criteria or create a new Superadmin profile.</p>
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
                {filteredAdmins.map((sa) => {
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
                            className="p-2 rounded-xl bg-stone-100 hover:bg-amber-100 hover:text-amber-800 text-stone-600 transition-colors cursor-pointer"
                            title="Edit / Modify Superadmin Profile"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(sa)}
                            className="p-2 rounded-xl bg-stone-100 hover:bg-red-100 hover:text-red-700 text-stone-600 transition-colors cursor-pointer"
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

      {/* CREATE MODAL */}
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
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    placeholder="Min. 4 characters"
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
                    onChange={(e) => setCreateForm({ ...createForm, auid: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-bold focus:outline-hidden focus:border-amber-500 uppercase"
                    placeholder="e.g. AIT2024FAC01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    College Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    placeholder="name@acharya.ac.in"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    placeholder="10-digit number"
                  />
                </div>
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Superadmin Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">Modify Superadmin Profile</h3>
                  <p className="text-[11px] text-stone-500">ID #{selectedAdmin.id} • @{selectedAdmin.username}</p>
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
                    required
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
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Reset Password (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    placeholder="Leave empty to keep current"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Official AUID / ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.auid}
                    onChange={(e) => setEditForm({ ...editForm, auid: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-bold focus:outline-hidden focus:border-amber-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    College Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
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
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-lg text-stone-900">Delete Superadmin Profile?</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                You are about to permanently delete the profile for{" "}
                <strong className="text-stone-900">{selectedAdmin.name}</strong> (@{selectedAdmin.username} • {selectedAdmin.auid}).
                This will revoke Superadmin access immediately.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
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
