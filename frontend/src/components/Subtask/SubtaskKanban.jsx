import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  PiArrowLeft,
  PiCalendarBlank,
  PiUserCircle,
  PiLockKey,
  PiKanban,
  PiChartBarHorizontal,
  PiListBullets,
} from "react-icons/pi";

import { useTasks } from "../../context/TasksContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useAuth } from "../../context/AuthContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useProjectTeam } from "../../context/ProjectTeamContextStore.js";
import { useTeams } from "../../context/TeamsContextStore.js";
import { canMoveSubtaskKanban } from "../../utils/access.js";
import SubtaskTimelineView from "./SubtaskTimelineView.jsx";
import SubtaskListView from "./SubtaskListView.jsx";

const COLUMNS = [
  {
    id: "To Do",
    title: "To Do",
    color: "text-slate-600",
    dot: "bg-slate-500",
  },
  {
    id: "In Progress",
    title: "In Progress",
    color: "text-[#2563EB]",
    dot: "bg-[#2563EB]",
  },
  {
    id: "In Review",
    title: "In Review",
    color: "text-purple-600",
    dot: "bg-purple-500",
  },
  {
    id: "Done",
    title: "Done",
    color: "text-[#16A34A]",
    dot: "bg-[#16A34A]",
  },
];

const priorityColor = {
  Critical: "text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40",
  High: "text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40",
  Medium: "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40",
  Low: "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
};

