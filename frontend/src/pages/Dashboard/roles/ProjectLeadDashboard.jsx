import { Link } from "react-router-dom";
import {
  PiListChecks,
  PiPlus,
  PiFolder,
} from "react-icons/pi";
import { useAuth } from "../../../context/AuthContextStore.js";
import { useProjects } from "../../../context/ProjectContextStore.js";
import { useTasks } from "../../../context/TasksContextStore.js";

const ProjectLeadDashboard = () => {
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  const ledProjects = projects.filter((p) => {
    const leadId = p.projectLead?.id ?? p.projectLeadId ?? p.leadId;
    return String(leadId) === String(currentUser?.id);
  });

  const ledProjectTasks = tasks.filter((t) =>
    ledProjects.some((p) => String(p.id) === String(t.projectId))
  );

  const todoCount = ledProjectTasks.filter((t) => t.status === "To Do").length;
  const inProgressCount = ledProjectTasks.filter((t) => t.status === "In Progress").length;
  const doneCount = ledProjectTasks.filter((t) => t.status === "Done").length;

  return (
    <div className="space-y-8">
      {/* Lead Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-200 dark:border-cyan-500/20 bg-gradient-to-r from-cyan-50 via-teal-50/50 to-white dark:from-cyan-950/40 dark:via-[#0e1424] dark:to-[#0a0e17] p-6 shadow-xs dark:shadow-xl transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 dark:border-cyan-500/30 bg-cyan-100/80 dark:bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
              Project Execution & Tech Lead
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Execution Control
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-[#e8eef8]/60">
              Drive sprints, decompose architecture into tasks, unblock squads, and lead delivery.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/tasks"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500"
            >
              <PiPlus size={16} />
              Create Task
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-[#e8eef8]/15 bg-white dark:bg-[#181b23] px-4 py-2 text-xs font-medium text-slate-700 dark:text-white transition hover:bg-slate-50 dark:hover:bg-[#e8eef8]/10"
            >
              <PiFolder size={16} />
              My Projects
            </Link>
          </div>
        </div>
      </div>

      {/* Task Status Breakdown Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Backlog / To Do</span>
            <span className="h-3 w-3 rounded-full bg-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{todoCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Ready to pull into sprint</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">In Progress</span>
            <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400">{inProgressCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Actively under development</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Completed</span>
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{doneCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Delivered & verified</p>
        </div>
      </div>

      {/* Led Project Tasks List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Project Work Items</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[#e8eef8]/50">Tasks under your technical leadership</p>
          </div>
          <Link to="/tasks" className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium">
            View Task Board
          </Link>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {ledProjectTasks.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#e8eef8]/40 py-4 text-center">
              No tasks currently tracked in led projects.
            </p>
          ) : (
            ledProjectTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 dark:bg-[#181f2f] p-2 text-cyan-600 dark:text-cyan-400">
                    <PiListChecks size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40">
                      Assignee: {task.assignee?.fullName || "Unassigned"} • Priority: {task.priority || "Medium"}
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-slate-200 dark:border-[#e8eef8]/10 bg-slate-100 dark:bg-[#0a0e17] px-3 py-1 text-xs text-slate-700 dark:text-[#e8eef8]/70">
                  {task.status || "To Do"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectLeadDashboard;
