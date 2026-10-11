import { useState, useMemo, useCallback } from "react";
import {
  PiMagnifyingGlass,
  PiUserCircle,
  PiArrowSquareOut,
  PiListDashes,
  PiArrowsDownUp,
  PiLockKey,
} from "react-icons/pi";
import { canMoveSubtaskKanban } from "../../utils/access.js";

const PRIORITY_BADGES = {
  Critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  High: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  Medium: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const STATUS_BADGES = {
  "To Do": "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "In Progress": "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  "In Review": "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300",
  "Ready for Testing": "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300",
  "In Testing": "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300",
  "In QA": "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300",
  Done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const SUBTASK_STATUSES = [
  "To Do",
  "In Progress",
  "In Review",
  "Ready for Testing",
  "In Testing",
  "In QA",
  "Done",
];

const getDaysDifference = (dueDateString) => {
  if (!dueDateString) return null;
  const target = new Date(`${dueDateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDisplayDate = (isoString) => {
  if (!isoString) return "—";
  const d = new Date(`${isoString}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const SubtaskListView = ({
  subtasks = [],
  parentTask,
  project,
  users = [],
  currentUser,
  projectTeams = {},
  teams = [],
  onUpdateStatus,
  onOpenSubtask,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate"); // 'dueDate', 'priority', 'title', 'status'
  const [sortOrder, setSortOrder] = useState("asc");

  const getAssignee = useCallback((assigneeId) => {
    if (!assigneeId) return null;
    return users.find((u) => String(u.id) === String(assigneeId));
  }, [users]);

  // Filtering & Sorting
  const processedSubtasks = useMemo(() => {
    let result = subtasks.filter((subtask) => {
      const assignee = getAssignee(subtask.assigneeId);
      const assigneeName = assignee?.fullName || assignee?.name || assignee?.username || "";

      const matchesSearch =
        !searchTerm.trim() ||
        subtask.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assigneeName.toLowerCase().includes(searchTerm.toLowerCase());

      const subtaskStatus = subtask.status || "To Do";
      const matchesStatus =
        statusFilter === "All" || subtaskStatus === statusFilter;

      const subtaskPriority = subtask.priority || "Medium";
      const matchesPriority =
        priorityFilter === "All" || subtaskPriority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    const priorityWeights = { Critical: 4, High: 3, Medium: 2, Low: 1 };

    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        comparison = new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === "priority") {
        const pA = priorityWeights[a.priority] || 2;
        const pB = priorityWeights[b.priority] || 2;
        comparison = pB - pA;
      } else if (sortBy === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      } else if (sortBy === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [subtasks, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder, getAssignee]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#111827]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <PiMagnifyingGlass
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subtasks or assignees..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-3.5 py-1.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              {SUBTASK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort By Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Sort:</span>
            <button
              type="button"
              onClick={() => toggleSort("dueDate")}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                sortBy === "dueDate"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <PiArrowsDownUp size={13} />
              <span>Due Date {sortBy === "dueDate" && (sortOrder === "asc" ? "↑" : "↓")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        {processedSubtasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <PiListDashes size={22} />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              No subtasks found
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <th
                    className="cursor-pointer px-5 py-3.5 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => toggleSort("title")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Subtask</span>
                      {sortBy === "title" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>

                  <th className="px-5 py-3.5">Assignee</th>

                  <th
                    className="cursor-pointer px-5 py-3.5 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => toggleSort("dueDate")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Due Date</span>
                      {sortBy === "dueDate" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>

                  <th
                    className="cursor-pointer px-5 py-3.5 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => toggleSort("priority")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Priority</span>
                      {sortBy === "priority" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>

                  <th
                    className="cursor-pointer px-5 py-3.5 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => toggleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      {sortBy === "status" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>

                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {processedSubtasks.map((subtask) => {
                  const assignee = getAssignee(subtask.assigneeId);
                  const daysDiff = getDaysDifference(subtask.dueDate);
                  const isDone = subtask.status === "Done";
                  const priorityClass =
                    PRIORITY_BADGES[subtask.priority] || PRIORITY_BADGES.Medium;
                  const statusClass =
                    STATUS_BADGES[subtask.status] || STATUS_BADGES["To Do"];

                  const canMove = canMoveSubtaskKanban(
                    currentUser,
                    subtask,
                    parentTask,
                    project,
                    projectTeams,
                    teams
                  );

                  return (
                    <tr
                      key={subtask.id}
                      className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      {/* Subtask Title & Identifier */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            SUBTASK-{subtask.id}
                          </span>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onOpenSubtask && onOpenSubtask(subtask)}
                              className="text-left font-semibold text-slate-900 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                            >
                              {subtask.title}
                            </button>

                            {subtask.description && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {subtask.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <PiUserCircle size={15} />
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {assignee?.fullName ||
                              assignee?.name ||
                              assignee?.username ||
                              "Unassigned"}
                          </span>
                        </div>
                      </td>

                      {/* Due Date & Urgency Badge */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatDisplayDate(subtask.dueDate)}
                          </span>

                          {daysDiff !== null && !isDone && (
                            <span
                              className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                daysDiff < 0
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                                  : daysDiff === 0
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                  : daysDiff <= 3
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {daysDiff < 0
                                ? `${Math.abs(daysDiff)}d overdue`
                                : daysDiff === 0
                                ? "Due today"
                                : daysDiff === 1
                                ? "Due tomorrow"
                                : `${daysDiff}d left`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityClass}`}
                        >
                          {subtask.priority || "Medium"}
                        </span>
                      </td>

                      {/* Status Selector Dropdown */}
                      <td className="px-5 py-4">
                        {canMove ? (
                          <select
                            value={subtask.status || "To Do"}
                            onChange={(e) =>
                              onUpdateStatus &&
                              onUpdateStatus(subtask.id, e.target.value)
                            }
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold outline-none transition ${statusClass}`}
                            title="Click to transition subtask status"
                          >
                            {SUBTASK_STATUSES.map((s) => (
                              <option
                                key={s}
                                value={s}
                                className="dark:bg-slate-800 dark:text-white"
                              >
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold opacity-90 ${statusClass}`}
                            title="You do not have permission to transition this subtask"
                          >
                            <PiLockKey size={13} className="text-amber-500" />
                            <span>{subtask.status || "To Do"}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onOpenSubtask && (
                          <button
                            type="button"
                            onClick={() => onOpenSubtask(subtask)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition"
                          >
                            <span>Details</span>
                            <PiArrowSquareOut size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtaskListView;
