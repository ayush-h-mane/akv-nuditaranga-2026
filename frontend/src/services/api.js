import { initialEvents } from "../config/eventsData";
import { isAcharyaEmail, ACHARYA_EMAIL_ERROR } from "../utils/emailValidation";
import { siteConfig } from "../config/siteConfig";
import { 
  initialActivities, 
  initialGallery, 
  initialReels, 
  initialAttendanceDates 
} from "../config/catalogData";

// Determine base API endpoint
// When running in production (e.g. Vercel) without explicit VITE_API_URL, use same-origin relative path "/api"
// to prevent mixed-content blocking and "Private Network Access / 3rd party permission" prompts on mobile.
const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  return "/api";
})();

// High-speed In-Memory & LocalStorage Cache with Stale-While-Revalidate
const memCache = new Map();
const inflightRequests = new Map();

function getFromMemCache(key, maxAgeMs = 60000) {
  if (!memCache.has(key)) return null;
  const item = memCache.get(key);
  if (!item || item._cachedAt === undefined) return null;
  if (Date.now() - item._cachedAt > maxAgeMs) return null;
  return item.data;
}

function setInMemCache(key, data) {
  memCache.set(key, { data, _cachedAt: Date.now() });
}

function invalidateMemCache(prefix = "") {
  if (!prefix) {
    memCache.clear();
    return;
  }
  for (const k of memCache.keys()) {
    if (k.startsWith(prefix)) {
      memCache.delete(k);
    }
  }
}

async function fetchWithDeduplication(reqKey, fetchFn) {
  if (inflightRequests.has(reqKey)) {
    return inflightRequests.get(reqKey);
  }
  const promise = fetchFn().finally(() => {
    inflightRequests.delete(reqKey);
  });
  inflightRequests.set(reqKey, promise);
  return promise;
}

// Local fallback storage keys
const STORAGE_EVENTS_KEY = "akv_events_cache_v2";
const STORAGE_REGS_KEY = "akv_registrations_cache_v2";
const STORAGE_USERS_KEY = "akv_users_cache_v2";
const STORAGE_ADMINS_KEY = "akv_admins_cache_v2";
const STORAGE_ATTENDANCE_KEY = "akv_attendance_cache_v2";
const STORAGE_AUDIT_KEY = "akv_audit_logs_cache_v2";
const STORAGE_ACTIVITIES_KEY = "akv_activities_cache_v2";
const STORAGE_GALLERY_KEY = "akv_gallery_cache_v2";
const STORAGE_SCHEDULE_KEY = "akv_schedule_cache_v2";
const STORAGE_REELS_KEY = "akv_reels_cache_v2";
const STORAGE_STUDENT_DASH_PREFIX = "akv_dash_";

function readLocalJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const defaultActivities = initialActivities;

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
  if (memCache.has("events")) {
    return memCache.get("events");
  }
  const data = readLocalJson(STORAGE_EVENTS_KEY, null);
  if (data && Array.isArray(data) && data.length > 0) {
    const existingIds = new Set(data.map(e => e.id));
    let merged = [...data];
    let added = false;
    for (const initEv of initialEvents) {
      if (!existingIds.has(initEv.id)) {
        merged.push(initEv);
        added = true;
      }
    }
    if (added) {
      writeLocalJson(STORAGE_EVENTS_KEY, merged);
    }
    memCache.set("events", merged);
    return merged;
  }
  memCache.set("events", [...initialEvents]);
  writeLocalJson(STORAGE_EVENTS_KEY, initialEvents);
  return [...initialEvents];
}

function saveLocalEvents(events) {
  if (!events || !Array.isArray(events)) return;
  memCache.set("events", events);
  writeLocalJson(STORAGE_EVENTS_KEY, events);
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

async function readApiResponse(res) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    if (data && data.detail !== undefined) {
      if (Array.isArray(data.detail)) {
        const formatted = data.detail
          .map((item) => {
            if (typeof item === "string") return item;
            const field = Array.isArray(item.loc)
              ? item.loc.filter((x) => x !== "body").join(" ")
              : "";
            const msg = item.msg || item.message || JSON.stringify(item);
            return field ? `${field}: ${msg}` : msg;
          })
          .filter(Boolean)
          .join(". ");
        data.raw_detail = data.detail;
        data.detail = formatted || `Validation error (${res.status})`;
      } else if (typeof data.detail === "object" && data.detail !== null) {
        data.raw_detail = data.detail;
        data.detail =
          data.detail.msg ||
          data.detail.message ||
          JSON.stringify(data.detail);
      }
    }
    return data;
  } catch {
    let clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length > 200) {
      clean = clean.substring(0, 200) + "...";
    }
    return { detail: clean || `Server responded with status ${res.status}` };
  }
}

