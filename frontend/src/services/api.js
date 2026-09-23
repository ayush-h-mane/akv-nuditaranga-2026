import { initialEvents } from "../config/eventsData";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Local fallback storage keys
const STORAGE_EVENTS_KEY = "akv_events_cache_v2";
const STORAGE_REGS_KEY = "akv_registrations_cache_v2";

function getLocalEvents() {
  try {
    const data = localStorage.getItem(STORAGE_EVENTS_KEY);
    return data ? JSON.parse(data) : [...initialEvents];
  } catch (e) {
    return [...initialEvents];
  }
}

function saveLocalEvents(events) {
  try {
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

function getLocalRegistrations() {
  try {
    const data = localStorage.getItem(STORAGE_REGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalRegistration(reg) {
  try {
    const list = getLocalRegistrations();
    list.unshift(reg);
    localStorage.setItem(STORAGE_REGS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

// Helper to get auth header
function getAuthHeaders() {
  const token = localStorage.getItem("akv_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // ==========================================
  // AUTHENTICATION APIs
  // ==========================================
  async studentRegister(payload) {
    const res = await fetch(`${API_BASE_URL}/auth/register/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Student registration failed");
    }
    return data;
  },

  async studentLogin(auid, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auid, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "AUID or password is incorrect.");
    }
    return data;
  },

  async forgotPassword(identifier) {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to process forgot password request");
    }
    return data;
  },

  async resetPassword(token, newPassword, confirmPassword) {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to reset password");
    }
    return data;
  },

  async adminRegister(payload) {
    const res = await fetch(`${API_BASE_URL}/auth/register/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Admin registration failed");
    }
    return data;
  },

  async adminLogin(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Admin login failed");
    }
    return data;
  },

  async getCurrentUser() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error("Session expired or invalid");
    return await res.json();
  },

  // ==========================================
  // STUDENT DASHBOARD APIs
  // ==========================================
  async getStudentDashboard() {
    const res = await fetch(`${API_BASE_URL}/student/dashboard`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch student dashboard");
    return data;
  },

  async getMyRegistrations() {
    const res = await fetch(`${API_BASE_URL}/student/my-registrations`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch registrations");
    return data;
  },

  async studentRegisterEvent(payload) {
    const res = await fetch(`${API_BASE_URL}/student/register-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Event registration failed");
    return data;
  },

  async changeStudentPassword(currentPassword, newPassword, confirmPassword) {
    const res = await fetch(`${API_BASE_URL}/student/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to change password");
    return data;
  },

  // ==========================================
  // APPROVED ADMIN APIs
  // ==========================================
  async getAdminOverview() {
    const res = await fetch(`${API_BASE_URL}/admin/overview`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch admin overview");
    return data;
  },

  async getTodayVolunteers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/admin/volunteers/today${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch volunteer list");
    return data;
  },

  async markVolunteerAttendance(volunteerUserId, status) {
    const res = await fetch(`${API_BASE_URL}/admin/volunteers/attendance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        volunteer_user_id: volunteerUserId,
        status: status
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to mark attendance");
    return data;
  },

  // ==========================================
  // SUPER ADMIN APIs
  // ==========================================
  async getSuperAdminStats() {
    const res = await fetch(`${API_BASE_URL}/superadmin/stats`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch Super Admin stats");
    return data;
  },

  async listStudents(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/superadmin/students${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to list students");
    return data;
  },

  async updateStudent(userId, payload) {
    const res = await fetch(`${API_BASE_URL}/superadmin/students/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update student");
    return data;
  },

  async deleteStudent(userId) {
    const res = await fetch(`${API_BASE_URL}/superadmin/students/${userId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to delete student");
    return data;
  },

  async listAdmins() {
    const res = await fetch(`${API_BASE_URL}/superadmin/admins`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to list admins");
    return data;
  },

  async approveAdmin(adminId) {
    const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}/approve`, {
      method: "POST",
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to approve admin");
    return data;
  },

  async rejectAdmin(adminId) {
    const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}/reject`, {
      method: "POST",
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to reject admin");
    return data;
  },

  async toggleAdminStatus(adminId) {
    const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}/toggle-status`, {
      method: "POST",
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to toggle admin status");
    return data;
  },

  async deleteAdmin(adminId) {
    const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to remove admin");
    return data;
  },

  async listAllVolunteers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/superadmin/volunteers${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to list volunteers");
    return data;
  },

  async getSuperAdminAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/superadmin/attendance${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch attendance");
    return data;
  },

  async updateAttendanceRecord(attendanceId, status, notes = "") {
    const res = await fetch(`${API_BASE_URL}/superadmin/attendance/${attendanceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update attendance record");
    return data;
  },

  async markAttendanceForDate(volunteerUserId, date, status = "PRESENT", notes = "") {
    const res = await fetch(`${API_BASE_URL}/superadmin/attendance/mark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        volunteer_user_id: volunteerUserId,
        date,
        status,
        notes
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to mark attendance");
    return data;
  },

  async exportAttendanceCsv(date = "all") {
    const query = date && date !== "all" ? `?date=${date}` : "";
    const res = await fetch(`${API_BASE_URL}/superadmin/attendance/export-csv${query}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error("Failed to export attendance CSV");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AKV_Nuditaranga_2026_Volunteer_Attendance_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async exportAttendanceXlsx(date = "all") {
    const query = date && date !== "all" ? `?date=${date}` : "";
    const res = await fetch(`${API_BASE_URL}/superadmin/attendance/export-xlsx${query}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error("Failed to export attendance XLSX");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AKV_Nuditaranga_2026_Volunteer_Attendance.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/superadmin/audit-logs${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch audit logs");
    return data;
  },

  // ==========================================
  // EXISTING EVENTS, CHECK-IN & GALLERY APIs
  // ==========================================
  async getEvents(category = "all", activeOnly = true) {
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);
      if (!activeOnly) params.append("active_only", "false");
      const queryString = params.toString() ? `?${params.toString()}` : "";
      
      const res = await fetch(`${API_BASE_URL}/events${queryString}`);
      if (res.ok) {
        const data = await res.json();
        saveLocalEvents(data);
        return data;
      }
    } catch (err) {
      console.warn("Backend unavailable, using client dataset for events:", err.message);
    }
    let list = getLocalEvents();
    if (activeOnly) {
      list = list.filter(e => e.is_active);
    }
    return category === "all" ? list : list.filter(e => e.category === category);
  },

  async getEvent(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Backend unavailable:", err.message);
    }
    const local = getLocalEvents();
    return local.find(e => e.id === id) || null;
  },

  async createEvent(payload) {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to create event");
    }
    return data;
  },

  async updateEvent(eventId, payload) {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to update event");
    }
    return data;
  },

  async deleteEvent(eventId) {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to delete event");
    }
    return data;
  },

  async createRegistration(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/registrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Registration failed. Please check details.");
      }
      return data;
    } catch (err) {
      if (err.message && !err.message.includes("Failed to fetch")) {
        throw err;
      }
      const localList = getLocalRegistrations();
      const count = localList.length + 1;
      const regId = `AKV26${String(count).padStart(3, "0")}`;
      const ev = initialEvents.find(e => e.id === payload.event_id);
      const newRecord = {
        id: count,
        registration_id: regId,
        ...payload,
        status: "Registered",
        created_at: new Date().toISOString(),
        event: ev || null
      };
      saveLocalRegistration(newRecord);
      return newRecord;
    }
  },

  async getRegistration(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/registrations/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Backend fetch failed:", err.message);
    }
    const localList = getLocalRegistrations();
    const found = localList.find(r => 
      r.registration_id.toLowerCase() === id.trim().toLowerCase() ||
      (r.auid && r.auid.toLowerCase() === id.trim().toLowerCase()) ||
      (r.usn && r.usn.toLowerCase() === id.trim().toLowerCase())
    );
    if (found) return found;
    throw new Error("Registration ID or USN not found.");
  },

  async checkIn(registrationId, agent = "Organizer") {
    const res = await fetch(`${API_BASE_URL}/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ registration_id: registrationId, agent })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Check-in failed.");
    }
    return data;
  },

  async getStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/stats`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable:", err.message);
    }
    const local = getLocalRegistrations();
    return {
      total_events: initialEvents.length,
      total_registrations: local.length,
      checked_in_count: 0,
      pending_checkin_count: local.length,
      events_breakdown: []
    };
  },

  async listRegistrations(filter = {}) {
    const params = new URLSearchParams();
    if (filter.event_id) params.append("event_id", filter.event_id);
    if (filter.department) params.append("department", filter.department);
    if (filter.status) params.append("status", filter.status);
    if (filter.search) params.append("search", filter.search);

    const res = await fetch(`${API_BASE_URL}/registrations?${params.toString()}`);
    if (res.ok) return await res.json();
    return getLocalRegistrations();
  },

  // Activities & Gallery
  async getActivities(category = "all", activeOnly = true) {
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);
      if (!activeOnly) params.append("active_only", "false");
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE_URL}/activities${queryString}`);
      if (res.ok) return await res.json();
    } catch (err) {}
    return [];
  },

  async getGallery() {
    try {
      const res = await fetch(`${API_BASE_URL}/gallery`);
      if (res.ok) return await res.json();
    } catch (err) {}
    return [];
  }
};
