import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  PiList,
  PiMagnifyingGlass,
  PiBell,
  PiCaretDown,
  PiCaretRight,
  PiSignOut,
  PiTrash,
  PiShieldCheck,
  PiBriefcase,
  PiCompass,
  PiUsersThree,
  PiCode,
  PiBug,
  PiCheckCircle,
  PiFolder,
  PiCalendarBlank,
  PiCheckSquare,
  PiUsers,
  PiGauge,
  PiX,
  PiCommand,
  PiCircleDashed,
  PiSun,
  PiMoon,
  PiGear,
} from "react-icons/pi";
import { useAuth } from "../../context/AuthContextStore.js";
import { useTheme } from "../../context/ThemeContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";
import { ROLES, formatRole, normalizeRole } from "../../constants/roles.js";

const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    label: "Admin",
    badge: "border-purple-200 bg-purple-50 text-purple-700",
    dot: "bg-purple-500",
    icon: PiShieldCheck,
  },
  [ROLES.PROJECT_MANAGER]: {
    label: "Project Manager",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    icon: PiBriefcase,
  },
  [ROLES.PROJECT_LEAD]: {
    label: "Project Lead",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
    dot: "bg-cyan-500",
    icon: PiCompass,
  },
  [ROLES.TEAM_LEAD]: {
    label: "Team Lead",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    icon: PiUsersThree,
  },
  [ROLES.DEVELOPER]: {
    label: "Developer",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    icon: PiCode,
  },
  [ROLES.TESTER]: {
    label: "Tester",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    icon: PiBug,
  },
  [ROLES.QA]: {
    label: "QA Engineer",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
    icon: PiCheckCircle,
  },
  [ROLES.UNASSIGNED]: {
    label: "Unassigned",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
    icon: PiCircleDashed,
  },
};

const getInitials = (name) => {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return parts[0].slice(0, 2).toUpperCase();
};

