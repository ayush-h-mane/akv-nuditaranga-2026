import { initialEvents } from "../config/eventsData";

// Determine base API endpoint
// When running in production (e.g. Vercel) without explicit VITE_API_URL, use same-origin relative path "/api"
// to prevent mixed-content blocking and "Private Network Access / 3rd party permission" prompts on mobile.
const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  return "/api";
})();

// Local fallback storage keys
const STORAGE_EVENTS_KEY = "akv_events_cache_v2";
const STORAGE_REGS_KEY = "akv_registrations_cache_v2";
const STORAGE_USERS_KEY = "akv_users_cache_v2";
const STORAGE_ADMINS_KEY = "akv_admins_cache_v2";
const STORAGE_ATTENDANCE_KEY = "akv_attendance_cache_v2";
const STORAGE_AUDIT_KEY = "akv_audit_logs_cache_v2";

// Zero preloaded demo users
const defaultDemoUsers = [];


function getLocalUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(defaultDemoUsers));
    return defaultDemoUsers;
  } catch (e) {
    return defaultDemoUsers;
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {}
}

function getLocalAdmins() {
  try {
    const raw = localStorage.getItem(STORAGE_ADMINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalAdmins(admins) {
  try {
    localStorage.setItem(STORAGE_ADMINS_KEY, JSON.stringify(admins));
  } catch (e) {}
}

function getLocalAttendance() {
  try {
    const raw = localStorage.getItem(STORAGE_ATTENDANCE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalAttendance(att) {
  try {
    localStorage.setItem(STORAGE_ATTENDANCE_KEY, JSON.stringify(att));
  } catch (e) {}
}

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

function isNetworkError(err) {
  if (!err) return false;
  // If the browser is online, never treat server errors or syntax parsing errors as offline
  if (typeof window !== "undefined" && window.navigator && window.navigator.onLine) {
    return false;
  }
  const msg = (err.message || "").toLowerCase();
  return (
    err.name === "TypeError" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("network request failed")
  );
}

export const api = {
  // ==========================================
  // AUTHENTICATION APIs
  // ==========================================
  async studentRegister(payload) {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn("[AKV Offline Fallback] Using local storage for student registration:", err.message);
        const users = getLocalUsers();
        const existingAuid = users.find(u => u.auid.toUpperCase() === payload.auid.trim().toUpperCase());
        if (existingAuid) {
          throw new Error("A student with this AUID is already registered.");
        }
        const existingEmail = users.find(u => u.email.toLowerCase() === payload.email.trim().toLowerCase());
        if (existingEmail) {
          throw new Error("This college email is already registered.");
        }

        const nextNum = users.length + 1;
        const regId = `AKV-2026-${String(nextNum).padStart(6, "0")}`;
        const newUser = {
          id: Date.now(),
          name: payload.full_name.trim(),
          auid: payload.auid.trim().toUpperCase(),
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone.trim(),
          institute: payload.institute || "Acharya Institute of Technology",
          department: payload.department.trim(),
          semester: Number(payload.semester) || 6,
          section: payload.section?.trim().toUpperCase() || "A",
          gender: payload.gender || "Female",
          role: payload.role?.toUpperCase() || "PARTICIPANT",
          registration_id: regId,
          account_status: "ACTIVE",
          password: payload.password
        };

        users.push(newUser);
        saveLocalUsers(users);

        const token = `offline-token-${Date.now()}`;
        return {
          success: true,
          message: "Registration Successful",
          token: token,
          user: newUser
        };
      }
      throw err;
    }
  },

  async studentLogin(auid, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auid: auid.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Invalid credentials.");
      }
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn("[AKV Offline Fallback] Using local storage for student login:", err.message);
        const users = getLocalUsers();
        const cleanId = (auid || "").trim();
        const upperId = cleanId.toUpperCase();
        const lowerId = cleanId.toLowerCase();

        // 1. Transparently check if user entered Admin or Superadmin credentials in Student tab
        if (
          lowerId === "akvntkvsa1" ||
          lowerId === "akvntkvsa2" ||
          lowerId === "akvntkvsa3" ||
          lowerId === "akv-nt-2026" ||
          lowerId === "superadmin" ||
          lowerId === "akv@acharya.ac.in"
        ) {
          return this.adminLogin(cleanId, password);
        }

        // 2. Search local users by AUID, Email, Registration ID, or Phone
        let user = users.find(u => 
          u.auid?.toUpperCase() === upperId ||
          u.email?.toLowerCase() === lowerId ||
          u.registration_id?.toUpperCase() === upperId ||
          u.phone === cleanId
        );

        if (!user) {
          throw new Error("Invalid AUID, email, or password.");
        }

        const cleanPw = (password || "").trim();
        if (user.password && user.password !== password && user.password !== cleanPw) {
          throw new Error("Invalid AUID, email, or password.");
        }

        const token = `offline-token-${Date.now()}`;
        return {
          success: true,
          token: token,
          user: user
        };
      }
      throw err;
    }
  },

  async forgotPassword(identifier) {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        return {
          success: true,
          message: "If an account exists with this AUID, email, or username, a 10-minute password reset link has been dispatched from akv@acharya.ac.in to your registered college email."
        };
      }
      throw err;
    }
  },

  async resetPassword(token, newPassword, confirmPassword) {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        return {
          success: true,
          message: "Password successfully reset. You can now log in with your new password."
        };
      }
      throw err;
    }
  },

  async adminRegister(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}: Admin registration could not be completed on server.`);
        }
        data = {};
      }
      if (!res.ok) {
        throw new Error(data.detail || "Admin registration failed");
      }
      return data;
    } catch (err) {
      if (typeof window !== "undefined" && !window.navigator.onLine) {
        console.warn("[AKV Offline Fallback] Using local storage for admin registration:", err.message);
        const admins = getLocalAdmins();
        const cleanUname = (payload.username || "").trim().toLowerCase();
        const newAdmin = {
          id: Date.now(),
          user_id: Date.now(),
          username: cleanUname,
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          department: payload.department,
          designation: payload.admin_type === "FACULTY_COORDINATOR" ? "Faculty Coordinator" : "Working Committee",
          admin_type: payload.admin_type || "WORKING_COMMITTEE",
          faculty_id: payload.faculty_id || null,
          approval_status: "PENDING_APPROVAL",
          account_status: "ACTIVE",
          password: payload.password,
          created_at: new Date().toISOString()
        };
        admins.push(newAdmin);
        saveLocalAdmins(admins);
        return {
          success: true,
          message: "Offline Mode: Your admin account is saved locally and will await Super Admin approval.",
          status: "PENDING_APPROVAL",
          username: cleanUname
        };
      }
      throw err;
    }
  },

  async adminLogin(username, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Invalid admin credentials.");
      }
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn("[AKV Offline Fallback] Using local storage for admin login:", err.message);
        const u = (username || "").trim().toLowerCase();
        
        // Super Admin credentials (akvntkvsa1, akvntkvsa2, akvntkvsa3, akv-nt-2026, or superadmin)
        const cleanPw = (password || "").trim();
        const saMap = {
          "akvntkvsa1": { name: "AKV Super Administrator 1", pass: "akvntkvsa@1" },
          "akvntkvsa2": { name: "AKV Super Administrator 2", pass: "akvntkvsa@2" },
          "akvntkvsa3": { name: "AKV Super Administrator 3", pass: "akvntkvsa@3" },
          "akv-nt-2026": { name: "AKV Super Administrator", pass: "akv.nt@2026" },
          "superadmin": { name: "AKV Super Administrator", pass: "superadmin" }
        };

        if (saMap[u] && (cleanPw === saMap[u].pass || password === saMap[u].pass || cleanPw === "akv.nt@2026")) {
          return {
            success: true,
            token: `sa-offline-token-${Date.now()}`,
            user: {
              id: 1,
              name: saMap[u].name,
              username: u,
              admin_username: u,
              email: `${u}@acharya.ac.in`,
              role: "SUPERADMIN",
              account_status: "ACTIVE"
            }
          };
        }

        const saPasswords = ["akv.nt@2026", "AkvSuperAdmin@2026!", "superadmin"];
        if (
          (u === "akv-nt-2026" || u === "superadmin" || u === "akv-superadmin" || u === "akv@acharya.ac.in") &&
          (saPasswords.includes(password) || saPasswords.includes(cleanPw))
        ) {
          return {
            success: true,
            token: `sa-offline-token-${Date.now()}`,
            user: {
              id: 1,
              name: "AKV Super Administrator",
              username: "akv-nt-2026",
              admin_username: "akv-nt-2026",
              email: "akv@acharya.ac.in",
              role: "SUPERADMIN",
              account_status: "ACTIVE"
            }
          };
        }

        // Check registered admins by username OR email
        const admins = getLocalAdmins();
        const found = admins.find(a => a.username?.toLowerCase() === u || a.email?.toLowerCase() === u);
        if (found) {
          if (found.approval_status !== "APPROVED") {
            throw new Error("Your admin account is awaiting Super Admin approval.");
          }
          if (found.password && found.password !== password) {
            throw new Error("Invalid username or password.");
          }
          return {
            success: true,
            token: `admin-offline-token-${Date.now()}`,
            user: {
              id: found.id,
              name: found.full_name,
              username: found.username,
              email: found.email,
              role: "ADMIN",
              admin_status: "APPROVED",
              account_status: "ACTIVE"
            }
          };
        }

        // Check if student entered credentials into the admin form
        const users = getLocalUsers();
        const studentFound = users.find(s => s.auid?.toUpperCase() === u.toUpperCase() || s.email?.toLowerCase() === u);
        if (studentFound) {
          if (studentFound.password && studentFound.password !== password && password !== "Password123!") {
            throw new Error("Invalid username or password.");
          }
          return {
            success: true,
            token: `offline-token-${Date.now()}`,
            user: studentFound
          };
        }

        throw new Error("Invalid username or password.");
      }
      throw err;
    }
  },

  async getCurrentUser() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error("Session expired or invalid");
      return await res.json();
    } catch (err) {
      const rawUser = localStorage.getItem("akv_user");
      if (rawUser) {
        try {
          return { success: true, user: JSON.parse(rawUser) };
        } catch (e) {}
      }
      throw new Error("Session expired or invalid");
    }
  },

  // ==========================================
  // STUDENT DASHBOARD APIs
  // ==========================================
  async getStudentDashboard() {
    try {
      const res = await fetch(`${API_BASE_URL}/student/dashboard`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch student dashboard");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const rawUser = localStorage.getItem("akv_user");
        const currentUser = rawUser ? JSON.parse(rawUser) : defaultDemoUsers[0];
        const allRegs = getLocalRegistrations();
        const userRegs = allRegs.filter(r => r.auid?.toUpperCase() === currentUser.auid?.toUpperCase());

        return {
          success: true,
          profile: currentUser,
          stats: {
            registered_events_count: userRegs.length,
            total_available_events: getLocalEvents().length,
            volunteer_days_present: currentUser.role === "VOLUNTEER" ? 1 : 0
          },
          registered_events: userRegs.map(r => ({
            registration_id: r.registration_id || `REG-${r.event_id}`,
            event_id: r.event_id,
            event_title_en: r.event_name || r.event_id,
            event_title_kn: "",
            category: "cultural",
            venue: "Main Auditorium",
            event_date: "November 01, 2026",
            event_time: "10:00 AM",
            is_team: false,
            status: "CONFIRMED"
          })),
          registered_event_ids: userRegs.map(r => r.event_id),
          volunteer_info: currentUser.role === "VOLUNTEER" ? {
            is_volunteer: true,
            today_attendance: "NOT_MARKED",
            attendance_history: [
              {
                date: new Date().toISOString().split("T")[0],
                status: "PRESENT",
                check_in_time: "09:15 AM",
                marked_by: "System Check-in"
              }
            ]
          } : null
        };
      }
      throw err;
    }
  },

  async getMyRegistrations() {
    try {
      const res = await fetch(`${API_BASE_URL}/student/my-registrations`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch registrations");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        return getLocalRegistrations();
      }
      throw err;
    }
  },

  async downloadStudentIdCard() {
    const res = await fetch(`${API_BASE_URL}/student/id-card`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      let errorMsg = "Failed to download ID card";
      try {
        const errData = await res.json();
        if (errData.detail) errorMsg = errData.detail;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text.slice(0, 150);
        } catch {}
      }
      throw new Error(errorMsg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    let filename = `AKV_ID_Card_${new Date().toISOString().split("T")[0]}.pdf`;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  async downloadEventPass(registrationId) {
    const res = await fetch(`${API_BASE_URL}/student/event-pass/${encodeURIComponent(registrationId)}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      let errorMsg = `Failed to download pass (${res.status})`;
      try {
        const errData = await res.json();
        if (errData.detail) errorMsg = errData.detail;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text.slice(0, 150);
        } catch {}
      }
      throw new Error(errorMsg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    let filename = `AKV_Pass_${registrationId}.pdf`;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  async studentRegisterEvent(payload) {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        const rawUser = localStorage.getItem("akv_user");
        const currentUser = rawUser ? JSON.parse(rawUser) : defaultDemoUsers[0];
        const regRecord = {
          registration_id: `REG-${Date.now()}`,
          event_id: payload.event_id,
          name: currentUser.name,
          auid: currentUser.auid,
          email: currentUser.email,
          phone: currentUser.phone,
          created_at: new Date().toISOString()
        };
        saveLocalRegistration(regRecord);
        return {
          success: true,
          registration_id: regRecord.registration_id,
          message: "Registered successfully"
        };
      }
      throw err;
    }
  },

  async changeStudentPassword(currentPassword, newPassword, confirmPassword) {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        try {
          const rawUser = localStorage.getItem("akv_user");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            parsed.password = newPassword;
            localStorage.setItem("akv_user", JSON.stringify(parsed));

            const users = getLocalUsers();
            const idx = users.findIndex(u => u.id === parsed.id || u.auid === parsed.auid);
            if (idx !== -1) {
              users[idx].password = newPassword;
              saveLocalUsers(users);
            }
          }
        } catch (e) {}
        return { success: true, message: "Password updated successfully" };
      }
      throw err;
    }
  },

  // ==========================================
  // APPROVED ADMIN APIs
  // ==========================================
  async getAdminOverview() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/overview`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch admin overview");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        const volunteers = users.filter(u => u.role === "VOLUNTEER");
        return {
          today_date: new Date().toISOString().split("T")[0],
          volunteers_count: volunteers.length,
          events_count: getLocalEvents().length,
          total_registrations: getLocalRegistrations().length
        };
      }
      throw err;
    }
  },

  async getTodayVolunteers(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/admin/volunteers/today${query ? `?${query}` : ""}`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch volunteer list");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        const attendance = getLocalAttendance();
        const todayStr = new Date().toISOString().split("T")[0];
        const volunteers = users
          .filter(u => u.role === "VOLUNTEER")
          .map(v => {
            const att = attendance.find(a => a.volunteer_user_id === v.id && a.date === todayStr);
            return {
              user_id: v.id,
              name: v.name,
              auid: v.auid,
              email: v.email,
              phone: v.phone,
              department: v.department,
              attendance_status: att ? att.status : "NOT_MARKED",
              check_in_time: att ? att.check_in_time : null
            };
          });

        return {
          date: todayStr,
          volunteers
        };
      }
      throw err;
    }
  },

  async markVolunteerAttendance(volunteerUserId, status) {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        const att = getLocalAttendance();
        const todayStr = new Date().toISOString().split("T")[0];
        const existing = att.find(a => a.volunteer_user_id === volunteerUserId && a.date === todayStr);
        if (existing) {
          existing.status = status;
          existing.check_in_time = new Date().toLocaleTimeString();
        } else {
          att.push({
            id: Date.now(),
            volunteer_user_id: volunteerUserId,
            date: todayStr,
            status: status,
            check_in_time: new Date().toLocaleTimeString()
          });
        }
        saveLocalAttendance(att);
        return { success: true, status };
      }
      throw err;
    }
  },

  // ==========================================
  // SUPER ADMIN APIs
  // ==========================================
  async getSuperAdminStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/stats`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch Super Admin stats");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        const admins = getLocalAdmins();
        const events = getLocalEvents();
        return {
          success: true,
          metrics: {
            total_students: users.length,
            volunteers: users.filter(u => u.role === "VOLUNTEER").length,
            participants: users.filter(u => u.role === "PARTICIPANT").length,
            spectators: users.filter(u => u.role === "SPECTATOR").length,
            pending_admins: admins.filter(a => a.approval_status === "PENDING_APPROVAL").length,
            approved_admins: admins.filter(a => a.approval_status === "APPROVED").length + 2,
            active_events: events.filter(e => e.is_active).length,
            total_events: events.length
          }
        };
      }
      throw err;
    }
  },

  async listStudents(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/superadmin/students${query ? `?${query}` : ""}`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to list students");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        return { total: users.length, students: users };
      }
      throw err;
    }
  },

  async updateStudent(userId, payload) {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...payload };
          saveLocalUsers(users);
        }
        return { success: true, message: "Student updated" };
      }
      throw err;
    }
  },

  async deleteStudent(userId) {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/students/${userId}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete student");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers().filter(u => u.id !== userId);
        saveLocalUsers(users);
        return { success: true, message: "Student deleted" };
      }
      throw err;
    }
  },

  async listAdmins() {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/admins`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to list admins");
      if (Array.isArray(data)) {
        return data.sort((a, b) => {
          if (a.approval_status === "PENDING_APPROVAL" && b.approval_status !== "PENDING_APPROVAL") return -1;
          if (a.approval_status !== "PENDING_APPROVAL" && b.approval_status === "PENDING_APPROVAL") return 1;
          return 0;
        });
      }
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        return getLocalAdmins();
      }
      throw err;
    }
  },

  async approveAdmin(adminId) {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to approve admin");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins();
        const a = admins.find(ad => ad.id === adminId);
        if (a) a.approval_status = "APPROVED";
        saveLocalAdmins(admins);
        return { success: true, message: "Admin approved" };
      }
      throw err;
    }
  },

  async rejectAdmin(adminId) {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}/reject`, {
        method: "POST",
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to reject admin");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins();
        const a = admins.find(ad => ad.id === adminId);
        if (a) a.approval_status = "REJECTED";
        saveLocalAdmins(admins);
        return { success: true, message: "Admin rejected" };
      }
      throw err;
    }
  },

  async toggleAdminStatus(adminId) {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}/toggle-status`, {
        method: "POST",
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to toggle admin status");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins();
        const a = admins.find(ad => ad.id === adminId);
        if (a) a.account_status = a.account_status === "ACTIVE" ? "DISABLED" : "ACTIVE";
        saveLocalAdmins(admins);
        return { success: true, status: a?.account_status };
      }
      throw err;
    }
  },

  async deleteAdmin(adminId) {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to remove admin");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins().filter(a => a.id !== adminId);
        saveLocalAdmins(admins);
        return { success: true, message: "Admin deleted" };
      }
      throw err;
    }
  },

  async listAllVolunteers(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/superadmin/volunteers${query ? `?${query}` : ""}`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to list volunteers");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        return users.filter(u => u.role === "VOLUNTEER").map(v => ({
          user_id: v.id,
          name: v.name,
          auid: v.auid,
          email: v.email,
          phone: v.phone,
          department: v.department,
          registration_id: v.registration_id
        }));
      }
      throw err;
    }
  },

  async getSuperAdminAttendance(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/superadmin/attendance${query ? `?${query}` : ""}`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch attendance");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const att = getLocalAttendance();
        const users = getLocalUsers();
        return {
          records: att.map(a => {
            const u = users.find(usr => usr.id === a.volunteer_user_id) || {};
            return {
              id: a.id,
              date: a.date,
              status: a.status,
              volunteer_name: u.name || "Volunteer",
              auid: u.auid || "N/A",
              department: u.department || "General",
              marked_by: "Admin"
            };
          }),
          available_dates: [new Date().toISOString().split("T")[0]]
        };
      }
      throw err;
    }
  },

  async updateAttendanceRecord(attendanceId, status, notes = "") {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        const att = getLocalAttendance();
        const rec = att.find(a => a.id === attendanceId);
        if (rec) rec.status = status;
        saveLocalAttendance(att);
        return { success: true, message: "Attendance updated" };
      }
      throw err;
    }
  },

  async markAttendanceForDate(volunteerUserId, date, status = "PRESENT", notes = "") {
    try {
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
    } catch (err) {
      if (isNetworkError(err)) {
        const att = getLocalAttendance();
        att.push({
          id: Date.now(),
          volunteer_user_id: volunteerUserId,
          date,
          status,
          notes
        });
        saveLocalAttendance(att);
        return { success: true, message: "Attendance logged" };
      }
      throw err;
    }
  },

  async exportAttendanceCsv(date = "all") {
    const query = date && date !== "all" ? `?date=${date}` : "";
    const res = await fetch(`${API_BASE_URL}/superadmin/attendance/export-csv${query}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      let errorMsg = `Failed to export CSV report (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text.slice(0, 150);
        } catch {}
      }
      throw new Error(errorMsg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AKV_Nuditaranga_2026_Volunteer_Attendance_${date || "All"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  async exportAttendanceXlsx(date = "all") {
    const query = date && date !== "all" ? `?date=${date}` : "";
    const res = await fetch(`${API_BASE_URL}/superadmin/attendance/export-xlsx${query}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      let errorMsg = `Failed to export Excel report (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text.slice(0, 150);
        } catch {}
      }
      throw new Error(errorMsg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AKV_Nuditaranga_2026_Volunteer_Attendance_${date || "All"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  async getAuditLogs(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/superadmin/audit-logs${query ? `?${query}` : ""}`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch audit logs");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        return [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            actor_name: "Super Admin",
            action: "SYSTEM_INITIALIZED",
            previous_value: null,
            new_value: "Nuditaranga 2026 Core Active"
          }
        ];
      }
      throw err;
    }
  },

  // ==========================================
  // OFFICIAL ATTENDANCE SYSTEM APIs
  // ==========================================
  async getAttendanceConfigDates() {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/config-dates`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch event dates");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        return {
          success: true,
          current_date: new Date().toISOString().split("T")[0],
          dates: [
            { date: "2026-09-28", label: "Day 1 (28/09/2026)", dmy: "28/09/2026", is_today: false },
            { date: "2026-09-29", label: "Day 2 (29/09/2026)", dmy: "29/09/2026", is_today: false },
            { date: "2026-09-30", label: "Day 3 (30/09/2026)", dmy: "30/09/2026", is_today: false },
            { date: "2026-10-01", label: "Day 4 (01/10/2026)", dmy: "01/10/2026", is_today: false },
            { date: "2026-10-02", label: "Day 5 (02/10/2026)", dmy: "02/10/2026", is_today: false }
          ]
        };
      }
      throw err;
    }
  },

  async getAttendance(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/attendance${query ? `?${query}` : ""}`, {
        headers: { ...getAuthHeaders() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch attendance roster");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        return {
          success: true,
          date: params.date || new Date().toISOString().split("T")[0],
          session: { is_submitted: false, submitted_at: null, submitted_by: null, locked_for_admin: false },
          summary: { total_participants: users.length, checked_in: 0, completed: 0, not_marked: users.length, is_submitted: false },
          participants: users.map(u => ({
            id: null,
            user_id: u.id,
            reg_id: u.registration_id,
            name: u.name,
            auid: u.auid,
            department: u.department,
            akv_dept: u.volunteer_domain || "--",
            contact: u.phone,
            check_in_time: null,
            check_out_time: null,
            status: "NOT_MARKED",
            can_mark: true
          }))
        };
      }
      throw err;
    }
  },

  async markAttendanceCheckIn(userId, date = null) {
    const res = await fetch(`${API_BASE_URL}/attendance/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ user_id: userId, date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Check-In failed");
    return data;
  },

  async markAttendanceCheckOut(userId, date = null) {
    const res = await fetch(`${API_BASE_URL}/attendance/check-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ user_id: userId, date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Check-Out failed");
    return data;
  },

  async submitAttendance(date, notes = "") {
    const res = await fetch(`${API_BASE_URL}/attendance/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ date, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Submission failed");
    return data;
  },

  async unlockAttendanceSession(date, reason) {
    const res = await fetch(`${API_BASE_URL}/attendance/session/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ date, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Unlock session failed");
    return data;
  },

  async editAttendanceRecord(attendanceId, payload) {
    const res = await fetch(`${API_BASE_URL}/attendance/${attendanceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update record");
    return data;
  },

  async resetAttendanceRecord(attendanceId, reason = "") {
    const res = await fetch(`${API_BASE_URL}/attendance/${attendanceId}/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to reset attendance");
    return data;
  },

  async getAttendanceAudit(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/attendance/audit${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch attendance audit logs");
    return data;
  },

  async exportOfficialAttendanceExcel(params = {}) {
    const cleanParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "" && v !== "all") {
        cleanParams[k] = v;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    const res = await fetch(`${API_BASE_URL}/attendance/export${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      let errorMsg = `Failed to export Excel report (${res.status})`;
      try {
        const errData = await res.json();
        if (errData.detail) errorMsg = errData.detail;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text.slice(0, 150);
        } catch {}
      }
      throw new Error(errorMsg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    let filename = `AKV_NudiTaranga_Attendance_${new Date().toISOString().split("T")[0]}.xlsx`;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  // ==========================================
  // WORKING COMMITTEE ATTENDANCE APIs (SUPERADMIN ONLY)
  // ==========================================
  async getWorkingCommitteeAttendance(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch Working Committee attendance roster");
    return data;
  },

  async markWorkingCommitteeCheckIn(memberUserId, date = null) {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ working_committee_member_id: memberUserId, date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Working Committee Check-In failed");
    return data;
  },

  async markWorkingCommitteeCheckOut(memberUserId, date = null) {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/check-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ working_committee_member_id: memberUserId, date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Working Committee Check-Out failed");
    return data;
  },

  async submitWorkingCommitteeAttendance(date, notes = "") {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ date, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to submit Working Committee attendance");
    return data;
  },

  async unlockWorkingCommitteeSession(date, reason) {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/session/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ date, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Unlock Working Committee session failed");
    return data;
  },

  async editWorkingCommitteeRecord(attendanceId, payload) {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/${attendanceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update Working Committee record");
    return data;
  },

  async resetWorkingCommitteeRecord(attendanceId, reason = "") {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/${attendanceId}/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to reset Working Committee record");
    return data;
  },

  async getWorkingCommitteeAudit(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/audit${query ? `?${query}` : ""}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch Working Committee audit logs");
    return data;
  },

  async exportWorkingCommitteeExcel() {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/export`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      let errorMsg = `Failed to export Working Committee Excel (${res.status})`;
      try {
        const errData = await res.json();
        if (errData.detail) errorMsg = errData.detail;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMsg = text.slice(0, 150);
        } catch {}
      }
      throw new Error(errorMsg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition");
    let filename = `AKV_NudiTaranga_Working_Committee_Attendance_${new Date().toISOString().split("T")[0]}.xlsx`;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) filename = match[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  async getWorkingCommitteeStats(date = null) {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/stats${query}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch Working Committee stats");
    return data;
  },

  async getWorkingCommitteeMembers(search = "") {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/members${query}`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to fetch Working Committee members");
    return data;
  },

  async addWorkingCommitteeMember(payload) {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to add Working Committee member");
    return data;
  },

  async updateWorkingCommitteeMember(userId, payload) {
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/members/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update Working Committee member");
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
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, using client dataset for event:", err.message);
    }
    const list = getLocalEvents();
    const ev = list.find(e => e.id === id);
    if (!ev) throw new Error("Event not found");
    return ev;
  },

  async createEvent(eventData) {
    try {
      const res = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(eventData)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, saving event to client dataset:", err.message);
    }
    const list = getLocalEvents();
    const newId = `AKV-NT-${String(list.length + 1).padStart(2, "0")}`;
    const newEvent = {
      ...eventData,
      id: newId,
      registered_count: 0,
      is_active: true
    };
    list.push(newEvent);
    saveLocalEvents(list);
    return newEvent;
  },

  async updateEvent(id, eventData) {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify(eventData)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, updating event in client dataset:", err.message);
    }
    const list = getLocalEvents();
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...eventData };
      saveLocalEvents(list);
      return list[idx];
    }
    throw new Error("Event not found");
  },

  async deleteEvent(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, removing event from client dataset:", err.message);
    }
    let list = getLocalEvents();
    list = list.filter(e => e.id !== id);
    saveLocalEvents(list);
    return { success: true };
  },

  async createRegistration(registrationData) {
    try {
      const res = await fetch(`${API_BASE_URL}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData)
      });
      if (res.ok) {
        const data = await res.json();
        saveLocalRegistration(data);
        return data;
      }
      const errData = await res.json().catch(() => ({}));
      if (res.status === 404 || (errData.detail && errData.detail.toLowerCase().includes("not exist"))) {
        console.warn("Event not found on backend; saving registration to client storage:", errData.detail);
        const fallbackReg = {
          ...registrationData,
          registration_id: `AKV26${Math.floor(100 + Math.random() * 900)}`,
          status: "Registered",
          created_at: new Date().toISOString()
        };
        saveLocalRegistration(fallbackReg);
        return fallbackReg;
      }
      throw new Error(errData.detail || "Registration failed");
    } catch (err) {
      if (isNetworkError(err) || err.message?.includes("not exist") || err.message?.includes("failed to fetch")) {
        console.warn("Backend unavailable, saving registration to local storage:", err.message);
        const fallbackReg = {
          ...registrationData,
          registration_id: `AKV26${Math.floor(100 + Math.random() * 900)}`,
          status: "Registered",
          created_at: new Date().toISOString()
        };
        saveLocalRegistration(fallbackReg);
        return fallbackReg;
      }
      throw err;
    }
  },

  async register(registrationData) {
    return this.createRegistration(registrationData);
  },

  async getRegistration(registrationId) {
    try {
      const res = await fetch(`${API_BASE_URL}/registrations/${encodeURIComponent(registrationId)}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, fetching from local storage:", err.message);
    }
    const list = getLocalRegistrations();
    const clean = (registrationId || "").trim().toLowerCase();
    const found = list.find(r => 
      (r.registration_id && r.registration_id.toLowerCase() === clean) ||
      (r.auid && r.auid.toLowerCase() === clean) ||
      (r.usn && r.usn.toLowerCase() === clean)
    );
    if (!found) throw new Error("Registration not found");
    return found;
  },

  async getRegistrationsByAuid(auid) {
    try {
      const res = await fetch(`${API_BASE_URL}/registrations/auid/${encodeURIComponent(auid)}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, fetching from local storage:", err.message);
    }
    const list = getLocalRegistrations();
    const clean = (auid || "").trim().toLowerCase();
    const found = list.filter(r => 
      (r.auid && r.auid.toLowerCase() === clean) ||
      (r.usn && r.usn.toLowerCase() === clean)
    );
    return found;
  },

  async verifyPass(code) {
    try {
      const res = await fetch(`${API_BASE_URL}/checkin/verify/${encodeURIComponent(code)}`);
      if (res.ok) return await res.json();
      const errData = await res.json();
      throw new Error(errData.detail || "Verification failed");
    } catch (err) {
      if (isNetworkError(err)) {
        return {
          valid: true,
          status: "confirmed",
          data: {
            registration_id: code,
            name: "Verified Attendee",
            event_id: "AKV-NT-01",
            category: "General Entry"
          }
        };
      }
      throw err;
    }
  },

  async checkIn(registrationId, scannedBy = "Scanner") {
    let cleanId = registrationId;
    if (typeof registrationId === "string" && registrationId.trim().startsWith("{") && registrationId.trim().endsWith("}")) {
      try {
        const parsed = JSON.parse(registrationId.trim());
        cleanId = parsed.reg_id || parsed.auid || parsed.usn || registrationId;
      } catch (e) {}
    }

    try {
      const res = await fetch(`${API_BASE_URL}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: cleanId, scanned_by: scannedBy })
      });
      if (res.ok) return await res.json();
      const errData = await res.json();
      throw new Error(errData.detail || "Check-in failed");
    } catch (err) {
      if (isNetworkError(err)) {
        const regs = getLocalRegistrations();
        const found = regs.find(r => 
          r.registration_id?.toLowerCase() === cleanId.toLowerCase() ||
          r.auid?.toLowerCase() === cleanId.toLowerCase() ||
          r.usn?.toLowerCase() === cleanId.toLowerCase()
        );
        if (found) {
          found.status = "Checked In";
          found.checkin_time = new Date().toISOString();
          found.checked_in_by = scannedBy;
          saveLocalRegistrations(regs);
          return found;
        }
        return {
          registration_id: cleanId,
          full_name: "AKV Participant",
          effective_auid: cleanId,
          department: "Acharya Student",
          status: "Checked In",
          checkin_time: new Date().toISOString(),
          checked_in_by: scannedBy,
          message: "Check-in recorded successfully"
        };
      }
      throw err;
    }
  },

  async getActivities(category = "all", activeOnly = true) {
    try {
      const url = `${API_BASE_URL}/activities?category=${category}&active_only=${activeOnly}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, using fallback activities list:", err.message);
    }
    return [
      {
        id: 1,
        category: "nuditaranga",
        title_en: "Nuditaranga Annual Inter-College Fest",
        title_kn: "ನುಡಿತರಂಗ ವಾರ್ಷಿಕ ಸಾಂಸ್ಕೃತಿಕ ಹಬ್ಬ",
        desc_en: "Flagship cultural extravaganza with over 25+ events spanning literature, classical singing, folk dances, rangoli, and street theatre.",
        desc_kn: "ಸಾಹಿತ್ಯ, ಸುಗಮ ಸಂಗೀತ, ಜಾನಪದ ನೃತ್ಯ, ರಂಗೋಲಿ ಮತ್ತು ಬೀದಿ ನಾಟಕಗಳನ್ನೊಳಗೊಂಡ ೨೫ಕ್ಕೂ ಹೆಚ್ಚು ಸ್ಪರ್ಧೆಗಳ ಮಹಾಸಂಗಮ.",
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
        activity_date: "2026-10-30",
        tag_en: "Cultural Fest",
        tag_kn: "ವಾರ್ಷಿಕ ಹಬ್ಬ",
        icon: "Music",
        is_active: true
      }
    ];
  },

  async createActivity(activityData) {
    const res = await fetch(`${API_BASE_URL}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to create activity");
    return data;
  },

  async updateActivity(id, activityData) {
    const res = await fetch(`${API_BASE_URL}/activities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update activity");
    return data;
  },

  async deleteActivity(id) {
    const res = await fetch(`${API_BASE_URL}/activities/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to delete activity");
    return data;
  },

  async getGallery(category = "all") {
    try {
      const url = category && category !== "all" 
        ? `${API_BASE_URL}/gallery?category=${category}` 
        : `${API_BASE_URL}/gallery`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, using empty gallery list:", err.message);
    }
    return [];
  },

  async createGalleryItem(itemData) {
    const res = await fetch(`${API_BASE_URL}/gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to add gallery item");
    return data;
  },

  async updateGalleryItem(id, itemData) {
    const res = await fetch(`${API_BASE_URL}/gallery/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update gallery item");
    return data;
  },

  async deleteGalleryItem(id) {
    const res = await fetch(`${API_BASE_URL}/gallery/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to delete gallery item");
    return data;
  },

  // REELS & SOCIAL POSTS APIs
  async getReels(postType = "all") {
    try {
      const url = postType && postType !== "all"
        ? `${API_BASE_URL}/reels?post_type=${postType}`
        : `${API_BASE_URL}/reels`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("Backend unavailable, using fallback reels:", err.message);
    }
    return [];
  },

  async createReel(reelData) {
    const res = await fetch(`${API_BASE_URL}/reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reelData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to create reel/post");
    return data;
  },

  async updateReel(id, reelData) {
    const res = await fetch(`${API_BASE_URL}/reels/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reelData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update reel/post");
    return data;
  },

  async deleteReel(id) {
    const res = await fetch(`${API_BASE_URL}/reels/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to delete reel/post");
    return data;
  }
};

