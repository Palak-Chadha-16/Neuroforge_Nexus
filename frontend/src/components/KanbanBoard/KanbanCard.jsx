
function KanbanCard({
  task,
  draggedTaskId,
  onDragStart,
  onDragEnd,
}) {
  const priority = task.priority || "Medium";

  const priorityClass = String(priority).toLowerCase();

  const taskTitle =
    task.title ||
    task.name ||
    "Untitled Task";

  const description =
    task.description ||
    "No description provided.";

  const assignee =
    task.assigneeName ||
    task.assignee?.name ||
    task.assignee?.fullName ||
    "Unassigned";

  const dueDate =
    task.dueDate ||
    task.endDate ||
    null;

  const formatDate = (date) => {
    if (!date) {
      return "Not set";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not set";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPriorityClass = () => {
    if (priorityClass === "high" || priorityClass === "critical") {
      return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/60";
    }

    if (priorityClass === "low") {
      return "bg-green-50 text-green-700 border border-green-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60";
    }

    return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60";
  };

  return (
    <article
      className={`cursor-grab active:cursor-grabbing rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-[#1e293b] dark:hover:border-slate-700 ${
        String(draggedTaskId) === String(task.id)
          ? "scale-[0.98] opacity-50 shadow-lg"
          : ""
      }`}
      draggable
      onDragStart={(event) => onDragStart(event, task)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400">
          #{task.id}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPriorityClass()}`}
        >
          {priority}
        </span>
      </div>

      <h4 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-[#172033] dark:text-slate-100">
        {taskTitle}
      </h4>

      <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#64748B] dark:text-slate-400">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300 dark:ring-1 dark:ring-blue-800">
          {String(assignee).charAt(0).toUpperCase()}
        </div>

        <span className="truncate text-xs font-medium text-[#475569] dark:text-slate-300">
          {assignee}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#475569] dark:bg-slate-800 dark:text-slate-300">
          {task.status || "To Do"}
        </span>

        <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400">
          Due: {formatDate(dueDate)}
        </span>
      </div>
    </article>
  );
}

export default KanbanCard;