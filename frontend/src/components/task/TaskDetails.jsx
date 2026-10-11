import { useTasks } from "../../context/TasksContextStore.js";

const TASK_STATUSES = ["To Do", "In Progress", "Done"];

const priorityColor = {
  High: "text-red-700 border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300",
  Medium: "text-amber-700 border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  Low: "text-green-700 border-green-200 bg-green-50 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const TaskDetails = ({ task, onClose }) => {
  const { tasks, updateTask } = useTasks();

  const currentTask =
    tasks.find((t) => String(t.id) === String(task.id)) || task;

  const handleTaskStatusChange = async (e) => {
    await updateTask({
      id: currentTask.id,
      title: currentTask.title,
      projectId: currentTask.project?.id,
      assigneeId: currentTask.assignee?.id,
      priority: currentTask.priority,
      dueDate: currentTask.dueDate,
      status: e.target.value,
    });
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Task details
        </h3>

        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="mt-3">
        <span className="text-xl font-semibold text-slate-900 dark:text-white">
          {currentTask.title}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Assignee
          </p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">
            {currentTask.assignee?.fullName || "Unassigned"}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Status
          </p>

          <select
            value={currentTask.status || "To Do"}
            onChange={handleTaskStatusChange}
            className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Priority
          </p>

          <span
            className={`mt-2 inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${
              priorityColor[currentTask.priority] ||
              "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {currentTask.priority || "Not set"}
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Due date
          </p>

          <p className="mt-2 font-medium text-slate-900 dark:text-white">
            {currentTask.dueDate || "Not set"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;