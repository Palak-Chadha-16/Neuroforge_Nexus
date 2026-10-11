import { useState, useMemo } from "react";
import {
  PiCalendarBlank,
  PiClock,
  PiUserCircle,
  PiArrowSquareOut,
  PiMagnifyingGlass,
  PiCheckCircle,
  PiWarningCircle,
  PiHourglassHigh,
} from "react-icons/pi";

const PRIORITY_BADGES = {
  Critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  High: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  Medium: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const STATUS_CONFIG = {
  "To Do": {
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
    progress: 10,
    progressColor: "bg-slate-400",
  },
  "In Progress": {
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    dot: "bg-blue-500",
    progress: 50,
    progressColor: "bg-blue-500",
  },
  "In Review": {
    badge: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300",
    dot: "bg-purple-500",
    progress: 80,
    progressColor: "bg-purple-500",
  },
  Done: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    progress: 100,
    progressColor: "bg-emerald-500",
  },
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
  if (!isoString) return "No date";
  const d = new Date(`${isoString}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const KanbanTimelineView = ({ tasks = [], onUpdateStatus, onSelectTask }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
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
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  // Group tasks into timeline categories
  const timelineGroups = useMemo(() => {
    const overdue = [];
    const thisWeek = [];
    const upcoming = [];
    const noDeadline = [];
    const completed = [];

    filteredTasks.forEach((task) => {
      const status = task.status || "To Do";
      if (status === "Done") {
        completed.push(task);
        return;
      }

      const days = getDaysDifference(task.dueDate);
      if (days === null) {
        noDeadline.push(task);
      } else if (days < 0) {
        overdue.push({ ...task, daysDiff: days });
      } else if (days <= 7) {
        thisWeek.push({ ...task, daysDiff: days });
      } else {
        upcoming.push({ ...task, daysDiff: days });
      }
    });

    // Sort chronologically within buckets
    const sortByDate = (a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    };

    overdue.sort(sortByDate);
    thisWeek.sort(sortByDate);
    upcoming.sort(sortByDate);
    completed.sort(sortByDate);

    const groups = [];

    if (overdue.length > 0) {
      groups.push({
        id: "overdue",
        title: "Overdue & Critical",
        subtitle: "Tasks past their scheduled deadline",
        color: "rose",
        icon: PiWarningCircle,
        headerClass: "text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60",
        nodeColor: "bg-rose-500 ring-rose-200 dark:ring-rose-900",
        tasks: overdue,
      });
    }

    if (thisWeek.length > 0) {
      groups.push({
        id: "thisWeek",
        title: "Due This Week",
        subtitle: "Immediate deliverables due within 7 days",
        color: "amber",
        icon: PiHourglassHigh,
        headerClass: "text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
        nodeColor: "bg-amber-500 ring-amber-200 dark:ring-amber-900",
        tasks: thisWeek,
      });
    }

    if (upcoming.length > 0) {
      groups.push({
        id: "upcoming",
        title: "Upcoming Scheduled",
        subtitle: "Planned sprints & future deadlines",
        color: "blue",
        icon: PiCalendarBlank,
        headerClass: "text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
        nodeColor: "bg-blue-500 ring-blue-200 dark:ring-blue-900",
        tasks: upcoming,
      });
    }

    if (noDeadline.length > 0) {
      groups.push({
        id: "noDeadline",
        title: "Backlog / Flexible Timeline",
        subtitle: "Tasks without an assigned target date",
        color: "slate",
        icon: PiClock,
        headerClass: "text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
        nodeColor: "bg-slate-400 ring-slate-200 dark:ring-slate-700",
        tasks: noDeadline,
      });
    }

    if (completed.length > 0) {
      groups.push({
        id: "completed",
        title: "Completed Deliverables",
        subtitle: "Finished tasks and resolved milestones",
        color: "emerald",
        icon: PiCheckCircle,
        headerClass: "text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
        nodeColor: "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900",
        tasks: completed,
      });
    }

    return groups;
  }, [filteredTasks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Search & Filter Bar */}
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
            placeholder="Search timeline tasks or assignees..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-3.5 py-1.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Filter controls */}
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
              {STATUS_LIST.map((s) => (
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

          <span className="text-xs text-slate-400 ml-1">
            ({filteredTasks.length} task{filteredTasks.length === 1 ? "" : "s"})
          </span>
        </div>
      </div>

      {/* Empty State */}
      {timelineGroups.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-[#111827]">
          <PiClock size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No tasks found in timeline view
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try resetting your status/priority filters or selecting another project.
          </p>
        </div>
      )}

      {/* Timeline Content */}
      <div className="space-y-8">
        {timelineGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.id} className="space-y-4">
              {/* Group Header Badge */}
              <div className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold shadow-2xs ${group.headerClass}`}>
                <GroupIcon size={16} />
                <span>{group.title}</span>
                <span className="rounded-full bg-white/70 dark:bg-black/30 px-2 py-0.5 text-[11px] font-bold">
                  {group.tasks.length}
                </span>
                <span className="text-[11px] font-normal opacity-80 hidden sm:inline">
                  • {group.subtitle}
                </span>
              </div>

              {/* Vertical Timeline Track */}
              <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:bottom-2 before:left-2.5 sm:before:left-3.5 before:top-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {group.tasks.map((task) => {
                  const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG["To Do"];
                  const priorityClass =
                    PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.Medium;
                  const days = getDaysDifference(task.dueDate);

                  return (
                    <div key={task.id} className="relative group">
                      {/* Timeline Node Point */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-5 h-3.5 w-3.5 rounded-full ring-4 transition-transform group-hover:scale-125 ${group.nodeColor}`}
                      />

                      {/* Timeline Card */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-[#111827] dark:hover:border-slate-700">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          {/* Left: Task Info */}
                          <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                            {/* Date & Deadline Pill */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <PiCalendarBlank size={13} className="text-slate-400" />
                                <span>{formatDisplayDate(task.dueDate)}</span>
                              </span>

                              {days !== null && task.status !== "Done" && (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                    days < 0
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                                      : days === 0
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                  }`}
                                >
                                  {days < 0
                                    ? `Overdue by ${Math.abs(days)}d`
                                    : days === 0
                                    ? "Due Today"
                                    : `In ${days} day${days === 1 ? "" : "s"}`}
                                </span>
                              )}

                              <span
                                className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${priorityClass}`}
                              >
                                {task.priority || "Medium"}
                              </span>
                            </div>

                            {/* Title */}
                            <h4
                              onClick={() => onSelectTask && onSelectTask(task)}
                              className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white transition group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer"
                            >
                              {task.title}
                            </h4>

                            {/* Description snippet */}
                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Assignee */}
                            <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                              <PiUserCircle size={17} className="text-slate-400" />
                              <span className="font-medium">
                                {task.assignee?.fullName || "Unassigned"}
                              </span>
                            </div>
                          </div>

                          {/* Right: Interactive Status Control & Action */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            {/* Status Selector */}
                            <div className="text-right space-y-1">
                              <select
                                value={task.status || "To Do"}
                                onChange={(e) =>
                                  onUpdateStatus &&
                                  onUpdateStatus(task.id, e.target.value)
                                }
                                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold outline-none transition ${statusConf.badge}`}
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
                            </div>

                            {/* View button */}
                            {onSelectTask && (
                              <button
                                type="button"
                                onClick={() => onSelectTask(task)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
                              >
                                <span>Details</span>
                                <PiArrowSquareOut size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-2 flex-1 max-w-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Workflow Progress:
                            </span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${statusConf.progressColor}`}
                                style={{ width: `${statusConf.progress}%` }}
                              />
                            </div>
                          </div>

                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {statusConf.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanTimelineView;
