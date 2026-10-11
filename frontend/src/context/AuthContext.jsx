import { useEffect, useState } from "react";
import axios from "axios";
import { normalizeRole, ROLES } from "../constants/roles.js";
import { AuthContext } from "./AuthContextStore.js";
import {
  setToken,
  clearToken,
  getToken,
  setTokenPersistent,
  getApiBase,
} from "../services/api.js";

const API_BASE = getApiBase();
const AUTH_USER_KEY = "auth_user";

const normalizeUser = (user) => {
  if (!user) return null;

  const role = normalizeRole(user.role || ROLES.UNASSIGNED);

  return {
    ...user,
    id: user.id,
    fullName: user.fullName || user.name || "User",
    name: user.fullName || user.name || "User",
    email: user.email || "",
    role,
    teamId: user.teamId ?? null,
    skills: Array.isArray(user.skills)
      ? user.skills
      : user.skill
        ? [user.skill]
        : [],
    status: user.status || "Active",
  };
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser =
      sessionStorage.getItem(AUTH_USER_KEY) ||
      localStorage.getItem(AUTH_USER_KEY);
    if (!getToken() || !savedUser) return null;
    try {
      const saved = JSON.parse(savedUser);
      if (!saved) return null;
      const role = normalizeRole(saved.role || ROLES.UNASSIGNED);
      return {
        ...saved,
        id: saved.id,
        fullName: saved.fullName || saved.name || "User",
        name: saved.fullName || saved.name || "User",
        email: saved.email || "",
        role,
        teamId: saved.teamId ?? null,
        skills: Array.isArray(saved.skills)
          ? saved.skills
          : saved.skill
            ? [saved.skill]
            : [],
        status: saved.status || "Active",
      };
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady] = useState(() => !getToken());

  useEffect(() => {
    const savedUser =
      sessionStorage.getItem(AUTH_USER_KEY) ||
      localStorage.getItem(AUTH_USER_KEY);

    const token = getToken();

    if (!token) {
      sessionStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return;
    }

    if (savedUser) {
      try {
        JSON.parse(savedUser);
      } catch {
        sessionStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }

    axios
      .get(`${API_BASE}/auth/me`)
      .then((response) => {
        const user = normalizeUser(response.data);

        const storage = localStorage.getItem(AUTH_USER_KEY)
          ? localStorage
          : sessionStorage;

        storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        setCurrentUser(user);
      })
      .catch(() => {
        clearToken();
        sessionStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/signup`, {
        fullName: userData.name || userData.fullName,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword,
      });

      if (!response.data?.token) {
        return {
          success: false,
          message: "Registration failed: authentication token was not returned.",
        };
      }

      setToken(response.data.token);

      const user = normalizeUser(response.data);

      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      localStorage.removeItem(AUTH_USER_KEY);

      setCurrentUser(user);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Registration failed.",
      };
    }
  };

  const login = async (email, password, remember = false) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        identifier: email,
        email,
        password,
      });

      if (!response.data?.token) {
        return {
          success: false,
          message: "Login failed: authentication token was not returned.",
        };
      }

      if (remember) {
        setTokenPersistent(response.data.token);
      } else {
        setToken(response.data.token);
      }

      const user = normalizeUser(response.data);

      const storage = remember ? localStorage : sessionStorage;

      storage.setItem(AUTH_USER_KEY, JSON.stringify(user));

      if (remember) {
        sessionStorage.removeItem(AUTH_USER_KEY);
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }

      setCurrentUser(user);

      return {
        success: true,
      };
    } catch (error) {
      const isNetworkError =
        !error.response ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNREFUSED";

      clearToken();
      sessionStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      setCurrentUser(null);

      return {
        success: false,
        message:
          error.response?.data?.message ||
          (isNetworkError
            ? "Unable to connect to the backend."
            : "Invalid email or password."),
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
    } catch {
      // Logout locally even if the backend request fails.
    }

    clearToken();
    sessionStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setCurrentUser(null);
  };

  const deleteAccount = async () => {
    try {
      await axios.delete(`${API_BASE}/users/me`);

      clearToken();
      sessionStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      setCurrentUser(null);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to delete your account.",
      };
    }
  };

  const updateCurrentUser = async (updates) => {
    try {
      const response = await axios.put(`${API_BASE}/users/me`, updates);

      const updated = normalizeUser(response.data);

      const storage = localStorage.getItem(AUTH_USER_KEY)
        ? localStorage
        : sessionStorage;

      storage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
      setCurrentUser(updated);

      return {
        success: true,
        user: updated,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to update your profile.",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authReady,
        register,
        login,
        logout,
        deleteAccount,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
