import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  PiBriefcase,
  PiClockCountdown,
  PiCheckCircle,
  PiCalendarCheck,
  PiArrowRight,
  PiKanban,
} from "react-icons/pi";

import { useAuth } from "../../../context/AuthContextStore.js";
import { useTasks } from "../../../context/TasksContextStore.js";
import { formatRole } from "../../../constants/roles.js";
import { getApiBase } from "../../../services/api.js";

const MemberDashboard = () => {
  const { currentUser } = useAuth();
  const { tasks = [] } = useTasks();

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const DASHBOARD_API = `${getApiBase()}/dashboard`;

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError("");

        const response = await axios.get(DASHBOARD_API);

        console.log("Dashboard API response:", response.data);

        setDashboard(response.data);
      } catch (error) {
        console.error("Dashboard API failed:", error);

        setDashboardError(
          error?.response?.data?.message ||
            error?.response?.data ||
            "Unable to load dashboard data."
        );
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboard();
  }, [DASHBOARD_API]);

  const fallbackMyTasks = tasks.filter(
    (task) => String(task.assigneeId ?? task.assignee?.id) === String(currentUser?.id)
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  const stats = dashboard?.stats || {
    assignedTasks: fallbackMyTasks.length,
    todoTasks: fallbackMyTasks.filter((t) => t.status === "To Do").length,
    inProgressTasks: fallbackMyTasks.filter((t) => t.status === "In Progress").length,
    completedTasks: fallbackMyTasks.filter((t) => t.status === "Done").length,
  };

  const assignedTasks = Number(stats.assignedTasks || 0);
  const inProgressTasks = Number(stats.inProgressTasks || 0);
  const completedTasks = Number(stats.completedTasks || 0);

  const myTasks = dashboard?.myTasks?.items?.length
    ? dashboard.myTasks.items
    : fallbackMyTasks.map((t) => ({
        ...t,
        overdue: Boolean(t.dueDate && t.dueDate < todayStr && t.status !== "Done"),
      }));

  const overdueTasks = myTasks.filter((task) => {
    return task.overdue === true;
  });

  const activeTasks = myTasks.filter((task) => {
    return task.status !== "Done";
  });

  const upcomingTasks = myTasks
    .filter((task) => task.dueDate && task.status !== "Done")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  return (
    <div className="space-y-8">

      {/* Member Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white dark:from-amber-950/40 dark:via-[#0e1424] dark:to-[#0a0e17] p-6 shadow-xs dark:shadow-xl transition-colors">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-100/80 dark:bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Personal Workbench • {formatRole(currentUser?.role)}
            </span>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back, {currentUser?.fullName || "Developer"}
            </h1>

            <p className="mt-1 text-sm text-slate-600 dark:text-[#e8eef8]/60">
              Focus on your active deliverables, track due dates, and update
              task statuses.
            </p>

          </div>

          <div className="flex flex-wrap gap-2.5">

            <Link
              to="/my-tasks"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-500"
            >
              <PiBriefcase size={16} />
              Open My Work
            </Link>

            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-[#e8eef8]/15 bg-white dark:bg-[#181b23] px-4 py-2 text-xs font-medium text-slate-700 dark:text-white transition hover:bg-slate-50 dark:hover:bg-[#e8eef8]/10"
            >
              <PiCalendarCheck size={16} />
              My Schedule
            </Link>

          </div>

        </div>
      </div>

      {/* Dashboard Error */}
      {dashboardError && fallbackMyTasks.length === 0 && (
        <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          Failed to load dashboard data: {dashboardError}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Assigned Work */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">

          <div className="flex items-center justify-between">

            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">
              Assigned Work
            </span>

            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <PiBriefcase size={20} />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            {dashboardLoading ? "..." : assignedTasks}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">
            Tasks assigned to you
          </p>

        </div>

        {/* In Progress */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">

          <div className="flex items-center justify-between">

            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">
              In Progress
            </span>

            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {dashboardLoading ? "..." : inProgressTasks}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">
            Currently being executed
          </p>

        </div>

        {/* Completed */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">

          <div className="flex items-center justify-between">

            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">
              Completed
            </span>

            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <PiCheckCircle size={20} />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {dashboardLoading ? "..." : completedTasks}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">
            Finished & verified
          </p>

        </div>

        {/* Overdue */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">

          <div className="flex items-center justify-between">

            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">
              Overdue
            </span>

            <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400">
              <PiClockCountdown size={20} />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-rose-600 dark:text-rose-400">
            {dashboardLoading ? "..." : overdueTasks.length}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">
            Past due deadline
          </p>

        </div>

      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Active Items */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-sm transition-colors">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Active Queue
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-[#e8eef8]/50">
                Tasks requiring your immediate focus
              </p>
            </div>

            <Link
              to="/my-tasks"
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              View All
              <PiArrowRight size={12} />
            </Link>

          </div>

          <div className="mt-5 space-y-3">

            {dashboardLoading ? (

              <div className="py-8 text-center text-sm text-slate-500 dark:text-[#e8eef8]/40">
                Loading your tasks...
              </div>

            ) : activeTasks.length === 0 ? (

              <div className="py-8 text-center text-sm text-slate-500 dark:text-[#e8eef8]/40">
                No tasks assigned yet. Check in with your Team Lead!
              </div>

            ) : (

              activeTasks.slice(0, 5).map((task) => {

                const isOverdue =
                  task.overdue === true ||
                  (
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== "Done"
                  );

                return (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0a0e17] p-4 transition hover:border-amber-400/40"
                  >

                    <div>

                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {task.title}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40">
                        Due:{" "}
                        <span
                          className={
                            isOverdue
                              ? "text-rose-600 dark:text-rose-400 font-medium"
                              : "text-slate-500 dark:text-[#e8eef8]/60"
                          }
                        >
                          {task.dueDate || "No deadline"}
                        </span>
                      </p>

                    </div>

                    <div className="flex items-center gap-2.5">

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                          task.status === "Done"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : task.status === "In Progress"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20"
                        }`}
                      >
                        {task.status || "To Do"}
                      </span>

                      {task.projectId && (
                        <Link
                          to={`/projects/${task.projectId}/tasks/${task.id}/kanban`}
                          title="Open Kanban"
                          className="rounded-lg p-1.5 text-slate-400 dark:text-[#e8eef8]/50 hover:bg-slate-200 dark:hover:bg-[#e8eef8]/5 hover:text-slate-700 dark:hover:text-[#e8eef8]"
                        >
                          <PiKanban size={16} />
                        </Link>
                      )}

                    </div>

                  </div>
                );
              })

            )}

          </div>

        </div>

        {/* Upcoming Milestones */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-sm transition-colors">

          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Upcoming Milestones
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#e8eef8]/50">
            Deliverable due dates
          </p>

          <div className="mt-5 space-y-3">

            {dashboardLoading ? (

              <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40 py-4 text-center">
                Loading due dates...
              </p>

            ) : upcomingTasks.length === 0 ? (

              <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40 py-4 text-center">
                No upcoming due dates scheduled.
              </p>

            ) : (

              upcomingTasks.map((task) => (

                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0a0e17] p-3.5"
                >

                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                    {task.title}
                  </p>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-[#e8eef8]/50">

                    <span>
                      Due: {task.dueDate}
                    </span>

                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {task.priority || "Normal"} Priority
                    </span>

                  </div>

                </div>

              ))

            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default MemberDashboard;