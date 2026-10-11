import KanbanCard from "./KanbanCard.jsx";

function KanbanColumn({
  column,
  tasks,
  draggedTaskId,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const getColumnClass = () => {
    if (isDropTarget) {
      return "min-h-[420px] rounded-xl border-2 border-blue-400 bg-blue-50/70 p-3.5 shadow-md ring-2 ring-blue-400/20 transition-all duration-200 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-500/20";
    }
    return "min-h-[420px] rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-[#111927]";
  };

  return (
    <div
      className={getColumnClass()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, column.id)}
    >
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              column.id === "To Do"
                ? "bg-blue-500"
                : column.id === "In Progress"
                ? "bg-indigo-500"
                : column.id === "In Review"
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
          ></span>

          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {column.title}
          </h3>
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 dark:border dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:ring-0">
          {tasks.length}
        </span>
      </div>

      <div className="my-2 border-b border-slate-200 dark:border-slate-800"></div>

      <div className="flex min-h-[350px] flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              +
            </div>

            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Drop tasks here
            </span>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              draggedTaskId={draggedTaskId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default KanbanColumn;