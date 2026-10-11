import { useMemo, useState } from "react";
import {
  PiListChecks,
  PiClock,
  PiSpinner,
  PiCheckCircle,
  PiKanban,
  PiChartBarHorizontal,
  PiListBullets,
} from "react-icons/pi";
import KanbanColumn from "./KanbanColumn.jsx";
import KanbanTimelineView from "./KanbanTimelineView.jsx";
import KanbanListView from "./KanbanListView.jsx";
import TaskDetails from "../task/TaskDetails.jsx";
import { useTasks } from "../../context/TasksContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import "./Kanban.css";

const COLUMNS = [
  { id: "To Do", title: "To Do" },
  { id: "In Progress", title: "In Progress" },
  { id: "In Review", title: "In Review" },
  { id: "Done", title: "Done" },
];

function KanbanBoard() {
  const { tasks, updateTask, updateTaskStatus } = useTasks();

  const {
    projects,
    selectedProjectId,
    selectProject,
  } = useProjects();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("kanban_view_mode") || "board";
  });
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("kanban_view_mode", mode);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  const handleDragStart = (event, task) => {
    setDraggedTaskId(task.id);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("taskId", String(task.id));
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (event, columnId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = async (event, newStatus) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverColumnId(null);

    const taskId =
      event.dataTransfer.getData("taskId") || draggedTaskId;

    if (!taskId) {
      setDraggedTaskId(null);
      return;
    }

    const task = tasks.find(
      (item) => String(item.id) === String(taskId)
    );

    if (!task) {
      setDraggedTaskId(null);
      return;
    }

    if (
      task.status === newStatus ||
      task.boardStatus === newStatus
    ) {
      setDraggedTaskId(null);
      return;
    }

        const result = updateTaskStatus
      ? await updateTaskStatus(task.id, newStatus)
      : await updateTask({
          ...task,
          status: newStatus,
        });

    if (!result.success) {
      console.error(
        "Failed to update task status:",
        result.message
      );
    }

    setDraggedTaskId(null);
  };

  const handleStatusChange = async (taskId, newStatus) => {
        const task = tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return;

    if (updateTaskStatus) {
      await updateTaskStatus(taskId, newStatus);
    } else if (updateTask) {
      await updateTask({
        ...task,
        status: newStatus,
      });
    }
  };

  const projectTasks = useMemo(() => {
    if (!selectedProjectId) {
      return [];
    }

    return tasks.filter(
      (task) =>
        String(task.projectId) ===
        String(selectedProjectId)
    );
  }, [tasks, selectedProjectId]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => String(t.id) === String(selectedTaskId)) || null;
  }, [tasks, selectedTaskId]);

  const normalizeStatus = (status) => {
    if (!status) return "To Do";

    const upper = String(status)
      .toUpperCase()
      .replace(/\s+/g, "_");

    if (upper === "TODO" || upper === "TO_DO") {
      return "To Do";
    }

    if (upper === "IN_PROGRESS") {
      return "In Progress";
    }

    if (
      upper === "IN_REVIEW" ||
      upper === "READY_FOR_TESTING" ||
      upper === "IN_TESTING" ||
      upper === "IN_QA"
    ) {
      return "In Review";
    }

    if (
      upper === "DONE" ||
      upper === "COMPLETED"
    ) {
      return "Done";
    }

    return status;
  };

  const tasksByStatus = useMemo(() => {
    const groupedTasks = {
      "To Do": [],
      "In Progress": [],
      "In Review": [],
      Done: [],
    };

    projectTasks.forEach((task) => {
      const status = normalizeStatus(
        task.status || task.boardStatus
      );

      if (groupedTasks[status]) {
        groupedTasks[status].push(task);
      } else {
        groupedTasks["To Do"].push(task);
      }
    });

    return groupedTasks;
  }, [projectTasks]);

  const totalTasks = projectTasks.length;
  const completedTasks = tasksByStatus.Done.length;

  const selectedProject = projects.find(
    (project) =>
      String(project.id) ===
      String(selectedProjectId)
  );

  return (
    <section className="min-h-full space-y-6 bg-transparent p-1 text-[#172033] dark:text-slate-100">
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] dark:text-blue-400">
            Kanban Board
          </span>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#172033] dark:text-white sm:text-3xl">
            Task Board
          </h1>

          <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">
            Manage and track your project tasks across different stages.
          </p>
        </div>

        <div className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-[#162032] lg:w-72">
          <label
            htmlFor="kanban-project-select"
            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400"
          >
            Project
          </label>

          <select
            id="kanban-project-select"
            value={selectedProjectId || ""}
            onChange={(event) =>
              selectProject(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
          >
            {projects.length === 0 ? (
              <option value="" className="dark:bg-slate-800 dark:text-white">
                No projects available
              </option>
            ) : (
              projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                  className="dark:bg-slate-800 dark:text-white"
                >
                  {project.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {selectedProject && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#172033] dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
          <span>{selectedProject.name}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <PiListChecks size={20} />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Tasks
            </span>
            <strong className="mt-1 block text-xl font-bold text-slate-900 dark:text-white">
              {totalTasks}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <PiClock size={20} />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              To Do
            </span>
            <strong className="mt-1 block text-xl font-bold text-slate-900 dark:text-white">
              {tasksByStatus["To Do"].length}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <PiSpinner size={20} />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              In Progress
            </span>
            <strong className="mt-1 block text-xl font-bold text-slate-900 dark:text-white">
              {tasksByStatus["In Progress"].length}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <PiCheckCircle size={20} />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Completed
            </span>
            <strong className="mt-1 block text-xl font-bold text-slate-900 dark:text-white">
              {completedTasks}
            </strong>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Project Workflow
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {viewMode === "board" && "Drag tasks between columns to update their status."}
              {viewMode === "timeline" && "Chronological milestone timeline grouped by deadlines."}
              {viewMode === "list" && "Comprehensive tabular overview with sorting and status transitions."}
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
              {totalTasks} task{totalTasks === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* View Switcher Content */}
        {viewMode === "board" && (
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1000px] grid-cols-4 gap-4">
              {COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByStatus[column.id]}
                  draggedTaskId={draggedTaskId}
                  isDropTarget={dragOverColumnId === column.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        )}

        {viewMode === "timeline" && (
          <KanbanTimelineView
            tasks={projectTasks}
            onUpdateStatus={handleStatusChange}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
          />
        )}

        {viewMode === "list" && (
          <KanbanListView
            tasks={projectTasks}
            onUpdateStatus={handleStatusChange}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
          />
        )}
      </div>

      {/* Task Details Modal / Panel */}
      {selectedTask && (
        <TaskDetails
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </section>
  );
}

export default KanbanBoard;