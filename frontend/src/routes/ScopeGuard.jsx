import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContextStore.js";
import { useProjects } from "../context/ProjectContextStore.js";
import { useTasks } from "../context/TasksContextStore.js";
import { useProjectTeam } from "../context/ProjectTeamContextStore.js";
import { useTeams } from "../context/TeamsContextStore.js";
import { ROLES, normalizeRole } from "../constants/roles.js";
import {
  canAccessProject,
  canAccessTask,
  canAccessSubtask,
} from "../utils/access.js";

/**
 * Route guard checking Layer 2 data scope on deep routes:
 * Validates the deepest identifier (subtaskId > taskId > projectId).
 */
const ScopeGuard = ({ children }) => {
  const { projectId, taskId, subtaskId } = useParams();
  const { currentUser } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const { tasks, subtasks = [], loading: tasksLoading } = useTasks();
  const { projectTeams = {} } = useProjectTeam();
  const { teams = [] } = useTeams();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(currentUser.role);

  // Admin bypasses data scope checks
  if (role === ROLES.ADMIN) {
    return children;
  }

  // Wait while data is loading to avoid false unauthorized redirects
  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm text-[#e8eef8]/50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-3" />
        Verifying workspace access...
      </div>
    );
  }

  // Check Project
  let project = null;
  if (projectId) {
    project = projects.find((p) => String(p.id) === String(projectId));
    // If project loaded but not found, or user cannot access project:
    if (!project || !canAccessProject(currentUser, project, projectTeams, teams)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check Parent Task
  let task = null;
  if (taskId) {
    task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task || !canAccessTask(currentUser, task, project, projectTeams, teams, subtasks)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check Subtask
  if (subtaskId) {
    const subtask = subtasks.find((s) => String(s.id) === String(subtaskId));
    if (!subtask || !canAccessSubtask(currentUser, subtask, task, project, projectTeams, teams)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ScopeGuard;
