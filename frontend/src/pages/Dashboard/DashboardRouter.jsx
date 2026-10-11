import { useAuth } from "../../context/AuthContextStore.js";
import { normalizeRole, ROLES } from "../../constants/roles.js";
import AdminDashboard from "./roles/AdminDashboard.jsx";
import ProjectManagerDashboard from "./roles/ProjectManagerDashboard.jsx";
import ProjectLeadDashboard from "./roles/ProjectLeadDashboard.jsx";
import TeamLeadDashboard from "./roles/TeamLeadDashboard.jsx";
import MemberDashboard from "./roles/MemberDashboard.jsx";
import Dashboard from "./Dashboard.jsx";

/**
 * DashboardRouter dynamically routes the user to their role-tailored dashboard:
 * - Admin: Organization Control Center (KPIs, pie charts, users by role, recent projects)
 * - Project Manager: Project Delivery Portfolio (Milestones, risks, schedule health, budget)
 * - Project Lead: Project Execution & Tech Lead (Sprint decomposition, task health)
 * - Team Lead: Squad Team Leadership (Team operations, workload distribution, subtask allocation)
 * - Developer / Tester / QA / Team Member: Personal Workbench (My tasks, deliverables, deadlines)
 */
const DashboardRouter = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500 dark:text-[#e8eef8]/50">
        Loading user workspace...
      </div>
    );
  }

  const role = normalizeRole(currentUser.role);

  switch (role) {
    case ROLES.ADMIN:
      return <AdminDashboard />;
    case ROLES.PROJECT_MANAGER:
      return <ProjectManagerDashboard />;
    case ROLES.PROJECT_LEAD:
      return <ProjectLeadDashboard />;
    case ROLES.TEAM_LEAD:
      return <TeamLeadDashboard />;
    case ROLES.DEVELOPER:
    case ROLES.TESTER:
    case ROLES.QA:
    case ROLES.TEAM_MEMBER:
      return <MemberDashboard />;
    default:
      return <Dashboard />;
  }
};

export default DashboardRouter;