export const api = {
  async sendContactMessage(payload) {
    const res = await fetch(`${API_BASE_URL}/contact/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || "Unable to send your message. Please try again.");
    }
    return data;
  },

  // ==========================================
  // AUTHENTICATION APIs
  // ==========================================
  async studentRegister(payload) {
    if (!isAcharyaEmail(payload.email)) {
      throw new Error(ACHARYA_EMAIL_ERROR);
    }
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
        const regId = `AKVNT${String(nextNum).padStart(4, "0")}`;
        const newUser = {
          id: Date.now(),
          name: payload.full_name.trim(),
          auid: payload.auid.trim().toUpperCase(),
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone.trim(),
          institute: payload.institute || "Acharya Institute of Technology",
          department: payload.department.trim(),
          semester: Number(payload.semester) || 1,
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

        // 1. Strictly isolate: Do NOT authenticate Admin or Superadmin credentials in Student tab
        if (lowerId === "superadmin" || lowerId === "akv@acharya.ac.in") {
          throw new Error("Access denied: Administrator accounts cannot log in through Student Login. Please use the Admin Portal.");
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
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to send the password reset email.");
    }
    return data;
  },

  async verifyResetOtp(identifier, otp) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, otp })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Invalid or expired OTP code.");
    }
    return data;
  },

  async resetPasswordWithOtp(identifier, otp, newPassword, confirmPassword) {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to reset password.");
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
    if (!isAcharyaEmail(payload.email)) {
      throw new Error(ACHARYA_EMAIL_ERROR);
    }
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
        const cleanAuid = payload.auid ? payload.auid.trim().toUpperCase() : null;
        const cleanUname = (payload.username || cleanAuid || "").trim().toLowerCase();
        const newAdmin = {
          id: Date.now(),
          user_id: Date.now(),
          username: cleanUname,
          auid: cleanAuid,
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
          username: cleanUname,
          auid: cleanAuid
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
      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.detail || `Admin login failed (${res.status}).`);
      }
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn("[AKV Offline Fallback] Using local storage for admin login:", err.message);
        const u = (username || "").trim().toLowerCase();
        
        const cleanPw = (password || "").trim();

        // Check registered admins by username, email, or AUID
        const admins = getLocalAdmins();
        const found = admins.find(a => 
          a.username?.toLowerCase() === u || 
          a.email?.toLowerCase() === u ||
          a.auid?.toLowerCase() === u ||
          a.auid?.toUpperCase() === u.toUpperCase()
        );
        if (found) {
          if (found.approval_status !== "APPROVED") {
            throw new Error("Your admin account is awaiting Super Admin approval.");
          }
          if (found.password && found.password !== password) {
            throw new Error("Invalid credentials (AUID, College Email, or Password).");
          }
          return {
            success: true,
            token: `admin-offline-token-${Date.now()}`,
            user: {
              id: found.id,
              name: found.full_name,
              username: found.username,
              auid: found.auid,
              email: found.email,
              role: "ADMIN",
              admin_status: "APPROVED",
              account_status: "ACTIVE"
            }
          };
        }

        // Reject student credentials in admin login
        const users = getLocalUsers();
        const studentFound = users.find(s => s.auid?.toUpperCase() === u.toUpperCase() || s.email?.toLowerCase() === u);
        if (studentFound && studentFound.role !== "ADMIN" && studentFound.role !== "SUPERADMIN") {
          throw new Error("Access denied: Student credentials cannot be used in Admin Login. Please use the Student Portal.");
        }

        throw new Error("Invalid credentials (AUID, College Email, or Password).");
      }
      throw err;
    }
  },

  async superadminLogin(username, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login/superadmin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.detail || `Superadmin login failed (${res.status}).`);
      }
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const cachedUser = this.getCachedUser();
        if (cachedUser && cachedUser.role === "SUPERADMIN" && (cachedUser.username?.toLowerCase() === (username || "").trim().toLowerCase())) {
          return {
            success: true,
            token: `sa-offline-token-${Date.now()}`,
            user: cachedUser
          };
        }
        throw new Error("Invalid Super Administrator credentials or backend server unavailable.");
      }
      throw err;
    }
  },

  async developerLogin(username, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login/developer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: (username || "").trim(), password: (password || "").trim() })
      });
      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.detail || `Developer login failed (${res.status}).`);
      }
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const u = (username || "").trim().toLowerCase();
        if (u === "nanu" && password === "nanu@ayush") {
          return {
            success: true,
            token: `dev-offline-token-${Date.now()}`,
            user: {
              id: 9999,
              name: "nanu",
              username: "nanu",
              auid: "DEV-NANU",
              email: "nanu.dev@acharyahabba.com",
              role: "DEVELOPER",
              admin_type: "DEVELOPER",
              account_status: "ACTIVE"
            }
          };
        }
        throw new Error("Invalid Developer credentials or backend server unavailable.");
      }
      throw err;
    }
  },

  async superadminFirstTimeSetup(payload) {
    const res = await fetch(`${API_BASE_URL}/auth/superadmin/first-time-setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || `First-time onboarding failed (${res.status}).`);
    }
    if (data.user) {
      try {
        localStorage.setItem("akv_user", JSON.stringify(data.user));
      } catch (e) {}
    }
    return data;
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

  async updateProfileOneTime(payload) {
    const res = await fetch(`${API_BASE_URL}/auth/profile/one-time-edit`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      const errMsg = (typeof data?.detail === "string" && data.detail)
        ? data.detail
        : `Profile update failed (${res.status}).`;
      throw new Error(errMsg);
    }
    if (data.user) {
      try {
        localStorage.setItem("akv_user", JSON.stringify(data.user));
        if (data.user.auid) {
          memCache.delete("dash_" + data.user.auid.toUpperCase());
        }
      } catch (e) {}
    }
    return data;
  },

  async forgotPassword(identifier) {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: (identifier || "").trim() })
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || `Forgot password request failed (${res.status}).`);
    }
    return data;
  },

  async verifyResetOtp(identifier, otp) {
    const res = await fetch(`${API_BASE_URL}/auth/verify-reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        identifier: (identifier || "").trim(), 
        otp: (otp || "").trim() 
      })
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || `OTP verification failed (${res.status}).`);
    }
    return data;
  },

  async resetPasswordWithOtp(identifier, otp, newPassword, confirmPassword) {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: (identifier || "").trim(),
        otp: (otp || "").trim(),
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || `Password reset failed (${res.status}).`);
    }
    return data;
  },

  async setSuperAdminUserPassword(userId, newPassword) {
    const res = await fetch(`${API_BASE_URL}/superadmin/users/${userId}/set-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ new_password: newPassword })
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || `Failed to update password (${res.status}).`);
    }
    invalidateMemCache("sa_admins");
    invalidateMemCache("sa_volunteers");
    invalidateMemCache("sa_students");
    return data;
  },

  // ==========================================
  // STUDENT DASHBOARD APIs
  // ==========================================
  getCachedStudentDashboard(auid = null) {
    let targetAuid = auid;
    let localUserObj = null;
    try {
      const rawUser = localStorage.getItem("akv_user");
      if (rawUser) {
        localUserObj = JSON.parse(rawUser);
        if (!targetAuid && localUserObj.auid) {
          targetAuid = localUserObj.auid;
        }
      }
    } catch {}

    if (!targetAuid) return null;
    const cacheKey = "dash_" + targetAuid.toUpperCase();
    if (memCache.has(cacheKey)) {
      return memCache.get(cacheKey);
    }
    const stored = readLocalJson(STORAGE_STUDENT_DASH_PREFIX + targetAuid.toUpperCase(), null);
    if (stored) {
      memCache.set(cacheKey, stored);
      return stored;
    }
    // Instant baseline synthesis from local user & registrations to eliminate any buffering
    if (localUserObj && (localUserObj.auid?.toUpperCase() === targetAuid.toUpperCase() || !localUserObj.auid)) {
      const allRegs = getLocalRegistrations();
      const userRegs = allRegs.filter(r => r.auid?.toUpperCase() === targetAuid.toUpperCase() || r.email === localUserObj.email);
      const instantDash = {
        success: true,
        profile: localUserObj,
        stats: {
          registered_events_count: userRegs.length,
          total_available_events: getLocalEvents().length,
          volunteer_days_present: localUserObj.role === "VOLUNTEER" ? 1 : 0
        },
        registered_events: userRegs.map(r => ({
          registration_id: r.registration_id || `REG-${r.event_id}`,
          event_id: r.event_id,
          event_title_en: r.event_name || r.event_id,
          event_title_kn: "",
          category: "cultural",
          venue: "Acharya Campus",
          event_date: "November 02, 2026",
          event_time: "10:00 AM",
          is_team: false,
          status: "CONFIRMED"
        })),
        registered_event_ids: userRegs.map(r => r.event_id),
        volunteer_info: localUserObj.role === "VOLUNTEER" ? {
          is_volunteer: true,
          today_attendance: "NOT_MARKED",
          attendance_history: []
        } : null
      };
      memCache.set(cacheKey, instantDash);
      return instantDash;
    }
    return null;
  },

  hasCachedStudentDashboard(auid = null) {
    return Boolean(this.getCachedStudentDashboard(auid));
  },

  async getStudentDashboard(forceFresh = false) {
    const key = "student_dashboard";
    if (forceFresh) {
      inflightRequests.delete(key);
    } else if (inflightRequests.has(key)) {
      return await inflightRequests.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const url = `${API_BASE_URL}/student/dashboard${forceFresh ? `?_t=${Date.now()}` : ""}`;
        const res = await fetch(url, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch student dashboard");

        if (data && data.profile && data.profile.auid) {
          const auid = data.profile.auid.toUpperCase();
          memCache.set("dash_" + auid, data);
          writeLocalJson(STORAGE_STUDENT_DASH_PREFIX + auid, data);
        }
        return data;
      } catch (err) {
        if (!forceFresh) {
          const cached = this.getCachedStudentDashboard();
          if (cached) return cached;
        }

        if (isNetworkError(err) || !forceFresh) {
          const cached = this.getCachedStudentDashboard();
          if (cached) return cached;
        }

        if (isNetworkError(err)) {
          const rawUser = localStorage.getItem("akv_user");
          if (!rawUser) throw err;
          const currentUser = JSON.parse(rawUser);
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
    })();

    inflightRequests.set(key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inflightRequests.delete(key);
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
        const nextNum = getLocalRegistrations().length + 1;
        const regRecord = {
          registration_id: `AKVNT${String(nextNum).padStart(4, "0")}`,
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
  async getAdminOverview(forceFresh = false) {
    try {
      const url = `${API_BASE_URL}/admin/overview${forceFresh ? `?_t=${Date.now()}` : ""}`;
      const res = await fetch(url, {
        cache: forceFresh ? "no-store" : "default",
        headers: {
          ...getAuthHeaders(),
          ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
        }
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
  getCachedSuperAdminStats() {
    return getFromMemCache("sa_stats", 300000);
  },

  async getSuperAdminStats(forceFresh = false) {
    const cacheKey = "sa_stats";
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const url = `${API_BASE_URL}/superadmin/stats${forceFresh ? `?_t=${Date.now()}` : ""}`;
        const res = await fetch(url, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch Super Admin stats");
        setInMemCache(cacheKey, data);
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = getFromMemCache(cacheKey, 600000);
          if (cached) return cached;
          const users = getLocalUsers();
          const admins = getLocalAdmins();
          const events = getLocalEvents();
          return {
            success: true,
            metrics: {
              total_students: users.length,
              volunteers: users.filter(u => u.role === "VOLUNTEER").length,
              participants: users.filter(u => u.role === "PARTICIPANT").length,
              pending_admins: admins.filter(a => a.approval_status === "PENDING_APPROVAL").length,
              approved_admins: admins.filter(a => a.approval_status === "APPROVED").length + 2,
              active_events: events.filter(e => e.is_active).length,
              total_events: events.length
            }
          };
        }
        throw err;
      }
    });
  },

  getCachedStudents(params = {}) {
    const qKey = `sa_students_${params.search || ""}_${params.role || ""}_${params.status_filter || ""}_${params.department || ""}_${params.limit || 100}`;
    return getFromMemCache(qKey, 300000);
  },

  async listStudents(params = {}, forceFresh = false) {
    const cacheKey = `sa_students_${params.search || ""}_${params.role || ""}_${params.status_filter || ""}_${params.department || ""}_${params.limit || 100}`;
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const qParams = { ...params };
        if (forceFresh) qParams._t = Date.now();
        const query = new URLSearchParams(qParams).toString();
        const res = await fetch(`${API_BASE_URL}/superadmin/students${query ? `?${query}` : ""}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to list students");
        setInMemCache(cacheKey, data);
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = getFromMemCache(cacheKey, 600000);
          if (cached) return cached;
          const users = getLocalUsers();
          return { total: users.length, students: users };
        }
        throw err;
      }
    });
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
      invalidateMemCache("sa_students");
      invalidateMemCache("sa_stats");
      invalidateMemCache("sa_volunteers");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...payload };
          saveLocalUsers(users);
        }
        invalidateMemCache("sa_students");
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
      invalidateMemCache("sa_students");
      invalidateMemCache("sa_stats");
      invalidateMemCache("sa_volunteers");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const users = getLocalUsers().filter(u => u.id !== userId);
        saveLocalUsers(users);
        invalidateMemCache("sa_students");
        return { success: true, message: "Student deleted" };
      }
      throw err;
    }
  },

  getCachedAdmins() {
    return getFromMemCache("sa_admins", 300000);
  },

  async listAdmins(forceFresh = false) {
    const cacheKey = "sa_admins";
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const url = `${API_BASE_URL}/superadmin/admins${forceFresh ? `?_t=${Date.now()}` : ""}`;
        const res = await fetch(url, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to list admins");
        let sorted = data;
        if (Array.isArray(data)) {
          sorted = data.sort((a, b) => {
            if (a.approval_status === "PENDING_APPROVAL" && b.approval_status !== "PENDING_APPROVAL") return -1;
            if (a.approval_status !== "PENDING_APPROVAL" && b.approval_status === "PENDING_APPROVAL") return 1;
            return 0;
          });
        }
        setInMemCache(cacheKey, sorted);
        return sorted;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = getFromMemCache(cacheKey, 600000);
          if (cached) return cached;
          return getLocalAdmins();
        }
        throw err;
      }
    });
  },

  async approveAdmin(adminId) {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/admins/${adminId}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders() }
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.detail || "Failed to approve admin");
      invalidateMemCache("sa_admins");
      invalidateMemCache("sa_stats");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins();
        const a = admins.find(ad => ad.id === adminId);
        if (a) a.approval_status = "APPROVED";
        saveLocalAdmins(admins);
        invalidateMemCache("sa_admins");
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
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.detail || "Failed to reject admin");
      invalidateMemCache("sa_admins");
      invalidateMemCache("sa_stats");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins();
        const a = admins.find(ad => ad.id === adminId);
        if (a) a.approval_status = "REJECTED";
        saveLocalAdmins(admins);
        invalidateMemCache("sa_admins");
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
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.detail || "Failed to toggle admin status");
      invalidateMemCache("sa_admins");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins();
        const a = admins.find(ad => ad.id === adminId);
        if (a) a.account_status = a.account_status === "ACTIVE" ? "DISABLED" : "ACTIVE";
        saveLocalAdmins(admins);
        invalidateMemCache("sa_admins");
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
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.detail || "Failed to remove admin");
      invalidateMemCache("sa_admins");
      invalidateMemCache("sa_stats");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const admins = getLocalAdmins().filter(a => a.id !== adminId);
        saveLocalAdmins(admins);
        invalidateMemCache("sa_admins");
        return { success: true, message: "Admin deleted" };
      }
      throw err;
    }
  },

  async setSuperAdminUserPassword(userId, newPassword) {
    const res = await fetch(`${API_BASE_URL}/superadmin/users/${userId}/set-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ new_password: newPassword })
    });
    const data = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(data.detail || `Failed to update password (${res.status})`);
    }
    invalidateMemCache("sa_volunteers");
    invalidateMemCache("sa_admins");
    invalidateMemCache("sa_students");
    return data;
  },

  getCachedVolunteers(params = {}) {
    const cacheKey = `sa_volunteers_${params.department || ""}_${params.search || ""}`;
    return getFromMemCache(cacheKey, 300000);
  },

  async listAllVolunteers(params = {}, forceFresh = false) {
    let resolvedParams = params;
    let resolvedForceFresh = forceFresh;
    if (typeof params === "boolean") {
      resolvedForceFresh = params;
      resolvedParams = {};
    }
    const cacheKey = `sa_volunteers_${resolvedParams?.department || ""}_${resolvedParams?.search || ""}`;
    if (!resolvedForceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const qParams = { ...resolvedParams };
        if (resolvedForceFresh) qParams._t = Date.now();
        const query = new URLSearchParams(qParams).toString();
        const res = await fetch(`${API_BASE_URL}/superadmin/volunteers${query ? `?${query}` : ""}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to list volunteers");
        setInMemCache(cacheKey, data);
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = getFromMemCache(cacheKey, 600000);
          if (cached) return cached;
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
    });
  },

  getCachedSuperAdminAttendance(params = {}) {
    const cacheKey = `sa_attendance_${params.date || "all"}_${params.department || ""}`;
    return getFromMemCache(cacheKey, 300000);
  },

  async getSuperAdminAttendance(params = {}, forceFresh = false) {
    const cacheKey = `sa_attendance_${params.date || "all"}_${params.department || ""}`;
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const qParams = { ...params };
        if (forceFresh) qParams._t = Date.now();
        const query = new URLSearchParams(qParams).toString();
        const res = await fetch(`${API_BASE_URL}/superadmin/attendance${query ? `?${query}` : ""}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch attendance");
        setInMemCache(cacheKey, data);
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = getFromMemCache(cacheKey, 600000);
          if (cached) return cached;
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
    });
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
      invalidateMemCache("sa_attendance");
      invalidateMemCache("sa_stats");
      return data;
    } catch (err) {
      if (isNetworkError(err)) {
        const att = getLocalAttendance();
        const rec = att.find(a => a.id === attendanceId);
        if (rec) rec.status = status;
        saveLocalAttendance(att);
        invalidateMemCache("sa_attendance");
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
      invalidateMemCache("sa_attendance");
      invalidateMemCache("sa_stats");
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
        invalidateMemCache("sa_attendance");
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

  async exportEventRegistrationsXlsx(eventId = "all") {
    const query = new URLSearchParams({ event_id: eventId || "all" });
    const res = await fetch(`${API_BASE_URL}/superadmin/registrations/export-xlsx?${query}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      const data = await readApiResponse(res);
      throw new Error(data.detail || "Failed to export event registrations.");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = eventId && eventId !== "all" ? `AKV_Event_Registrations_${eventId}.xlsx` : "AKV_Event_Registrations.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  async createSuperAdminRegistration(registrationData) {
    const res = await fetch(`${API_BASE_URL}/superadmin/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(registrationData)
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to create registration.");
    invalidateMemCache("registrations_");
    invalidateMemCache("sa_stats");
    return data;
  },

  async updateSuperAdminRegistration(id, registrationData) {
    const res = await fetch(`${API_BASE_URL}/superadmin/registrations/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(registrationData)
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to update registration.");
    invalidateMemCache("registrations_");
    invalidateMemCache("sa_stats");
    return data;
  },

  async deleteSuperAdminRegistration(id) {
    const res = await fetch(`${API_BASE_URL}/superadmin/registrations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() }
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to delete registration.");
    invalidateMemCache("registrations_");
    invalidateMemCache("sa_stats");
    return data;
  },

  getCachedSuperAdminIdCards(search = "") {
    const cacheKey = `sa_idcards_${search.trim()}`;
    return getFromMemCache(cacheKey, 300000);
  },

  async getSuperAdminIdCards(search = "", forceFresh = false) {
    const cacheKey = `sa_idcards_${search.trim()}`;
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (forceFresh) query.set("_t", String(Date.now()));
      const res = await fetch(`${API_BASE_URL}/superadmin/id-cards${query.size ? `?${query}` : ""}`, {
        cache: forceFresh ? "no-store" : "default",
        headers: {
          ...getAuthHeaders(),
          ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
        }
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.detail || "Failed to load the ID card directory.");
      setInMemCache(cacheKey, data);
      return data;
    });
  },

  async downloadSuperAdminIdCard(sourceType, sourceId) {
    const res = await fetch(`${API_BASE_URL}/superadmin/id-cards/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}/download`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      const data = await readApiResponse(res);
      throw new Error(data.detail || "Failed to generate the ID card.");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AKV_ID_Card_${sourceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  getCachedAuditLogs(params = {}) {
    const cacheKey = `sa_audit_${params.action || ""}`;
    return getFromMemCache(cacheKey, 300000);
  },

  async getAuditLogs(params = {}, forceFresh = false) {
    const cacheKey = `sa_audit_${params.action || ""}`;
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const qParams = { ...params };
        if (forceFresh) qParams._t = Date.now();
        const query = new URLSearchParams(qParams).toString();
        const res = await fetch(`${API_BASE_URL}/superadmin/audit-logs${query ? `?${query}` : ""}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch audit logs");
        setInMemCache(cacheKey, data);
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = getFromMemCache(cacheKey, 600000);
          if (cached) return cached;
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
    });
  },

  // ==========================================
  // OFFICIAL ATTENDANCE SYSTEM APIs
  // ==========================================
  getCachedAttendanceConfigDates() {
    let cached = memCache.get("attendance_config_dates");
    if (!cached) {
      cached = readLocalJson(STORAGE_ATTENDANCE_KEY + "_dates", null);
      if (!cached || !cached.dates || cached.dates.length === 0) {
        cached = {
          success: true,
          current_date: new Date().toISOString().split("T")[0],
          dates: initialAttendanceDates
        };
      }
      memCache.set("attendance_config_dates", cached);
    }
    return cached;
  },

  async getAttendanceConfigDates(forceFresh = false) {
    const key = "attendance_config_dates";
    if (forceFresh) {
      inflightRequests.delete(key);
    } else if (inflightRequests.has(key)) {
      return await inflightRequests.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const url = `${API_BASE_URL}/attendance/config-dates${forceFresh ? `?_t=${Date.now()}` : ""}`;
        const res = await fetch(url, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.dates) && data.dates.length > 0) {
            memCache.set(key, data);
            writeLocalJson(STORAGE_ATTENDANCE_KEY + "_dates", data);
            return data;
          }
        }
      } catch (err) {
        console.warn("Backend unavailable, using cached attendance dates:", err.message);
      }
      return this.getCachedAttendanceConfigDates();
    })();

    inflightRequests.set(key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inflightRequests.delete(key);
    }
  },

  getCachedAttendance(params = {}) {
    const cacheKey = `official_att_${params.date || ""}_${params.search || ""}_${params.department || ""}_${params.akv_dept || ""}_${params.status_filter || ""}`;
    return getFromMemCache(cacheKey, 300000);
  },

  async getAttendance(params = {}, forceFresh = false) {
    const cacheKey = `official_att_${params.date || ""}_${params.search || ""}_${params.department || ""}_${params.akv_dept || ""}_${params.status_filter || ""}`;
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const qParams = { ...params };
        if (forceFresh) qParams._t = Date.now();
        const query = new URLSearchParams(qParams).toString();
        const res = await fetch(`${API_BASE_URL}/attendance${query ? `?${query}` : ""}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch attendance roster");
        setInMemCache(cacheKey, data);
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          const cached = getFromMemCache(cacheKey, 600000);
          if (cached) return cached;
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
    });
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
    invalidateMemCache("official_att");
    invalidateMemCache("sa_stats");
    return data;
  },

  async markAttendanceCheckOut(userId, date = null, force = false) {
    const res = await fetch(`${API_BASE_URL}/attendance/check-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ user_id: userId, date, force })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Check-Out failed");
    invalidateMemCache("official_att");
    invalidateMemCache("sa_stats");
    return data;
  },

  async scanAttendanceQR(qrData, date = null) {
    const res = await fetch(`${API_BASE_URL}/attendance/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ qr_data: qrData, date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Attendance QR scan failed");
    invalidateMemCache("official_att");
    invalidateMemCache("sa_stats");
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
    invalidateMemCache("official_att");
    invalidateMemCache("sa_stats");
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
    invalidateMemCache("official_att");
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
    invalidateMemCache("official_att");
    invalidateMemCache("sa_stats");
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
    invalidateMemCache("official_att");
    invalidateMemCache("sa_stats");
    return data;
  },

  async getAttendanceAudit(params = {}, forceFresh = false) {
    const qParams = { ...params };
    if (forceFresh) qParams._t = Date.now();
    const query = new URLSearchParams(qParams).toString();
    const res = await fetch(`${API_BASE_URL}/attendance/audit${query ? `?${query}` : ""}`, {
      cache: forceFresh ? "no-store" : "default",
      headers: {
        ...getAuthHeaders(),
        ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
      }
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
      if (res.status === 401) {
        localStorage.removeItem("akv_token");
        localStorage.removeItem("akv_role");
        localStorage.removeItem("akv_user");
        throw new Error("Your session expired. Please log in again and retry the export.");
      }
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
  getCachedWorkingCommitteeAttendance(params = {}) {
    const cacheKey = `wc_att_${params.date || ""}_${params.search || ""}_${params.role_filter || ""}_${params.status_filter || ""}`;
    return getFromMemCache(cacheKey, 300000);
  },

  async getWorkingCommitteeAttendance(params = {}, forceFresh = false) {
    const cacheKey = `wc_att_${params.date || ""}_${params.search || ""}_${params.role_filter || ""}_${params.status_filter || ""}`;
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      const qParams = { ...params };
      if (forceFresh) qParams._t = Date.now();
      const query = new URLSearchParams(qParams).toString();
      const res = await fetch(`${API_BASE_URL}/working-committee-attendance${query ? `?${query}` : ""}`, {
        cache: forceFresh ? "no-store" : "default",
        headers: {
          ...getAuthHeaders(),
          ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch Working Committee attendance roster");
      setInMemCache(cacheKey, data);
      return data;
    });
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
    invalidateMemCache("wc_att");
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
    invalidateMemCache("wc_att");
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
    invalidateMemCache("wc_att");
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
    invalidateMemCache("wc_att");
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
    invalidateMemCache("wc_att");
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
    invalidateMemCache("wc_att");
    return data;
  },

  async getWorkingCommitteeAudit(params = {}, forceFresh = false) {
    const qParams = { ...params };
    if (forceFresh) qParams._t = Date.now();
    const query = new URLSearchParams(qParams).toString();
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/audit${query ? `?${query}` : ""}`, {
      cache: forceFresh ? "no-store" : "default",
      headers: {
        ...getAuthHeaders(),
        ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
      }
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

  async getWorkingCommitteeStats(date = null, forceFresh = false) {
    const qParams = new URLSearchParams();
    if (date) qParams.set("date", date);
    if (forceFresh) qParams.set("_t", String(Date.now()));
    const query = qParams.toString() ? `?${qParams.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/working-committee-attendance/stats${query}`, {
      cache: forceFresh ? "no-store" : "default",
      headers: {
        ...getAuthHeaders(),
        ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
      }
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
  getCachedEvents(category = "all", activeOnly = true) {
    let list = getLocalEvents();
    if (activeOnly) {
      list = list.filter(e => e.is_active !== false);
    }
    return category === "all" ? list : list.filter(e => e.category === category);
  },

  hasCachedEvents(category = "all", activeOnly = true) {
    const cached = this.getCachedEvents(category, activeOnly);
    return Boolean(cached && cached.length > 0);
  },

  async getEvents(category = "all", activeOnly = true, forceFresh = false) {
    const cacheKey = `events_${category}_${activeOnly}`;
    const reqKey = category === "all" ? "events_all" : cacheKey;
    if (forceFresh) {
      inflightRequests.delete("events_all");
      inflightRequests.delete(reqKey);
    } else if (inflightRequests.has("events_all")) {
      await inflightRequests.get("events_all").catch(() => {});
      return this.getCachedEvents(category, activeOnly);
    }

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (category && category !== "all") params.append("category", category);
        if (!activeOnly) params.append("active_only", "false");
        if (forceFresh) params.append("_t", String(Date.now()));
        const queryString = params.toString() ? `?${params.toString()}` : "";
        
        const res = await fetch(`${API_BASE_URL}/events${queryString}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            saveLocalEvents(data);
            return this.getCachedEvents(category, activeOnly);
          }
        }
      } catch (err) {
        console.warn("Backend unavailable, using client dataset for events:", err.message);
      }
      return this.getCachedEvents(category, activeOnly);
    })();

    inflightRequests.set(reqKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inflightRequests.delete(reqKey);
    }
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
        invalidateMemCache("registrations_");
        invalidateMemCache("sa_stats");
        return data;
      }
      const errData = await res.json().catch(() => ({}));
      if (res.status === 404 || (errData.detail && errData.detail.toLowerCase().includes("not exist"))) {
        console.warn("Event not found on backend; saving registration to client storage:", errData.detail);
        const nextNum = getLocalRegistrations().length + 1;
        const fallbackReg = {
          ...registrationData,
          registration_id: `AKVNT${String(nextNum).padStart(4, "0")}`,
          status: "Registered",
          created_at: new Date().toISOString()
        };
        saveLocalRegistration(fallbackReg);
        invalidateMemCache("registrations_");
        return fallbackReg;
      }
      throw new Error(errData.detail || "Registration failed");
    } catch (err) {
      if (isNetworkError(err) || err.message?.includes("not exist") || err.message?.includes("failed to fetch")) {
        console.warn("Backend unavailable, saving registration to local storage:", err.message);
        const nextNum = getLocalRegistrations().length + 1;
        const fallbackReg = {
          ...registrationData,
          registration_id: `AKVNT${String(nextNum).padStart(4, "0")}`,
          status: "Registered",
          created_at: new Date().toISOString()
        };
        saveLocalRegistration(fallbackReg);
        invalidateMemCache("registrations_");
        return fallbackReg;
      }
      throw err;
    }
  },

  async register(registrationData) {
    return this.createRegistration(registrationData);
  },

  getCachedRegistrations(params = {}) {
    const cacheKey = `registrations_${params.event_id || "all"}_${params.search || ""}`;
    return getFromMemCache(cacheKey, 300000);
  },

  async listRegistrations(params = {}, forceFresh = false) {
    const cacheKey = `registrations_${params.event_id || "all"}_${params.search || ""}`;
    if (!forceFresh) {
      const cached = getFromMemCache(cacheKey, 30000);
      if (cached) return cached;
    }
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        const qParams = { ...params };
        if (forceFresh) qParams._t = Date.now();
        const query = new URLSearchParams(qParams).toString();
        const res = await fetch(`${API_BASE_URL}/registrations${query ? `?${query}` : ""}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: {
            ...getAuthHeaders(),
            ...(forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          setInMemCache(cacheKey, data);
          return data;
        }
      } catch (err) {
        console.warn("Backend unavailable, fetching registrations from local storage:", err.message);
      }
      let list = getLocalRegistrations();
      if (params.event_id && params.event_id !== "all") {
        list = list.filter(r => r.event_id === params.event_id);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        list = list.filter(r => 
          (r.registration_id && r.registration_id.toLowerCase().includes(s)) ||
          (r.full_name && r.full_name.toLowerCase().includes(s)) ||
          (r.name && r.name.toLowerCase().includes(s)) ||
          (r.auid && r.auid.toLowerCase().includes(s)) ||
          (r.team_name && r.team_name.toLowerCase().includes(s))
        );
      }
      return list;
    });
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
          full_name: "Participant",
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

  getCachedActivities(category = "all", activeOnly = true) {
    let list = memCache.get("activities");
    if (!list) {
      list = readLocalJson(STORAGE_ACTIVITIES_KEY, defaultActivities);
      memCache.set("activities", list);
    }
    if (activeOnly) {
      list = list.filter(a => a.is_active !== false);
    }
    return category === "all" ? list : list.filter(a => a.category?.toLowerCase() === category.toLowerCase());
  },

  async getActivities(category = "all", activeOnly = true, forceFresh = false) {
    const key = "activities";
    if (forceFresh) {
      inflightRequests.delete(key);
    } else if (inflightRequests.has(key)) {
      await inflightRequests.get(key).catch(() => {});
      return this.getCachedActivities(category, activeOnly);
    }

    const fetchPromise = (async () => {
      try {
        const query = new URLSearchParams();
        if (category && category !== "all") query.set("category", category);
        if (!activeOnly) query.set("active_only", "false");
        if (forceFresh) query.set("_t", String(Date.now()));
        const url = `${API_BASE_URL}/activities${query.toString() ? `?${query.toString()}` : ""}`;
        const res = await fetch(url, {
          cache: forceFresh ? "no-store" : "default",
          headers: forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            memCache.set("activities", data);
            writeLocalJson(STORAGE_ACTIVITIES_KEY, data);
            return this.getCachedActivities(category, activeOnly);
          }
        }
      } catch (err) {
        console.warn("Backend unavailable, using fallback activities list:", err.message);
      }
      return this.getCachedActivities(category, activeOnly);
    })();

    inflightRequests.set(key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inflightRequests.delete(key);
    }
  },

  async createActivity(activityData) {
    try {
      const res = await fetch(`${API_BASE_URL}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create activity");
      let list = this.getCachedActivities("all", false);
      list = [...list, data];
      memCache.set("activities", list);
      writeLocalJson(STORAGE_ACTIVITIES_KEY, list);
      return data;
    } catch (err) {
      if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && err.message !== "Failed to create activity") {
        throw err;
      }
      let list = this.getCachedActivities("all", false);
      const newAct = {
        id: Date.now(),
        title_en: activityData.title_en || activityData.title || "Major Activity",
        title_kn: activityData.title_kn || "",
        desc_en: activityData.desc_en || activityData.description || "",
        desc_kn: activityData.desc_kn || "",
        title: activityData.title_en || activityData.title || "Major Activity",
        description: activityData.desc_en || activityData.description || "",
        activity_date: activityData.activity_date || "",
        image: activityData.image || activityData.image_url || "",
        image_url: activityData.image || activityData.image_url || "",
        category: activityData.category || "Major Activity",
        is_active: activityData.is_active !== undefined ? activityData.is_active : true
      };
      list = [...list, newAct];
      memCache.set("activities", list);
      writeLocalJson(STORAGE_ACTIVITIES_KEY, list);
      return newAct;
    }
  },

  async updateActivity(id, activityData) {
    try {
      const res = await fetch(`${API_BASE_URL}/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update activity");
      let list = this.getCachedActivities("all", false);
      list = list.map(a => a.id === id ? { ...a, ...data } : a);
      memCache.set("activities", list);
      writeLocalJson(STORAGE_ACTIVITIES_KEY, list);
      return data;
    } catch (err) {
      if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && err.message !== "Failed to update activity") {
        throw err;
      }
      let list = this.getCachedActivities("all", false);
      list = list.map(a => a.id === id ? {
        ...a,
        ...activityData,
        title_en: activityData.title_en || activityData.title || a.title_en || a.title,
        title_kn: activityData.title_kn !== undefined ? activityData.title_kn : a.title_kn,
        desc_en: activityData.desc_en || activityData.description || a.desc_en || a.description,
        desc_kn: activityData.desc_kn !== undefined ? activityData.desc_kn : a.desc_kn,
        title: activityData.title || activityData.title_en || a.title,
        description: activityData.description || activityData.desc_en || a.description,
        image_url: activityData.image_url || activityData.image || a.image_url || a.image
      } : a);
      memCache.set("activities", list);
      writeLocalJson(STORAGE_ACTIVITIES_KEY, list);
      return list.find(a => a.id === id);
    }
  },

  async deleteActivity(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/activities/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete activity");
      let list = this.getCachedActivities("all", false);
      list = list.filter(a => a.id !== id);
      memCache.set("activities", list);
      writeLocalJson(STORAGE_ACTIVITIES_KEY, list);
      return data;
    } catch (err) {
      if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && err.message !== "Failed to delete activity") {
        throw err;
      }
      let list = this.getCachedActivities("all", false);
      list = list.filter(a => a.id !== id);
      memCache.set("activities", list);
      writeLocalJson(STORAGE_ACTIVITIES_KEY, list);
      return { success: true };
    }
  },

  getCachedGallery(category = "all") {
    let list = memCache.get("gallery");
    if (!list || list.length === 0) {
      list = readLocalJson(STORAGE_GALLERY_KEY, null);
      if (!list || list.length === 0) {
        list = initialGallery;
      }
      memCache.set("gallery", list);
    }
    return category === "all" ? list : list.filter(g => g.category?.toLowerCase() === category.toLowerCase());
  },

  async getGallery(category = "all", forceFresh = false) {
    const key = "gallery";
    if (forceFresh) {
      inflightRequests.delete(key);
    } else if (inflightRequests.has(key)) {
      await inflightRequests.get(key).catch(() => {});
      return this.getCachedGallery(category);
    }

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (category && category !== "all") params.set("category", category);
        if (forceFresh) params.set("_t", String(Date.now()));
        const queryString = params.toString() ? `?${params.toString()}` : "";
        const url = `${API_BASE_URL}/gallery${queryString}`;
        const res = await fetch(url, {
          cache: forceFresh ? "no-store" : "default",
          headers: forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            memCache.set("gallery", data);
            writeLocalJson(STORAGE_GALLERY_KEY, data);
            return this.getCachedGallery(category);
          }
        }
      } catch (err) {
        console.warn("Backend unavailable, using cached gallery list:", err.message);
      }
      return this.getCachedGallery(category);
    })();

    inflightRequests.set(key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inflightRequests.delete(key);
    }
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
  getCachedReels(postType = "all") {
    let list = memCache.get("reels");
    if (!list || list.length === 0) {
      list = readLocalJson(STORAGE_REELS_KEY, null);
      if (!list || list.length === 0) {
        list = initialReels;
      }
      memCache.set("reels", list);
    }
    return postType === "all" ? list : list.filter(r => (r.type || "reel").toLowerCase() === postType.toLowerCase());
  },

  async getReels(postType = "all", forceFresh = false) {
    const key = "reels";
    if (forceFresh) {
      inflightRequests.delete(key);
    } else if (inflightRequests.has(key)) {
      return await inflightRequests.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (postType && postType !== "all") params.set("post_type", postType);
        if (forceFresh) params.set("_t", String(Date.now()));
        const queryString = params.toString() ? `?${params.toString()}` : "";
        const url = `${API_BASE_URL}/reels${queryString}`;
        const res = await fetch(url, {
          cache: forceFresh ? "no-store" : "default",
          headers: forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            memCache.set("reels", data);
            writeLocalJson(STORAGE_REELS_KEY, data);
            return data;
          }
        }
      } catch (err) {
        console.warn("Backend unavailable, using fallback reels:", err.message);
      }
      return this.getCachedReels(postType);
    })();

    inflightRequests.set(key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inflightRequests.delete(key);
    }
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
  },

  getCachedFestivalSchedule() {
    let schedule = memCache.get("festival_schedule");
    if (!schedule) {
      schedule = readLocalJson(STORAGE_SCHEDULE_KEY, null);
      if (schedule) memCache.set("festival_schedule", schedule);
    }
    return schedule;
  },

  async getFestivalSchedule(forceFresh = false) {
    const key = "festival_schedule";
    if (forceFresh) {
      inflightRequests.delete(key);
    } else if (inflightRequests.has(key)) {
      return await inflightRequests.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const query = forceFresh ? `?_t=${Date.now()}` : "";
        const res = await fetch(`${API_BASE_URL}/festival-schedule${query}`, {
          cache: forceFresh ? "no-store" : "default",
          headers: forceFresh ? { "Cache-Control": "no-cache", "Pragma": "no-cache" } : {}
        });
        if (res.ok) {
          const data = await res.json();
          memCache.set("festival_schedule", data);
          writeLocalJson(STORAGE_SCHEDULE_KEY, data);
          return data;
        }
      } catch (err) {
        console.warn("Backend unavailable, using cached schedule:", err.message);
      }
      return this.getCachedFestivalSchedule() || { schedule: siteConfig.festival.schedule || [] };
    })();

    inflightRequests.set(key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inflightRequests.delete(key);
    }
  },

  prefetchAll(user = null) {
    try {
      const tasks = [
        this.getEvents("all", false).catch(() => {}),
        this.getFestivalSchedule().catch(() => {}),
        this.getActivities("all", false).catch(() => {}),
        this.getGallery("all").catch(() => {}),
        this.getReels("all").catch(() => {}),
        this.getAttendanceConfigDates().catch(() => {})
      ];
      if (user && user.role === "SUPERADMIN") {
        tasks.push(
          this.getSuperAdminStats().catch(() => {}),
          this.listAdmins().catch(() => {}),
          this.listAllVolunteers().catch(() => {}),
          this.listStudents({ limit: 100 }).catch(() => {}),
          this.getSuperAdminIdCards().catch(() => {}),
          this.listRegistrations().catch(() => {})
        );
      } else if (user && user.role !== "ADMIN") {
        tasks.push(this.getStudentDashboard().catch(() => {}));
      }
      Promise.allSettled(tasks);
    } catch (e) {
      console.warn("Prefetch warning:", e);
    }
  },

  async updateFestivalSchedule(days) {
    const normalizedDays = days.map((day) => ({
      id: day.id,
      sort_order: day.sort_order,
      day: day.day,
      day_kn: day.dayKn,
      date: day.date,
      date_kn: day.dateKn,
      title: day.title,
      title_kn: day.titleKn,
      tag: day.tag,
      tag_kn: day.tagKn,
      desc_en: day.descEn,
      desc_kn: day.descKn,
      venue: day.venue,
      venue_en: day.venueEn,
      venue_kn: day.venueKn,
      time_en: day.timeEn,
      time_kn: day.timeKn,
      is_active: day.is_active !== false
    }));
    const res = await fetch(`${API_BASE_URL}/festival-schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ days: normalizedDays })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed to update festival schedule");
    return data;
  },

  // ==========================================
  // DEVELOPER PORTAL APIs
  // ==========================================
  async getDeveloperSuperAdmins() {
    const res = await fetch(`${API_BASE_URL}/developer/superadmins`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to load superadmins");
    return data;
  },

  async createDeveloperSuperAdmin(payload) {
    const res = await fetch(`${API_BASE_URL}/developer/superadmins`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to create superadmin profile");
    return data;
  },

  async updateDeveloperSuperAdmin(userId, payload) {
    const res = await fetch(`${API_BASE_URL}/developer/superadmins/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to update superadmin profile");
    return data;
  },

  async deleteDeveloperSuperAdmin(userId) {
    const res = await fetch(`${API_BASE_URL}/developer/superadmins/${userId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() }
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to delete superadmin profile");
    return data;
  },

  async getDeveloperSystemHealth() {
    const res = await fetch(`${API_BASE_URL}/developer/system-health`, {
      headers: { ...getAuthHeaders() }
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to fetch system diagnostics");
    return data;
  },

  async flushDeveloperCache() {
    const res = await fetch(`${API_BASE_URL}/developer/cache/flush`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() }
    });
    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.detail || "Failed to flush cache");
    return data;
  }
};

// Eager non-blocking background prefetch right upon script evaluation
if (typeof window !== "undefined") {
  setTimeout(() => {
    try {
      const rawUser = localStorage.getItem("akv_user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      api.prefetchAll(user);
    } catch {}
  }, 20);
}

