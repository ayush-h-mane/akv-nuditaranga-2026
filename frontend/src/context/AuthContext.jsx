import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("akv_token") || null);
  const [role, setRole] = useState(() => localStorage.getItem("akv_role") || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify session on load
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem("akv_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        if (res.success && res.user) {
          setUser(res.user);
          setRole(res.user.role);
          localStorage.setItem("akv_role", res.user.role);
        } else {
          logout();
        }
      } catch (err) {
        console.warn("Session expired or invalid, logging out:", err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = (newUser, newToken) => {
    setUser(newUser);
    setToken(newToken);
    setRole(newUser.role);
    localStorage.setItem("akv_token", newToken);
    localStorage.setItem("akv_role", newUser.role);
    localStorage.setItem("akv_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRole(null);
    localStorage.removeItem("akv_token");
    localStorage.removeItem("akv_role");
    localStorage.removeItem("akv_user");
  };

  const refreshUser = async () => {
    try {
      const res = await api.getCurrentUser();
      if (res.success && res.user) {
        setUser(res.user);
        setRole(res.user.role);
      }
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, role, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
