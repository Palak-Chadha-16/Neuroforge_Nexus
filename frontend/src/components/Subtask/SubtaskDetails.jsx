import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PiArrowLeft,
  PiCalendarBlank,
  PiCheckCircle,
  PiClock,
  PiFolder,
  PiPencilSimple,
  PiTrash,
  PiUserCircle,
} from "react-icons/pi";

import { useTasks } from "../../context/TasksContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useAuth } from "../../context/AuthContextStore.js";
import { usePermission } from "../../hooks/usePermission.js";

const priorityColor = {
  Critical:
    "text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40",
  High:
    "text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40",
  Medium:
    "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40",
  Low:
    "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
};

const statusColor = {
  "To Do":
    "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800",
  "In Progress":
    "text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40",
  "In Review":
    "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40",
  "Ready for Testing":
    "text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40",
  "In Testing":
    "text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40",
  "In QA":
    "text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40",
  Done:
    "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
};

const SubtaskDetails = () => {
  const {
    projectId,
    taskId,
    subtaskId,
  } = useParams();

  const navigate = useNavigate();

  const {
    getTaskById,
    getSubtasksByTaskId,
    deleteSubtask,
  } = useTasks();

  const { users } = useUsers();
  const { projects } = useProjects();
  const { can } = usePermission();
  const { currentUser } = useAuth();

  const [deleting, setDeleting] = useState(false);

  const parentTask = useMemo(() => {
    return getTaskById(taskId);
  }, [getTaskById, taskId]);

  const subtask = useMemo(() => {
    const subtasks = getSubtasksByTaskId(taskId);

    return subtasks.find(
      (item) =>
        String(item.id) === String(subtaskId)
    );
  }, [
    getSubtasksByTaskId,
    taskId,
    subtaskId,
  ]);

  const project = useMemo(() => {
    return projects?.find(
      (item) =>
        String(item.id) ===
        String(
          parentTask?.projectId || projectId
        )
    );
  }, [
    projects,
    parentTask,
    projectId,
  ]);

  const assignee = useMemo(() => {
    if (!subtask?.assigneeId) {
      return null;
    }

    return users.find(
      (user) =>
        String(user.id) ===
        String(subtask.assigneeId)
    );
  }, [users, subtask]);

    const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subtask?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    const result = await deleteSubtask(
      taskId,
      subtaskId
    );

    setDeleting(false);

    if (!result.success) {
      alert(result.message);
      return;
    }

    navigate(
      `/projects/${projectId}/tasks/${taskId}/subtasks`
    );
  };

  const handleEdit = () => {
    navigate(
      `/projects/${projectId}/tasks/${taskId}/subtasks`,
      {
        state: {
          editSubtaskId: subtaskId,
        },
      }
    );
  };

  if (!parentTask || !subtask) {
    return (
      <div className="min-h-full bg-transparent p-6 text-[#172033] dark:text-slate-100">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/projects/${projectId}/tasks/${taskId}/subtasks`
              )
            }
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#64748B] transition hover:text-[#172033] dark:text-slate-400 dark:hover:text-slate-200"
          >
            <PiArrowLeft />
            Back to Subtasks
          </button>

          <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#172033] dark:text-slate-100">
              Subtask not found
            </p>

            <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
              This subtask may have been deleted
              or does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const priorityStyles =
    priorityColor[subtask.priority] ||
    priorityColor.Medium;

  return (
    <div className="min-h-full bg-transparent px-4 py-6 text-[#172033] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        {/* HIERARCHICAL BREADCRUMB */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-[#64748B] dark:text-slate-400">
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
            {project?.name || "Project"}
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() =>
              navigate(`/projects/${projectId}/tasks/${taskId}`)
            }
            className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            TASK-{parentTask.id}
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() =>
              navigate(`/projects/${projectId}/tasks/${taskId}/subtasks`)
            }
            className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            Subtasks
          </button>
          <span>/</span>
          <span className="font-semibold text-[#172033] dark:text-slate-200">
            SUBTASK-{subtask.id}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0b1120]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    SUBTASK-{subtask.id}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusColor[subtask.status] ||
                      statusColor["To Do"]
                    }`}
                  >
                    {subtask.status || "To Do"}
                  </span>

                  <span className="text-sm text-[#64748B] dark:text-slate-400">
                    Sub Task Details
                  </span>
                </div>

                <h1 className="mt-4 text-2xl font-bold text-[#172033] dark:text-white sm:text-3xl">
                  {subtask.title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#475569] dark:text-slate-400">
                  View the details and information associated with this subtask.
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {(can("subtask:edit") ||
                  String(subtask?.assigneeId) ===
                    String(currentUser?.id)) && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#2563EB] dark:border-slate-700 dark:bg-[#24324A] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                  >
                    <PiPencilSimple />
                    Edit
                  </button>
                )}

                {can("subtask:delete") && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <PiTrash />

                    {deleting
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-[#0b1120]">
            <div className="flex min-w-max gap-1">
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Subtask Details
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}/kanban?view=board`
                  )
                }
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Kanban
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}/kanban?view=timeline`
                  )
                }
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Timeline
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}/kanban?view=list`
                  )
                }
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                List
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}/calendar`
                  )
                }
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-[#172033] dark:hover:text-slate-100"
              >
                Calendar
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111927] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
                  <PiCheckCircle size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#172033] dark:text-slate-100">
                    Description
                  </p>

                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    Subtask information
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-[#475569] dark:text-slate-300">
                {subtask.description ||
                  "No description has been added for this subtask."}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400">
                    <PiCheckCircle size={20} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                      Priority
                    </p>

                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${priorityStyles}`}
                      >
                        {subtask.priority || "Medium"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
                    <PiUserCircle size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                      Assignee
                    </p>

                    <p className="mt-2 truncate text-sm font-semibold text-[#172033] dark:text-slate-100">
                      {assignee?.fullName ||
                        assignee?.name ||
                        assignee?.username ||
                        "Unassigned"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
                    <PiCalendarBlank size={20} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                      Due Date
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#172033] dark:text-slate-100">
                      {subtask.dueDate ||
                        "No due date"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400">
                    <PiFolder size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                      Project
                    </p>

                    <p className="mt-2 truncate text-sm font-semibold text-[#172033] dark:text-slate-100">
                      {project?.name ||
                        project?.title ||
                        `Project ${projectId}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
                    <PiClock size={18} />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                      Created
                    </p>

                    <p className="mt-1 text-sm text-[#475569] dark:text-slate-300">
                      {subtask.createdAt
                        ? new Date(
                            subtask.createdAt
                          ).toLocaleDateString()
                        : "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400">
                    <PiFolder size={18} />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                      Project
                    </p>

                    <p className="mt-1 text-sm text-[#475569] dark:text-slate-300">
                      {project?.name ||
                        project?.title ||
                        `Project ${projectId}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtaskDetails;