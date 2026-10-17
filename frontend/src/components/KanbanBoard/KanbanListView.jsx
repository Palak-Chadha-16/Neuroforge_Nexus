import { useState, useMemo } from "react";
import {
  PiMagnifyingGlass,
  PiCalendarBlank,
  PiUserCircle,
  PiArrowSquareOut,
  PiListDashes,
  PiArrowsDownUp,
} from "react-icons/pi";

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
  Done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const STATUS_LIST = ["To Do", "In Progress", "In Review", "Done"];

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

const KanbanListView = ({ tasks = [], onUpdateStatus, onSelectTask }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate"); // 'dueDate', 'priority', 'title', 'status'
  const [sortOrder] = useState("asc");

  // Filtering & Sorting
  const processedTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      const matchesSearch =
        !searchTerm.trim() ||
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

      const taskStatus = task.status || "To Do";
      const matchesStatus =
        statusFilter === "All" || taskStatus === statusFilter;

      const taskPriority = task.priority || "Medium";
      const matchesPriority =
        priorityFilter === "All" || taskPriority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const statusWeight = { "To Do": 1, "In Progress": 2, "In Review": 3, Done: 4 };

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "dueDate") {
        if (!a.dueDate) comparison = 1;
        else if (!b.dueDate) comparison = -1;
        else comparison = new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === "priority") {
        comparison = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      } else if (sortBy === "status") {
        comparison = (statusWeight[a.status] || 1) - (statusWeight[b.status] || 1);
      } else if (sortBy === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tasks, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#111827]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <PiMagnifyingGlass
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks by title or assignee..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-3.5 py-1.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="All">All Statuses</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Priority Filter */}
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

          {/* Sort By Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <PiArrowsDownUp size={14} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-semibold outline-none cursor-pointer"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="title">Title</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            ({processedTasks.length} task{processedTasks.length === 1 ? "" : "s"})
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#111827]">
        {processedTasks.length === 0 ? (
          <div className="p-12 text-center">
            <PiListDashes size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No tasks found in list view
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search criteria or filter selections.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">#</th>
                  <th className="px-5 py-3.5">Task Title</th>
                  <th className="px-5 py-3.5">Assignee</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Workflow Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {processedTasks.map((task, index) => {
                  const priorityClass =
                    PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.Medium;
                  const statusClass =
                    STATUS_BADGES[task.status] || STATUS_BADGES["To Do"];
                  const days = getDaysDifference(task.dueDate);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onSelectTask && onSelectTask(task)}
                      className="group cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      {/* # Sequence */}
                      <td className="px-5 py-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {index + 1}
                      </td>

                      {/* Title & Description */}
                      <td className="px-5 py-4 max-w-md">
                        <div>
                          <p className="font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                            {task.taskKey && (
                              <span className="mr-2 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {task.taskKey}
                              </span>
                            )}
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="px-5 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <PiUserCircle size={18} className="text-slate-400 shrink-0" />
                          <span>{task.assignee?.fullName || "Unassigned"}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${priorityClass}`}
                        >
                          {task.priority || "Medium"}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <PiCalendarBlank size={14} className="text-slate-400" />
                          <span>{formatDisplayDate(task.dueDate)}</span>
                        </div>
                        {days !== null && task.status !== "Done" && (
                          <span
                            className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              days < 0
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                                : days === 0
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            }`}
                          >
                            {days < 0
                              ? `${Math.abs(days)}d overdue`
                              : days === 0
                              ? "Due today"
                              : `In ${days}d`}
                          </span>
                        )}
                      </td>

                      {/* Status Selector */}
                      <td
                        className="px-5 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={task.status || "To Do"}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStatus &&
                              onUpdateStatus(task.id, e.target.value);
                          }}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold outline-none transition ${statusClass}`}
                          title="Click to transition task status"
                        >
                          {STATUS_LIST.map((s) => (
                            <option
                              key={s}
                              value={s}
                              className="dark:bg-slate-800 dark:text-white"
                            >
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onSelectTask && (
                          <button
                            type="button"
                            onClick={() => onSelectTask(task)}
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

export default KanbanListView;
