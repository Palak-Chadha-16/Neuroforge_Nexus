import { useEffect, useMemo, useRef, useState } from "react";
import {
  PiPaperPlaneRight,
  PiRobot,
  PiX,
  PiTrash,
  PiCheckCircle,
  PiSparkle,
} from "react-icons/pi";
import { useAuth } from "../../context/AuthContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";
import { useTeams } from "../../context/TeamsContextStore.js";
import { useProjectTeam } from "../../context/ProjectTeamContextStore.js";
import axios, { getApiBase } from "../../services/api.js";

const CHATBOT_EVENTS_KEY = "nfn_calendar_events_";
const API_BASE = getApiBase();
const CHAT_ENDPOINT = `${API_BASE}/chat`;

const lower = (value) => String(value ?? "").toLowerCase();
const isCalendarIntent = (value) =>
  /\b(calendar|schedule|meeting|event|deadline|due dates?|task dates?|task deadlines?|overdue|today|tomorrow|next week|this week|reschedule|postpone|move|change|remind(?:er)?|saved events|my events|all events|list events)\b/i.test(value) ||
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(value) ||
  /\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(value);

const formatDisplayDate = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;

const DAYS_OF_WEEK = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTH_NAMES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const extractDate = (text) => {
  const q = text.trim();
  const today = new Date();

  if (/\btoday\b/i.test(q)) {
    return {
      iso: toISO(today.getFullYear(), today.getMonth() + 1, today.getDate()),
      matchText: "today",
    };
  }

  if (/\btomorrow\b/i.test(q)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return {
      iso: toISO(t.getFullYear(), t.getMonth() + 1, t.getDate()),
      matchText: "tomorrow",
    };
  }

  const dayMatch = q.match(
    /\b(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i
  );

  if (dayMatch) {
    const targetDayIndex = DAYS_OF_WEEK[dayMatch[1].toLowerCase()];
    if (targetDayIndex != null) {
      const currentDayIndex = today.getDay();
      let diff = targetDayIndex - currentDayIndex;
      if (diff <= 0) diff += 7;

      const t = new Date(today);
      t.setDate(t.getDate() + diff);

      return {
        iso: toISO(t.getFullYear(), t.getMonth() + 1, t.getDate()),
        matchText: dayMatch[0],
      };
    }
  }

  let m = q.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    return {
      iso: toISO(+m[1], +m[2], +m[3]),
      matchText: m[0],
    };
  }

  m = q.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return {
      iso: toISO(year, +m[2], +m[1]),
      matchText: m[0],
    };
  }

  m =
    q.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
    ) ||
    q.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
    );

  if (m) {
    const isFirstMonth = Number.isNaN(+m[1]);
    const monthKey = (isFirstMonth ? m[1] : m[2]).toLowerCase();
    const dayVal = +(isFirstMonth ? m[2] : m[1]);
    const monthVal = MONTH_NAMES[monthKey];

    if (monthVal && dayVal >= 1 && dayVal <= 31) {
      return {
        iso: toISO(today.getFullYear(), monthVal, dayVal),
        matchText: m[0],
      };
    }
  }

  return null;
};