const Navbar = ({
  sidebarOpen,
  toggleSidebar,
  onRequestDeleteAccount,
}) => {
  const { currentUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { projects = [] } = useProjects();
  const { tasks = [] } = useTasks();
  const location = useLocation();
  const navigate = useNavigate();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "Workspace Synchronized",
      description:
        "All active project and task data are in sync with MySQL.",
      time: "Just now",
      read: false,
      type: "system",
    },
    {
      id: "2",
      title: "Sprint Delivery Tracker",
      description:
        "Automated calculation of completion & blocked status is active.",
      time: "10m ago",
      read: false,
      type: "project",
    },
    {
      id: "3",
      title: "SDLC Security Guard Active",
      description:
        "RBAC and scope protections verified for current session.",
      time: "1h ago",
      read: true,
      type: "security",
    },
  ]);

  const accountRef = useRef(null);
  const notifRef = useRef(null);
  const searchModalRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }

      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }

      if (e.key === "Escape") {
        setSearchOpen(false);
        setAccountMenuOpen(false);
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [searchOpen]);

  const role = normalizeRole(currentUser?.role);
  const roleConfig =
    ROLE_CONFIG[role] || ROLE_CONFIG[ROLES.UNASSIGNED];

  const RoleIcon = roleConfig.icon;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const breadcrumb = useMemo(() => {
    const path = location.pathname;

    if (path.startsWith("/dashboard")) {
      return {
        title: "Dashboard",
        category: "Workspace",
      };
    }

    if (path === "/projects") {
      return {
        title: "Project Directory",
        category: "Management",
      };
    }

    if (path.startsWith("/projects/")) {
      const id = path.split("/")[2];
      const proj = projects.find(
        (p) => String(p.id) === String(id)
      );

      return {
        title: proj?.name || `Project #${id}`,
        category: "Project Workspace",
      };
    }

    if (path.startsWith("/my-tasks")) {
      return {
        title: "My Work Queue",
        category: "Workbench",
      };
    }

    if (path.startsWith("/user-management")) {
      return {
        title: "User Directory",
        category: "Administration",
      };
    }

    if (path.startsWith("/calendar")) {
      return {
        title: "Calendar Overview",
        category: "Planning",
      };
    }

    return {
      title: "Overview",
      category: "Workspace",
    };
  }, [location.pathname, projects]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase().trim();

    const matchedProjects = projects
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((p) => ({
        type: "project",
        id: p.id,
        title: p.name,
        subtitle: `Project Code: ${p.code || "—"} • ${
          p.status || "In Progress"
        }`,
        link: `/projects/${p.id}`,
        icon: PiFolder,
      }));

    const matchedTasks = tasks
      .filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.taskKey?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((t) => ({
        type: "task",
        id: t.id,
        title: t.title,
        subtitle: `${
          t.taskKey || `Task #${t.id}`
        } • Priority: ${t.priority || "Medium"} • ${
          t.status || "To Do"
        }`,
        link: t.projectId
          ? `/projects/${t.projectId}`
          : "/projects",
        icon: PiCheckSquare,
      }));

    const navPages = [
      {
        title: "Dashboard",
        link: "/dashboard",
        icon: PiGauge,
        desc: "Personal overview & metrics",
      },
      {
        title: "Projects",
        link: "/projects",
        icon: PiFolder,
        desc: "All workspace projects",
      },
      ...(role !== ROLES.ADMIN
        ? [
            {
              title: "My Work",
              link: "/my-tasks",
              icon: PiCheckSquare,
              desc: "Assigned tasks & subtasks",
            },
          ]
        : []),
      ...(role !== ROLES.ADMIN
        ? [
            {
              title: "Calendar",
              link: "/calendar",
              icon: PiCalendarBlank,
              desc: "Schedule & deadlines",
            },
          ]
        : []),
      ...(role === ROLES.ADMIN
        ? [
            {
              title: "Users",
              link: "/user-management",
              icon: PiUsers,
              desc: "Manage members & permissions",
            },
          ]
        : []),
    ]
      .filter(
        (page) =>
          page.title.toLowerCase().includes(q) ||
          page.desc.toLowerCase().includes(q)
      )
      .map((page) => ({
        type: "page",
        id: page.link,
        title: page.title,
        subtitle: page.desc,
        link: page.link,
        icon: page.icon,
      }));

    return [...navPages, ...matchedProjects, ...matchedTasks];
  }, [searchQuery, projects, tasks, role]);

  const handleSelectResult = (link) => {
    setSearchOpen(false);
    navigate(link);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#172033]/95 backdrop-blur-md shadow-xs dark:shadow-lg dark:shadow-slate-900/15 transition-colors duration-200">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />

        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 md:gap-5">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={
                sidebarOpen
                  ? "Hide navigation"
                  : "Show navigation"
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-[#24324a] text-slate-700 dark:text-slate-300 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-[#2d3c56] hover:text-slate-900 dark:hover:text-white active:scale-95"
              title={
                sidebarOpen
                  ? "Collapse sidebar"
                  : "Expand sidebar"
              }
            >
              <PiList size={20} />
            </button>

            <Link
              to="/dashboard"
              className="group flex items-center gap-2.5 transition-all duration-200 hover:opacity-95"
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white font-black text-base shadow-md shadow-blue-500/25 transition-transform duration-200 group-hover:scale-105">
                <span>N</span>

                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </div>

              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-300">
                    NeuroForge
                  </span>

                  <span className="rounded-md border border-blue-400/30 bg-blue-400/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                    Nexus
                  </span>
                </div>

                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  SDLC Suite
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {breadcrumb.category}
              </span>

              <PiCaretRight
                size={12}
                className="text-slate-400 dark:text-slate-500"
              />

              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                {breadcrumb.title}
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-[#24324a] px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400 shadow-inner transition-all duration-200 hover:border-blue-400/50 hover:bg-slate-200 dark:hover:bg-[#2d3c56] hover:text-slate-800 dark:hover:text-slate-200"
            >
              <div className="flex items-center gap-2.5 truncate">
                <PiMagnifyingGlass
                  size={16}
                  className="text-slate-400 transition-colors group-hover:text-blue-500"
                />

                <span className="truncate">
                  Search projects, tasks, or pages...
                </span>
              </div>

              <div className="flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#172033] px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <PiCommand size={10} />
                <span>K</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-[#24324a] text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-[#2d3c56] hover:text-slate-900 dark:hover:text-white"
              title="Search"
            >
              <PiMagnifyingGlass size={17} />
            </button>

            <div
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide shadow-xs ${roleConfig.badge}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${roleConfig.dot} animate-pulse`}
              />

              <RoleIcon size={14} className="opacity-90" />

              <span>{formatRole(role)}</span>
            </div>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setAccountMenuOpen(false);
                }}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
                  notificationsOpen
                    ? "border-blue-400/50 bg-blue-500/15 text-blue-600 dark:text-blue-300"
                    : "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-[#24324a] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-[#2d3c56] hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <PiBell size={18} />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white shadow-md shadow-blue-500/50">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#172033] p-4 shadow-2xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        Notifications
                      </span>

                      {unreadCount > 0 && (
                        <span className="rounded-full bg-blue-500/15 border border-blue-400/30 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <PiCheckCircle
                          size={28}
                          className="mx-auto mb-2 text-emerald-500/70"
                        />

                        All caught up! No notifications.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 transition-all ${
                            item.read
                              ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#24324a]/50"
                              : "border-blue-400/30 bg-blue-50 dark:bg-blue-500/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                              {item.title}
                            </h4>

                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {item.time}
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-2.5 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
                      NeuroForge Event Stream Active
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-[#24324a] text-slate-700 dark:text-slate-300 transition-all duration-200 hover:scale-105 active:scale-95 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-[#2d3c56]"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <PiSun
                  size={19}
                  className="text-amber-400 transition-transform duration-300 hover:rotate-45"
                />
              ) : (
                <PiMoon
                  size={19}
                  className="text-indigo-600 transition-transform duration-300 hover:-rotate-12"
                />
              )}
            </button>

            <div
              className="relative border-l border-slate-200 dark:border-slate-700 pl-2.5 sm:pl-3.5"
              ref={accountRef}
            >
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                className={`flex items-center gap-2.5 rounded-xl border p-1 sm:px-2.5 sm:py-1.5 transition-all duration-200 active:scale-95 ${
                  accountMenuOpen
                    ? "border-blue-400/50 bg-blue-500/10"
                    : "border-transparent hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-[#24324a]"
                }`}
                aria-expanded={accountMenuOpen}
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-xs font-bold text-white shadow-md shadow-blue-500/20">
                  <span>
                    {getInitials(
                      currentUser?.fullName || currentUser?.email
                    )}
                  </span>

                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#172033] bg-emerald-400" />
                </div>

                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-white truncate max-w-[120px]">
                    {currentUser?.fullName || "User"}
                  </p>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                    {currentUser?.email}
                  </p>
                </div>

                <PiCaretDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 ${
                    accountMenuOpen
                      ? "rotate-180 text-blue-500 dark:text-blue-300"
                      : ""
                  }`}
                />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#172033] p-2 shadow-2xl z-50">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#24324a] p-3.5 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 font-bold text-white text-sm shadow-md">
                        {getInitials(
                          currentUser?.fullName || currentUser?.email
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {currentUser?.fullName || "User"}
                        </p>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {currentUser?.email}
                        </p>

                        <span
                          className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleConfig.badge}`}
                        >
                          <RoleIcon size={12} />
                          {formatRole(role)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    >
                      <PiGauge
                        size={16}
                        className="text-blue-500 dark:text-blue-400"
                      />
                      <span>My Dashboard</span>
                    </Link>

                    {role !== ROLES.ADMIN && (
                      <Link
                        to="/my-tasks"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                      >
                        <PiCheckSquare
                          size={16}
                          className="text-amber-500 dark:text-amber-400"
                        />
                        <span>My Work Queue</span>
                      </Link>
                    )}

                    <Link
                      to="/projects"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    >
                      <PiFolder
                        size={16}
                        className="text-cyan-500 dark:text-cyan-400"
                      />
                      <span>Projects Directory</span>
                    </Link>

                    {role === ROLES.ADMIN && (
                      <Link
                        to="/user-management"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                      >
                        <PiUsers
                          size={16}
                          className="text-purple-500 dark:text-purple-400"
                        />
                        <span>User Management</span>
                      </Link>
                    )}

                    {role !== ROLES.ADMIN && (
                      <Link
                        to="/calendar"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                      >
                        <PiCalendarBlank
                          size={16}
                          className="text-emerald-400"
                        />
                        <span>Global Calendar</span>
                      </Link>
                    )}

                    <Link
                      to="/settings"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                    >
                      <PiGear
                        size={16}
                        className="text-blue-500 dark:text-blue-400"
                      />
                      <span>Account Settings</span>
                    </Link>
                  </div>

                  <div className="px-3 py-1.5 mb-1.5 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    <span>System Status</span>

                    <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-3 py-1.5 mb-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      {isDark ? (
                        <PiMoon size={15} className="text-blue-400" />
                      ) : (
                        <PiSun size={15} className="text-amber-500" />
                      )}
                      Appearance
                    </span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-[#24324a] px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500 transition hover:scale-105"
                    >
                      {isDark ? "🌙 Dark" : "☀️ Light"}
                    </button>
                  </div>

                  <div className="space-y-0.5 border-t border-slate-100 dark:border-slate-700 pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-950 dark:hover:text-white"
                    >
                      <PiSignOut size={16} className="text-slate-600 dark:text-slate-300" />
                      <span>Sign Out</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onRequestDeleteAccount();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
                    >
                      <PiTrash size={16} />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 dark:bg-slate-950/70 px-4 pt-20 backdrop-blur-sm">
          <div
            ref={searchModalRef}
            className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#172033] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 px-4 py-3.5">
              <PiMagnifyingGlass
                size={20}
                className="text-blue-500 dark:text-blue-400 shrink-0"
              />

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search projects, tasks, or sections..."
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                >
                  <PiX size={16} />
                </button>
              )}

              <span className="rounded-md border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-[#24324a] px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                ESC
              </span>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-2">
              {searchQuery.trim() === "" ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Quick Search
                  </p>

                  <p>
                    Type any keyword to search across projects, task
                    keys, titles, and pages.
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No matching results found for "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((item) => {
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() =>
                          handleSelectResult(item.link)
                        }
                        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 dark:hover:bg-[#24324a] group"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-[#111827] text-blue-500 dark:text-blue-400 group-hover:border-blue-400/40 group-hover:bg-blue-500/10 transition">
                          <ItemIcon size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition truncate">
                            {item.title}
                          </p>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.subtitle}
                          </p>
                        </div>

                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          Jump →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#111827] px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Navigate with mouse or keyboard</span>

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="hover:text-slate-900 dark:hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;