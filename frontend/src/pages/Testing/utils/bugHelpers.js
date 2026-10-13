import { normalizeRole, ROLES } from "../../../constants/roles.js";

const roleOf = (user) => {
  const raw =
    user?.role ?? user?.roleName ?? user?.userRole ?? user?.roles?.[0];
  const value =
    raw && typeof raw === "object" ? raw.name ?? raw.roleName ?? "" : raw ?? "";
  return String(value).toLowerCase();
};

export const isDeveloper = (user) =>
  normalizeRole(roleOf(user)) === ROLES.DEVELOPER;

export const mergeActivity = (bug, activity = []) => {
  const server = [bug?.activity, bug?.history, bug?.activities].find(
    Array.isArray
  );

  const mapped = (server || [])
    .map((event, index) => ({
      id: event.id ?? `srv-${index}`,
      at: event.createdAt ?? event.at ?? event.timestamp,
      type: event.type ?? "status",
      actor: event.actor ?? event.user ?? event.performedBy ?? "System",
      text: event.text ?? event.message ?? event.description ?? "",
    }))
    .filter((event) => event.at && event.text);

  const events = [...mapped, ...activity];
  const uniqueEvents = [...new Map(
    events.map((event, index) => [
      String(event.id ?? `${event.type}-${event.at}-${event.actor}-${index}`)
        .replace(/^srv-/, ""),
      event,
    ])
  ).values()];

  return uniqueEvents.sort(
    (a, b) => new Date(b.at) - new Date(a.at)
  );
};

export const mergeComments = (bug, comments = []) => {
  const server = Array.isArray(bug?.comments) ? bug.comments : [];

  const mapped = server
    .map((comment, index) => ({
      id: comment.id ?? `srv-${index}`,
      at: comment.createdAt ?? comment.at,
      author:
        comment.author ??
        comment.user?.fullName ??
        comment.userName ??
        "Unknown",
      text: comment.text ?? comment.content ?? comment.message ?? "",
    }))
    .filter((comment) => comment.at && comment.text);

  const uniqueComments = [...new Map(
    [...mapped, ...comments].map((comment, index) => [
      String(comment.id ?? `${comment.at}-${comment.author}-${index}`)
        .replace(/^srv-/, ""),
      comment,
    ])
  ).values()];

  return uniqueComments.sort(
    (a, b) => new Date(a.at) - new Date(b.at)
  );
};

export const getInitials = (name = "") =>
  String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

// No red here: red is reserved for danger.
const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-teal-500",
  "bg-fuchsia-500",
  "bg-amber-500",
];

export const avatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  }
  return avatarColors[hash % avatarColors.length];
};

export const formatStamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return date.toDateString() === new Date().toDateString()
    ? time
    : `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
};