import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";

import BugReporting from "./pages/Testing/BugReporting.jsx";


import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./context/AuthContextStore.js";
import { UsersProvider } from "./context/UsersContext.jsx";
import { TeamsProvider } from "./context/TeamsContext.jsx";
import { ProjectProvider } from "./context/ProjectContext.jsx";
import { ProjectTeamProvider } from "./context/ProjectTeamContext.jsx";
import { TasksProvider } from "./context/TasksContext.jsx";
import { useTasks } from "./context/TasksContextStore.js";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RoleRoute from "./routes/RoleRoute.jsx";
import ScopeGuard from "./routes/ScopeGuard.jsx";
import DashboardLayout from "./components/layouts/DashboardLayout.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Auth/Login.jsx";
import Register from "./pages/Auth/Register.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";

import DashboardRouter from "./pages/Dashboard/DashboardRouter.jsx";

import UserManagement from "./pages/UserManagement/UserManagement.jsx";
import UserDetails from "./pages/UserManagement/UserDetails.jsx";
import TeamManagement from "./pages/TeamManagement/TeamManagement.jsx";
import ProjectManagement from "./pages/ProjectManagement/ProjectManagement.jsx";
import ProjectWorkspace from "./pages/ProjectWorkspace/ProjectWorkspace.jsx";
import TaskManagement from "./pages/TaskManagement/TaskManagement.jsx";
import ParentTaskDetailsPage from "./pages/TaskManagement/ParentTaskDetailsPage.jsx";
import SubtaskManagement from "./pages/SubtaskManagement/SubtaskManagement.jsx";
import SubtaskDetails from "./components/Subtask/SubtaskDetails.jsx";
import SubtaskKanban from "./components/Subtask/SubtaskKanban.jsx";
import SubtaskCalendar from "./components/Subtask/SubtaskCalendar.jsx";
import GlobalCalendar from "./pages/Calendar/GlobalCalendar.jsx";
import MyTask from "./pages/Mytask/MyTask.jsx";
import KanbanBoard from "./components/KanbanBoard/KanbanBoard.jsx";

import Settings from "./pages/Settings/Settings.jsx";
import AdminSettings from "./pages/Settings/AdminSettings.jsx";

import { ROLES, MEMBER_ROLES } from "./constants/roles.js";

import "./App.css";

const TaskRedirectHandler = () => {
  const { taskId } = useParams();
  const { tasks } = useTasks();
  const navigate = useNavigate();

  useEffect(() => {
    const task = tasks.find((t) => String(t.id) === String(taskId));
    const projId = task?.projectId || task?.project?.id;

    if (projId) {
      navigate(`/projects/${projId}/tasks/${taskId}`, {
        replace: true,
      });
    } else {
      navigate("/tasks", { replace: true });
    }
  }, [taskId, tasks, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  );
};

const protect = (content) => (
  <ProtectedRoute>
    <DashboardLayout>{content}</DashboardLayout>
  </ProtectedRoute>
);

const AppRoutes = () => {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Landing />
          )
        }
      />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/unauthorized"
        element={protect(<Unauthorized />)}
      />

      <Route
        path="/dashboard"
        element={protect(<DashboardRouter />)}
      />

      <Route
        path="/user-management"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <UserManagement />
          </RoleRoute>
        )}
      />

      <Route
        path="/user-management/:userId"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <UserDetails />
          </RoleRoute>
        )}
      />

      <Route
        path="/teams"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD]}>
            <TeamManagement />
          </RoleRoute>
        )}
      />

      <Route
        path="/projects"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD, ...MEMBER_ROLES]}>
            <ProjectManagement />
          </RoleRoute>
        )}
      />

      <Route
        path="/projects/:projectId"
        element={protect(
          <ScopeGuard>
            <ProjectWorkspace />
          </ScopeGuard>
        )}
      />

      <Route
        path="/tasks"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD, ...MEMBER_ROLES]}>
            <TaskManagement />
          </RoleRoute>
        )}
      />

      <Route
        path="/tasks/:taskId"
        element={protect(<TaskRedirectHandler />)}
      />

      <Route
        path="/projects/:projectId/tasks/:taskId"
        element={protect(
          <ScopeGuard>
            <ParentTaskDetailsPage />
          </ScopeGuard>
        )}
      />

      <Route
        path="/projects/:projectId/tasks/:taskId/subtasks"
        element={protect(
          <ScopeGuard>
            <SubtaskManagement />
          </ScopeGuard>
        )}
      />

      <Route
        path="/projects/:projectId/tasks/:taskId/:subtaskId"
        element={protect(
          <ScopeGuard>
            <SubtaskDetails />
          </ScopeGuard>
        )}
      />

      <Route
        path="/projects/:projectId/tasks/:taskId/:subtaskId/kanban"
        element={protect(
          <ScopeGuard>
            <SubtaskKanban />
          </ScopeGuard>
        )}
      />

      <Route
        path="/projects/:projectId/tasks/:taskId/:subtaskId/calendar"
        element={protect(
          <ScopeGuard>
            <SubtaskCalendar />
          </ScopeGuard>
        )}
      />

      <Route
        path="/calendar"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD, ...MEMBER_ROLES]}>
            <GlobalCalendar />
          </RoleRoute>
        )}
      />

      <Route
        path="/my-tasks"
        element={protect(
          <RoleRoute
            allowedRoles={[
              ROLES.PROJECT_MANAGER,
              ROLES.PROJECT_LEAD,
              ROLES.TEAM_LEAD,
              ...MEMBER_ROLES,
            ]}
          >
            <MyTask />
          </RoleRoute>
        )}
      />

      <Route
        path="/testing"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD, ...MEMBER_ROLES]}>
            <BugReporting />
          </RoleRoute>
        )}
      />

      

      <Route
        path="/kanban"
        element={protect(<KanbanBoard />)}
      />

      <Route
        path="/ai-assistant"
        element={<Navigate to="/dashboard" replace />}
      />

      <Route
        path="/settings"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD, ...MEMBER_ROLES, ROLES.UNASSIGNED]}>
            <Settings />
          </RoleRoute>
        )}
      />

      <Route
        path="/admin-settings"
        element={protect(
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminSettings />
          </RoleRoute>
        )}
      />

      <Route
        path="*"
        element={
          <Navigate
            to={currentUser ? "/dashboard" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

const AuthenticatedApp = () => {
  const { currentUser, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6fa] p-8 text-slate-900 dark:bg-[#0b1120] dark:text-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading SDLC workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AppRoutes />;
  }

  return (
    <UsersProvider>
      <TeamsProvider>
        <ProjectProvider>
          <ProjectTeamProvider>
            <TasksProvider>
              <AppRoutes />
            </TasksProvider>
          </ProjectTeamProvider>
        </ProjectProvider>
      </TeamsProvider>
    </UsersProvider>
  );
};

export default App;
