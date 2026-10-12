import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { getApiBase } from "../services/api.js";

const TeamsContext = createContext(null);

const API_BASE = getApiBase();

export const TeamsProvider = ({ children }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getCurrentRole = () => {
    try {
      const storedUser =
        sessionStorage.getItem("auth_user") ||
        localStorage.getItem("auth_user");

      if (!storedUser) return null;

      const user = JSON.parse(storedUser);
      return user?.role?.toUpperCase();
    } catch {
      return null;
    }
  };

  const fetchTeams = async () => {
    const role = getCurrentRole();

    // Teams are available to ADMIN, PROJECT_MANAGER, PROJECT_LEAD, TEAM_LEAD.
    if (
      role !== "ADMIN" &&
      role !== "PROJECT_MANAGER" &&
      role !== "PROJECT_LEAD" &&
      role !== "TEAM_LEAD"
    ) {
      setTeams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
            const response = await axios.get(`${API_BASE}/teams`);

      const teamsWithMembers = await Promise.all(
        response.data.map(async (team) => {
          try {
                        const membersResponse = await axios.get(
              `${API_BASE}/teams/${team.id}/members`
            );

            return {
              ...team,
              members: membersResponse.data,
            };
          } catch (memberError) {
            console.error(
              `Failed to fetch members for team ${team.id}:`,
              memberError
            );

            return {
              ...team,
              members: [],
            };
          }
        })
      );

      setTeams(teamsWithMembers);
    } catch (error) {
      console.error("Failed to fetch teams:", error);

      setError(
        error.response?.data?.message ||
          "Teams could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const createTeam = async (payload) => {
    try {
      const response = await axios.post(`${API_BASE}/teams`, payload);
      await fetchTeams();
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to create team." };
    }
  };

  const updateTeam = async (teamId, payload) => {
    try {
      const response = await axios.put(`${API_BASE}/teams/${teamId}`, payload);
      await fetchTeams();
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Failed to update team." };
    }
  };

  const deleteTeam = async (teamId) => {
    try {
            await axios.delete(`${API_BASE}/teams/${teamId}`);

      setTeams((prev) =>
        prev.filter(
          (team) => team.id !== teamId
        )
      );

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to delete team.";

      return {
        success: false,
        message,
      };
    }
  };

  const addMember = async (teamId, member) => {
    try {
      await axios.post(
        `${API_BASE}/teams/${teamId}/members`,
        {
          userId: member.userId,
          teamRole: member.teamRole,
        }
      );

      await fetchTeams();

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to add member.";

      return {
        success: false,
        message,
      };
    }
  };

  const updateMember = async (
    teamId,
    userId,
    updates
  ) => {
    try {
      await axios.put(
        `${API_BASE}/teams/${teamId}/members/${userId}`,
        {
          teamRole: updates.teamRole,
        }
      );

      await fetchTeams();

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to update member.";

      return {
        success: false,
        message,
      };
    }
  };

  const removeMember = async (
    teamId,
    userId
  ) => {
    try {
      await axios.delete(
        `${API_BASE}/teams/${teamId}/members/${userId}`
      );

      await fetchTeams();

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to remove member.";

      return {
        success: false,
        message,
      };
    }
  };

  const fetchTeamByProject = async (projectId) => {
    try {
      const response = await axios.get(`${API_BASE}/teams/by-project/${projectId}`);
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, data: null };
      }
      return { success: false, data: null, message: error.response?.data?.message || "Failed to load team." };
    }
  };

  return (
    <TeamsContext.Provider
      value={{
        teams,
        loading,
        error,
        createTeam,
        updateTeam,
        deleteTeam,
        addMember,
        updateMember,
        removeMember,
        fetchTeamByProject,
      }}
    >
      {children}
    </TeamsContext.Provider>
  );
};

export const useTeams = () =>
  useContext(TeamsContext);