import { Link } from "react-router-dom";
import {
  PiBriefcase,
  PiCalendarCheck,
  PiWarningCircle,
  PiTrendUp,
  PiPlus,
  PiUsersThree,
} from "react-icons/pi";
import { useAuth } from "../../../context/AuthContextStore.js";
import { useProjects } from "../../../context/ProjectContextStore.js";
import { useTasks } from "../../../context/TasksContextStore.js";

const ProjectManagerDashboard = () => {
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  // Filter projects managed by this PM
  const myProjects = projects.filter((p) => {
    const managerId = p.projectManager?.id ?? p.projectManagerId ?? p.managerId;
    return String(managerId) === String(currentUser?.id);
  });

  const now = new Date();
  const managedTasks = tasks.filter((t) =>
    myProjects.some((p) => String(p.id) === String(t.projectId))
  );

  const overdueCount = managedTasks.filter((t) => {
    if (!t.dueDate || t.status === "Done") return false;
    return new Date(t.dueDate) < now;
  }).length;

  return (
    <div className="space-y-8">
      {/* PM Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 via-cyan-50/50 to-white dark:from-blue-950/40 dark:via-[#0e1424] dark:to-[#0a0e17] p-6 shadow-xs dark:shadow-xl transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 dark:border-blue-500/30 bg-blue-100/80 dark:bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
              Project Delivery Portfolio
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Portfolio Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-[#e8eef8]/60">
              Track project milestones, delivery timelines, risks, and budget allocations for managed projects.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              <PiPlus size={16} />
              Create Project
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-[#e8eef8]/15 bg-white dark:bg-[#181b23] px-4 py-2 text-xs font-medium text-slate-700 dark:text-white transition hover:bg-slate-50 dark:hover:bg-[#e8eef8]/10"
            >
              <PiUsersThree size={16} />
              View Teams
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Managed Projects</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <PiBriefcase size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{myProjects.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Active portfolio</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Portfolio Tasks</span>
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-400">
              <PiTrendUp size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{managedTasks.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Total parent deliverables</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Schedule Health</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <PiCalendarCheck size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {overdueCount === 0 ? "100% On Track" : "Action Required"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Delivery cadence</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Overdue Items</span>
            <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
              <PiWarningCircle size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-rose-600 dark:text-rose-400">{overdueCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Tasks past deadline</p>
        </div>
      </div>

      {/* Managed Projects Health & Progress */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Managed Projects Health</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[#e8eef8]/50">Execution progress and risk classification</p>
          </div>
          <Link to="/projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Manage All
          </Link>
        </div>

        <div className="mt-5 space-y-4">
          {myProjects.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#e8eef8]/40 py-4 text-center">
              No projects assigned to you as Project Manager yet.
            </p>
          ) : (
            myProjects.map((p) => {
              const projectTasks = tasks.filter((t) => String(t.projectId) === String(p.id));
              const doneTasks = projectTasks.filter((t) => t.status === "Done");
              const progressPct = projectTasks.length
                ? Math.round((doneTasks.length / projectTasks.length) * 100)
                : p.status === "Completed" ? 100 : 35;

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0a0e17] p-4 transition hover:border-blue-400/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link
                        to={`/projects/${p.id}`}
                        className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        {p.name}
                      </Link>
                      <span className="ml-2.5 text-xs text-slate-500 dark:text-[#e8eef8]/40">{p.code}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        On Track
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">{progressPct}%</span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#181f2f]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-[#e8eef8]/40">
                    <span>{projectTasks.length} total tasks</span>
                    <span>Lead: {p.projectLead?.fullName || "Assigned Lead"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectManagerDashboard;