const extractTime = (text) => {
  let m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (m) {
    const hours = m[1];
    const minutes = m[2] || "00";
    const ampm = m[3].toUpperCase();

    return {
      formatted: `${hours}:${minutes} ${ampm}`,
      matchText: m[0],
    };
  }

  m = text.match(/\bat\s+(\d{1,2}):(\d{2})\b/i);
  if (m) {
    let h = +m[1];
    const mins = m[2];
    const ampm = h >= 12 ? "PM" : "AM";

    if (h > 12) h -= 12;
    if (h === 0) h = 12;

    return {
      formatted: `${h}:${mins} ${ampm}`,
      matchText: m[0],
    };
  }

  return null;
};

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractMeetingTitle = (text, dateMatchText, timeMatchText) => {
  let rest = text;

  if (dateMatchText) {
    rest = rest.replace(new RegExp(escapeRegExp(dateMatchText), "gi"), " ");
  }

  if (timeMatchText) {
    rest = rest.replace(new RegExp(escapeRegExp(timeMatchText), "gi"), " ");
  }

  const m =
    rest.match(/\b(?:called|named|titled)\s+["']?([^"'\n,.]+)["']?/i) ||
    rest.match(/\bmeeting\s+(?:with|about|for)\s+["']?([^"'\n,.]+)["']?/i) ||
    rest.match(/\bschedule\s+["']?([^"'\n,.]+)["']?\s+(?:meeting|sync|review|demo)\b/i) ||
    rest.match(/\b(?:schedule|book|set up|create)\s+(?:a\s+)?meeting\s+["']?([^"'\n,.]+)["']?/i);

  if (m && m[1].trim().length > 1) {
    return m[1].trim();
  }

  const cleaned = rest
    .replace(
      /\b(schedule|reschedule|book|set|add|move|a|an|the|meeting|sync|call|with|on|at|for|please|to|my|calendar)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 2 ? cleaned : "Team Sync";
};

const extractLabel = (text, dateMatchText) => {
  let rest = text;

  if (dateMatchText) {
    rest = rest.replace(new RegExp(escapeRegExp(dateMatchText), "i"), " ");
  }

  const m =
    rest.match(/\bas\s+(.+)$/i) ||
    rest.match(/\b(?:called|named|titled)\s+(.+)$/i) ||
    rest.match(/\bevent[: ]+([^,.]+)/i);

  if (m) {
    return m[1].trim().replace(/[.?!]+$/, "");
  }

  const stripped = rest
    .replace(
      /\b(mark|set|save|add|remind|note|reminder|on|for|the|my|calendar|date|in|to|please)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  return stripped.length > 1 ? stripped : null;
};

const loadCalendarEvents = (userId) => {
  try {
    const raw = localStorage.getItem(CHATBOT_EVENTS_KEY + (userId ?? "guest"));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCalendarEvents = (userId, events) => {
  try {
    localStorage.setItem(
      CHATBOT_EVENTS_KEY + (userId ?? "guest"),
      JSON.stringify(events)
    );
    window.dispatchEvent(new Event("nfn-calendar-events-updated"));
    return true;
  } catch {
    return false;
  }
};

const QUICK_SUGGESTIONS = [
  "Schedule meeting tomorrow at 3 PM",
  "Reschedule meeting to Friday at 4 PM",
  "Show dates of tasks",
  "Which tasks are overdue?",
  "How many projects do I have?",
  "Give me a sprint progress summary",
  "Set overdue tasks on calendar",
];

const createMsg = (from, text) => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  from,
  text,
  time: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
});

const ChatBot = () => {
  const { currentUser } = useAuth();
  const { projects: allProjects = [], getVisibleProjects } = useProjects() || {};
  const { tasks = [] } = useTasks() || {};
  const { teams = [] } = useTeams() || {};
  const { projectTeams = {} } = useProjectTeam() || {};

  const projects = useMemo(
    () =>
      getVisibleProjects
        ? getVisibleProjects(currentUser, projectTeams, teams)
        : allProjects,
    [getVisibleProjects, currentUser, projectTeams, teams, allProjects]
  );

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [messages, setMessages] = useState(() => [
    {
      id: "bot-init",
      from: "bot",
      text: `Hello ${currentUser?.fullName || "there"}! 👋

I'm your **NeuroForge SDLC AI Assistant**. You can ask me to schedule meetings, check project deadlines, query sprint progress, or pin overdue tasks to your calendar.`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleCopy = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard access may be unavailable.
    }
  };

  const handleClear = () => {
    setMessages([
      createMsg(
        "bot",
        "Conversation cleared. How can I assist you with your projects, tasks, or calendar schedule?"
      ),
    ]);
  };

  const handleCalendarQuery = (query) => {
    const userId = currentUser?.id;
    const q = lower(query).trim();
    const today = new Date();
    const todayISO = toISO(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );
    const calendarEvents = loadCalendarEvents(userId);

    // 1. Show task dates and deadlines.
    if (
      /\b(dates of tasks|task dates|task deadlines|due dates of tasks|task due dates|deadlines of tasks|dates for tasks)\b/i.test(q) ||
      (/\b(show|list|what are|view)\b/i.test(q) &&
        /\b(dates|deadlines)\b/i.test(q) &&
        /\btask/i.test(q))
    ) {
      const allTasksWithDates = tasks.filter((t) => t.dueDate);

      if (allTasksWithDates.length === 0) {
        return "📋 No tasks currently have scheduled due dates in your active projects.";
      }

      const overdue = [];
      const dueThisWeek = [];
      const upcoming = [];
      const nextWeekDate = new Date(today);
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);

      const nextWeekISO = toISO(
        nextWeekDate.getFullYear(),
        nextWeekDate.getMonth() + 1,
        nextWeekDate.getDate()
      );

      allTasksWithDates.forEach((task) => {
        const isDone =
          (task.status || task.boardStatus || "")
            .toUpperCase()
            .replace(/\s+/g, "_") === "DONE";

        const proj = projects.find(
          (p) => String(p.id) === String(task.projectId)
        );

        const item = {
          title: task.title,
          dueDate: task.dueDate,
          project: proj?.name || proj?.title || `Project #${task.projectId || "—"}`,
          status: task.status || "To Do",
          priority: task.priority || "Medium",
        };

        if (!isDone && task.dueDate < todayISO) {
          overdue.push(item);
        } else if (!isDone && task.dueDate <= nextWeekISO) {
          dueThisWeek.push(item);
        } else {
          upcoming.push(item);
        }
      });

      const responseLines = ["📅 **Current Task Deadlines & Dates:**\n"];

      if (overdue.length > 0) {
        responseLines.push(`🔴 **Overdue Tasks (${overdue.length})**:`);
        overdue.forEach((t) =>
          responseLines.push(
            `• **${t.title}** — Due: **${formatDisplayDate(t.dueDate)}** | Priority: ${t.priority} | Project: ${t.project}`
          )
        );
        responseLines.push("");
      }

      if (dueThisWeek.length > 0) {
        responseLines.push(`🟡 **Due This Week (${dueThisWeek.length})**:`);
        dueThisWeek.forEach((t) =>
          responseLines.push(
            `• **${t.title}** — Due: **${formatDisplayDate(t.dueDate)}** | Status: ${t.status} | Project: ${t.project}`
          )
        );
        responseLines.push("");
      }

      if (upcoming.length > 0) {
        responseLines.push(`🟢 **Future Deadlines (${upcoming.length})**:`);
        upcoming.forEach((t) =>
          responseLines.push(
            `• **${t.title}** — Due: **${formatDisplayDate(t.dueDate)}** | Project: ${t.project}`
          )
        );
      }

      return responseLines.join("\n");
    }

    // 2. Pin overdue tasks to the calendar.
    if (
      (/\b(set|mark|pin|show|sync|add)\b/i.test(q) &&
        /\boverdue\b/i.test(q) &&
        /\bcalendar\b/i.test(q)) ||
      /\bcalendar overdue\b/i.test(q) ||
      /\boverdue on calendar\b/i.test(q)
    ) {
      const overdueTasks = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const status = (t.status || t.boardStatus || "")
          .toUpperCase()
          .replace(/\s+/g, "_");

        return (
          status !== "DONE" &&
          status !== "COMPLETED" &&
          t.dueDate < todayISO
        );
      });

      if (overdueTasks.length === 0) {
        return "🎉 **All tasks are on track!** There are currently no overdue tasks to pin to the calendar.";
      }

      const existingEventIds = new Set(calendarEvents.map((e) => e.id));
      const newAlertEvents = [];

      overdueTasks.forEach((task) => {
        const alertId = `overdue-alert-${task.id}`;

        if (!existingEventIds.has(alertId)) {
          newAlertEvents.push({
            id: alertId,
            title: `⚠️ OVERDUE: ${task.title}`,
            label: `⚠️ OVERDUE: ${task.title}`,
            dueDate: todayISO,
            originalDueDate: task.dueDate,
            type: "overdue_alert",
            calendarType: "chatbot",
            isOverdueAlert: true,
            isOverdue: true,
            taskId: task.id,
            priority: "Critical",
            description: `Original due date was ${task.dueDate}. Priority: ${task.priority || "High"}.`,
            createdBy: userId ?? "guest",
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (newAlertEvents.length > 0) {
        saveCalendarEvents(userId, [...calendarEvents, ...newAlertEvents]);
      }

      return (
        `⚠️ **Pinned to Calendar!**\n\nI identified **${overdueTasks.length} overdue task(s)** and pinned high-priority alert cards to your **SDLC Master Calendar** for today (${formatDisplayDate(todayISO)}) so you and your team can address them immediately.\n\n` +
        overdueTasks
          .map(
            (t) =>
              `• **${t.title}** (Original deadline was: ${formatDisplayDate(t.dueDate)})`
          )
          .join("\n")
      );
    }

    // 3. Reschedule a meeting.
    if (/\breschedule\b|\bmove meeting\b|\bchange meeting\b|\bpostpone\b/i.test(q)) {
      const dateHit = extractDate(query);
      const timeHit = extractTime(query);

      if (!dateHit && !timeHit) {
        return 'I can help reschedule your meeting! Please specify the new date and/or time (e.g. "Reschedule meeting to tomorrow at 4 PM" or "Reschedule meeting to Friday").';
      }

      const meetingEvents = calendarEvents.filter(
        (e) => e.type === "meeting" || e.isMeeting || e.calendarType === "chatbot"
      );

      if (meetingEvents.length === 0) {
        return 'You don\'t have any scheduled meetings on your calendar yet to reschedule. Would you like me to schedule a new one? (e.g. "Schedule meeting tomorrow at 3 PM")';
      }

      const candidateTitle = extractMeetingTitle(
        query,
        dateHit?.matchText,
        timeHit?.matchText
      );

      let meetingIndex = -1;

      if (candidateTitle && candidateTitle !== "Team Sync") {
        meetingIndex = calendarEvents.findIndex(
          (e) =>
            lower(e.title).includes(lower(candidateTitle)) ||
            lower(candidateTitle).includes(lower(e.title))
        );
      }

      if (meetingIndex === -1) {
        meetingIndex = calendarEvents.findIndex(
          (e) =>
            (e.type === "meeting" || e.isMeeting) &&
            e.dueDate >= todayISO
        );

        if (meetingIndex === -1) {
          meetingIndex = calendarEvents.findLastIndex
            ? calendarEvents.findLastIndex(
                (e) => e.type === "meeting" || e.isMeeting
              )
            : calendarEvents.length - 1;
        }
      }

      if (meetingIndex === -1) meetingIndex = calendarEvents.length - 1;

      const targetMeeting = calendarEvents[meetingIndex];
      if (!targetMeeting) return "I couldn't find a meeting to reschedule.";

      const oldDate = targetMeeting.dueDate;
      const oldTime = targetMeeting.time || "10:00 AM";
      const newDateISO = dateHit ? dateHit.iso : targetMeeting.dueDate;
      const newTimeStr = timeHit
        ? timeHit.formatted
        : targetMeeting.time || "10:00 AM";

      const updated = {
        ...targetMeeting,
        dueDate: newDateISO,
        time: newTimeStr,
        updatedAt: new Date().toISOString(),
      };

      const updatedList = [...calendarEvents];
      updatedList[meetingIndex] = updated;
      saveCalendarEvents(userId, updatedList);

      return (
        `🔄 **Meeting Rescheduled Successfully!**\n\n` +
        `📌 **Meeting:** ${targetMeeting.title || "Team Meeting"}\n` +
        `📅 **New Date:** ${formatDisplayDate(newDateISO)} (was ${formatDisplayDate(oldDate)})\n` +
        `🕒 **New Time:** ${newTimeStr} (was ${oldTime})\n\n` +
        `Your **SDLC Master Calendar** has been updated in real time.`
      );
    }

    // 4. Schedule a meeting.
    if (/\b(schedule|book|set up|create)\b.*\bmeeting\b/i.test(q) || /\bmeeting at\b/i.test(q)) {
      const dateHit = extractDate(query);
      const timeHit = extractTime(query);

      const targetDateISO = dateHit
        ? dateHit.iso
        : toISO(today.getFullYear(), today.getMonth() + 1, today.getDate() + 1);

      const targetTime = timeHit ? timeHit.formatted : "10:00 AM";
      const meetingTitle = extractMeetingTitle(
        query,
        dateHit?.matchText,
        timeHit?.matchText
      );

      const newMeeting = {
        id: `meeting-${crypto.randomUUID()}`,
        title: meetingTitle,
        label: meetingTitle,
        dueDate: targetDateISO,
        time: targetTime,
        type: "meeting",
        isMeeting: true,
        calendarType: "chatbot",
        priority: "High",
        createdBy: userId ?? "guest",
        createdAt: new Date().toISOString(),
      };

      saveCalendarEvents(userId, [...calendarEvents, newMeeting]);

      return (
        `✅ **Meeting Scheduled!**\n\n` +
        `📌 **Title:** ${meetingTitle}\n` +
        `📅 **Date:** ${formatDisplayDate(targetDateISO)}\n` +
        `🕒 **Time:** ${targetTime}\n\n` +
        `This meeting has been pinned to your **SDLC Master Calendar** and will notify participants.`
      );
    }

    // 5. Specific date queries and calendar reminders.
    const dateHit = extractDate(query);

    if (dateHit) {
      const isMarkIntent =
        /\b(mark|set|save|add|remind|note|reminder)\b/i.test(q);

      if (isMarkIntent) {
        const label = extractLabel(query, dateHit.matchText);

        if (!label) {
          return `Got the date (${formatDisplayDate(dateHit.iso)}), but couldn't detect the event title. Try: "Mark ${formatDisplayDate(dateHit.iso)} as Sprint Review".`;
        }

        const newEvent = {
          id: `chatbot-${crypto.randomUUID()}`,
          title: label,
          label,
          dueDate: dateHit.iso,
          priority: "Medium",
          type: "chatbot",
          calendarType: "chatbot",
          createdBy: userId ?? "guest",
          createdAt: new Date().toISOString(),
        };

        const saved = saveCalendarEvents(userId, [...calendarEvents, newEvent]);

        if (!saved) {
          return "I couldn't save that calendar event in this browser.";
        }

        return `✅ Event saved! **${formatDisplayDate(dateHit.iso)}** is now marked as **"${label}"**.`;
      }

      const dayEvents = calendarEvents.filter(
        (event) => event?.dueDate === dateHit.iso
      );
      const dueTasks = tasks.filter((task) => task?.dueDate === dateHit.iso);

      if (dayEvents.length === 0 && dueTasks.length === 0) {
        return `📅 Nothing is scheduled on **${formatDisplayDate(dateHit.iso)}**.`;
      }

      const lines = [`📅 **Schedule for ${formatDisplayDate(dateHit.iso)}:**`];

      dayEvents.forEach((event) => {
        const timeBadge = event.time ? ` [${event.time}]` : "";
        lines.push(
          `• 📌 **${event.type === "meeting" ? "Meeting" : "Calendar Event"}**: ${event.title || event.label}${timeBadge}`
        );
      });

      dueTasks.forEach((task) => {
        lines.push(
          `• 📋 **Task Deadline**: ${task.title} (${task.status || "To Do"})`
        );
      });

      return lines.join("\n");
    }

    // 6. List saved calendar events and meetings.
    if (/\b(saved events|all events|list events|my events|meetings|saved meetings)\b/i.test(q)) {
      if (calendarEvents.length === 0) {
        return "You don't have any custom calendar events or meetings saved yet.";
      }

      return (
        `📅 **Your Saved Calendar Events & Meetings (${calendarEvents.length}):**\n` +
        calendarEvents
          .map((event) => {
            const timeStr = event.time ? ` at ${event.time}` : "";
            return `• **${formatDisplayDate(event.dueDate)}${timeStr}**: ${event.title || event.label}`;
          })
          .join("\n")
      );
    }

    return null;
  };

  // Local workspace metrics fallback.
  const handleWorkspaceFallbackQuery = (query) => {
    const q = lower(query).trim();
    const todayStr = new Date().toISOString().slice(0, 10);
    const userId = String(currentUser?.id ?? "");

    if (/\b(how many projects|number of projects|count of projects|project count)\b/i.test(q)) {
      if (!projects.length) {
        return "📁 You currently do not have access to any active projects.";
      }

      return (
        `📊 **You have ${projects.length} accessible project(s):**\n\n` +
        projects
          .map(
            (p) =>
              `• **${p.name || p.title || `Project #${p.id}`}** — Status: \`${p.status || "In Progress"}\` | Priority: \`${p.priority || "Medium"}\``
          )
          .join("\n")
      );
    }

    if (/\b(projects in progress|in progress projects|active projects|ongoing projects)\b/i.test(q)) {
      const inProgress = projects.filter(
        (p) => (p.status || "").toLowerCase().replace(/[\s_]+/g, "") === "inprogress"
      );

      if (inProgress.length === 0) {
        return "📁 No projects are currently marked as 'In Progress'.";
      }

      return (
        `🚀 **Projects Currently In Progress (${inProgress.length}):**\n\n` +
        inProgress
          .map(
            (p) =>
              `• **${p.name || p.title}** (Priority: ${p.priority || "Medium"}, Target End: ${p.endDate || "No deadline"})`
          )
          .join("\n")
      );
    }

    if (/\b(high priority projects|critical projects|important projects)\b/i.test(q)) {
      const highPri = projects.filter((p) => {
        const pri = (p.priority || "").toLowerCase();
        return pri === "high" || pri === "critical";
      });

      if (highPri.length === 0) {
        return "✅ There are no High or Critical priority projects currently.";
      }

      return (
        `🔥 **High / Critical Priority Projects (${highPri.length}):**\n\n` +
        highPri
          .map(
            (p) =>
              `• **${p.name || p.title}** [${p.priority}] — Status: ${p.status || "Active"}`
          )
          .join("\n")
      );
    }

    if (/\b(project deadlines|upcoming project deadlines|when do projects end)\b/i.test(q)) {
      const withEnd = projects.filter((p) => p.endDate);

      if (withEnd.length === 0) {
        return "📅 None of your active projects have set end dates.";
      }

      return (
        `📅 **Project Delivery Deadlines:**\n\n` +
        withEnd
          .map(
            (p) =>
              `• **${p.name || p.title}**: Target End Date: **${formatDisplayDate(p.endDate)}**`
          )
          .join("\n")
      );
    }

    if (/\b(assigned to me|my tasks|what are my tasks|tasks for me)\b/i.test(q)) {
      const myTasks = tasks.filter(
        (t) => String(t.assigneeId ?? t.assignee?.id) === userId
      );

      if (myTasks.length === 0) {
        return `🙌 You currently have no tasks assigned directly to your account (${currentUser?.fullName || "User"}).`;
      }

      return (
        `👤 **Tasks Assigned to You (${myTasks.length}):**\n\n` +
        myTasks
          .map((t) => {
            const isDone =
              (t.status || t.boardStatus || "").toLowerCase() === "done";
            const isOverdue = !isDone && t.dueDate && t.dueDate < todayStr;
            const overdueTag = isOverdue ? " 🔴 **[OVERDUE]**" : "";

            return `• **${t.title}**${overdueTag} — Status: \`${t.status || "To Do"}\` | Due: ${t.dueDate ? formatDisplayDate(t.dueDate) : "None"}`;
          })
          .join("\n")
      );
    }

    if (/\b(all open parent tasks|open tasks|open parent tasks|all tasks)\b/i.test(q)) {
      const openTasks = tasks.filter(
        (t) => (t.status || t.boardStatus || "").toLowerCase() !== "done"
      );

      if (!openTasks.length) {
        return "🎉 There are no open parent tasks at this moment. Everything is caught up!";
      }

      return (
        `📋 **Open Parent Tasks (${openTasks.length}):**\n\n` +
        openTasks
          .slice(0, 10)
          .map(
            (t) =>
              `• **${t.title}** — Status: \`${t.status || "To Do"}\` | Priority: \`${t.priority || "Medium"}\``
          )
          .join("\n") +
        (openTasks.length > 10
          ? `\n\n*...and ${openTasks.length - 10} more in your project workspace.*`
          : "")
      );
    }

    if (/\b(which tasks are overdue|overdue tasks|overdue)\b/i.test(q)) {
      const overdue = tasks.filter((t) => {
        const isDone =
          (t.status || t.boardStatus || "").toLowerCase() === "done";
        return !isDone && t.dueDate && t.dueDate < todayStr;
      });

      if (overdue.length === 0) {
        return "🎉 **Great job!** None of your tasks are currently overdue.";
      }

      return (
        `⚠️ **Overdue Tasks Requiring Attention (${overdue.length}):**\n\n` +
        overdue
          .map(
            (t) =>
              `• **${t.title}** — Due Date was: **${formatDisplayDate(t.dueDate)}** (Priority: ${t.priority || "High"})`
          )
          .join("\n") +
        `\n\n💡 *Tip: You can say "Set overdue tasks on calendar" to pin these to your calendar view.*`
      );
    }

    if (/\b(sprint|sprint progress|sprint summary)\b/i.test(q)) {
      const total = tasks.length;
      const completed = tasks.filter(
        (t) => (t.status || t.boardStatus || "").toLowerCase() === "done"
      ).length;
      const inProgress = tasks.filter(
        (t) => (t.status || t.boardStatus || "").toLowerCase() === "in progress"
      ).length;
      const todo = total - completed - inProgress;
      const percentage =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return (
        `📈 **Sprint Delivery Summary:**\n\n` +
        `• **Total Tasks Tracked:** ${total}\n` +
        `• **Completed (Done):** ${completed} (${percentage}%)\n` +
        `• **In Progress:** ${inProgress}\n` +
        `• **Remaining (To Do):** ${todo}\n\n` +
        `⚡ **Velocity Status:** ${percentage >= 70 ? "On Track 🟢" : percentage >= 40 ? "Steady 🟡" : "Needs Acceleration 🔴"}`
      );
    }

    if (/\b(hello|hi|hey|greetings|help)\b/i.test(q)) {
      return (
        `Hello ${currentUser?.fullName || "there"}! 👋\n\n` +
        `I'm your **NeuroForge SDLC Assistant**. Here are things you can ask me right now:\n` +
        `• **Meeting Scheduling & Rescheduling**: e.g., *"Schedule meeting tomorrow at 3 PM"*, *"Reschedule meeting to Friday at 4 PM"*\n` +
        `• **Task Deadlines & Overdue**: e.g., *"Show dates of tasks"*, *"Which tasks are overdue?"*\n` +
        `• **Project & Sprint Summaries**: e.g., *"How many projects do I have?"*, *"Give me a sprint progress summary"*\n` +
        `• **Calendar Alerts**: e.g., *"Set overdue tasks on calendar"*`
      );
    }

    return null;
  };

  const send = async (text) => {
    const question = text.trim();
    if (!question || sending) return;

    const userMessage = createMsg("user", question);
    const previousMessages = messages;

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      // Calendar questions and mutations must use the persisted backend API.
      const calendarReply = isCalendarIntent(question)
        ? null
        : handleCalendarQuery(question);

      if (calendarReply) {
        setMessages((prev) => [...prev, createMsg("bot", calendarReply)]);
        return;
      }

      // 2. Call backend chat endpoint.
      const history = previousMessages
        .filter((m) => m.id !== "bot-init")
        .slice(-8)
        .map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const { data } = await axios.post(CHAT_ENDPOINT, {
        message: question,
        history,
      });

      if (isCalendarIntent(question)) {
        window.dispatchEvent(new Event("nfn-calendar-events-updated"));
      }

      const reply = data?.reply;
      if (!reply) throw new Error("Empty reply received from backend.");

      const isGroqUnavailable =
        reply.includes("Groq API configuration") ||
        reply.includes("AI Assistant is currently unavailable");

      if (isGroqUnavailable) {
        const fallbackAnswer = isCalendarIntent(question)
          ? null
          : handleWorkspaceFallbackQuery(question);

        if (fallbackAnswer) {
          setMessages((prev) => [
            ...prev,
            createMsg(
              "bot",
              `${fallbackAnswer}\n\n---\n*💡 Note: Answered via Local Workspace Intelligence because Groq API Key is not configured in \`application.properties\`. *`
            ),
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          createMsg(
            "bot",
            `⚠️ **Groq API Key Not Configured in Backend**\n\n` +
              `The backend connects to Groq Cloud LLM, but no valid API key was found in \`application.properties\` (default is \`mock-key\`).\n\n` +
              `**How to fix in 1 minute:**\n` +
              `1. Get a free API key at https://console.groq.com/keys\n` +
              `2. Open \`backend/src/main/resources/application.properties\`.\n` +
              `3. Set: \`neuroforge.chat.api-key=gsk_your_groq_api_key_here\`\n` +
              `4. Restart your Spring Boot backend (\`mvnw.cmd spring-boot:run\`).\n\n` +
              `💡 *Calendar requests require the backend so changes are saved consistently.*`
          ),
        ]);
        return;
      }

      setMessages((prev) => [...prev, createMsg("bot", reply)]);
    } catch (error) {
      console.error("Chatbot request failed:", error);
      const fallbackAnswer = isCalendarIntent(question)
        ? null
        : handleWorkspaceFallbackQuery(question);

      if (fallbackAnswer) {
        setMessages((prev) => [
          ...prev,
          createMsg(
            "bot",
            `${fallbackAnswer}\n\n---\n*💡 Note: Answered via Local Workspace Intelligence while the AI backend is offline.*`
          ),
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          createMsg(
            "bot",
            `⚠️ **AI Backend Service Offline**\n\n` +
              `The AI backend could not be reached. Make sure your Spring Boot backend is running on port 8080.\n\n` +
              `*Calendar scheduling, meeting booking, and task deadline commands require the backend to be available.*`
          ),
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send(input);
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Backdrop overlay: darkens the page but does NOT blur it. */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Slide-in right chatbot drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full sm:w-[420px] md:w-[460px] max-w-full flex-col bg-white dark:bg-[#0f172a] shadow-2xl border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="AI Assistant Drawer"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] px-4 py-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/25">
              <PiRobot size={20} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
                  NeuroForge Assistant
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                SDLC & Calendar Copilot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClear}
              title="Clear chat"
              className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <PiTrash size={18} />
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant drawer"
              title="Close drawer (Esc)"
              className="rounded-lg p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <PiX size={20} />
            </button>
          </div>
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 space-y-3.5 overflow-y-auto bg-slate-50 dark:bg-[#090d16] p-4 transition-colors">
          {messages.map((message, index) => {
            const isUser = message.from === "user";

            return (
              <div
                key={message.id || index}
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`group relative max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs transition-colors ${
                    isUser
                      ? "rounded-br-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      : "rounded-bl-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#172033] text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {message.text}

                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopy(message.text, index)}
                      title="Copy response"
                      className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400 shadow-xs hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                    >
                      {copiedIndex === index ? (
                        <>
                          <PiCheckCircle
                            size={11}
                            className="text-emerald-500"
                          />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <PiCheckCircle size={11} className="hidden" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <span className="mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500">
                  {message.time}
                </span>
              </div>
            );
          })}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <PiRobot size={14} />
              </div>

              <div className="flex items-center gap-1 rounded-xl rounded-bl-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#172033] px-3 py-2 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}

          {/* Prompt suggestion pills */}
          {messages.length <= 2 && (
            <div className="pt-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <PiSparkle size={13} className="text-amber-500" />
                Suggested Actions
              </p>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => send(sug)}
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172033] px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs transition hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Drawer footer input bar */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about projects, schedule meetings, deadlines..."
              disabled={sending}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#172033] px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PiPaperPlaneRight size={17} />
            </button>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400 dark:text-slate-500">
            <span>Press Enter to send</span>
            <span>Esc to close</span>
          </div>
        </form>
      </div>

      {/* Floating chatbot button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close AI drawer" : "Open AI assistant drawer"}
        title="Open AI Assistant"
        className={`fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-blue-600/40 ring-4 ring-white/20 dark:ring-slate-900/40 transition-all duration-300 hover:scale-110 active:scale-95 ${
          open
            ? "scale-0 opacity-0 pointer-events-none"
            : "scale-100 opacity-100"
        }`}
      >
        <div className="relative flex items-center justify-center">
          <PiRobot size={26} />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-[#0f172a] bg-emerald-400" />
        </div>
      </button>
    </>
  );
};

export default ChatBot;