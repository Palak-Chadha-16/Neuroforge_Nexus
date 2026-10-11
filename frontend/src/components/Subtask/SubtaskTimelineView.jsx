import { useState, useMemo, useCallback } from "react";
import {
  PiCalendarBlank,
  PiClock,
  PiUserCircle,
  PiArrowSquareOut,
  PiMagnifyingGlass,
  PiFunnel,
  PiCheckCircle,
  PiWarningCircle,
  PiHourglassHigh,
  PiFlag,
  PiLockKey,
} from "react-icons/pi";
import { canMoveSubtaskKanban } from "../../utils/access.js";

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
    progress: 75,
    progressColor: "bg-purple-500",
  },
  "Ready for Testing": {
    badge: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300",
    dot: "bg-purple-500",
    progress: 78,
    progressColor: "bg-purple-500",
  },
  "In Testing": {
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300",
    dot: "bg-indigo-500",
    progress: 85,
    progressColor: "bg-indigo-500",
  },
  "In QA": {
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300",
    dot: "bg-cyan-500",
    progress: 90,
    progressColor: "bg-cyan-500",
  },
  Done: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    progress: 100,
    progressColor: "bg-emerald-500",
  },
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
  if (!isoString) return "No date";
  const d = new Date(`${isoString}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const SubtaskTimelineView = ({
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

  const getAssignee = useCallback((assigneeId) => {
    if (!assigneeId) return null;
    return users.find((u) => String(u.id) === String(assigneeId));
  }, [users]);

  // Filter subtasks
  const filteredSubtasks = useMemo(() => {
    return subtasks.filter((subtask) => {
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
  }, [subtasks, searchTerm, statusFilter, priorityFilter, getAssignee]);

  // Group subtasks into timeline milestone categories
  const timelineGroups = useMemo(() => {
    const overdue = [];
    const thisWeek = [];
    const upcoming = [];
    const noDeadline = [];
    const completed = [];

    filteredSubtasks.forEach((subtask) => {
      const status = subtask.status || "To Do";
      if (status === "Done") {
        completed.push(subtask);
        return;
      }

      const days = getDaysDifference(subtask.dueDate);
      if (days === null) {
        noDeadline.push(subtask);
      } else if (days < 0) {
        overdue.push({ ...subtask, daysDiff: days });
      } else if (days <= 7) {
        thisWeek.push({ ...subtask, daysDiff: days });
      } else {
        upcoming.push({ ...subtask, daysDiff: days });
      }
    });

    const sortByDate = (a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    };

    overdue.sort(sortByDate);
    thisWeek.sort(sortByDate);
    upcoming.sort(sortByDate);

    const groups = [];

    if (overdue.length > 0) {
      groups.push({
        id: "overdue",
        title: "Overdue & Critical",
        subtitle: "Subtasks past their target completion deadline",
        color: "red",
        icon: PiWarningCircle,
        headerClass: "text-red-700 dark:text-red-300 bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60",
        nodeColor: "bg-red-500 ring-red-200 dark:ring-red-900",
        items: overdue,
      });
    }

    if (thisWeek.length > 0) {
      groups.push({
        id: "this-week",
        title: "Due This Week",
        subtitle: "Immediate delivery targets scheduled within 7 days",
        color: "amber",
        icon: PiClock,
        headerClass: "text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
        nodeColor: "bg-amber-500 ring-amber-200 dark:ring-amber-900",
        items: thisWeek,
      });
    }

    if (upcoming.length > 0) {
      groups.push({
        id: "upcoming",
        title: "Upcoming Scheduled",
        subtitle: "Future milestones scheduled beyond 7 days",
        color: "blue",
        icon: PiCalendarBlank,
        headerClass: "text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
        nodeColor: "bg-blue-500 ring-blue-200 dark:ring-blue-900",
        items: upcoming,
      });
    }

    if (noDeadline.length > 0) {
      groups.push({
        id: "no-deadline",
        title: "Backlog & Flexible",
        subtitle: "Subtasks without specific due dates",
        color: "slate",
        icon: PiHourglassHigh,
        headerClass: "text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
        nodeColor: "bg-slate-400 ring-slate-200 dark:ring-slate-700",
        items: noDeadline,
      });
    }

    if (completed.length > 0) {
      groups.push({
        id: "completed",
        title: "Completed Subtasks",
        subtitle: "Finished deliverable milestones",
        color: "emerald",
        icon: PiCheckCircle,
        headerClass: "text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
        nodeColor: "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900",
        items: completed,
      });
    }

    return groups;
  }, [filteredSubtasks]);

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
            placeholder="Search subtasks or assignees..."
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
        </div>
      </div>

      {/* Empty State */}
      {timelineGroups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
            <PiFunnel size={22} />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
            No matching subtasks
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search query or filters.
          </p>
        </div>
      )}

      {/* Milestone Groups Timeline Rail */}
      <div className="relative space-y-8 pl-4 sm:pl-6 before:absolute before:bottom-3 before:left-[19px] sm:before:left-[27px] before:top-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {timelineGroups.map((group) => {
          const GroupIcon = group.icon;

          return (
            <div key={group.id} className="relative group/section">
              {/* Milestone Indicator Node */}
              <div
                className={`absolute -left-[19px] sm:-left-[27px] top-3.5 h-3.5 w-3.5 rounded-full ring-4 transition-transform group-hover/section:scale-125 ${group.nodeColor}`}
              />

              {/* Group Header Banner */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border px-4 py-2.5 mb-3.5 shadow-xs ${group.headerClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon size={18} className="shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {group.title}
                    </h3>
                    <p className="text-[11px] opacity-80">{group.subtitle}</p>
                  </div>
                </div>

                <span className="self-start sm:self-auto rounded-full bg-white/70 dark:bg-slate-900/60 px-2.5 py-0.5 text-xs font-bold">
                  {group.items.length} subtask{group.items.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Subtask Timeline Cards Grid */}
              <div className="space-y-3">
                {group.items.map((subtask) => {
                  const assignee = getAssignee(subtask.assigneeId);
                  const statusConf = STATUS_CONFIG[subtask.status] || STATUS_CONFIG["To Do"];
                  const priorityClass =
                    PRIORITY_BADGES[subtask.priority] || PRIORITY_BADGES.Medium;

                  const canMove = canMoveSubtaskKanban(
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
                      className="group/card relative rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a] dark:hover:border-blue-500"
                    >
                      <div className="flex flex-col gap-3">
                        {/* Upper row: Title, Badges, Status Dropdown */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                SUBTASK-{subtask.id}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityClass}`}
                              >
                                <PiFlag size={11} />
                                <span>{subtask.priority || "Medium"}</span>
                              </span>

                              {subtask.daysDiff !== undefined && subtask.status !== "Done" && (
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                    subtask.daysDiff < 0
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-semibold"
                                      : subtask.daysDiff <= 3
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {subtask.daysDiff < 0
                                    ? `${Math.abs(subtask.daysDiff)}d overdue`
                                    : subtask.daysDiff === 0
                                    ? "Due today"
                                    : subtask.daysDiff === 1
                                    ? "Due tomorrow"
                                    : `${subtask.daysDiff}d left`}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onOpenSubtask && onOpenSubtask(subtask)}
                              className="text-left text-sm font-semibold text-slate-900 group-hover/card:text-blue-600 transition dark:text-white dark:group-hover/card:text-blue-400"
                            >
                              {subtask.title}
                            </button>

                            {subtask.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                {subtask.description}
                              </p>
                            )}

                            {/* Assignee & Dates */}
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1.5">
                                <PiUserCircle size={15} className="text-slate-400" />
                                <span>
                                  {assignee?.fullName ||
                                    assignee?.name ||
                                    assignee?.username ||
                                    "Unassigned"}
                                </span>
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <PiCalendarBlank size={15} className="text-slate-400" />
                                <span>
                                  Target:{" "}
                                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                                    {formatDisplayDate(subtask.dueDate)}
                                  </strong>
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Right Controls: Interactive Status Transition Dropdown */}
                          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                            <div className="relative">
                              {canMove ? (
                                <select
                                  value={subtask.status || "To Do"}
                                  onChange={(e) =>
                                    onUpdateStatus &&
                                    onUpdateStatus(subtask.id, e.target.value)
                                  }
                                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold outline-none transition ${statusConf.badge}`}
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
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold opacity-90 ${statusConf.badge}`}
                                  title="You do not have permission to transition this subtask"
                                >
                                  <PiLockKey size={13} className="text-amber-500" />
                                  <span>{subtask.status || "To Do"}</span>
                                </div>
                              )}
                            </div>

                            {/* View button */}
                            {onOpenSubtask && (
                              <button
                                type="button"
                                onClick={() => onOpenSubtask(subtask)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition"
                              >
                                <span>Details</span>
                                <PiArrowSquareOut size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-2 flex-1 max-w-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Milestone Progress:
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

export default SubtaskTimelineView;
