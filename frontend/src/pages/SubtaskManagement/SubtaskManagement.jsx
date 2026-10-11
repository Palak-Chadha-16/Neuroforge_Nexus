import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PiArrowLeft,
  PiCalendarBlank,
  PiCheckCircle,
  PiPencil,
  PiPlus,
  PiTrash,
  PiUserCircle,
} from "react-icons/pi";

import { useTasks } from "../../context/TasksContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useAuth } from "../../context/AuthContextStore.js";
import { usePermission } from "../../hooks/usePermission.js";
import Can from "../../components/common/Can.jsx";

const SUBTASK_STATUSES = [
  "To Do",
  "In Progress",
  "In Review",
  "Ready for Testing",
  "In Testing",
  "In QA",
  "Done",
];

const priorityColor = {
  Critical:
    "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300",

  High:
    "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",

  Medium:
    "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",

  Low:
    "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
};

const statusColor = {
  "To Do":
    "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",

  "In Progress":
    "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",

  "In Review":
    "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",

  "Ready for Testing":
    "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",

  "In Testing":
    "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300",

  "In QA":
    "border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300",

  Done:
    "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111927] px-4 py-2.5 text-sm text-[#172033] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15";

const SubtaskManagement = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();

  const {
    getTaskById,
    getSubtasksByTaskId,
    createSubtask,
    updateSubtask,
    deleteSubtask,
  } = useTasks();

  const { users } = useUsers();
  const { can } = usePermission();
  const { currentUser } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To Do");
  const [dueDate, setDueDate] = useState("");

  const parentTask = useMemo(() => {
    return getTaskById(taskId);
  }, [getTaskById, taskId]);

  const subtasks = useMemo(() => {
    return getSubtasksByTaskId(taskId);
  }, [getSubtasksByTaskId, taskId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("Medium");
    setStatus("To Do");
    setDueDate("");
    setEditingSubtaskId(null);
    setShowForm(false);
  };

    const handleCreateSubtask = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Please enter a subtask title.");
      return;
    }

    const result = await createSubtask(taskId, {
      title: title.trim(),
      description: description.trim(),
      assigneeId,
      priority,
      status: "To Do",
      dueDate,
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    resetForm();
  };

  const handleEditSubtask = (subtask) => {
    setEditingSubtaskId(subtask.id);

    setTitle(subtask.title || "");
    setDescription(subtask.description || "");

    setAssigneeId(
      subtask.assigneeId ? String(subtask.assigneeId) : ""
    );

    setPriority(subtask.priority || "Medium");
    setStatus(subtask.status || "To Do");
    setDueDate(subtask.dueDate || "");

    setShowForm(true);
  };

    const handleUpdateSubtask = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("Please enter a subtask title.");
      return;
    }

    const result = await updateSubtask(taskId, {
      id: editingSubtaskId,
      title: title.trim(),
      description: description.trim(),
      assigneeId,
      priority,
      status,
      dueDate,
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    resetForm();
  };

    const handleDeleteSubtask = async (subtask) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${subtask.title}"?`
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteSubtask(taskId, subtask.id);

    if (!result.success) {
      alert(result.message);
      return;
    }

    if (String(editingSubtaskId) === String(subtask.id)) {
      resetForm();
    }
  };

  const handleOpenSubtask = (subtask) => {
    navigate(
      `/projects/${projectId}/tasks/${taskId}/${subtask.id}`
    );
  };

  if (!parentTask) {
    return (
      <div className="min-h-full bg-transparent px-4 py-6 text-[#172033] dark:text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() =>
              navigate(`/projects/${projectId}/tasks/${taskId}`)
            }
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#64748B] dark:text-slate-400 transition hover:text-[#172033] dark:hover:text-slate-200"
          >
            <PiArrowLeft size={18} />
            Back to Task
          </button>

          <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#172033] dark:text-slate-100">
              Task not found
            </p>

            <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
              This task may have been deleted or does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent px-4 py-6 text-[#172033] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
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
          <span className="font-semibold text-[#172033] dark:text-slate-200">
            Subtasks
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1120]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  TASK-{parentTask.id}
                </span>

                <span className="text-sm text-[#64748B] dark:text-slate-400">
                  Subtask Decomposition
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold text-[#172033] dark:text-white sm:text-3xl">
                {parentTask.title}
              </h1>

              <p className="mt-2 text-sm text-[#475569] dark:text-slate-400">
                Manage and track granular engineering subtasks associated with this deliverable.
              </p>
            </div>

            <Can perform="subtask:create">
              <button
                type="button"
                onClick={() => {
                  if (editingSubtaskId) {
                    resetForm();
                  } else {
                    setShowForm(!showForm);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
              >
                <PiPlus size={18} />

                {showForm ? "Cancel" : "Add Subtask"}
              </button>
            </Can>
          </div>
        </div>

        {showForm && (
          <div className="mt-6 rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#172033] dark:text-slate-100">
                {editingSubtaskId
                  ? "Edit Subtask"
                  : "Create Subtask"}
              </h2>

              <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                Add the details needed to track this subtask.
              </p>
            </div>

            <form
              onSubmit={
                editingSubtaskId
                  ? handleUpdateSubtask
                  : handleCreateSubtask
              }
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#475569] dark:text-slate-300">
                  Subtask Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Enter subtask title"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#475569] dark:text-slate-300">
                  Assignee
                </label>

                <select
                  value={assigneeId}
                  onChange={(event) =>
                    setAssigneeId(event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="" className="dark:bg-slate-800 dark:text-white">Select user</option>

                  {users.map((user) => (
                    <option key={user.id} value={user.id} className="dark:bg-slate-800 dark:text-white">
                      {user.fullName ||
                        user.name ||
                        user.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#475569] dark:text-slate-300">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="Low" className="dark:bg-slate-800 dark:text-white">Low</option>
                  <option value="Medium" className="dark:bg-slate-800 dark:text-white">Medium</option>
                  <option value="High" className="dark:bg-slate-800 dark:text-white">High</option>
                  <option value="Critical" className="dark:bg-slate-800 dark:text-white">Critical</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#475569] dark:text-slate-300">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  className={inputClass}
                >
                  {SUBTASK_STATUSES.map((item) => (
                    <option key={item} value={item} className="dark:bg-slate-800 dark:text-white">
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#475569] dark:text-slate-300">
                  Due Date
                </label>

                <div className="relative">
                  <PiCalendarBlank
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(event.target.value)
                    }
                    className={`${inputClass} px-10`}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-[#475569] dark:text-slate-300">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Describe this subtask"
                  rows={4}
                  className={`${inputClass} resize-none px-4 py-3`}
                />
              </div>

              <div className="flex items-end gap-3 md:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
                >
                  {editingSubtaskId
                    ? "Update Subtask"
                    : "Create Subtask"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#172033] dark:hover:text-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Subtasks
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {subtasks.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              To Do
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {
                subtasks.filter(
                  (subtask) => subtask.status === "To Do"
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              In Progress
            </p>

            <p className="mt-2 text-2xl font-bold text-[#2563EB] dark:text-blue-400">
              {
                subtasks.filter(
                  (subtask) =>
                    subtask.status === "In Progress"
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Completed
            </p>

            <p className="mt-2 text-2xl font-bold text-[#16A34A] dark:text-emerald-400">
              {
                subtasks.filter(
                  (subtask) => subtask.status === "Done"
                ).length
              }
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-[#172033] dark:text-slate-100">
              Subtasks
            </h2>

            <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
              All subtasks belonging to this task.
            </p>
          </div>

          {subtasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F5F9] dark:bg-slate-800">
                <PiCheckCircle
                  size={28}
                  className="text-slate-400"
                />
              </div>

              <p className="mt-4 text-sm font-semibold text-[#172033] dark:text-slate-100">
                No subtasks yet
              </p>

              <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                Create the first subtask for this task.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {subtasks.map((subtask) => {
                const subtaskAssignee = users.find(
                  (user) =>
                    String(user.id) ===
                    String(subtask.assigneeId)
                );

                return (
                  <div
                    key={subtask.id}
                    className="p-6 transition hover:bg-[#F1F5F9] dark:hover:bg-[#111927]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenSubtask(subtask)
                            }
                            className="text-left text-base font-semibold text-[#172033] dark:text-slate-100 transition hover:text-[#2563EB] dark:hover:text-blue-400"
                          >
                            {subtask.title}
                          </button>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              statusColor[subtask.status] ||
                              statusColor["To Do"]
                            }`}
                          >
                            {subtask.status || "To Do"}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              priorityColor[
                                subtask.priority
                              ] || priorityColor.Medium
                            }`}
                          >
                            {subtask.priority || "Medium"}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748B] dark:text-slate-400">
                          {subtask.description ||
                            "No description has been added."}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-[#64748B] dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <PiUserCircle size={16} />

                            {subtaskAssignee?.fullName ||
                              subtaskAssignee?.name ||
                              subtaskAssignee?.username ||
                              "Unassigned"}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <PiCalendarBlank size={16} />

                            {subtask.dueDate ||
                              "No due date"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(can("subtask:edit") ||
                          String(subtask.assigneeId) ===
                            String(currentUser?.id)) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleEditSubtask(subtask)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:border-blue-200 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-[#2563EB] dark:hover:text-blue-400"
                          >
                            <PiPencil size={15} />
                            Edit
                          </button>
                        )}

                        {can("subtask:delete") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSubtask(subtask)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-900/40"
                          >
                            <PiTrash size={15} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubtaskManagement;