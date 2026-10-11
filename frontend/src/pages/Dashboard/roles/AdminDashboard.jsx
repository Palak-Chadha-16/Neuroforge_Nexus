import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PiUsers,
  PiFolder,
  PiCheckCircle,
  PiChartPieSlice,
} from "react-icons/pi";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useUsers } from "../../../context/UsersContextStore.js";
import { useProjects } from "../../../context/ProjectContextStore.js";
import { useTheme } from "../../../context/ThemeContextStore.js";

const AdminDashboard = () => {
  const { users } = useUsers();
  const { projects } = useProjects();
  const { isDark } = useTheme();

  const activeProjects = projects.filter((p) => p.status === "In Progress").length;
  const completedProjects = projects.filter((p) => p.status === "Completed").length;
  const projectCompletionRate = projects.length
    ? Math.round((completedProjects / projects.length) * 100)
    : 0;

  const activeUsersCount = users.filter(
    (u) => (u.status || "Active").toLowerCase() === "active"
  ).length;

  const rolesCount = users.reduce((acc, user) => {
    const role = user.role || "Member";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  /* ================= VISUAL PIE CHART: PROJECTS GROWTH ================= */
  const projectChartData = useMemo(() => {
    const inProgress = projects.filter((p) => p.status === "In Progress").length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    const planning = Math.max(0, projects.length - inProgress - completed);

    const data = [
      { name: "In Progress", value: inProgress, color: "#3b82f6" },
      { name: "Completed", value: completed, color: "#10b981" },
      { name: "Planning & Pipeline", value: planning, color: "#8b5cf6" },
    ].filter((item) => item.value > 0);

    return data.length > 0
      ? data
      : [{ name: "No Projects", value: 1, color: "#94a3b8" }];
  }, [projects]);

  /* ================= VISUAL PIE CHART: USERS GROWTH ================= */
  const userChartData = useMemo(() => {
    let engineering = 0;
    let qaTesting = 0;
    let leadership = 0;
    let admin = 0;

    users.forEach((u) => {
      const r = (u.role || "").toLowerCase();
      if (r.includes("dev")) engineering++;
      else if (r.includes("test") || r.includes("qa")) qaTesting++;
      else if (r.includes("lead") || r.includes("manager")) leadership++;
      else if (r.includes("admin")) admin++;
      else engineering++;
    });

    const data = [
      { name: "Engineering / Dev", value: engineering, color: "#06b6d4" },
      { name: "QA & Testing", value: qaTesting, color: "#f59e0b" },
      { name: "Leadership & Management", value: leadership, color: "#8b5cf6" },
      { name: "System Administration", value: admin, color: "#ec4899" },
    ].filter((item) => item.value > 0);

    return data.length > 0
      ? data
      : [{ name: "Users", value: users.length || 1, color: "#06b6d4" }];
  }, [users]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-200 dark:border-purple-500/20 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-[#0e1424] dark:to-[#0a0e17] p-6 shadow-xs dark:shadow-xl transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 dark:border-purple-500/30 bg-purple-100/80 dark:bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-400">
              System Administration
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Organization Control Center
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-[#e8eef8]/60">
              Global oversight across all users, organizational units, system projects, and delivery metrics.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/projects"
              className="manage-projects-btn inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-900 dark:text-blue-300 shadow-xs transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-950"
            >
              <PiFolder size={16} className="text-slate-800 dark:text-blue-400" />
              <span>Manage Projects</span>
            </Link>
            <Link
              to="/user-management"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-500"
            >
              <PiUsers size={16} />
              Manage Users
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Total Users</span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
              <PiUsers size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{users.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Across all organizational units</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Active Projects</span>
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-400">
              <PiFolder size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{activeProjects}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">{completedProjects} completed projects</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Total Projects</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <PiCheckCircle size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{projects.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Managed initiatives</p>
        </div>
      </div>

      {/* VISUAL PIE CHARTS: OVERALL ORGANIZATION'S GROWTH BASED ON PROJECTS & USERS */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-xl transition-colors">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-purple-500/10 p-1.5 text-purple-600 dark:text-purple-400">
                <PiChartPieSlice size={20} />
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Organization Growth Analytics
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">
              Visual growth metrics and capacity breakdown based on projects and user talent
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
            Live Organization Growth
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* PIE CHART 1: PROJECTS GROWTH & DELIVERY STATUS */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#07111f]/60 p-5 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Project Portfolio Growth
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40">
                  Lifecycle distribution of {projects.length} organizational projects
                </p>
              </div>
              <span className="rounded-md border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                {projectCompletionRate}% Completed
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Pie */}
              <div className="relative flex items-center justify-center shrink-0">
                <PieChart width={150} height={150}>
                  <Pie
                    data={projectChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {projectChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0d1a2b" : "#ffffff",
                      borderColor: isDark ? "rgba(232, 238, 248, 0.15)" : "#e2e8f0",
                      borderRadius: "0.75rem",
                      color: isDark ? "#e8eef8" : "#0f172a",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    itemStyle={{ color: isDark ? "#e8eef8" : "#0f172a" }}
                  />
                </PieChart>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{projects.length}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#e8eef8]/40">Projects</span>
                </div>
              </div>

              {/* Legend & Breakdown */}
              <div className="flex-1 w-full space-y-2.5">
                {projectChartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 dark:text-[#e8eef8]/70">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.value} ({projects.length ? Math.round((item.value / projects.length) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PIE CHART 2: USER CAPITAL & ROLE ALLOCATION GROWTH */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#07111f]/60 p-5 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  User Talent Growth
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40">
                  Role specializations across {users.length} registered members
                </p>
              </div>
              <span className="rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {activeUsersCount}/{users.length} Active
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Pie */}
              <div className="relative flex items-center justify-center shrink-0">
                <PieChart width={150} height={150}>
                  <Pie
                    data={userChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {userChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0d1a2b" : "#ffffff",
                      borderColor: isDark ? "rgba(232, 238, 248, 0.15)" : "#e2e8f0",
                      borderRadius: "0.75rem",
                      color: isDark ? "#e8eef8" : "#0f172a",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    itemStyle={{ color: isDark ? "#e8eef8" : "#0f172a" }}
                  />
                </PieChart>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{users.length}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#e8eef8]/40">Users</span>
                </div>
              </div>

              {/* Legend & Breakdown */}
              <div className="flex-1 w-full space-y-2.5">
                {userChartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 dark:text-[#e8eef8]/70">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.value} ({users.length ? Math.round((item.value / users.length) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Roles Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-sm transition-colors">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Users by Role</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#e8eef8]/50">Headcount breakdown by system persona</p>
          <div className="mt-5 space-y-3">
            {Object.entries(rolesCount).map(([role, count]) => {
              const pct = users.length ? Math.round((count / users.length) * 100) : 0;
              return (
                <div key={role} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-[#e8eef8]">{role}</span>
                    <span className="text-slate-500 dark:text-[#e8eef8]/50">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#181f2f]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Projects Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Projects</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-[#e8eef8]/50">Latest projects created in organization</p>
            </div>
            <Link to="/projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
              View All
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {projects.slice(0, 5).map((proj) => (
              <div key={proj.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    to={`/projects/${proj.id}`}
                    className="text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                  >
                    {proj.name}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40">{proj.code || "NO-CODE"}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    proj.status === "Completed"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : proj.status === "In Progress"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"
                  }`}
                >
                  {proj.status || "Not Started"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
