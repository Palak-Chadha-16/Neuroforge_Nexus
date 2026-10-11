import { useAuth } from "../../context/AuthContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { ROLES, normalizeRole } from "../../constants/roles.js";
import StatCard from "../../components/dashboard/StatCard.jsx";
import TaskOverviewChart from "../../components/dashboard/TaskOverviewChart.jsx";
import ProjectProgressList from "../../components/dashboard/ProjectProgressList.jsx";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { tasks } = useTasks();
  const { projects } = useProjects();

  if (!currentUser) {
    return (
      <div className="text-slate-500 dark:text-slate-400">
        Loading user...
      </div>
    );
  }

  // --------------------------------------------------
  // PROJECT STATISTICS
  // --------------------------------------------------

  const totalProjects = projects.length;

  // --------------------------------------------------
  // TASK STATISTICS
  // --------------------------------------------------

  const totalTasks = tasks.length;

  const taskStatus = (task) => task.boardStatus || task.status;

  const todoTasks = tasks.filter(
    (task) => ["TODO", "To Do"].includes(taskStatus(task))
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => ["IN_PROGRESS", "In Progress"].includes(taskStatus(task))
  ).length;

  const completedTasks = tasks.filter(
    (task) => ["DONE", "Done"].includes(taskStatus(task))
  ).length;

  // --------------------------------------------------
  // CURRENT USER TASKS
  // --------------------------------------------------

  const myTasks = tasks.filter(
    (task) =>
      String(task.assignee?.id ?? task.assigneeId) === String(currentUser.id)
  );

  const myCompletedTasks = myTasks.filter(
    (task) => ["DONE", "Done"].includes(taskStatus(task))
  ).length;

  const myInProgressTasks = myTasks.filter(
    (task) => ["IN_PROGRESS", "In Progress"].includes(taskStatus(task))
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Dashboard
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Welcome back, {currentUser.fullName || currentUser.name || "User"}
        </p>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={totalProjects}
          sublabel="Projects"
        />

        <StatCard
          label="Total Tasks"
          value={totalTasks}
          sublabel="Tasks"
        />

        <StatCard
          label="In Progress"
          value={inProgressTasks}
          sublabel="Tasks"
        />

        <StatCard
          label="Completed"
          value={completedTasks}
          sublabel="Tasks"
        />
      </div>

      {/* Task Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TaskOverviewChart
          totalTasks={totalTasks}
          todoTasks={todoTasks}
          inProgressTasks={inProgressTasks}
          completedTasks={completedTasks}
        />

        <ProjectProgressList
          projects={projects}
          tasks={tasks}
        />
      </div>

      {/* My Tasks Summary (Non-Admin only) */}
      {normalizeRole(currentUser.role) !== ROLES.ADMIN && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#181b23] p-5 shadow-xs dark:shadow-md transition-colors">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              My Tasks
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tasks currently assigned to you
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#0f1117] p-4 transition-colors">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Assigned
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {myTasks.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#0f1117] p-4 transition-colors">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                In Progress
              </p>

              <p className="mt-2 text-xl font-bold text-blue-600 dark:text-blue-400">
                {myInProgressTasks}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#0f1117] p-4 transition-colors">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Completed
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {myCompletedTasks}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
