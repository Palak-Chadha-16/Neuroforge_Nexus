import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  PiCalendarBlank,
  PiCalendar,
  PiCaretLeft,
  PiCaretRight,
  PiFunnel,
  PiX,
  PiWarningCircle,
  PiDownloadSimple,
  PiListBullets,
  PiFlag,
  PiCheckCircle,
  PiPlus,
  PiTrash,
} from "react-icons/pi";

import { useAuth } from "../../context/AuthContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useTeams } from "../../context/TeamsContextStore.js";
import axios, { getApiBase } from "../../services/api.js";

const API_BASE = getApiBase();
const API = `${API_BASE}/calendar`;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const TYPES = ["DEADLINE", "MILESTONE", "MEETING", "REMINDER", "RELEASE", "OTHER"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["PENDING", "COMPLETED", "CANCELLED"];

const pad2 = (value) => String(value).padStart(2, "0");
const toEventDateTime = (value) =>
  value && value.length === 10 ? `${value}T00:00:00` : value;
const toISO = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatDisplayDate = (value) => {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  const displayDate = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return value.length > 10 && !value.endsWith("T00:00:00")
    ? `${displayDate}, ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
    : displayDate;
};

const titleForType = (type) =>
  String(type || "OTHER")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeBackendEvent = (event) => ({
  ...event,
  id: event.id,
  title: event.title || "Calendar Event",
  label: event.title || "Calendar Event",
  calendarTitle: event.title || "Calendar Event",
  dueDate: event.eventDate ? event.eventDate.slice(0, 10) : "",
  eventDate: event.eventDate,
  calendarType: "meeting",
  type: event.type ? event.type.toLowerCase() : "meeting",
  priority: event.priority || "Medium",
  status: event.status || "PENDING",
  isMeeting: event.type === "MEETING",
  isBackendEvent: true,
  editable: event.editable ?? (event.source !== "SYSTEM"),
});

const isItemOverdue = (dueDate, status, boardStatus, todayISO = toISO(new Date())) => {
  if (!dueDate) return false;
  const cleanStatus = (status || boardStatus || "").toUpperCase().replace(/\s+/g, "_");
  if (cleanStatus === "DONE" || cleanStatus === "COMPLETED") return false;
  return dueDate < todayISO;
};

const GlobalCalendar = () => {
  const { currentUser } = useAuth();
  const { projects = [] } = useProjects();
  const { tasks = [], updateSubtask, updateTask } = useTasks();
  const { teams = [] } = useTeams();
  const { users = [] } = useUsers();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // "month" | "week" | "agenda"

  const [selectedProjectId, setSelectedProjectId] = useState("ALL");
  const [selectedTeamId, setSelectedTeamId] = useState("ALL");
  const [selectedUserId, setSelectedUserId] = useState("ALL");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Backend Calendar API state
  const [backendEvents, setBackendEvents] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEventDate, setNewEventDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    eventDate: "",
    type: "DEADLINE",
    priority: "MEDIUM",
    projectId: "",
    taskId: "",
    subtaskId: "",
    sprintId: "",
    assignedTo: "",
  });

  // Toast notification for drag-and-drop feedback
  const [toastMessage, setToastMessage] = useState(null);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);

  const loadBackendEvents = useCallback(async () => {
    setError("");
    try {
      const response = await axios.get(API);
      if (Array.isArray(response.data)) {
        setBackendEvents(response.data.map(normalizeBackendEvent));
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Calendar events could not be loaded."
      );
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      Promise.resolve().then(loadBackendEvents);
    }
  }, [currentUser, loadBackendEvents]);

  useEffect(() => {
    let active = true;
    if (!form.projectId) {
      Promise.resolve().then(() => {
        if (active) setSprints([]);
      });
      return () => { active = false; };
    }
    axios
      .get(`${API_BASE}/sprints/projects/${form.projectId}/sprints`)
      .then((response) => {
        if (active) setSprints(Array.isArray(response.data) ? response.data : response.data?.content || []);
      })
      .catch(() => { if (active) setSprints([]); });
    return () => { active = false; };
  }, [form.projectId]);

  // Refresh after an assistant action persisted through the calendar API.
  useEffect(() => {
    const handleEventsUpdated = () => loadBackendEvents();

    window.addEventListener("nfn-calendar-events-updated", handleEventsUpdated);
    return () => {
      window.removeEventListener("nfn-calendar-events-updated", handleEventsUpdated);
    };
  }, [loadBackendEvents]);

  // Auto-clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const visibleProjects = useMemo(() => {
    if (!currentUser) return [];
    return projects;
  }, [currentUser, projects]);

  const todayISO = toISO(new Date());

  const visibleTasks = useMemo(() => {
    if (!currentUser) return [];
    const visibleProjectIds = new Set(
      visibleProjects.map((project) => String(project.id))
    );
    return tasks.filter((task) =>
      visibleProjectIds.has(String(task.projectId))
    );
  }, [currentUser, tasks, visibleProjects]);

  const visibleSubtasks = useMemo(() => {
    if (!currentUser) return [];
    const taskIds = new Set(visibleTasks.map((t) => String(t.id)));
    return tasks.flatMap((t) => (Array.isArray(t.subtasks) ? t.subtasks : [])).filter((sub) =>
      taskIds.has(String(sub.taskId))
    );
  }, [currentUser, tasks, visibleTasks]);

  // Unified Event Aggregator
  const allEvents = useMemo(() => {
    const taskEvents = visibleTasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: `task-${task.id}`,
        rawId: task.id,
        taskId: task.id,
        calendarTitle: task.title,
        title: task.title,
        label: task.title,
        dueDate: task.dueDate,
        eventDate: task.dueDate,
        projectId: task.projectId,
        priority: task.priority || "Medium",
        calendarType: "task",
        type: "task",
        status: task.status || task.boardStatus || "To Do",
        assigneeId: task.assigneeId,
        assignee: task.assignee,
        isOverdue: isItemOverdue(task.dueDate, task.status, task.boardStatus, todayISO),
        editable: true,
      }));

    const subtaskEvents = visibleSubtasks
      .filter((subtask) => subtask.dueDate)
      .map((subtask) => ({
        id: `subtask-${subtask.id}`,
        rawId: subtask.id,
        subtaskId: subtask.id,
        taskId: subtask.taskId,
        calendarTitle: subtask.title,
        title: subtask.title,
        label: subtask.title,
        dueDate: subtask.dueDate,
        eventDate: subtask.dueDate,
        projectId: subtask.projectId,
        priority: subtask.priority || "Medium",
        calendarType: "subtask",
        type: "subtask",
        status: subtask.status || subtask.boardStatus || "To Do",
        assigneeId: subtask.assigneeId,
        assignee: subtask.assignee,
        isOverdue: isItemOverdue(subtask.dueDate, subtask.status, subtask.boardStatus, todayISO),
        editable: true,
      }));

    return [...taskEvents, ...subtaskEvents, ...backendEvents];
  }, [
    visibleTasks,
    visibleSubtasks,
    backendEvents,
    todayISO,
  ]);

  // Scoped Event Filtering
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (
        selectedProjectId !== "ALL" &&
        event.projectId != null &&
        String(event.projectId) !== String(selectedProjectId)
      ) {
        return false;
      }

      if (
        selectedTeamId !== "ALL" &&
        event.teamId != null &&
        String(event.teamId) !== String(selectedTeamId)
      ) {
        return false;
      }

      if (
        selectedUserId !== "ALL" &&
        event.assigneeId != null &&
        String(event.assigneeId) !== String(selectedUserId)
      ) {
        return false;
      }

      if (showOverdueOnly && !event.isOverdue) {
        return false;
      }

      return true;
    });
  }, [
    allEvents,
    selectedProjectId,
    selectedTeamId,
    selectedUserId,
    showOverdueOnly,
  ]);

  // Workload Collision Detector: detects team members with >= 3 deliverables on same date
  const workloadCollisionsByDate = useMemo(() => {
    const countsByDateAndUser = {};

    filteredEvents.forEach((ev) => {
      if (!ev.dueDate) return;
      const userKey = ev.assigneeId || ev.assignee?.id || (ev.assignedTo != null ? ev.assignedTo : null);
      if (!userKey) return;

      const dateKey = ev.dueDate;
      if (!countsByDateAndUser[dateKey]) countsByDateAndUser[dateKey] = {};
      countsByDateAndUser[dateKey][userKey] = (countsByDateAndUser[dateKey][userKey] || 0) + 1;
    });

    const collisionMap = {};
    Object.entries(countsByDateAndUser).forEach(([date, userCounts]) => {
      const collisions = Object.entries(userCounts).filter(([, count]) => count >= 3);
      if (collisions.length > 0) {
        collisionMap[date] = collisions.map(([uId, count]) => {
          const userObj = users.find((u) => String(u.id) === String(uId));
          return {
            userName: userObj?.fullName || userObj?.name || `User #${uId}`,
            count,
          };
        });
      }
    });

    return collisionMap;
  }, [filteredEvents, users]);

  // Calendar date range calculations
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const firstDayOfWeek = firstDay.getDay();

    for (let i = firstDayOfWeek; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Current week 7 days
  const currentWeekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day;
    const weekStart = new Date(curr.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Agenda items sorted chronologically
  const agendaEventsGrouped = useMemo(() => {
    const sorted = [...filteredEvents].filter((ev) => ev.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const groups = {};
    sorted.forEach((ev) => {
      const dateKey = ev.dueDate;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(ev);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      items,
    }));
  }, [filteredEvents]);

  const getDayEvents = (day) => {
    const dateString = toISO(day);
    return filteredEvents.filter((event) => event.dueDate === dateString);
  };

  // Navigation handlers
  const navigatePeriod = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (viewMode === "week") {
      newDate.setDate(currentDate.getDate() + direction * 7);
    } else {
      newDate.setDate(currentDate.getDate() + direction * 14);
    }
    setCurrentDate(newDate);
  };

  const periodTitle = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === "week") {
      const first = currentWeekDays[0];
      const last = currentWeekDays[6];
      return `${MONTHS[first.getMonth()].slice(0, 3)} ${first.getDate()} – ${MONTHS[last.getMonth()].slice(0, 3)} ${last.getDate()}, ${last.getFullYear()}`;
    }
    return `Agenda – ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [viewMode, currentDate, currentWeekDays]);

  // Drag and Drop rescheduling handler
  const handleDrop = async (targetDateString) => {
    if (!draggedItem) return;

    const { calendarType, rawId, title } = draggedItem;

    try {
      if (calendarType === "task" && updateTask) {
        const existingTask = tasks.find((t) => String(t.id) === String(rawId));
        if (existingTask) {
          await updateTask({
            ...existingTask,
            dueDate: targetDateString,
          });
          setToastMessage(`📅 Rescheduled task "${title}" to ${formatDisplayDate(targetDateString)}`);
        }
      } else if (calendarType === "subtask" && updateSubtask) {
        const allSubs = tasks.flatMap((t) => (Array.isArray(t.subtasks) ? t.subtasks : []));
        const existingSub = allSubs.find((s) => String(s.id) === String(rawId));
        if (existingSub) {
          await updateSubtask({
            ...existingSub,
            dueDate: targetDateString,
          });
          setToastMessage(`📅 Rescheduled subtask "${title}" to ${formatDisplayDate(targetDateString)}`);
        }
      } else if (draggedItem.isBackendEvent) {
        await axios.patch(`${API}/${rawId}/date`, {
          eventDate: toEventDateTime(targetDateString),
        });
        await loadBackendEvents();
        setToastMessage(`📅 Rescheduled event "${title}" to ${formatDisplayDate(targetDateString)}`);
      } else {
        throw new Error("This calendar item cannot be rescheduled.");
      }
    } catch (err) {
      console.error("Reschedule failed:", err);
      setToastMessage(`❌ Failed to reschedule: ${err.message}`);
    } finally {
      setDraggedItem(null);
      setDragOverDay(null);
    }
  };

  // Google Calendar / iCal RFC 5545 Export
  const handleExportICS = () => {
    if (filteredEvents.length === 0) {
      alert("No scheduled events or deadlines to export.");
      return;
    }

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NeuroForge SDLC//Master Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    filteredEvents.forEach((ev) => {
      if (!ev.dueDate) return;
      const cleanDate = ev.dueDate.replace(/-/g, "");
      const uid = `nf-${ev.id || Math.random().toString(36).slice(2, 9)}@neuroforge.io`;
      const summary = ev.title || ev.label || "SDLC Deliverable";
      const desc = `Type: ${ev.calendarType || "Task"} | Priority: ${ev.priority || "Medium"} | Status: ${ev.status || "Open"}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${cleanDate}T000000Z`);
      lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
      lines.push(`SUMMARY:${summary.replace(/[,;]/g, " ")}`);
      lines.push(`DESCRIPTION:${desc.replace(/[,;]/g, " ")}`);
      lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neuroforge_schedule_${toISO(new Date())}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToastMessage("📥 Schedule exported (.ics) for Google Calendar & Outlook!");
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setNewEventDate((event.eventDate || event.dueDate || "").slice(0, 16));
  };

  const handleReschedule = async () => {
    if (!selectedEvent?.rawId && !selectedEvent?.id) return;
    setSaving(true);
    try {
      const eventId = selectedEvent.rawId || selectedEvent.id;
      if (selectedEvent.isBackendEvent) {
        await axios.patch(`${API}/${eventId}/date`, {
          eventDate: toEventDateTime(newEventDate),
        });
        await loadBackendEvents();
      } else if (selectedEvent.calendarType === "task" && updateTask) {
        const t = tasks.find((item) => String(item.id) === String(eventId));
        if (t) await updateTask({ ...t, dueDate: newEventDate.slice(0, 10) });
      } else if (selectedEvent.calendarType === "subtask" && updateSubtask) {
        const allSubs = tasks.flatMap((t) => (Array.isArray(t.subtasks) ? t.subtasks : []));
        const s = allSubs.find((item) => String(item.id) === String(eventId));
        if (s) await updateSubtask({ ...s, dueDate: newEventDate.slice(0, 10) });
      }
      setSelectedEvent(null);
      setToastMessage(`📅 Rescheduled successfully!`);
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to reschedule event.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status) => {
    if (!selectedEvent?.id || !selectedEvent.isBackendEvent) return;
    setSaving(true);
    try {
      await axios.patch(`${API}/${selectedEvent.rawId || selectedEvent.id}/status`, { status });
      await loadBackendEvents();
      setSelectedEvent((prev) => (prev ? { ...prev, status } : prev));
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to update status.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!window.confirm("Delete this calendar event?")) return;
    setSaving(true);
    try {
      const eventId = selectedEvent.rawId || selectedEvent.id;
      if (selectedEvent.isBackendEvent) {
        await axios.delete(`${API}/${eventId}`);
        await loadBackendEvents();
      } else {
        throw new Error("This calendar item is not a saved event.");
      }
      setSelectedEvent(null);
      setToastMessage("🗑️ Event removed.");
    } catch (err) {
      alert(err?.response?.data?.message || "Unable to delete event.");
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await axios.post(API, {
        title: form.title,
        description: form.description || null,
        eventDate: form.eventDate,
        type: form.type,
        priority: form.priority,
        projectId: form.projectId ? Number(form.projectId) : null,
        taskId: form.taskId ? Number(form.taskId) : null,
        subtaskId: form.subtaskId ? Number(form.subtaskId) : null,
        sprintId: form.sprintId ? Number(form.sprintId) : null,
        assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
      });
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        eventDate: "",
        type: "DEADLINE",
        priority: "MEDIUM",
        projectId: "",
        taskId: "",
        sprintId: "",
        subtaskId: "",
        assignedTo: "",
      });
      await loadBackendEvents();
      setToastMessage("✅ Calendar event created successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save the calendar event."
      );
    } finally {
      setSaving(false);
    }
  };

  const getEventBadgeStyle = (event) => {
    if (event.isOverdue) {
      return "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";
    }
    if (event.calendarType === "subtask") {
      return "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300";
    }
    if (event.calendarType === "meeting" || event.isMeeting) {
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
    }
    if (event.type === "release" || event.type === "milestone") {
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    }
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
  };

  const projectTasks = useMemo(() => {
    if (!form.projectId) return tasks;
    return tasks.filter((task) => String(task.projectId) === String(form.projectId));
  }, [tasks, form.projectId]);

  const selectedTask = useMemo(
    () => tasks.find((task) => String(task.id) === String(form.taskId)),
    [tasks, form.taskId]
  );

  const projectSubtasks = useMemo(() => {
    if (!selectedTask || !Array.isArray(selectedTask.subtasks)) return [];
    return selectedTask.subtasks;
  }, [selectedTask]);

  return (
    <div className="min-h-full bg-transparent space-y-5 p-4 text-[#172033] dark:text-slate-100 sm:p-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl border border-blue-200 bg-white dark:bg-[#172033] dark:border-blue-900/60 px-4 py-3 text-sm font-medium text-slate-800 dark:text-white shadow-xl animate-fade-in">
          <PiCheckCircle size={18} className="text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <PiX size={15} />
          </button>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <PiCalendar size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                SDLC Master Schedule
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Deliverable deadlines, subtask sprints, team standups & workload heatmap
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher, Create Event & Export Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Mode Switcher */}
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:border-slate-800 dark:bg-[#172033]">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <PiCalendarBlank size={14} />
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "week"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <PiListBullets size={14} />
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "agenda"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <PiFlag size={14} />
              Agenda
            </button>
          </div>

          {/* Create Event Button */}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
          >
            <PiPlus size={15} />
            Create Event
          </button>

          {/* Export .ics Button */}
          <button
            type="button"
            onClick={handleExportICS}
            title="Export calendar to iCal / Google Calendar"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#172033] dark:text-slate-200 dark:hover:border-slate-700"
          >
            <PiDownloadSimple size={15} />
            Export (.ics)
          </button>
        </div>
      </div>

      {/* Filter Toolbar & Color-Coded Legends */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#172033]">
        <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <PiFunnel size={14} />
              <span>Filters:</span>
            </div>

            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-200"
            >
              <option value="ALL">All Projects ({visibleProjects.length})</option>
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.title}
                </option>
              ))}
            </select>

            {/* Team Filter */}
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-200"
            >
              <option value="ALL">All Teams ({teams.length})</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Assignee / User Filter */}
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-200"
            >
              <option value="ALL">All Assignees ({users.length})</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.name}
                </option>
              ))}
            </select>

            {/* Overdue Only Toggle */}
            <button
              type="button"
              onClick={() => setShowOverdueOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                showOverdueOnly
                  ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-400"
              }`}
            >
              <PiWarningCircle size={14} className={showOverdueOnly ? "text-rose-600" : ""} />
              Overdue Only
            </button>
          </div>

          {/* Color-Coded Category Legends */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Parent Tasks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              Subtasks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Meetings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Milestones
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Overdue
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadBackendEvents}
            className="shrink-0 font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Calendar Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#172033]">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-[#172033]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigatePeriod(-1)}
              aria-label="Previous period"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            >
              <PiCaretLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigatePeriod(1)}
              aria-label="Next period"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            >
              <PiCaretRight size={18} />
            </button>

            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Today
            </button>
          </div>

          <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            {periodTitle}
          </h2>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {filteredEvents.length} scheduled deliverable(s)
          </div>
        </div>

        {/* VIEW MODE A: MONTH GRID */}
        {viewMode === "month" && (
          <div>
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              {DAYS.map((day) => (
                <div key={day} className="py-3">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800">
              {calendarDays.map((day, idx) => {
                const dayISO = toISO(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = dayISO === todayISO;
                const dayEvents = getDayEvents(day);
                const collisions = workloadCollisionsByDate[dayISO];
                const isDropTarget = dragOverDay === dayISO;

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDay(dayISO);
                    }}
                    onDragLeave={() => {
                      if (dragOverDay === dayISO) setDragOverDay(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(dayISO);
                    }}
                    className={`min-h-[120px] p-2 transition-colors ${
                      isCurrentMonth
                        ? "bg-white dark:bg-[#172033]"
                        : "bg-slate-50/60 text-slate-400 dark:bg-slate-900/20 dark:text-slate-600"
                    } ${isDropTarget ? "ring-2 ring-blue-500 ring-inset bg-blue-50/40 dark:bg-blue-950/20" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-blue-600 text-white font-bold"
                            : isCurrentMonth
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-400 dark:text-slate-600"
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      {/* Workload Collision Indicator */}
                      {collisions && collisions.length > 0 && (
                        <span
                          title={`Workload Crunch: ${collisions
                            .map((c) => `${c.userName} has ${c.count} items`)
                            .join(", ")}`}
                          className="flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        >
                          <PiWarningCircle size={10} />
                          {collisions.reduce((acc, c) => acc + c.count, 0)} due
                        </span>
                      )}
                    </div>

                    {/* Day Deliverables Stack */}
                    <div className="space-y-1 overflow-y-auto max-h-[90px]">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          draggable={event.editable !== false}
                          onDragStart={() => setDraggedItem(event)}
                          onClick={() => handleEventClick(event)}
                          className={`cursor-pointer truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition hover:brightness-95 ${getEventBadgeStyle(
                            event
                          )}`}
                          title={`${event.title} (${event.priority || "Normal"}) - Click to view or drag to reschedule`}
                        >
                          {event.title}
                        </div>
                      ))}

                      {dayEvents.length > 3 && (
                        <div
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode("agenda");
                          }}
                          className="cursor-pointer text-[10px] font-semibold text-blue-600 hover:underline dark:text-blue-400 pl-1"
                        >
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW MODE B: WEEK TIME/DELIVERABLE STACK */}
        {viewMode === "week" && (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              {currentWeekDays.map((day) => {
                const dayISO = toISO(day);
                const isToday = dayISO === todayISO;
                return (
                  <div key={dayISO} className="py-3 px-2">
                    <span className="block">{DAYS[day.getDay()]}</span>
                    <span
                      className={`inline-block mt-1 h-6 w-6 rounded-full text-xs font-bold leading-6 ${
                        isToday ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-slate-200 dark:divide-slate-800 min-h-[380px]">
              {currentWeekDays.map((day) => {
                const dayISO = toISO(day);
                const dayEvents = getDayEvents(day);
                const collisions = workloadCollisionsByDate[dayISO];
                const isDropTarget = dragOverDay === dayISO;

                return (
                  <div
                    key={dayISO}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDay(dayISO);
                    }}
                    onDragLeave={() => {
                      if (dragOverDay === dayISO) setDragOverDay(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(dayISO);
                    }}
                    className={`p-2.5 space-y-2 transition-colors ${
                      isDropTarget ? "bg-blue-50/40 ring-2 ring-blue-500 ring-inset dark:bg-blue-950/20" : ""
                    }`}
                  >
                    {collisions && collisions.length > 0 && (
                      <div className="mb-2 rounded-lg bg-amber-50 border border-amber-200 p-1.5 text-[10px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                        ⚠️ Crunch: {collisions.map((c) => `${c.userName} (${c.count})`).join(", ")}
                      </div>
                    )}

                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        draggable={event.editable !== false}
                        onDragStart={() => setDraggedItem(event)}
                        onClick={() => handleEventClick(event)}
                        className={`cursor-pointer rounded-xl border p-2 text-xs font-medium shadow-2xs transition hover:brightness-95 ${getEventBadgeStyle(
                          event
                        )}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                            {event.calendarType}
                          </span>
                          {event.isOverdue && (
                            <span className="text-[10px] font-bold text-rose-600">OVERDUE</span>
                          )}
                        </div>
                        <p className="font-semibold leading-tight line-clamp-2">{event.title}</p>
                        {event.priority && (
                          <div className="mt-1 text-[10px] opacity-75">Priority: {event.priority}</div>
                        )}
                      </div>
                    ))}

                    {dayEvents.length === 0 && (
                      <div className="h-full flex items-center justify-center text-[11px] text-slate-400">
                        No events
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW MODE C: AGENDA TIMELINE */}
        {viewMode === "agenda" && (
          <div className="p-5 space-y-6">
            {agendaEventsGrouped.map(({ date, items }) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {formatDisplayDate(date)}
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`cursor-pointer rounded-xl border p-3 text-xs transition hover:brightness-95 ${getEventBadgeStyle(
                        event
                      )}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                          {event.calendarType}
                        </span>
                        <span className="text-[10px] opacity-75">Priority: {event.priority || "Medium"}</span>
                      </div>
                      <p className="text-sm font-semibold">{event.title}</p>
                      {event.status && (
                        <div className="mt-2 text-[11px] opacity-80">Status: {event.status}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {agendaEventsGrouped.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">
                No deliverables found matching the selected filters.
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitCreate}
            className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create Calendar Event</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <PiX size={20} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                required
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
              <select
                value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, taskId: "", sprintId: "", subtaskId: "", assignedTo: "" }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Personal Event</option>
                {visibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || `Project ${p.id}`}
                  </option>
                ))}
              </select>
              <select
                value={form.taskId}
                onChange={(e) => setForm((f) => ({ ...f, taskId: e.target.value, subtaskId: "" }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Related Task (optional)</option>
                {projectTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title || t.name}
                  </option>
                ))}
              </select>
              <select
                value={form.sprintId}
                onChange={(e) => setForm((f) => ({ ...f, sprintId: e.target.value }))}
                disabled={!form.projectId}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Related Sprint (optional)</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || `Sprint ${s.id}`}
                  </option>
                ))}
              </select>
              <select
                value={form.subtaskId}
                onChange={(e) => setForm((f) => ({ ...f, subtaskId: e.target.value }))}
                disabled={!form.taskId}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Related Subtask (optional)</option>
                {projectSubtasks.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.title || st.name}
                  </option>
                ))}
              </select>
              <select
                value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Assignee (optional)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EVENT DETAILS / RESCHEDULE MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {selectedEvent.calendarTitle || selectedEvent.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedEvent.isBackendEvent
                    ? "Calendar Event"
                    : selectedEvent.calendarType === "task"
                    ? "Parent Task"
                    : selectedEvent.calendarType === "subtask"
                    ? "Subtask"
                    : "Meeting"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <PiX size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
                  <p className="mt-1 text-sm font-semibold">{formatDisplayDate(selectedEvent.dueDate || selectedEvent.eventDate)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Type</p>
                  <p className="mt-1 text-sm font-semibold">{titleForType(selectedEvent.type)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Priority</p>
                  <p className="mt-1 text-sm font-semibold">{selectedEvent.priority || "Normal"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-semibold">
                    {selectedEvent.isOverdue ? "Overdue" : titleForType(selectedEvent.status || "Pending")}
                  </p>
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.taskId != null && selectedEvent.projectId != null && (
                <Link
                  to={`/projects/${selectedEvent.projectId}/tasks/${selectedEvent.taskId}`}
                  className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700"
                >
                  Open Task Details
                </Link>
              )}

              {selectedEvent.editable !== false && (
                <>
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <label className="text-xs uppercase tracking-wide text-slate-500">Reschedule Date</label>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="date"
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                      <button
                        disabled={saving}
                        type="button"
                        onClick={handleReschedule}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.isBackendEvent && (
                      <select
                        value={selectedEvent.status || "PENDING"}
                        onChange={(e) => handleStatus(e.target.value)}
                        disabled={saving}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      >
                        {STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                    >
                      <PiTrash size={16} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalCalendar;
