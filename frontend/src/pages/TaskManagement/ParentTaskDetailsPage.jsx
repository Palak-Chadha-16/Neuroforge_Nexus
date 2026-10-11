import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  PiCheckCircle,
  PiCalendarBlank,
  PiUserCircle,
  PiFolder,
  PiClock,
  PiListChecks,
} from "react-icons/pi";
import { useTasks } from "../../context/TasksContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";

const TASK_STATUSES = ["To Do", "In Progress", "Done"];

const priorityColor = {
  Critical: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  High: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  Medium: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  Low: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
};

const ParentTaskDetailsPage = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();

  const { tasks, updateTask, getSubtasksByTaskId } = useTasks();
  const { getProjectById } = useProjects();
  const { users } = useUsers();

  const task = tasks.find((t) => String(t.id) === String(taskId));
  const project = getProjectById(projectId);
  const subtasks = getSubtasksByTaskId(taskId);

  const [status, setStatus] = useState(task?.status || "To Do");
  const [updating, setUpdating] = useState(false);

  if (!task) {
    return (
      <div className="min-h-full bg-transparent px-4 py-10 text-[#172033] dark:text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-10 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
              <PiCheckCircle
                size={28}
                className="text-red-500 dark:text-red-400"
              />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-[#172033] dark:text-slate-100">
              Parent Task Not Found
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B] dark:text-slate-400">
              The requested task might have been deleted or
              does not exist in this project.
            </p>

            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="mt-5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
            >
              Back to Project
            </button>
          </div>
        </div>
      </div>
    );
  }

    const handleStatusChange = async (e) => {
    const newStatus = e.target.value;

    setStatus(newStatus);
    setUpdating(true);

    await updateTask({
      id: task.id,
      title: task.title,
      description: task.description,
      projectId: task.projectId || projectId,
      assigneeId: task.assigneeId,
      priority: task.priority,
      dueDate: task.dueDate,
      status: newStatus,
    });

    setUpdating(false);
  };

  const assigneeUser =
    task.assignee ||
    users.find(
      (u) => String(u.id) === String(task.assigneeId)
    );

  return (
    <div className="space-y-6">
      {/* HIERARCHICAL BREADCRUMB */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#64748B] dark:text-slate-400">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
        >
          Projects
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() =>
            navigate(`/projects/${projectId}?section=tasks`, {
              state: { section: "tasks" },
            })
          }
          className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
        >
          {project?.name || `Project #${projectId}`}
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() =>
            navigate(`/projects/${projectId}?section=tasks`, {
              state: { section: "tasks" },
            })
          }
          className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
        >
          Parent Tasks
        </button>
        <span>/</span>
        <span className="font-semibold text-[#172033] dark:text-slate-200">
          TASK-{task.id}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-[#0b1120]">
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20"
            >
              Task Details
            </button>

            <Link
              to={`/projects/${projectId}/tasks/${taskId}/subtasks`}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#24324A] dark:hover:text-white"
            >
              <PiListChecks size={16} />
              Subtasks ({subtasks.length})
            </Link>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                TASK-{task.id}
              </span>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#172033] dark:text-white sm:text-3xl">
                {task.title}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#475569] dark:text-slate-400">
                {task.description ||
                  "No description provided for this parent task."}
              </p>
            </div>

            <div className="shrink-0">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                Status
              </label>

              <select
                value={status}
                onChange={handleStatusChange}
                disabled={updating}
                className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[#111927] dark:text-slate-100"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s} className="dark:bg-slate-800 dark:text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-200 dark:border-slate-800 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/60 p-2.5 text-[#2563EB] dark:text-blue-400">
                <PiFolder size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">
                  Project
                </p>

                <p className="truncate text-sm font-semibold text-[#172033] dark:text-slate-100">
                  {project?.name || `Project #${projectId}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/60 p-2.5 text-purple-600 dark:text-purple-400">
                <PiUserCircle size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">
                  Assignee
                </p>

                <p className="truncate text-sm font-semibold text-[#172033] dark:text-slate-100">
                  {assigneeUser?.fullName || "Unassigned"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 p-2.5 text-amber-600 dark:text-amber-400">
                <PiClock size={18} />
              </div>

              <div>
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">
                  Priority
                </p>

                <span
                  className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    priorityColor[task.priority] ||
                    "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {task.priority || "Medium"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/60 p-2.5 text-cyan-600 dark:text-cyan-400">
                <PiCalendarBlank size={18} />
              </div>

              <div>
                <p className="text-xs font-medium text-[#64748B] dark:text-slate-400">
                  Due Date
                </p>

                <p className="text-sm font-semibold text-[#172033] dark:text-slate-100">
                  {task.dueDate || "No deadline"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-800 bg-[#F1F5F9] dark:bg-[#111927] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-[#64748B] dark:text-slate-400">
            {subtasks.length} subtask
            {subtasks.length === 1 ? "" : "s"} decomposed under
            this parent task
          </span>

          <Link
            to={`/projects/${projectId}/tasks/${taskId}/subtasks`}
            className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 transition hover:text-[#4F46E5] dark:hover:text-blue-300"
          >
            Open Subtask Management →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ParentTaskDetailsPage;