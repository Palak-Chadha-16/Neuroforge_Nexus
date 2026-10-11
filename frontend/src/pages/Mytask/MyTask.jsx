import { useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  PiBriefcase,
  PiUsersThree,
  PiKanban,
  PiCalendarBlank,
} from "react-icons/pi";
import { useAuth } from "../../context/AuthContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useTeams } from "../../context/TeamsContextStore.js";
import { ROLES, normalizeRole, formatRole } from "../../constants/roles.js";

const priorityColor = {
  Critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300",
  High: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  Medium: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const MyTask = () => {
  const { currentUser } = useAuth();
  const {
    tasks,
    subtasks = [],
    updateSubtaskStatus,
    updateTaskStatus,
  } = useTasks();

  const { projects } = useProjects();
  const { teams } = useTeams();

  const role = normalizeRole(currentUser?.role);

  const [activeTab, setActiveTab] = useState("all");

  const myParentTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        String(task.assigneeId ?? task.assignee?.id) ===
        String(currentUser?.id)
    );
  }, [tasks, currentUser?.id]);

  const mySubtasks = useMemo(() => {
    return subtasks.filter(
      (subtask) =>
        String(subtask.assigneeId) === String(currentUser?.id)
    );
  }, [subtasks, currentUser?.id]);

  const myTeam =
    teams.find(
      (team) =>
        String(team.leadId) === String(currentUser?.id)
    ) || teams[0];

  const teamSubtasks = useMemo(() => {
    return subtasks.filter(
      (subtask) =>
        String(subtask.teamId) === String(myTeam?.id)
    );
  }, [subtasks, myTeam?.id]);

  const now = useMemo(() => new Date(), []);

  const handleParentTaskStatusChange = async (task, newStatus) => {
    const res = await updateTaskStatus(task.id, newStatus);
    if (res && !res.success) {
      alert(res.message || "Failed to update task status");
    }
  };

  const handleSubtaskStatusChange = async (subtask, newStatus) => {
    const res = await updateSubtaskStatus(subtask.id, newStatus);
    if (res && !res.success) {
      alert(res.message || "Failed to update subtask status");
    }
  };

  const getStatus = (item) => {
    if (!item) return "To Do";

    const raw = (item.status || item.boardStatus || "To Do").trim();
    const upper = raw.toUpperCase().replace(/\s+/g, "_");

    if (upper === "TODO" || upper === "TO_DO") return "To Do";
    if (upper === "IN_PROGRESS") return "In Progress";
    if (upper === "IN_REVIEW") return "In Review";
    if (upper === "READY_FOR_TESTING") {
      return item.itemType === "task"
        ? "In Review"
        : "Ready for Testing";
    }
    if (upper === "IN_TESTING") {
      return item.itemType === "task"
        ? "In Review"
        : "In Testing";
    }
    if (upper === "IN_QA") {
      return item.itemType === "task"
        ? "In Review"
        : "In QA";
    }
    if (upper === "DONE" || upper === "COMPLETED") return "Done";

    return raw;
  };

  const allMyItems = useMemo(() => {
    const parentItems = myParentTasks.map((task) => ({
      ...task,
      itemType: "task",
      itemId: task.id,
      itemStatus: getStatus(task),
    }));

    const subtaskItems = mySubtasks.map((subtask) => ({
      ...subtask,
      itemType: "subtask",
      itemId: subtask.id,
      itemStatus: getStatus(subtask),
    }));

    return [...parentItems, ...subtaskItems];
  }, [myParentTasks, mySubtasks]);

  const teamWorkItems = useMemo(() => {
    return teamSubtasks.map((subtask) => ({
      ...subtask,
      itemType: "subtask",
      itemId: subtask.id,
      itemStatus: getStatus(subtask),
    }));
  }, [teamSubtasks]);

  const displayedItems = useMemo(() => {
    if (activeTab === "team_work") {
      return teamWorkItems;
    }

    let items = allMyItems;

    if (activeTab === "todo") {
      items = items.filter(
        (item) => getStatus(item) === "To Do"
      );
    } else if (activeTab === "in_progress") {
      items = items.filter(
        (item) => getStatus(item) === "In Progress"
      );
    } else if (activeTab === "done") {
      items = items.filter(
        (item) => getStatus(item) === "Done"
      );
    } else if (activeTab === "overdue") {
      items = items.filter(
        (item) =>
          item.dueDate &&
          new Date(item.dueDate) < now &&
          getStatus(item) !== "Done"
      );
    } else if (activeTab === "review") {
      items = items.filter(
        (item) =>
          getStatus(item) === "In Review" ||
          getStatus(item) === "Ready for Testing" ||
          getStatus(item) === "In Testing" ||
          getStatus(item) === "In QA"
      );
    }

    return items;
  }, [
    activeTab,
    allMyItems,
    teamWorkItems,
    now,
  ]);

  const todoCount = allMyItems.filter(
    (item) => getStatus(item) === "To Do"
  ).length;

  const inProgressCount = allMyItems.filter(
    (item) => getStatus(item) === "In Progress"
  ).length;

  const completedCount = allMyItems.filter(
    (item) => getStatus(item) === "Done"
  ).length;

  const overdueCount = allMyItems.filter(
    (item) =>
      item.dueDate &&
      new Date(item.dueDate) < now &&
      getStatus(item) !== "Done"
  ).length;

  if (role === ROLES.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-full space-y-8 bg-transparent p-1">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Personal Workbench • {formatRole(role)}
          </span>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            My Work Queue
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            All work items and deliverables assigned to you across projects.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Logged in as{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {currentUser?.fullName}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            My Tasks
          </span>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {allMyItems.length}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {myParentTasks.length} tasks • {mySubtasks.length} subtasks
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            In Progress
          </span>

          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {inProgressCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Completed
          </span>

          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {completedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overdue
          </span>

          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {overdueCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "all"
              ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          All Items ({allMyItems.length})
        </button>

        <button
          onClick={() => setActiveTab("todo")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "todo"
              ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          To Do ({todoCount})
        </button>

        <button
          onClick={() => setActiveTab("in_progress")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "in_progress"
              ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/20"
              : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          In Progress ({inProgressCount})
        </button>

        <button
          onClick={() => setActiveTab("done")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "done"
              ? "bg-[#2563EB] text-white shadow-md shadow-blue-600/20"
              : "text-[#475569] hover:bg-white hover:text-[#172033]"
          }`}
        >
          Completed ({completedCount})
        </button>

        <button
          onClick={() => setActiveTab("overdue")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "overdue"
              ? "bg-[#DC2626] text-white shadow-md shadow-red-600/20"
              : "text-[#DC2626] hover:bg-red-50"
          }`}
        >
          Overdue ({overdueCount})
        </button>

        {(role === ROLES.TESTER || role === ROLES.QA) && (
          <button
            onClick={() => setActiveTab("review")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "review"
                ? "bg-[#4F46E5] text-white shadow-md shadow-indigo-600/20"
                : "text-[#4F46E5] hover:bg-indigo-50"
            }`}
          >
            Waiting for Review
          </button>
        )}

        {role === ROLES.TEAM_LEAD && (
          <button
            onClick={() => setActiveTab("team_work")}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
              activeTab === "team_work"
                ? "border-[#16A34A] bg-[#16A34A] text-white shadow-md shadow-green-600/20"
                : "border-emerald-200 text-[#16A34A] hover:bg-emerald-50"
            }`}
          >
            <PiUsersThree
              size={16}
              className="mr-1.5 inline"
            />
            My Team's Work ({teamSubtasks.length})
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {activeTab === "team_work"
              ? "Team Deliverables"
              : "My Work Items"}
          </h2>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {displayedItems.length} item
            {displayedItems.length === 1 ? "" : "s"}
          </span>
        </div>

        {displayedItems.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            No work items found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3.5">
                    Work Item
                  </th>

                  <th className="px-6 py-3.5">
                    Parent Task & Project
                  </th>

                  <th className="px-6 py-3.5">
                    Status
                  </th>

                  <th className="px-6 py-3.5">
                    Priority
                  </th>

                  <th className="px-6 py-3.5">
                    Due Date
                  </th>

                  <th className="px-6 py-3.5 text-right">
                    Quick Links
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {displayedItems.map((item) => {
                  const isParentTask =
                    item.itemType === "task";

                  const parentTask = isParentTask
                    ? item
                    : tasks.find(
                        (task) =>
                          String(task.id) ===
                          String(item.taskId)
                      );

                  const project = projects.find(
                    (project) =>
                      String(project.id) ===
                      String(parentTask?.projectId)
                  );

                  const itemStatus = getStatus(item);

                  const isOverdue =
                    item.dueDate &&
                    new Date(item.dueDate) < now &&
                    itemStatus !== "Done";

                  return (
                    <tr
                      key={`${item.itemType}-${item.id}`}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isParentTask ? (
                            <PiBriefcase
                              size={17}
                              className="text-blue-600 dark:text-blue-400"
                            />
                          ) : (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                              SUB
                            </span>
                          )}

                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                        </div>

                        {item.description && (
                          <p className="mt-0.5 max-w-sm truncate text-xs text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {isParentTask
                            ? "Parent Task"
                            : parentTask?.title ||
                              `Task #${item.taskId}`}
                        </p>

                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                          {project?.name ||
                            item.project?.name ||
                            "Project"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={itemStatus || "To Do"}
                          onChange={(e) => {
                            const newStatus = e.target.value;

                            if (isParentTask) {
                              handleParentTaskStatusChange(
                                item,
                                newStatus
                              );
                            } else {
                              handleSubtaskStatusChange(
                                item,
                                newStatus
                              );
                            }
                          }}
                          className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-400"
                        >
                          {isParentTask ? (
                            <>
                              <option value="To Do" className="dark:bg-slate-800 dark:text-white">
                                To Do
                              </option>
                              <option value="In Progress" className="dark:bg-slate-800 dark:text-white">
                                In Progress
                              </option>
                              <option value="In Review" className="dark:bg-slate-800 dark:text-white">
                                In Review
                              </option>
                              <option value="Done" className="dark:bg-slate-800 dark:text-white">
                                Done
                              </option>
                            </>
                          ) : (
                            <>
                              <option value="To Do" className="dark:bg-slate-800 dark:text-white">
                                To Do
                              </option>
                              <option value="In Progress" className="dark:bg-slate-800 dark:text-white">
                                In Progress
                              </option>
                              <option value="In Review" className="dark:bg-slate-800 dark:text-white">
                                In Review
                              </option>
                              <option value="Ready for Testing" className="dark:bg-slate-800 dark:text-white">
                                Ready for Testing
                              </option>
                              <option value="In Testing" className="dark:bg-slate-800 dark:text-white">
                                In Testing
                              </option>
                              <option value="In QA" className="dark:bg-slate-800 dark:text-white">
                                In QA
                              </option>
                              <option value="Done" className="dark:bg-slate-800 dark:text-white">
                                Done
                              </option>
                            </>
                          )}
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            priorityColor[item.priority] ||
                            "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {item.priority || "Medium"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <span
                          className={
                            isOverdue
                              ? "font-semibold text-rose-600 dark:text-rose-400"
                              : "text-slate-500 dark:text-slate-400"
                          }
                        >
                          {item.dueDate || "No deadline"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {parentTask?.projectId ? (
                          <div className="inline-flex items-center gap-2">
                            {isParentTask ? (
                              <Link
                                to={`/projects/${parentTask.projectId}/tasks/${parentTask.id}`}
                                title="Task Details"
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                              >
                                <PiBriefcase size={16} />
                              </Link>
                            ) : (
                              <>
                                <Link
                                  to={`/projects/${parentTask.projectId}/tasks/${parentTask.id}/${item.id}`}
                                  title="Subtask Details"
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                >
                                  <PiBriefcase size={16} />
                                </Link>

                                <Link
                                  to={`/projects/${parentTask.projectId}/tasks/${parentTask.id}/${item.id}/kanban`}
                                  title="Subtask Kanban"
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                >
                                  <PiKanban size={16} />
                                </Link>

                                <Link
                                  to={`/projects/${parentTask.projectId}/tasks/${parentTask.id}/${item.id}/calendar`}
                                  title="Subtask Calendar"
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                >
                                  <PiCalendarBlank size={16} />
                                </Link>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            -
                          </span>
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

export default MyTask;