const SubtaskKanban = () => {
  const {
    projectId,
    taskId,
    subtaskId,
  } = useParams();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get("view");

  const [storedViewMode, setStoredViewMode] = useState(() => {
    return localStorage.getItem("subtask_kanban_view_mode") || "board";
  });
  const viewMode =
    urlView && ["board", "timeline", "list"].includes(urlView)
      ? urlView
      : storedViewMode;

  const handleViewModeChange = (mode) => {
    setStoredViewMode(mode);
    try {
      localStorage.setItem("subtask_kanban_view_mode", mode);
    } catch {
      // Ignore storage errors in restricted contexts
    }
    setSearchParams({ view: mode }, { replace: true });
  };

  const {
    getTaskById,
    getSubtasksByTaskId,
    updateSubtask,
    updateSubtaskStatus,
  } = useTasks();

  const { users } = useUsers();
  const { currentUser } = useAuth();
  const { getProjectById } = useProjects();
  const { projectTeams = {} } = useProjectTeam();
  const { teams = [] } = useTeams();

  const project = getProjectById(projectId);
  const parentTask = useMemo(() => getTaskById(taskId), [getTaskById, taskId]);
  const subtasks = useMemo(
    () => getSubtasksByTaskId(taskId),
    [getSubtasksByTaskId, taskId]
  );

  const [draggedSubtaskId, setDraggedSubtaskId] =
    useState(null);

  const [dragOverColumn, setDragOverColumn] =
    useState(null);

  const [isUpdating, setIsUpdating] =
    useState(false);

  if (!projectId || !taskId || !subtaskId) {
    return (
      <div className="min-h-full bg-transparent p-6 text-[#172033] dark:text-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#172033] dark:text-slate-100">
              Invalid subtask URL
            </p>

            <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
              Project, task, or subtask information is
              missing from the URL.
            </p>

            <button
              type="button"
              onClick={() => navigate("/tasks")}
              className="mt-6 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
            >
              Back to Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getAssignee = (assigneeId) => {
    return users.find(
      (user) =>
        String(user.id) === String(assigneeId)
    );
  };

  const handleDragStart = (
    event,
    subtask
  ) => {
    const canMove = canMoveSubtaskKanban(
      currentUser,
      subtask,
      parentTask,
      project,
      projectTeams,
      teams
    );

    if (!canMove) {
      event.preventDefault();
      return;
    }

    setDraggedSubtaskId(subtask.id);

    event.dataTransfer.effectAllowed = "move";

    event.dataTransfer.setData(
      "text/plain",
      String(subtask.id)
    );
  };

  const handleDragEnd = () => {
    setDraggedSubtaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (
    event,
    columnId
  ) => {
    event.preventDefault();

    event.dataTransfer.dropEffect = "move";

    setDragOverColumn(columnId);
  };

  const handleDragLeave = (
    event,
    columnId
  ) => {
    const currentTarget =
      event.currentTarget;

    const relatedTarget =
      event.relatedTarget;

    if (
      relatedTarget &&
      currentTarget.contains(relatedTarget)
    ) {
      return;
    }

    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (
    event,
    newStatus
  ) => {
    event.preventDefault();

    const draggedId =
      event.dataTransfer.getData(
        "text/plain"
      ) || draggedSubtaskId;

    setDragOverColumn(null);

    if (!draggedId) {
      setDraggedSubtaskId(null);
      return;
    }

    const draggedSubtask =
      subtasks.find(
        (subtask) =>
          String(subtask.id) ===
          String(draggedId)
      );

    if (!draggedSubtask) {
      setDraggedSubtaskId(null);
      return;
    }

    const canMove = canMoveSubtaskKanban(
      currentUser,
      draggedSubtask,
      parentTask,
      project,
      projectTeams,
      teams
    );

    if (!canMove) {
      setDraggedSubtaskId(null);
      return;
    }

    if (
      (draggedSubtask.status || "To Do") ===
      newStatus
    ) {
      setDraggedSubtaskId(null);
      return;
    }

    setIsUpdating(true);

        const result = updateSubtaskStatus
      ? await updateSubtaskStatus(
          draggedSubtask.id,
          newStatus
        )
      : await updateSubtask(taskId, {
          ...draggedSubtask,
          status: newStatus,
        });

    setIsUpdating(false);
    setDraggedSubtaskId(null);

    if (!result.success) {
      alert(result.message);
    }
  };

  const handleOpenSubtask = (subtask) => {
    navigate(
      `/projects/${projectId}/tasks/${taskId}/${subtask.id}`
    );
  };

  const handleStatusUpdate = async (targetSubtaskId, newStatus) => {
        setIsUpdating(true);
    const targetSubtask = subtasks.find(
      (s) => String(s.id) === String(targetSubtaskId)
    );
    if (!targetSubtask) {
      setIsUpdating(false);
      return;
    }

    const canMove = canMoveSubtaskKanban(
      currentUser,
      targetSubtask,
      parentTask,
      project,
      projectTeams,
      teams
    );

    if (!canMove) {
      setIsUpdating(false);
      alert("You do not have permission to transition this subtask.");
      return;
    }

    const result = updateSubtaskStatus
      ? await updateSubtaskStatus(targetSubtaskId, newStatus)
      : await updateSubtask(taskId, {
          ...targetSubtask,
          status: newStatus,
        });

    setIsUpdating(false);
    if (!result.success) {
      alert(result.message || "Failed to update subtask status.");
    }
  };

  if (!parentTask) {
    return (
      <div className="min-h-full bg-transparent p-6 text-[#172033] dark:text-slate-100">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/projects/${projectId}/tasks/${taskId}`
              )
            }
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#475569] dark:text-slate-400 transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            <PiArrowLeft />
            Back to Task
          </button>

          <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#172033] dark:text-slate-100">
              Task not found
            </p>

            <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
              This task may have been deleted or
              does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent px-4 py-6 text-[#172033] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
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
              navigate(
                `/projects/${projectId}/tasks/${taskId}/${subtaskId}`
              )
            }
            className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            SUBTASK-{subtaskId}
          </button>
          <span>/</span>
          <span className="font-semibold text-[#172033] dark:text-slate-200">
            {viewMode === "timeline"
              ? "Timeline"
              : viewMode === "list"
              ? "List"
              : "Kanban"}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0f172a]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  TASK-{parentTask.id}
                </span>

                <span className="text-sm text-[#64748B] dark:text-slate-400">
                  {viewMode === "timeline"
                    ? "Subtask Timeline"
                    : viewMode === "list"
                    ? "Subtask List View"
                    : "Subtask Kanban"}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#172033] dark:text-white sm:text-3xl">
                {parentTask.title}
              </h1>

              <p className="mt-2 text-sm text-[#475569] dark:text-slate-400">
                {viewMode === "board" &&
                  "Drag and drop subtasks between columns to update their delivery status."}
                {viewMode === "timeline" &&
                  "Chronological milestone schedule grouped by due date targets."}
                {viewMode === "list" &&
                  "Structured overview of all subtasks with multi-column sorting and direct status transitions."}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-[#0b1120]">
            <div className="flex min-w-max gap-1">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}`
                  )
                }
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Subtask Details
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange("board")}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  viewMode === "board"
                    ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                Kanban
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange("timeline")}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  viewMode === "timeline"
                    ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                Timeline
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  viewMode === "list"
                    ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
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
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Calendar
              </button>
            </div>
          </div>
        </div>

        {/* View Switcher Controls Bar */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {viewMode === "board" && "Subtask Workflow Board"}
              {viewMode === "timeline" && "Milestone Timeline"}
              {viewMode === "list" && "Subtask Table Overview"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {viewMode === "board" && "Drag cards between columns to change delivery state."}
              {viewMode === "timeline" && "Chronological milestone rail grouped by deadlines."}
              {viewMode === "list" && "Full tabular listing with multi-column sorting and filtering."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher Segmented Control */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => handleViewModeChange("board")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "board"
                    ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Board (Cards) View"
              >
                <PiKanban size={15} />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange("timeline")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "timeline"
                    ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Chronological Milestone Timeline View"
              >
                <PiChartBarHorizontal size={15} />
                <span>Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Structured Table / List View"
              >
                <PiListBullets size={15} />
                <span>List</span>
              </button>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-1 dark:ring-slate-700">
              {subtasks.length} subtask{subtasks.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* View Mode: Board / Cards */}
        {viewMode === "board" && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COLUMNS.map((column) => {
                const count =
                  subtasks.filter((subtask) => {
                    const st =
                      subtask.status || "To Do";

                    if (column.id === "In Review") {
                      return [
                        "In Review",
                        "Ready for Testing",
                        "In Testing",
                        "In QA",
                      ].includes(st);
                    }

                    return st === column.id;
                  }).length;

                return (
                  <div
                    key={column.id}
                    className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#475569] dark:text-slate-400">
                        {column.title}
                      </p>

                      <span
                        className={`text-sm font-semibold ${column.color}`}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="grid min-w-[1000px] grid-cols-4 gap-5">
                {COLUMNS.map((column) => {
                  const columnSubtasks =
                    subtasks.filter((subtask) => {
                      const st =
                        subtask.status || "To Do";

                      if (column.id === "In Review") {
                        return [
                          "In Review",
                          "Ready for Testing",
                          "In Testing",
                          "In QA",
                        ].includes(st);
                      }

                      return st === column.id;
                    });

                  const isDropTarget =
                    dragOverColumn === column.id;

                  return (
                    <div
                      key={column.id}
                      onDragOver={(event) =>
                        handleDragOver(
                          event,
                          column.id
                        )
                      }
                      onDragLeave={(event) =>
                        handleDragLeave(
                          event,
                          column.id
                        )
                      }
                      onDrop={(event) =>
                        handleDrop(
                          event,
                          column.id
                        )
                      }
                      className={`min-h-[500px] rounded-2xl border transition-all duration-200 ${
                        isDropTarget
                          ? "border-blue-400 bg-blue-50/60 dark:bg-blue-950/20 shadow-[0_0_0_1px_rgba(37,99,235,0.12)]"
                          : "border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#111927] shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${column.dot}`}
                          />

                          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {column.title}
                          </h2>
                        </div>

                        <span className="rounded-full bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-0">
                          {columnSubtasks.length}
                        </span>
                      </div>

                      <div className="space-y-3 p-4">
                        {columnSubtasks.length === 0 ? (
                          <div
                            className={`flex min-h-[220px] items-center justify-center rounded-xl border border-dashed transition ${
                              isDropTarget
                                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                                : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#0b1120]"
                            }`}
                          >
                            <div className="text-center">
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {isDropTarget
                                  ? "Drop subtask here"
                                  : "No subtasks"}
                              </p>

                              {!isDropTarget && (
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                  Drag a card here
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          columnSubtasks.map(
                            (subtask) => {
                              const assignee =
                                getAssignee(
                                  subtask.assigneeId
                                );

                              const priorityStyles =
                                priorityColor[
                                  subtask.priority
                                ] ||
                                priorityColor.Medium;

                              const isDragging =
                                String(
                                  draggedSubtaskId
                                ) ===
                                String(
                                  subtask.id
                                );

                              const canDrag =
                                !isUpdating &&
                                canMoveSubtaskKanban(
                                  currentUser,
                                  subtask,
                                  parentTask,
                                  project,
                                  projectTeams,
                                  teams
                                );

                              return (
                                <div
                                  key={subtask.id}
                                  draggable={canDrag}
                                  onDragStart={(event) =>
                                    handleDragStart(
                                      event,
                                      subtask
                                    )
                                  }
                                  onDragEnd={
                                    handleDragEnd
                                  }
                                  className={`rounded-xl border bg-white dark:bg-[#1e293b] p-4 shadow-sm transition-all duration-200 ${
                                    canDrag
                                      ? "cursor-grab border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md active:cursor-grabbing"
                                      : "cursor-default opacity-85 border-slate-200 dark:border-slate-700"
                                  } ${
                                    isDragging
                                      ? "scale-[0.98] border-blue-400 opacity-40 shadow-lg"
                                      : ""
                                  }`}
                                >
                                  <div className="mb-3 flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-400">
                                      {canDrag ? (
                                        "Drag to move"
                                      ) : (
                                        <>
                                          <PiLockKey
                                            size={12}
                                            className="text-amber-600 dark:text-amber-400"
                                          />
                                          <span>
                                            Locked
                                          </span>
                                        </>
                                      )}
                                    </span>

                                    <span className="text-[10px] text-slate-400 dark:text-slate-400">
                                      {subtask.id}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenSubtask(
                                        subtask
                                      )
                                    }
                                    className="w-full text-left text-sm font-semibold text-[#172033] dark:text-slate-100 transition hover:text-[#2563EB] dark:hover:text-blue-400"
                                  >
                                    {subtask.title}
                                  </button>

                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#64748B] dark:text-slate-400">
                                    {subtask.description ||
                                      "No description has been added."}
                                  </p>

                                  <div className="mt-4">
                                    <span
                                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityStyles}`}
                                    >
                                      {subtask.priority ||
                                        "Medium"}
                                    </span>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
                                      <PiUserCircle />

                                      <span className="truncate">
                                        {assignee?.fullName ||
                                          assignee?.name ||
                                          assignee?.username ||
                                          "Unassigned"}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
                                      <PiCalendarBlank />

                                      <span>
                                        {subtask.dueDate ||
                                          "No due date"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* View Mode: Timeline */}
        {viewMode === "timeline" && (
          <div className="mt-6">
            <SubtaskTimelineView
              subtasks={subtasks}
              parentTask={parentTask}
              project={project}
              users={users}
              currentUser={currentUser}
              projectTeams={projectTeams}
              teams={teams}
              onUpdateStatus={handleStatusUpdate}
              onOpenSubtask={handleOpenSubtask}
            />
          </div>
        )}

        {/* View Mode: List */}
        {viewMode === "list" && (
          <div className="mt-6">
            <SubtaskListView
              subtasks={subtasks}
              parentTask={parentTask}
              project={project}
              users={users}
              currentUser={currentUser}
              projectTeams={projectTeams}
              teams={teams}
              onUpdateStatus={handleStatusUpdate}
              onOpenSubtask={handleOpenSubtask}
            />
          </div>
        )}

        {draggedSubtaskId && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-xl">
            Dragging subtask — drop it into a column
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtaskKanban;