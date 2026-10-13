import { useEffect, useMemo, useState } from "react";
import {
  PiCheckCircle,
  PiListChecks,
  PiTimer,
  PiWarning,
  PiWrench,
} from "react-icons/pi";
import axios, { getApiBase } from "../../../services/api.js";
import { avatarColor, getInitials } from "../utils/bugHelpers.js";

const API_BASE = getApiBase();
const TASKS_API = `${API_BASE}/tasks`;

const periods = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

const CLOSED = "Closed";
const FIXED = ["Fixed", "Retest", "Closed"];
const DONE = ["done", "completed", "complete", "closed", "finished"];

const sameId = (a, b) =>
  a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);

const taskAssignee = (task) =>
  task.assignedTo ??
  task.assignedToId ??
  task.assigneeId ??
  task.assignee?.id ??
  task.userId ??
  null;

const isDone = (task) => DONE.includes(String(task.status ?? "").toLowerCase());
const completedAt = (task) =>
  task.completedAt ?? task.completedDate ?? task.updatedAt ?? null;
const dueAt = (task) => task.dueDate ?? task.deadline ?? task.endDate ?? null;

const tones = {
  emerald: {
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  blue: {
    tile: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    bar: "bg-blue-500",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    bar: "bg-violet-500",
  },
};

const StatCard = ({ icon: Icon, label, value, sub, progress, tone }) => {
  const style = tones[tone];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.tile}`}
        >
          <Icon size={19} />
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>

      {progress !== null && progress !== undefined && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};

const DeveloperPerformance = ({
  bugs,
  projects,
  currentUser,
  currentUserName,
  isDeveloperViewer,
}) => {
  const [tasks, setTasks] = useState(undefined); // undefined = loading, null = unavailable
  const [selectedId, setSelectedId] = useState("");
  const [periodId, setPeriodId] = useState("30");

  useEffect(() => {
    let active = true;

    axios
      .get(TASKS_API)
      .then((response) => {
        if (active) setTasks(Array.isArray(response.data) ? response.data : null);
      })
      .catch(() => {
        if (active) setTasks(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const developers = useMemo(() => {
    const map = new Map();

    projects.forEach((project) => {
      (project.members || []).forEach((member) => {
        const id = member.userId ?? member.id;
        if (id === null || id === undefined) return;

        const role = String(member.role ?? member.roleName ?? "").toLowerCase();

        map.set(String(id), {
          id: String(id),
          name: member.fullName || member.name || `User #${id}`,
          isDev: role ? role.includes("developer") : true,
        });
      });
    });

    const all = [...map.values()];
    const devs = all.filter((member) => member.isDev);
    return devs.length > 0 ? devs : all;
  }, [projects]);

  const period = periods.find((item) => item.id === periodId) || periods[1];
  const [now] = useState(() => Date.now());
  const since = period.days ? now - period.days * 86400000 : 0;
  const inPeriod = (value) =>
    !since || (value && new Date(value).getTime() >= since);

  const activeId = isDeveloperViewer
    ? String(currentUser?.id ?? "")
    : selectedId || developers[0]?.id || "";

  const activeDeveloper = developers.find((dev) => dev.id === activeId) || {
    id: activeId,
    name: isDeveloperViewer ? currentUserName : "No developer",
  };

  const metrics = useMemo(() => {
    const mine = bugs.filter((bug) => sameId(bug.assignedTo, activeId));

    const bugsFixed = mine.filter(
      (bug) =>
        FIXED.includes(bug.status) && inPeriod(bug.updatedAt ?? bug.createdAt)
    ).length;

    const openBugs = mine.filter((bug) => bug.status !== CLOSED).length;

    let tasksAssigned = null;
    let tasksCompleted = null;
    let onTime = null;

    if (Array.isArray(tasks)) {
      const myTasks = tasks.filter((task) => sameId(taskAssignee(task), activeId));
      const doneInPeriod = myTasks
        .filter(isDone)
        .filter((task) => inPeriod(completedAt(task)));

      tasksAssigned = myTasks.length;
      tasksCompleted = doneInPeriod.length;

      const withDeadline = doneInPeriod.filter(
        (task) => dueAt(task) && completedAt(task)
      );

      if (withDeadline.length > 0) {
        const onTimeCount = withDeadline.filter(
          (task) => new Date(completedAt(task)) <= new Date(dueAt(task))
        ).length;
        onTime = Math.round((onTimeCount / withDeadline.length) * 100);
      }
    }

    return { bugsFixed, openBugs, tasksAssigned, tasksCompleted, onTime };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bugs, tasks, activeId, periodId]);

  const leaderboard = useMemo(() => {
    const rows = developers.map((dev) => {
      const mine = bugs.filter((bug) => sameId(bug.assignedTo, dev.id));
      return {
        ...dev,
        fixed: mine.filter(
          (bug) =>
            FIXED.includes(bug.status) &&
            inPeriod(bug.updatedAt ?? bug.createdAt)
        ).length,
        open: mine.filter((bug) => bug.status !== CLOSED).length,
      };
    });

    return rows.sort((a, b) => b.fixed - a.fixed).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developers, bugs, periodId]);

  const maxFixed = Math.max(1, ...leaderboard.map((row) => row.fixed));
  const taskDataReady = metrics.tasksAssigned !== null;

  const completionRate =
    taskDataReady && metrics.tasksAssigned > 0
      ? (metrics.tasksCompleted / metrics.tasksAssigned) * 100
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(
              activeDeveloper.name
            )}`}
          >
            {getInitials(activeDeveloper.name)}
          </span>

          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Developer Performance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeDeveloper.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isDeveloperViewer && developers.length > 0 && (
            <select
              value={activeId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              {developers.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            {periods.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriodId(item.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  periodId === item.id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={PiListChecks}
          tone="emerald"
          label="Tasks completed"
          value={taskDataReady ? metrics.tasksCompleted : "-"}
          sub={
            taskDataReady
              ? `Out of ${metrics.tasksAssigned} assigned`
              : tasks === undefined
                ? "Loading tasks..."
                : "Task data not available yet"
          }
          progress={completionRate}
        />

        <StatCard
          icon={PiWrench}
          tone="blue"
          label="Bugs fixed"
          value={metrics.bugsFixed}
          sub="In the selected period"
          progress={null}
        />

        <StatCard
          icon={PiWarning}
          tone="amber"
          label="Open bugs"
          value={metrics.openBugs}
          sub="Currently unresolved"
          progress={null}
        />

        <StatCard
          icon={PiTimer}
          tone="violet"
          label="On-time completion"
          value={metrics.onTime !== null ? `${metrics.onTime}%` : "-"}
          sub="Completed by deadline"
          progress={metrics.onTime}
        />
      </div>

      {!isDeveloperViewer && leaderboard.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <PiCheckCircle size={17} className="text-emerald-500" />
            Top developers by bugs fixed
          </p>

          <div className="space-y-3">
            {leaderboard.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className="flex w-full items-center gap-3 rounded-lg p-1 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                    row.name
                  )}`}
                >
                  {getInitials(row.name)}
                </span>

                <span className="w-32 shrink-0 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {row.name}
                </span>

                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <span
                    className="block h-full rounded-full bg-blue-500"
                    style={{ width: `${(row.fixed / maxFixed) * 100}%` }}
                  />
                </span>

                <span className="w-24 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                  {row.fixed} fixed · {row.open} open
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperPerformance;