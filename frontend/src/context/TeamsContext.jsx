import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import { getApiBase } from "../services/api.js";
import { TeamsContext } from "./TeamsContextStore.js";
import { useAuth } from "./AuthContextStore.js";

const API_BASE = getApiBase();
const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.detail ||
  error.message ||
  fallback;

export const TeamsProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTeams = useCallback(async () => {
    const role = currentUser?.role?.toUpperCase();

    // Teams are available only to ADMIN and PROJECT_MANAGER.
    if (
      role !== "ADMIN" &&
      role !== "PROJECT_MANAGER"
    ) {
      setTeams([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError("");

    try {
            const response = await axios.get(`${API_BASE}/teams`);

      const teamsWithMembers = await Promise.all(
        response.data.map(async (team) => {
          const membersResponse = await axios.get(
            `${API_BASE}/teams/${team.id}/members`
          );
          return {
            ...team,
            members: membersResponse.data,
          };
        })
      );

      setTeams(teamsWithMembers);
      return teamsWithMembers;
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      setTeams([]);
      setError(getErrorMessage(error, "Teams could not be loaded."));
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchTeams();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchTeams]);

  const createTeam = async (name, projectId) => {
    try {
            await axios.post(`${API_BASE}/teams`, {
        name,
        projectId,
        description: "",
      });

      await fetchTeams();

      return { success: true };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, "Failed to create team.") };
    }
  };

  const updateTeam = async (teamId, updates) => {
    try {
            await axios.put(`${API_BASE}/teams/${teamId}`, {
        name: updates.name,
        description: updates.description || "",
      });

      await fetchTeams();

      return { success: true };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, "Failed to update team.") };
    }
  };

  const deleteTeam = async (teamId) => {
    try {
            await axios.delete(`${API_BASE}/teams/${teamId}`);

      await fetchTeams();

      return { success: true };
    } catch (error) {
      return { success: false, message: getErrorMessage(error, "Failed to delete team.") };
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
      return { success: false, message: getErrorMessage(error, "Failed to add member.") };
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
      return { success: false, message: getErrorMessage(error, "Failed to update member.") };
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
      return { success: false, message: getErrorMessage(error, "Failed to remove member.") };
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
      }}
    >
      {children}
    </TeamsContext.Provider>
  );
};
