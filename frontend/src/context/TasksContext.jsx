import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getApiBase } from "../services/api.js";
import { canAccessTask, canAccessSubtask } from "../utils/access.js";
import { TasksContext } from "./TasksContextStore.js";

const API_BASE = `${getApiBase()}/tasks`;

const normalizeTask = (task) => {
  if (!task) return task;
  const projId = task.projectId ?? task.project?.id ?? task.project_id ?? null;
  const assId = task.assigneeId ?? task.assignee?.id ?? task.assignee_id ?? null;
  return { ...task, projectId: projId ? Number(projId) : null, assigneeId: assId ? Number(assId) : null };
};

const normalizeSubtask = (subtask) => ({
  ...subtask,
  id: Number(subtask.id),
  taskId: Number(subtask.taskId ?? subtask.task?.id),
  assigneeId: subtask.assigneeId == null ? null : Number(subtask.assigneeId ?? subtask.assignee?.id),
  teamId: subtask.teamId == null ? null : Number(subtask.teamId ?? subtask.team?.id),
});

export const TasksProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
            const response = await axios.get(API_BASE);
      const data = Array.isArray(response.data) ? response.data : [];

      if (data.length === 0) {
        setTasks([]);
        setSubtasks([]);
      } else {
        const normalizedTasks = data.map(normalizeTask);
        setTasks(normalizedTasks);

        try {
          const subtaskResults = await Promise.all(
            normalizedTasks.map((task) => axios.get(`${API_BASE}/${task.id}/subtasks`))
          );
          const allSubs = subtaskResults.flatMap((r) => Array.isArray(r.data) ? r.data.map(normalizeSubtask) : []);
          setSubtasks(allSubs);
        } catch {
          setSubtasks([]);
        }
      }
    } catch {
      setTasks([]);
      setSubtasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return fetchTasks();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [fetchTasks]);

  const buildPayload = (formData) => ({
    title: formData.title,
    description: formData.description || "",
    projectId: formData.projectId
      ? Number(formData.projectId)
      : formData.project?.id ?? null,
    assigneeId: formData.assigneeId
      ? Number(formData.assigneeId)
      : formData.assignee?.id ?? null,
    status: formData.status,
    priority: formData.priority,
    dueDate: formData.dueDate || null,
  });

  /* ================= PARENT TASK CRUD ================= */

  const createTask = async (formData) => {
    try {
            const response = await axios.post(
        API_BASE,
        buildPayload(formData)
      );

      const newTask = normalizeTask(
        response.data || formData
      );

      setTasks((prev) => [...prev, newTask]);

      return {
        success: true,
        data: newTask,
      };
    } catch (err) {
      console.warn(
        "Backend task creation failed, falling back to local state:",
        err.message
      );

      const newTask = normalizeTask({
        ...formData,
        id: Date.now(),
        status: formData.status || "To Do",
        boardStatus: formData.status || "To Do",
        priority: formData.priority || "Medium",
      });

      setTasks((prev) => [...prev, newTask]);

      return {
        success: true,
        data: newTask,
      };
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
            const response = await axios.patch(`${API_BASE}/${taskId}/status`, {
        status: newStatus,
      });

      const existingTask = getTaskById(taskId);
      const updated = normalizeTask(
        response.data || {
          ...existingTask,
          id: taskId,
          status: newStatus,
        }
      );

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? {
                ...task,
                ...updated,
                status: updated.status || newStatus,
                boardStatus: updated.boardStatus || task.boardStatus,
              }
            : task
        )
      );

      return {
        success: true,
        data: updated,
      };
    } catch (err) {
      console.warn(
        "Backend update task status failed, falling back to local state:",
        err.message
      );

      const existingTask = getTaskById(taskId);
      const updated = normalizeTask({
        ...existingTask,
        id: taskId,
        status: newStatus,
        boardStatus: newStatus,
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(taskId)
            ? {
                ...task,
                ...updated,
                status: newStatus,
                boardStatus: newStatus,
              }
            : task
        )
      );

      return {
        success: true,
        data: updated,
      };
    }
  };

  const updateTask = async (formData) => {
    const existingTask = getTaskById(formData.id);

    const currentUserRaw =
      sessionStorage.getItem("auth_user") ||
      localStorage.getItem("auth_user");

    let currentUser = null;

    try {
      currentUser = currentUserRaw
        ? JSON.parse(currentUserRaw)
        : null;
    } catch (error) {
      console.warn("Ignoring invalid stored user profile:", error);
    }

    const role = currentUser?.role
      ? String(currentUser.role).toUpperCase()
      : "";

    const isExecutionRole = ["DEVELOPER", "TESTER", "QA", "TEAM_MEMBER"].includes(role);

    // Check if this update is strictly a status transition (e.g. from Kanban, My Work, or status dropdown)
    const isStatusOnlyUpdate = existingTask && formData.status && (
      String(formData.status) !== String(existingTask.status) ||
      String(formData.status) !== String(existingTask.boardStatus)
    ) && (
      !formData.title || formData.title === existingTask.title
    ) && (
      formData.description === undefined || formData.description === (existingTask.description || "")
    ) && (
      !formData.priority || formData.priority === existingTask.priority
    );

    if (
      (isExecutionRole || isStatusOnlyUpdate) &&
      existingTask &&
      formData.status &&
      (String(formData.status) !== String(existingTask.status) ||
       String(formData.status) !== String(existingTask.boardStatus))
    ) {
      return updateTaskStatus(formData.id, formData.status);
    }

    try {
            const response = await axios.put(
        `${API_BASE}/${formData.id}`,
        buildPayload(formData)
      );

      const updated = normalizeTask(
        response.data || formData
      );

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(formData.id)
            ? {
                ...task,
                ...updated,
              }
            : task
        )
      );

      return {
        success: true,
        data: updated,
      };
    } catch (err) {
      console.warn(
        "Backend task update failed, falling back to local state:",
        err.message
      );

      const updated = normalizeTask({
        ...existingTask,
        ...formData,
      });

      setTasks((prev) =>
        prev.map((task) =>
          String(task.id) === String(formData.id)
            ? {
                ...task,
                ...updated,
              }
            : task
        )
      );

      return {
        success: true,
        data: updated,
      };
    }
  };

  const deleteTask = async (taskId) => {
    try {
            await axios.delete(
        `${API_BASE}/${taskId}`
      );
    } catch (err) {
      console.warn(
        "Backend task deletion failed, removing locally:",
        err.message
      );
    }

    setTasks((prev) =>
      prev.filter(
        (task) =>
          String(task.id) !== String(taskId)
      )
    );

    // Also cleanup subtasks under this parent task
    setSubtasks((prev) =>
      prev.filter(
        (sub) =>
          String(sub.taskId) !==
          String(taskId)
      )
    );

    return { success: true };
  };

  const getTaskById = (taskId) => {
    return (
      tasks.find(
        (t) =>
          String(t.id) === String(taskId)
      ) || null
    );
  };

  /* ================= SUBTASK CRUD ================= */

  const getSubtasksByTaskId = (taskId) =>
    taskId ? subtasks.filter((sub) => String(sub.taskId) === String(taskId)) : [];

  const createSubtask = async (taskId, subtaskData) => {
    if (!taskId || !subtaskData?.title) return { success: false, message: "Task ID and title are required." };
    try {
            const response = await axios.post(`${API_BASE}/${taskId}/subtasks`, {
        title: subtaskData.title.trim(),
        description: subtaskData.description || "",
        assigneeId: subtaskData.assigneeId ? Number(subtaskData.assigneeId) : null,
        teamId: subtaskData.teamId ? Number(subtaskData.teamId) : null,
        status: subtaskData.status || "To Do",
        priority: subtaskData.priority || "Medium",
        dueDate: subtaskData.dueDate || null,
      });
      const created = normalizeSubtask(response.data);
      setSubtasks((prev) => [...prev, created]);
      return { success: true, data: created };
    } catch (error) {
      console.warn("Backend create subtask failed, falling back to local state:", error.message);
      const created = normalizeSubtask({
        ...subtaskData,
        id: Date.now(),
        taskId: Number(taskId),
        status: subtaskData.status || "To Do",
        priority: subtaskData.priority || "Medium",
        dueDate: subtaskData.dueDate || null,
      });
      setSubtasks((prev) => [...prev, created]);
      return { success: true, data: created };
    }
  };

  const updateSubtaskStatus = async (subtaskId, newStatus) => {
    try {
            const response = await axios.patch(
        `${getApiBase()}/subtasks/${subtaskId}/status`,
        {
          status: newStatus || "To Do",
        }
      );
      const updated = normalizeSubtask(response.data);
      setSubtasks((prev) =>
        prev.map((sub) =>
          String(sub.id) === String(subtaskId)
            ? { ...sub, ...updated, status: updated.status || newStatus }
            : sub
        )
      );
      return { success: true, data: updated };
    } catch (error) {
      console.warn("Backend update subtask status failed, falling back to local state:", error.message);
      const existing = subtasks.find((s) => String(s.id) === String(subtaskId));
      const updated = normalizeSubtask({
        ...existing,
        id: subtaskId,
        status: newStatus || "To Do",
      });
      setSubtasks((prev) =>
        prev.map((sub) =>
          String(sub.id) === String(subtaskId)
            ? { ...sub, ...updated, status: newStatus || "To Do" }
            : sub
        )
      );
      return { success: true, data: updated };
    }
  };

  const updateSubtask = async (taskId, updatedSubtask) => {
    if (!updatedSubtask?.id) return { success: false, message: "Subtask ID is required." };

    const currentUserRaw = sessionStorage.getItem("auth_user") || localStorage.getItem("auth_user");
    let currentUser = null;
    try {
      currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    } catch (error) {
      console.warn("Ignoring invalid stored user profile:", error);
    }
    const role = String(currentUser?.role || "").toUpperCase();
    const isExecutionRole = ["DEVELOPER", "TESTER", "QA", "TEAM_MEMBER"].includes(role);

    const existingSubtask = subtasks.find((s) => String(s.id) === String(updatedSubtask.id));
    const isStatusOnlyUpdate = existingSubtask && updatedSubtask.status && (
      String(updatedSubtask.status) !== String(existingSubtask.status)
    ) && (
      !updatedSubtask.title || updatedSubtask.title === existingSubtask.title
    ) && (
      updatedSubtask.description === undefined || updatedSubtask.description === (existingSubtask.description || "")
    ) && (
      !updatedSubtask.priority || updatedSubtask.priority === existingSubtask.priority
    );

    if (isExecutionRole || isStatusOnlyUpdate) {
      return updateSubtaskStatus(updatedSubtask.id, updatedSubtask.status);
    }

    try {
            const response = await axios.put(`${getApiBase()}/subtasks/${updatedSubtask.id}`, {
        title: updatedSubtask.title,
        description: updatedSubtask.description || "",
        assigneeId: updatedSubtask.assigneeId ? Number(updatedSubtask.assigneeId) : null,
        teamId: updatedSubtask.teamId ? Number(updatedSubtask.teamId) : null,
        status: updatedSubtask.status || "To Do",
        priority: updatedSubtask.priority || "Medium",
        dueDate: updatedSubtask.dueDate || null,
      });
      const updated = normalizeSubtask(response.data);
      setSubtasks((prev) => prev.map((sub) => String(sub.id) === String(updated.id) ? { ...sub, ...updated, status: updated.status || updatedSubtask.status } : sub));
      return { success: true, data: updated };
    } catch (error) {
      console.warn("Backend update subtask failed, falling back to local state:", error.message);
      const existing = subtasks.find((s) => String(s.id) === String(updatedSubtask.id));
      const updated = normalizeSubtask({
        ...existing,
        ...updatedSubtask,
      });
      setSubtasks((prev) =>
        prev.map((sub) =>
          String(sub.id) === String(updated.id)
            ? { ...sub, ...updated }
            : sub
        )
      );
      return { success: true, data: updated };
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    if (!subtaskId) return { success: false, message: "Subtask ID is required." };
    try {
            await axios.delete(`${getApiBase()}/subtasks/${subtaskId}`);
    } catch (error) {
      console.warn("Backend delete subtask failed, removing locally:", error.message);
    }
    setSubtasks((prev) => prev.filter((sub) => String(sub.id) !== String(subtaskId)));
    return { success: true };
  };

  /* ================= SCOPING FILTERS ================= */

  const getVisibleTasks = (
    user,
    projectTeams = {},
    teams = [],
    projects = []
  ) => {
    if (!user) return [];

    return tasks.filter((task) => {
      const project = projects.find(
        (p) =>
          String(p.id) ===
          String(task.projectId)
      );

      return canAccessTask(
        user,
        task,
        project,
        projectTeams,
        teams,
        subtasks
      );
    });
  };

  const getVisibleSubtasks = (
    user,
    projectTeams = {},
    teams = [],
    projects = []
  ) => {
    if (!user) return [];

    return subtasks.filter((sub) => {
      const parentTask =
        getTaskById(sub.taskId);

      const project = projects.find(
        (p) =>
          String(p.id) ===
          String(parentTask?.projectId)
      );

      return canAccessSubtask(
        user,
        sub,
        parentTask,
        project,
        projectTeams,
        teams
      );
    });
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        subtasks,
        loading,
        error,
        createTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        getTaskById,
        createSubtask,
        updateSubtask,
        updateSubtaskStatus,
        deleteSubtask,
        getSubtasksByTaskId,
        getVisibleTasks,
        getVisibleSubtasks,
        refetchTasks: fetchTasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};
