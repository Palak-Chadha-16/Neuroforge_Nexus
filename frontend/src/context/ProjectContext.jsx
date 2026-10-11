import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import { getApiBase } from "../services/api.js";
import { ProjectContext } from "./ProjectContextStore.js";

const API_BASE = getApiBase();
const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.response?.data?.detail ||
  error.message ||
  fallback;

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
            const response = await axios.get(`${API_BASE}/projects`);

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setProjects(data);

      if (data.length > 0) {
        setSelectedProjectId((currentId) => {
          if (!currentId || !data.some((p) => String(p.id) === String(currentId))) {
            return data[0].id;
          }
          return currentId;
        });
      } else {
        setSelectedProjectId(null);
      }
    } catch (err) {
      setProjects([]);
      setSelectedProjectId(null);
      setError(getErrorMessage(err, "Projects could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchProjects();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchProjects]);

  const buildPayload = (formData) => ({
    name: formData.name,
    description: formData.description,
    code: formData.code,
    projectLeadId: formData.projectLead
      ? Number(formData.projectLead)
      : null,
    projectManagerId: formData.projectManager
      ? Number(formData.projectManager)
      : null,
    teamId: formData.teamId
      ? Number(formData.teamId)
      : null,
    status: formData.status,
    startDate: formData.startDate || null,
    endDate: formData.endDate || null,
    repository: formData.repository || "",
  });

  const createProject = async (formData) => {
    try {
            const response = await axios.post(
        `${API_BASE}/projects`,
        buildPayload(formData)
      );

      const projectWithRepo = {
        ...response.data,
        repository: response.data?.repository || "",
      };

      setProjects((prev) => [
        ...prev,
        projectWithRepo,
      ]);
      setSelectedProjectId(projectWithRepo.id);
      await fetchProjects();

      return {
        success: true,
        data: projectWithRepo,
      };
    } catch (err) {
      return {
        success: false,
        message: getErrorMessage(err, "Failed to create project."),
      };
    }
  };

  const updateProject = async (arg1, arg2) => {
    const formData =
      typeof arg1 === "object" && arg1 !== null
        ? arg1
        : { ...(arg2 || {}), id: arg1 };

    const targetId = formData.id;
    try {
            const response = await axios.put(
        `${API_BASE}/projects/${targetId}`,
        buildPayload(formData)
      );

      const projectWithRepo = {
        ...response.data,
        repository: response.data?.repository || "",
      };

      setProjects((prev) =>
        prev.map((project) =>
          String(project.id) === String(targetId)
            ? projectWithRepo
            : project
        )
      );
      await fetchProjects();

      return {
        success: true,
        data: projectWithRepo,
      };
    } catch (err) {
      return {
        success: false,
        message: getErrorMessage(err, "Failed to update project."),
      };
    }
  };

  const updateProjectStatus = async (projectId, status) => {
    try {
      let response;
      try {
                response = await axios.patch(
          `${API_BASE}/projects/${projectId}/status`,
          { status }
        );
      } catch (patchErr) {
        if (patchErr.response?.status === 404) {
          const currentProject = projects.find(
            (p) => String(p.id) === String(projectId)
          ) || {};
          response = await axios.put(
            `${API_BASE}/projects/${projectId}`,
            buildPayload({ ...currentProject, status })
          );
        } else {
          throw patchErr;
        }
      }

      const updated = response.data;
      const projectWithRepo = {
        ...updated,
        repository: updated.repository || "",
      };

      setProjects((prev) =>
        prev.map((project) =>
          String(project.id) === String(projectId)
            ? { ...project, ...projectWithRepo, status: updated.status || status }
            : project
        )
      );
      await fetchProjects();

      return {
        success: true,
        data: projectWithRepo,
      };
    } catch (err) {
      return {
        success: false,
        message: getErrorMessage(err, "Failed to update project status."),
      };
    }
  };

  const deleteProject = async (projectId) => {
    try {
            await axios.delete(
        `${API_BASE}/projects/${projectId}`
      );

      setProjects((prev) =>
        prev.filter((project) => String(project.id) !== String(projectId))
      );

      if (
        String(selectedProjectId) ===
        String(projectId)
      ) {
        setSelectedProjectId(null);
      }
      await fetchProjects();

      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: getErrorMessage(err, "Failed to delete project."),
      };
    }
  };

  const getProjectById = (projectId) => {
    return projects.find(
      (project) =>
        String(project.id) ===
        String(projectId)
    );
  };

  const selectProject = (projectId) => {
    setSelectedProjectId(projectId);
  };

  const selectedProject =
    getProjectById(selectedProjectId);

  /*
   * IMPORTANT:
   *
   * The backend already applies project visibility
   * according to the logged-in user's role.
   *
   * Therefore, do not run another frontend
   * canAccessProject() filter here.
   *
   * Example:
   * TEAM_MEMBER Bob -> backend returns only
   * Website Redesign.
   */
  const getVisibleProjects = () => {
    return projects;
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectedProjectId,
        selectProject,
        loading,
        error,
        createProject,
        updateProject,
        updateProjectStatus,
        deleteProject,
        getProjectById,
        getVisibleProjects,
        refetchProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
