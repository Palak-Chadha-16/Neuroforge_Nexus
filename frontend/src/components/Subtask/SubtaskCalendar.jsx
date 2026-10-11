import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PiCaretLeft,
  PiCaretRight,
} from "react-icons/pi";
import { useTasks } from "../../context/TasksContextStore.js";
import { useAuth } from "../../context/AuthContextStore.js";
import { canRescheduleSubtask } from "../../utils/access.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const priorityColor = {
  Critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400",
  High: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400",
  Medium: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400",
};

const SubtaskCalendar = () => {
  const { projectId, taskId, subtaskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const {
    getTaskById,
    getSubtasksByTaskId,
    updateSubtask,
  } = useTasks();


  const parentTask = getTaskById(taskId);
  const subtasks = getSubtasksByTaskId(taskId);

  const currentSubtask = subtasks.find(
    (s) => String(s.id) === String(subtaskId)
  );

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedSubtask, setSelectedSubtask] =
    useState(currentSubtask || null);

  const [newDueDate, setNewDueDate] =
    useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(
      new Date(year, month - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(year, month + 1, 1)
    );
  };

  const monthName = currentDate.toLocaleString(
    "default",
    { month: "long" }
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const totalDays = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const daysArray = [];

    for (let i = 0; i < firstDay; i++) {
      daysArray.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      daysArray.push(d);
    }

    return daysArray;
  }, [year, month]);

  const getSubtasksForDay = (day) => {
    if (!day) return [];

    const formattedDay = `${year}-${String(
      month + 1
    ).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;

    return subtasks.filter(
      (s) => s.dueDate === formattedDay
    );
  };

  const canReschedule =
    canRescheduleSubtask(
      currentUser,
      selectedSubtask
    );

  const handleReschedule = async () => {
    if (!selectedSubtask || !newDueDate) {
      return;
    }

    await updateSubtask(taskId, {
      id: selectedSubtask.id,
      dueDate: newDueDate,
    });

    setNewDueDate("");

    setSelectedSubtask((prev) => ({
      ...prev,
      dueDate: newDueDate,
    }));
  };

  if (!parentTask) {
    return (
      <div className="min-h-full bg-transparent p-6 text-[#172033] dark:text-slate-100">
        <div className="py-16 text-center">
          <h2 className="text-lg font-semibold text-[#172033] dark:text-white">
            Task not found
          </h2>

          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="mt-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent px-4 py-6 text-[#172033] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* HIERARCHICAL BREADCRUMB */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-[#64748B] dark:text-slate-400">
          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            Projects
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() =>
              navigate(`/projects/${projectId}?section=tasks`, {
                state: { section: "tasks" },
              })
            }
            className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            Project Workspace
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() =>
              navigate(`/projects/${projectId}/tasks/${taskId}`)
            }
            className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            TASK-{parentTask.id}
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/projects/${projectId}/tasks/${taskId}/${subtaskId}`
              )
            }
            className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
          >
            SUBTASK-{subtaskId}
          </button>
          <span>/</span>
          <span className="font-semibold text-[#172033] dark:text-slate-200">
            Calendar
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="border-b border-slate-200 p-6 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                TASK-{parentTask.id}
              </span>

              <span className="text-xs text-[#64748B] dark:text-slate-400">
                Subtask Schedule
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#172033] dark:text-white sm:text-3xl">
              {parentTask.title} • Calendar
            </h1>

            <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">
              Timeline schedule and deadlines for subtasks belonging to this parent work item.
            </p>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-[#0b1120]">
            <div className="flex min-w-max gap-1">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}`
                  )
                }
                className="rounded-xl px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Subtask Details
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}/kanban?view=board`
                  )
                }
                className="rounded-xl px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Kanban
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}/kanban?view=timeline`
                  )
                }
                className="rounded-xl px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Timeline
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/tasks/${taskId}/${subtaskId}/kanban?view=list`
                  )
                }
                className="rounded-xl px-5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                List
              </button>

              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2 text-xs font-semibold text-white shadow-sm"
              >
                Calendar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#172033] dark:text-white">
                  {monthName} {year}
                </h2>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-[#64748B] transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                  >
                    <PiCaretLeft size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-[#64748B] transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                  >
                    <PiCaretRight size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-semibold text-[#64748B] dark:text-slate-400">
                {DAYS.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="h-20 rounded-xl bg-[#F1F5F9] dark:bg-slate-800/40"
                      />
                    );
                  }

                  const daySubtasks =
                    getSubtasksForDay(day);

                  const formattedDate = `${year}-${String(
                    month + 1
                  ).padStart(2, "0")}-${String(
                    day
                  ).padStart(2, "0")}`;

                  const isSelected =
                    selectedSubtask?.dueDate ===
                    formattedDate;

                  return (
                    <div
                      key={`day-${day}`}
                      className={`flex h-24 flex-col justify-between rounded-xl border p-1.5 transition ${
                        isSelected
                          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-[#F1F5F9] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-[#475569] dark:text-slate-400">
                        {day}
                      </span>

                      <div className="space-y-1 overflow-y-auto">
                        {daySubtasks.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setSelectedSubtask(s)
                            }
                            className={`w-full truncate rounded border px-1.5 py-0.5 text-left text-[10px] font-semibold ${
                              priorityColor[
                                s.priority
                              ] ||
                              "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-[#F1F5F9] p-5 dark:border-slate-800 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold text-[#172033] dark:text-white">
                Subtask Details
              </h3>

              <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
                Selected schedule event
              </p>

              {selectedSubtask ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <span className="font-mono text-[10px] text-[#64748B] dark:text-slate-400">
                      SUBTASK-{selectedSubtask.id}
                    </span>

                    <h4 className="mt-1 text-sm font-semibold text-[#172033] dark:text-white">
                      {selectedSubtask.title}
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-[#475569] dark:text-slate-300">
                      {selectedSubtask.description ||
                        "No description provided."}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-slate-300 pt-3 text-xs dark:border-slate-700">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#64748B] dark:text-slate-400">
                        Status:
                      </span>

                      <span className="font-medium text-[#172033] dark:text-white">
                        {selectedSubtask.status ||
                          "To Do"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-[#64748B] dark:text-slate-400">
                        Priority:
                      </span>

                      <span className="font-medium text-[#172033] dark:text-white">
                        {selectedSubtask.priority ||
                          "Medium"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-[#64748B] dark:text-slate-400">
                        Due Date:
                      </span>

                      <span className="font-medium text-[#D97706] dark:text-amber-400">
                        {selectedSubtask.dueDate ||
                          "Not set"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-4 dark:border-slate-700">
                    <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                      Reschedule Due Date
                    </label>

                    {canReschedule ? (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={newDueDate}
                          onChange={(e) =>
                            setNewDueDate(
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />

                        <button
                          type="button"
                          onClick={
                            handleReschedule
                          }
                          disabled={!newDueDate}
                          className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Update
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs italic text-[#64748B] dark:text-slate-400">
                        View-only schedule. Contact Team
                        Lead to reschedule.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#64748B] dark:text-slate-400">
                  Click any scheduled subtask on the
                  calendar to view details or reschedule.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtaskCalendar;