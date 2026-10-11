import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import { getApiBase } from "../services/api.js";
import { normalizeUser, UsersContext } from "./UsersContextStore.js";
import { useAuth } from "./AuthContextStore.js";

const API_BASE = getApiBase();
const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.detail ||
  error.message ||
  fallback;

export const UsersProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    const currentRole = currentUser?.role?.toUpperCase();
    setLoading(true);
    setError("");

    try {
            const response = currentRole === "ADMIN"
        ? await axios.get(`${API_BASE}/users`)
        : ["PROJECT_MANAGER", "PROJECT_LEAD", "TEAM_LEAD"].includes(currentRole)
          ? await axios.get(`${API_BASE}/users/options`)
          : { data: [] };

      const normalized = Array.isArray(response.data) ? response.data.map(normalizeUser) : [];
      setUsers(normalized);
    } catch (error) {
      setUsers([]);
      setError(getErrorMessage(error, "Users could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchUsers();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchUsers]);

  const createUser = async (newUser) => {
    try {
            const response = await axios.post(`${API_BASE}/users`, {
        fullName: newUser.fullName || newUser.name,
        email: newUser.email,
        password: newUser.password || "TempPass@123",
        role: newUser.role,
        status: newUser.status || "Active",
      });
      const normalized = normalizeUser(response.data);
      setUsers((prev) => [normalized, ...prev]);
      return { success: true, data: normalized };
    } catch (e) {
      return { success: false, message: getErrorMessage(e, "Failed to create user.") };
    }
  };

  const updateUser = async (updatedUser) => {
    const existing = users.find((u) => String(u.id) === String(updatedUser.id));
    if (!existing) return { success: false, message: "User not found." };

    try {
            let response = await axios.put(`${API_BASE}/users/${updatedUser.id}`, {
        fullName: updatedUser.fullName || updatedUser.name,
        email: updatedUser.email,
      });
      if (updatedUser.role && String(updatedUser.role).toLowerCase() !== String(existing.role).toLowerCase()) {
        response = await axios.patch(`${API_BASE}/users/${updatedUser.id}/role`, { role: updatedUser.role });
      }
      if (updatedUser.status && updatedUser.status !== existing.status) {
        response = await axios.patch(`${API_BASE}/users/${updatedUser.id}/status`, { status: updatedUser.status });
      }
      const normalized = normalizeUser(response.data || { ...existing, ...updatedUser });
      setUsers((prev) => {
        return prev.map((u) => String(u.id) === String(normalized.id) ? normalized : u);
      });
      return { success: true, data: normalized };
    } catch (error) {
      await fetchUsers();
      return { success: false, message: getErrorMessage(error, "Failed to update user.") };
    }
  };

  const updateUserStatus = async (targetUserId, newStatus) => {
    try {
            const response = await axios.patch(`${API_BASE}/users/${targetUserId}/status`, { status: newStatus });
      const normalized = normalizeUser(response.data);
      setUsers((prev) => {
        return prev.map((u) => String(u.id) === String(targetUserId) ? normalized : u);
      });
      return { success: true, data: normalized };
    } catch (error) {
      await fetchUsers();
      return { success: false, message: getErrorMessage(error, "Failed to update user status.") };
    }
  };

  const toggleUserStatus = async (targetUserId) => {
    const user = users.find((u) => String(u.id) === String(targetUserId));
    if (!user) return { success: false, message: "User not found." };
    const nextStatus = user.status === "Active" ? "In Meeting" : user.status === "In Meeting" ? "Inactive" : "Active";
    return updateUserStatus(targetUserId, nextStatus);
  };

  const deleteUser = async (userId) => {
    try {
            await axios.delete(`${API_BASE}/users/${userId}`);
      setUsers((prev) => prev.filter((u) => String(u.id) !== String(userId)));
      return { success: true };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, "Failed to delete user.") };
    }
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        loading,
        error,
        createUser,
        updateUser,
        updateUserStatus,
        toggleUserStatus,
        deleteUser,
        refetchUsers: fetchUsers,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};
