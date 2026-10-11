import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getApiBase } from "../services/api.js";
import { MEMBER_STATUSES, ProjectTeamContext } from "./ProjectTeamContextStore.js";

const API_BASE = getApiBase();
const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.detail ||
  error.message ||
  fallback;

const normalizeMember = (member) => ({
  id: member.id,
  userId: Number(member.userId ?? member.user?.id ?? member.id),
  projectRole: member.projectRole ?? member.role ?? "Developer",
  status: MEMBER_STATUSES.includes(member.status) ? member.status : "Active",
  fullName: member.fullName ?? member.user?.fullName ?? "",
  email: member.email ?? member.user?.email ?? "",
});

export const ProjectTeamProvider = ({ children }) => {
  const [projectTeams, setProjectTeams] = useState({});
  const [error, setError] = useState("");

  const loadProjectMembers = useCallback(async (projectId) => {
    if (!projectId) return [];
    try {
      const { data } = await axios.get(`${API_BASE}/projects/${projectId}/members`);
      if (!Array.isArray(data)) {
        throw new Error("Project members response was invalid.");
      }
      const normalized = data.map(normalizeMember);
      setProjectTeams((prev) => ({ ...prev, [String(projectId)]: normalized }));
      setError("");
      return normalized;
    } catch (error) {
      setError(getErrorMessage(error, "Project members could not be loaded."));
      throw error;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/projects`);
        if (!Array.isArray(data)) {
          throw new Error("Projects response was invalid.");
        }
        await Promise.all(data.map((project) => loadProjectMembers(project.id)));
        setError("");
      } catch (error) {
        setError(getErrorMessage(error, "Project members could not be loaded."));
      }
    };
    load();
  }, [loadProjectMembers]);

  const getProjectMembers = useCallback((projectId) => projectTeams[String(projectId)] || [], [projectTeams]);
  const isUserAssignedToProject = useCallback((userId) => Object.values(projectTeams).some((members) => members.some((m) => String(m.userId) === String(userId))), [projectTeams]);
  const getUserProjectId = useCallback((userId) => {
    const entry = Object.entries(projectTeams).find(([, members]) => members.some((m) => String(m.userId) === String(userId)));
    return entry ? entry[0] : null;
  }, [projectTeams]);

  const addProjectMember = useCallback(async (projectId, userId, projectRole) => {
    try {
      const { data } = await axios.post(`${API_BASE}/projects/${projectId}/members`, { userId: Number(userId), projectRole });
      await loadProjectMembers(projectId);
      setError("");
      return { success: true, data: normalizeMember(data) };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to assign project member.");
      setError(message);
      return { success: false, message };
    }
  }, [loadProjectMembers]);

  const updateProjectMember = useCallback(async (projectId, userId, projectRole) => {
    try {
      const { data } = await axios.put(`${API_BASE}/projects/${projectId}/members/${userId}`, { projectRole });
      await loadProjectMembers(projectId);
      setError("");
      return { success: true, data: normalizeMember(data) };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update project member.");
      setError(message);
      return { success: false, message };
    }
  }, [loadProjectMembers]);

  const updateProjectMemberStatus = useCallback(async (projectId, userId, status) => {
    if (!MEMBER_STATUSES.includes(status)) return { success: false, message: "Invalid member status." };
    try {
      const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/members/${userId}/status`, { status });
      await loadProjectMembers(projectId);
      setError("");
      return { success: true, data: normalizeMember(data) };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to update project member status.");
      setError(message);
      return { success: false, message };
    }
  }, [loadProjectMembers]);

  const removeProjectMember = useCallback(async (projectId, userId) => {
    try {
      await axios.delete(`${API_BASE}/projects/${projectId}/members/${userId}`);
      await loadProjectMembers(projectId);
      setError("");
      return { success: true };
    } catch (error) {
      const message = getErrorMessage(error, "Failed to remove project member.");
      setError(message);
      return { success: false, message };
    }
  }, [loadProjectMembers]);

  const clearProjectTeam = useCallback((projectId) => setProjectTeams((prev) => {
    const next = { ...prev };
    delete next[String(projectId)];
    return next;
  }), []);

  const syncUserStatusAcrossTeams = useCallback((userId, status) => {
    setProjectTeams((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach((projectId) => {
        next[projectId] = next[projectId].map((m) => {
          if (String(m.userId) === String(userId)) {
            changed = true;
            return { ...m, status };
          }
          return m;
        });
      });
      return changed ? next : prev;
    });
  }, []);

  const value = useMemo(() => ({
    projectTeams,
    error,
    getProjectMembers,
    isUserAssignedToProject,
    getUserProjectId,
    addProjectMember,
    updateProjectMember,
    updateProjectMemberStatus,
    syncUserStatusAcrossTeams,
    removeProjectMember,
    clearProjectTeam,
    MEMBER_STATUSES,
    loadProjectMembers,
  }), [
    projectTeams,
    error,
    getProjectMembers,
    isUserAssignedToProject,
    getUserProjectId,
    addProjectMember,
    updateProjectMember,
    updateProjectMemberStatus,
    syncUserStatusAcrossTeams,
    removeProjectMember,
    clearProjectTeam,
    loadProjectMembers,
  ]);

  return <ProjectTeamContext.Provider value={value}>{children}</ProjectTeamContext.Provider>;
};
