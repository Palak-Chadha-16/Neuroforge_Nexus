import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PiArrowRight,
  PiBug,
  PiCheckCircle,
  PiClock,
  PiMagnifyingGlass,
  PiPlus,
  PiTrash,
  PiWarning,
  PiX,
  PiXCircle,
} from "react-icons/pi";
import { AuthContext } from "../../context/AuthContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";
import axios, { getApiBase } from "../../services/api.js";
import BugActivityTimeline from "./components/BugActivityTimeline.jsx";
import BugAISummary from "./components/BugAISummary.jsx";
import BugComments from "./components/BugComments.jsx";
import DeveloperPerformance from "./components/DeveloperPerformance.jsx";
import {
  avatarColor,
  getInitials,
  isDeveloper,
  mergeActivity,
  mergeComments,
} from "./utils/bugHelpers.js";
import { normalizeRole, ROLES } from "../../constants/roles.js";

const API_BASE = getApiBase();
const BUGS_API = `${API_BASE}/bugs`;
const PROJECTS_API = `${API_BASE}/projects`;

const workflow = [
  "New",
  "Triaged",
  "Assigned",
  "In Progress",
  "Fixed",
  "Retest",
  "Reopened",
  "Closed",
];

const statusOptions = [
  "New",
  "Triaged",
  "Assigned",
  "In Progress",
  "Fixed",
  "Retest",
  "Reopened",
  "Closed",
];

const statusConfig = {
  New: {
    icon: PiPlus,
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  },
  Triaged: {
    icon: PiMagnifyingGlass,
    className:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  },
  Assigned: {
    icon: PiBug,
    className:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  "In Progress": {
    icon: PiClock,
    className:
      "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  },
  Fixed: {
    icon: PiCheckCircle,
    className:
      "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  },
  Retest: {
    icon: PiWarning,
    className:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  },
  Closed: {
    icon: PiCheckCircle,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  },
  Reopened: {
    icon: PiXCircle,
    className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
};

const severityClass = {
  Critical: "text-red-600 dark:text-red-400",
  High: "text-orange-600 dark:text-orange-400",
  Medium: "text-yellow-600 dark:text-yellow-400",
  Low: "text-green-600 dark:text-green-400",
};

/*
  Project color palette (no red/rose: red is reserved for danger/alerts).
  - dot:   small color marker
  - solid: filled button (Open Project)
  - soft:  tinted button (Open Task)
*/
const projectPalette = [
  {
    dot: "bg-blue-500",
    solid:
      "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400",
    soft: "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
  },
  {
    dot: "bg-emerald-500",
    solid:
      "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400",
    soft: "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
  },
  {
    dot: "bg-violet-500",
    solid:
      "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400",
    soft: "border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20",
  },
  {
    dot: "bg-indigo-500",
    solid:
      "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400",
    soft: "border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20",
  },
  {
    dot: "bg-amber-500",
    solid:
      "bg-amber-500 text-gray-900 hover:bg-amber-600 dark:bg-amber-400 dark:hover:bg-amber-300",
    soft: "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
  },
  {
    dot: "bg-cyan-500",
    solid:
      "bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400",
    soft: "border border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20",
  },
  {
    dot: "bg-fuchsia-500",
    solid:
      "bg-fuchsia-600 text-white hover:bg-fuchsia-700 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-400",
    soft: "border border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:hover:bg-fuchsia-500/20",
  },
  {
    dot: "bg-teal-500",
    solid:
      "bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400",
    soft: "border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20",
  },
];

const neutralColor = {
  dot: "bg-gray-400",
  solid:
    "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200",
  soft: "border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700/40 dark:text-gray-200 dark:hover:bg-gray-700",
};

const getProjectColor = (projectId) => {
  if (projectId === undefined || projectId === null || projectId === "") {
    return neutralColor;
  }

  const key = String(projectId);
  let hash = 0;

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }

  return projectPalette[hash % projectPalette.length];
};

const initialForm = {
  title: "",
  description: "",
  projectId: "",
  taskId: "",
  module: "",
  environment: "Development",
  severity: "Medium",
  priority: "Medium",
  assignedToId: "",
};

const labelClass =
  "mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200";

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

const thClass =
  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

const primaryBtn =
  "inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200";

const outlineBtn =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700";

const linkBtnBase =
  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const CLOSED = "Closed";
const EXECUTION_ROLES = new Set([ROLES.DEVELOPER, ROLES.TESTER, ROLES.QA]);
const STATUS_TRANSITIONS = {
  New: ["Triaged"],
  Triaged: ["Assigned"],
  Assigned: ["In Progress"],
  "In Progress": ["Fixed"],
  Fixed: ["Retest"],
  Retest: ["Closed", "Reopened"],
  Reopened: ["In Progress"],
  Closed: ["Reopened"],
};

// Reads the linked task id from whichever field the backend returns
const readTaskId = (bug) => {
  const value =
    bug?.taskId ?? bug?.task_id ?? bug?.linkedTaskId ?? bug?.task?.id;
  return value === undefined || value === null || value === ""
    ? null
    : value;
};

const getTaskLabel = (task) =>
  task?.title || task?.name || `Task #${task?.id}`;

const getTaskProjectId = (task) => task?.projectId ?? task?.project?.id;

const BugReporting = () => {
  const { currentUser } = useContext(AuthContext);
  const { tasks = [] } = useTasks();
  const navigate = useNavigate();
  const location = useLocation();

  const [bugs, setBugs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalNotice, setModalNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");

  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [activity, setActivity] = useState([]);
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [assignmentUserId, setAssignmentUserId] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentUsers, setAssignmentUsers] = useState([]);
  const [teamMembersByProject, setTeamMembersByProject] = useState({});
  const [assignmentLoadError, setAssignmentLoadError] = useState("");
  const [editingBug, setEditingBug] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const currentUserName =
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.email ||
    "Current User";

  const developerViewer = isDeveloper(currentUser);
  const canReportBug = projects.length > 0;

  const selectedColor = getProjectColor(selectedBug?.projectId);
  const selectedProject = projects.find(
    (project) => String(project.id) === String(selectedBug?.projectId)
  );
  const formProject = projects.find(
    (project) => String(project.id) === String(form.projectId)
  );
  const formTasks = form.projectId
    ? tasks.filter(
        (task) => String(getTaskProjectId(task)) === String(form.projectId)
      )
    : [];
  const currentRole = normalizeRole(currentUser?.role);
  const getProjectMembers = (project) => [
    ...(project?.members || []),
    ...(teamMembersByProject[project?.id] || []),
  ];
  const isProjectMember = (project) =>
    getProjectMembers(project).some(
      (member) =>
        String(member.userId ?? member.user?.id ?? member.id) ===
        String(currentUser?.id)
    );
  const isProjectTeamLead = (project) =>
    currentRole === ROLES.TEAM_LEAD &&
    getProjectMembers(project).some(
      (member) =>
        String(member.userId ?? member.user?.id ?? member.id) ===
          String(currentUser?.id) &&
        String(member.teamRole ?? member.role ?? member.projectRole ?? "").toLowerCase() === "team lead"
    );
  const canManageBug = (project) =>
    currentRole === ROLES.ADMIN ||
    (currentRole === ROLES.PROJECT_MANAGER &&
      String(project?.projectManagerId ?? project?.projectManager?.id) ===
        String(currentUser?.id)) ||
    (currentRole === ROLES.PROJECT_LEAD &&
      String(project?.projectLeadId ?? project?.projectLead?.id) ===
        String(currentUser?.id));
  const canAssignBug = (project) =>
    canManageBug(project) || isProjectTeamLead(project);
  const canEditBug = (bug) => {
    const rawBug = bugs.find((item) => String(item.id) === String(bug?.id)) || bug;
    const project = projects.find(
      (item) => String(item.id) === String(rawBug?.projectId)
    );
    return (
      canManageBug(project) ||
      (EXECUTION_ROLES.has(currentRole) &&
        String(currentUser?.id) === String(rawBug?.reportedBy) &&
        isProjectMember(project))
    );
  };
  const canTransitionBug = (bug, nextStatus) => {
    const rawBug = bugs.find((item) => String(item.id) === String(bug?.id)) || bug;
    const project = projects.find(
      (item) => String(item.id) === String(rawBug?.projectId)
    );
    const previousStatus = rawBug?.status;
    if (!STATUS_TRANSITIONS[previousStatus]?.includes(nextStatus)) return false;
    if (canManageBug(project)) return true;
    if (
      currentRole === ROLES.TEAM_LEAD &&
      isProjectTeamLead(project) &&
      ((previousStatus === "New" && nextStatus === "Triaged") ||
        (previousStatus === "Triaged" && nextStatus === "Assigned"))
    ) return true;
    if (
      [ROLES.DEVELOPER, ROLES.TEAM_MEMBER].includes(currentRole) &&
      String(currentUser?.id) === String(rawBug?.assignedTo) &&
      ((previousStatus === "Assigned" && nextStatus === "In Progress") ||
        (previousStatus === "In Progress" && nextStatus === "Fixed") ||
        (previousStatus === "Reopened" && nextStatus === "In Progress"))
    ) return true;
    return (
      [ROLES.TESTER, ROLES.QA].includes(currentRole) &&
      isProjectMember(project) &&
      ((previousStatus === "Fixed" && nextStatus === "Retest") ||
        (previousStatus === "Retest" &&
          ["Closed", "Reopened"].includes(nextStatus)) ||
        (previousStatus === "Closed" && nextStatus === "Reopened"))
    );
  };
  const eligibleAssignees = (project) => {
    const memberIds = new Set(
      getProjectMembers(project).map((member) =>
        String(member.userId ?? member.user?.id ?? member.id)
      )
    );
    return assignmentUsers.filter(
      (user) =>
        user.active !== false &&
        EXECUTION_ROLES.has(normalizeRole(user.role)) &&
        memberIds.has(String(user.id))
    );
  };

  const closeDetails = () => {
    setSelectedBug(null);
    setModalNotice("");
    setActivity([]);
    setComments([]);
    setEditingBug(false);
    setEditForm(null);
  };

  const openDetails = (bug) => {
    setModalNotice("");
    setDetailTab("overview");
    setActivity([]);
    setComments([]);
    setSelectedBug(normalizeBug(bug));
    setAssignmentUserId(bug.assignedTo == null ? "" : String(bug.assignedTo));
    setEditingBug(false);
    setEditForm({
      title: bug.title || "",
      description: bug.description || "",
      module: bug.module || "",
      environment: bug.environment || "Development",
      severity: bug.severity || "Medium",
      priority: bug.priority || "Medium",
    });
  };

  const logActivity = async (bugId) => {
    try {
      const response = await axios.get(`${BUGS_API}/${bugId}/activity`);
      if (String(selectedBug?.id) === String(bugId)) {
        setActivity(Array.isArray(response.data) ? response.data : []);
      }
    } catch (requestError) {
      setModalNotice(
        requestError.response?.data?.message ||
          "Bug activity could not be refreshed."
      );
    }
  };

  const addComment = async (text) => {
    if (!selectedBug) return false;
    try {
      const response = await axios.post(
        `${BUGS_API}/${selectedBug.id}/comments`,
        { text }
      );
      setComments((current) => [...current, response.data]);
      await logActivity(selectedBug.id);
      return true;
    } catch (requestError) {
      setModalNotice(
        requestError.response?.data?.message || "Failed to post the comment."
      );
      return false;
    }
  };

  const openProject = () => {
    const projectId = selectedBug?.projectId;
    if (!projectId) return;
    closeDetails();
    navigate(`/projects/${projectId}`);
  };

  // Linked task of the selected bug
  const linkedTaskId = readTaskId(selectedBug);
  const hasLinkedTask = linkedTaskId !== null;
  const linkedTask = hasLinkedTask
    ? tasks.find((task) => String(task.id) === String(linkedTaskId))
    : null;

  // Opens the parent task page: /projects/:projectId/tasks/:taskId
  const openLinkedTask = () => {
    const projectId = selectedBug?.projectId ?? getTaskProjectId(linkedTask);
    if (!hasLinkedTask || !projectId) return;
    closeDetails();
    navigate(`/projects/${projectId}/tasks/${linkedTaskId}`);
  };

  const getProject = (projectId) =>
    projects.find((project) => String(project.id) === String(projectId));

  const getUserName = (userId) => {
    if (!userId) return "Unassigned";

    if (String(userId) === String(currentUser?.id)) {
      return currentUserName;
    }

    for (const project of projects) {
      if (String(project.projectManager?.id) === String(userId)) {
        return project.projectManager.fullName || `User #${userId}`;
      }
      if (String(project.projectLead?.id) === String(userId)) {
        return project.projectLead.fullName || `User #${userId}`;
      }
      const member = (project.members || []).find(
        (user) =>
          String(user.id) === String(userId) ||
          String(user.userId) === String(userId)
      );

      if (member) {
        return member.fullName || member.name || `User #${userId}`;
      }
    }

    return `User #${userId}`;
  };

  function normalizeBug(bug) {
    return {
      ...bug,
      taskId: readTaskId(bug),
      project: getProject(bug.projectId)?.name || `Project #${bug.projectId}`,
      reportedBy: getUserName(bug.reportedBy),
      assignedTo: getUserName(bug.assignedTo),
      createdDate: bug.createdAt
        ? new Date(bug.createdAt).toISOString().split("T")[0]
        : "",
      attachments: Array.isArray(bug.attachments)
        ? bug.attachments
        : typeof bug.attachments === "string"
          ? bug.attachments.split("|").filter(Boolean)
          : [],
    };
  }

  const loadData = useCallback(async () => {
    const viewerRole = normalizeRole(currentUser?.role);
    setLoading(true);
    setError("");

    try {
      const [bugResponse, projectResponse] = await Promise.all([
        axios.get(BUGS_API),
        axios.get(PROJECTS_API),
      ]);

      const loadedProjects = Array.isArray(projectResponse.data)
        ? projectResponse.data
        : [];
      setProjects(loadedProjects);
      setBugs(Array.isArray(bugResponse.data) ? bugResponse.data : []);

      setAssignmentUsers([]);
      setTeamMembersByProject({});
      setAssignmentLoadError("");
      if (
        [
          ROLES.ADMIN,
          ROLES.PROJECT_MANAGER,
          ROLES.PROJECT_LEAD,
          ROLES.TEAM_LEAD,
        ].includes(viewerRole)
      ) {
        try {
          const userResponse = await axios.get(`${API_BASE}/users/options`);
          setAssignmentUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
        } catch (userError) {
          setAssignmentLoadError(
            userError.response?.data?.message ||
              "Active bug assignees could not be loaded."
          );
        }
      }

      const teams = loadedProjects.filter((project) => project.teamId != null);
      const teamMemberResults = await Promise.all(
        teams.map(async (project) => {
          try {
            const response = await axios.get(
              `${API_BASE}/teams/${project.teamId}/members`
            );
            return [project.id, Array.isArray(response.data) ? response.data : []];
          } catch (teamError) {
            setAssignmentLoadError(
              teamError.response?.data?.message ||
                "Project team assignments could not be loaded."
            );
            return [project.id, []];
          }
        })
      );
      setTeamMembersByProject(Object.fromEntries(teamMemberResults));
    } catch (requestError) {
      console.error("Failed to load testing data:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Testing data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) return loadData();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  // Report a bug directly from a task page:
  // navigate("/bugs", { state: { reportBugForTask: { taskId, projectId, title } } })
  const prefill = location.state?.reportBugForTask;
  useEffect(() => {
    if (!prefill || loading || projects.length === 0) return;

    setForm({
      ...initialForm,
      projectId:
        prefill.projectId != null ? String(prefill.projectId) : "",
      taskId: prefill.taskId != null ? String(prefill.taskId) : "",
      title: prefill.title ? `Bug in task: ${prefill.title}` : "",
    });
    setShowReportModal(true);

    // Clear the router state so the modal doesn't reopen on refresh
    navigate(location.pathname, { replace: true, state: null });
  }, [prefill, loading, projects.length, navigate, location.pathname]);

  const selectedBugId = selectedBug?.id;
  useEffect(() => {
    if (!selectedBugId) return undefined;

    let active = true;
    Promise.all([
      axios.get(`${BUGS_API}/${selectedBugId}/comments`),
      axios.get(`${BUGS_API}/${selectedBugId}/activity`),
    ])
      .then(([commentResponse, activityResponse]) => {
        if (!active) return;
        setComments(Array.isArray(commentResponse.data) ? commentResponse.data : []);
        setActivity(Array.isArray(activityResponse.data) ? activityResponse.data : []);
      })
      .catch((requestError) => {
        if (!active) return;
        setModalNotice(
          requestError.response?.data?.message ||
            "Bug discussion and activity could not be loaded."
        );
      });

    return () => {
      active = false;
    };
  }, [selectedBugId]);

  const refreshBugs = async () => {
    const response = await axios.get(BUGS_API);
    setBugs(Array.isArray(response.data) ? response.data : []);
  };

  // Merge an API response into the bug we already have, so fields the
  // response omits (like the linked task id) are not lost.
  const applyBugUpdate = (bugId, data) => {
    const existing =
      bugs.find((bug) => String(bug.id) === String(bugId)) || {};
    const merged = { ...existing, ...data };

    setBugs((current) =>
      current.map((bug) => (String(bug.id) === String(bugId) ? merged : bug))
    );

    setSelectedBug(normalizeBug(merged));
  };

  const filteredBugs = useMemo(() => {
    const query = search.toLowerCase().trim();

    return bugs.filter((bug) => {
      const haystack = [
        bug.bugKey || bug.id,
        bug.title,
        bug.projectId,
        bug.module,
        bug.reportedBy,
        getUserName(bug.reportedBy),
        bug.assignedTo,
        getUserName(bug.assignedTo),
        getProject(bug.projectId)?.name,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      const matchesSearch = haystack.includes(query);
      const matchesStatus = statusFilter === "All" || bug.status === statusFilter;
      const matchesSeverity =
        severityFilter === "All" || bug.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bugs, projects, search, statusFilter, severityFilter]);

  const stats = [
    {
      label: "Total Bugs",
      value: bugs.length,
      icon: PiBug,
      iconClass: "text-gray-400",
    },
    {
      label: "Open Bugs",
      value: bugs.filter((bug) => bug.status !== CLOSED).length,
      icon: PiClock,
      iconClass: "text-orange-500",
    },
    {
      label: "Critical",
      value: bugs.filter((bug) => bug.severity === "Critical").length,
      icon: PiWarning,
      iconClass: "text-red-500",
    },
    {
      label: "Closed",
      value: bugs.filter((bug) => bug.status === "Closed").length,
      icon: PiCheckCircle,
      iconClass: "text-green-500",
    },
  ];

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      // Changing the project clears the assignee and the linked task
      ...(name === "projectId" ? { assignedToId: "", taskId: "" } : {}),
    }));
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !canReportBug ||
      !form.title.trim() ||
      !form.description.trim() ||
      !form.projectId ||
      !form.module.trim()
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await axios.post(BUGS_API, {
        title: form.title.trim(),
        description: form.description.trim(),
        projectId: Number(form.projectId),
        taskId: form.taskId ? Number(form.taskId) : null,
        module: form.module.trim(),
        environment: form.environment,
        severity: form.severity,
        priority: form.priority,
        ...(canAssignBug(getProject(form.projectId))
          ? { assignedTo: form.assignedToId ? Number(form.assignedToId) : null }
          : {}),
      });

      await refreshBugs();
      closeReportModal();
    } catch (requestError) {
      console.error("Failed to create bug:", requestError);
      setError(
        requestError.response?.data?.message || "Failed to create the bug."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateBugStatus = async (bugId, status, retestResult) => {
    try {
      const response = await axios.patch(`${BUGS_API}/${bugId}/status`, {
        status,
        ...(retestResult ? { retestResult } : {}),
      });

      applyBugUpdate(bugId, response.data);
      await logActivity(bugId);
    } catch (requestError) {
      console.error("Failed to update bug status:", requestError);
      setModalNotice(
        requestError.response?.data?.message || "Failed to update bug status."
      );
    }
  };

  const handleRetest = (bugId, result) =>
    updateBugStatus(bugId, result === "Passed" ? "Closed" : "Reopened", result);

  const updateAssignment = async () => {
    if (!selectedBug || !canAssignBug(selectedProject)) return;
    setAssignmentSaving(true);
    try {
      const response = await axios.patch(
        `${BUGS_API}/${selectedBug.id}/assignment`,
        { assignedTo: assignmentUserId ? Number(assignmentUserId) : null }
      );
      applyBugUpdate(selectedBug.id, response.data);
      setModalNotice("");
      setAssignmentUserId(
        response.data.assignedTo == null ? "" : String(response.data.assignedTo)
      );
      await logActivity(selectedBug.id);
    } catch (requestError) {
      setModalNotice(
        requestError.response?.data?.message || "Failed to update bug assignment."
      );
    } finally {
      setAssignmentSaving(false);
    }
  };

  const saveBugDetails = async () => {
    if (
      !selectedBug ||
      !editForm ||
      !editForm.title.trim() ||
      !editForm.description.trim() ||
      !editForm.module.trim() ||
      !editForm.environment.trim() ||
      !editForm.severity.trim() ||
      !editForm.priority.trim()
    ) {
      setModalNotice("Complete all bug fields before saving.");
      return;
    }
    try {
      const response = await axios.put(`${BUGS_API}/${selectedBug.id}`, {
        ...editForm,
        ...(canAssignBug(selectedProject)
          ? { assignedTo: assignmentUserId ? Number(assignmentUserId) : null }
          : {}),
      });
      applyBugUpdate(selectedBug.id, response.data);
      setEditingBug(false);
      setModalNotice("");
      await logActivity(selectedBug.id);
    } catch (requestError) {
      setModalNotice(
        requestError.response?.data?.message || "Failed to update bug details."
      );
    }
  };

  const deleteBug = async (bugId) => {
    try {
      await axios.delete(`${BUGS_API}/${bugId}`);

      setBugs((current) =>
        current.filter((bug) => String(bug.id) !== String(bugId))
      );

      closeDetails();
    } catch (requestError) {
      console.error("Failed to delete bug:", requestError);
      setModalNotice(
        requestError.response?.data?.message || "Failed to delete bug."
      );
    }
  };

  const getStatusConfig = (status) => statusConfig[status] || statusConfig.New;

  const nextStatus = selectedBug && selectedBug.status !== "Retest"
    ? workflow.find((status) => canTransitionBug(selectedBug, status))
    : null;

  const SelectedStatusIcon = selectedBug
    ? getStatusConfig(selectedBug.status).icon
    : null;

  // Data for the details modal
  const mergedActivity = selectedBug ? mergeActivity(selectedBug, activity) : [];
  const mergedComments = selectedBug ? mergeComments(selectedBug, comments) : [];

  const projectMembers = selectedBug
    ? (getProject(selectedBug.projectId)?.members || []).map((member) => ({
        id: member.userId ?? member.id,
        name:
          member.fullName ||
          member.name ||
          `User #${member.userId ?? member.id}`,
      }))
    : [];

  const rawSelected = selectedBug
    ? bugs.find((bug) => String(bug.id) === String(selectedBug.id))
    : null;

  const developerOpenBugs = rawSelected?.assignedTo
    ? bugs.filter(
        (bug) =>
          String(bug.assignedTo) === String(rawSelected.assignedTo) &&
          bug.status !== CLOSED
      ).length
    : 0;

  const hasDeveloper = selectedBug && selectedBug.assignedTo !== "Unassigned";

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "comments", label: "Comments", count: mergedComments.length },
    { id: "activity", label: "Activity", count: mergedActivity.length },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Loading testing data...
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <PiBug size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bug Reporting
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track, manage, and resolve software defects.
            </p>
          </div>
        </div>

        {canReportBug && (
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            disabled={loading || projects.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <PiPlus size={18} />
            Report Bug
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const StatIcon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </span>
                <StatIcon size={21} className={stat.iconClass} />
              </div>

              <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Developer performance */}
      <DeveloperPerformance
        bugs={bugs}
        projects={projects}
        currentUser={currentUser}
        currentUserName={currentUserName}
        isDeveloperViewer={developerViewer}
      />

      {/* Filters + table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <PiMagnifyingGlass
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bugs, projects, modules..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="All">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50">
                <th className={thClass}>Bug</th>
                <th className={thClass}>Project</th>
                <th className={thClass}>Severity</th>
                <th className={thClass}>Priority</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Assigned</th>
                <th className={thClass}>Created</th>
              </tr>
            </thead>

            <tbody>
              {filteredBugs.map((bug) => {
                const config = getStatusConfig(bug.status);
                const StatusIcon = config.icon;
                const projectColor = getProjectColor(bug.projectId);
                const projectName =
                  getProject(bug.projectId)?.name ||
                  `Project #${bug.projectId}`;

                return (
                  <tr
                    key={bug.id}
                    onClick={() => openDetails(bug)}
                    className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-700/70 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {bug.bugKey || bug.id}
                      </p>
                      <p className="mt-1 max-w-xs truncate text-sm text-gray-500 dark:text-gray-400">
                        {bug.title}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${projectColor.dot}`}
                        />
                        {projectName}
                      </p>
                      <p className="mt-1 pl-[18px] text-xs text-gray-500 dark:text-gray-400">
                        {bug.module}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`text-sm font-semibold ${
                          severityClass[bug.severity] || "text-gray-600"
                        }`}
                      >
                        {bug.severity}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {bug.priority}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
                      >
                        <StatusIcon size={14} />
                        {bug.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {getUserName(bug.assignedTo)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {bug.createdAt
                          ? new Date(bug.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && filteredBugs.length === 0 && (
            <div className="px-6 py-16 text-center">
              <PiBug
                size={40}
                className="mx-auto text-gray-300 dark:text-gray-600"
              />
              <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                No bugs found
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Try changing your filters
                {canReportBug ? " or report a new bug." : "."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Report modal */}
      {showReportModal && canReportBug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Report New Bug
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create a defect report for your project.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                <PiX size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Bug Title</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder="Enter a short description of the bug"
                    required
                    className={fieldClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    placeholder="Describe the issue, steps to reproduce, expected result, and actual result"
                    required
                    rows={5}
                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className={labelClass}>Project / Product</label>
                  <select
                    name="projectId"
                    value={form.projectId}
                    onChange={handleInputChange}
                    required
                    className={fieldClass}
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Linked Task (optional)</label>
                  <select
                    name="taskId"
                    value={form.taskId}
                    onChange={handleInputChange}
                    disabled={!form.projectId}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <option value="">
                      {form.projectId
                        ? "No linked task"
                        : "Select a project first"}
                    </option>
                    {formTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {getTaskLabel(task)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Module / Feature</label>
                  <input
                    type="text"
                    name="module"
                    value={form.module}
                    onChange={handleInputChange}
                    placeholder="Login, Dashboard, Payments..."
                    required
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Environment</label>
                  <select
                    name="environment"
                    value={form.environment}
                    onChange={handleInputChange}
                    className={fieldClass}
                  >
                    <option value="Development">Development</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Severity</label>
                  <select
                    name="severity"
                    value={form.severity}
                    onChange={handleInputChange}
                    className={fieldClass}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleInputChange}
                    className={fieldClass}
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {canAssignBug(formProject) && (
                  <div>
                    <label className={labelClass}>Assigned To</label>
                    <select
                      name="assignedToId"
                      value={form.assignedToId}
                      onChange={handleInputChange}
                      disabled={!form.projectId || Boolean(assignmentLoadError)}
                      className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <option value="">Unassigned</option>
                      {eligibleAssignees(formProject).map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName || user.name}
                        </option>
                      ))}
                    </select>
                    {assignmentLoadError && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {assignmentLoadError}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Reported By</label>
                  <input
                    type="text"
                    value={currentUserName}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
                <button
                  type="button"
                  onClick={closeReportModal}
                  className={outlineBtn}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  {saving ? "Saving..." : "Report Bug"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bug details modal */}
      {selectedBug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {selectedBug.bugKey || selectedBug.id}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      getStatusConfig(selectedBug.status).className
                    }`}
                  >
                    <SelectedStatusIcon size={14} />
                    {selectedBug.status}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                  {selectedBug.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                <PiX size={22} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Tabs */}
              <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
                      detailTab === tab.id
                        ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {detailTab === "overview" && (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Severity
                      </p>
                      <p
                        className={`mt-1 text-sm font-semibold ${
                          severityClass[selectedBug.severity] || "text-gray-700"
                        }`}
                      >
                        {selectedBug.severity}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Priority
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {selectedBug.priority}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Environment
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {selectedBug.environment}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {selectedBug.createdDate}
                      </p>
                    </div>
                  </div>

                  {editingBug && canEditBug(selectedBug) ? (
                    <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                      <label className="block">
                        <span className={labelClass}>Title</span>
                        <input
                          value={editForm?.title || ""}
                          onChange={(event) => setEditForm((value) => ({
                            ...value, title: event.target.value,
                          }))}
                          className={fieldClass}
                          maxLength={255}
                          required
                        />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Description</span>
                        <textarea
                          value={editForm?.description || ""}
                          onChange={(event) => setEditForm((value) => ({
                            ...value, description: event.target.value,
                          }))}
                          className={fieldClass}
                          rows={5}
                          required
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          ["module", "Module"],
                          ["environment", "Environment"],
                          ["severity", "Severity"],
                          ["priority", "Priority"],
                        ].map(([field, label]) => (
                          <label key={field} className="block">
                            <span className={labelClass}>{label}</span>
                            <input
                              value={editForm?.[field] || ""}
                              onChange={(event) => setEditForm((value) => ({
                                ...value, [field]: event.target.value,
                              }))}
                              className={fieldClass}
                              required
                            />
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" className={outlineBtn} onClick={() => setEditingBug(false)}>
                          Cancel
                        </button>
                        <button type="button" className={primaryBtn} onClick={saveBugDetails}>
                          Save changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Description
                        </p>
                        {canEditBug(selectedBug) && (
                          <button
                            type="button"
                            className={outlineBtn}
                            onClick={() => setEditingBug(true)}
                          >
                            Edit bug
                          </button>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {selectedBug.description}
                      </p>
                    </>
                  )}

                  <BugAISummary
                    bug={selectedBug}
                    comments={mergedComments}
                    activity={mergedActivity}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Project
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedColor.dot}`}
                        />
                        {selectedBug.project}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Linked Task
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {hasLinkedTask
                          ? linkedTask
                            ? getTaskLabel(linkedTask)
                            : `Task #${linkedTaskId}`
                          : "None"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Module
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {selectedBug.module}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Reported By
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {selectedBug.reportedBy}
                      </p>
                    </div>
                  </div>

                  {/* Bug assignment */}
                  <div>
                    <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Bug and assignment
                    </p>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          <PiBug size={14} />
                          Bug
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedBug.bugKey || selectedBug.id}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {selectedBug.title}
                        </p>
                      </div>

                      <PiArrowRight
                        size={18}
                        className="hidden self-center text-gray-400 md:block"
                      />

                      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Developer
                        </p>

                        {hasDeveloper ? (
                          <div className="mt-2 flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                                selectedBug.assignedTo
                              )}`}
                            >
                              {getInitials(selectedBug.assignedTo)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {selectedBug.assignedTo}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {developerOpenBugs} open bug
                                {developerOpenBugs === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            Unassigned
                          </p>
                        )}
                        {canAssignBug(selectedProject) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <select
                              value={assignmentUserId}
                              onChange={(event) => setAssignmentUserId(event.target.value)}
                              className={`${fieldClass} min-w-48 flex-1`}
                            >
                              <option value="">Unassigned</option>
                              {eligibleAssignees(selectedProject).map((member) => {
                                const id = member.userId ?? member.user?.id ?? member.id;
                                return (
                                  <option key={id} value={id}>
                                    {member.fullName || member.user?.fullName || member.name || `User #${id}`}
                                  </option>
                                );
                              })}
                            </select>
                            <button
                              type="button"
                              className={outlineBtn}
                              disabled={assignmentSaving}
                              onClick={updateAssignment}
                            >
                              {assignmentSaving ? "Saving..." : "Save assignment"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Bug Workflow
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {workflow.map((stage) => {
                        const active = selectedBug.status === stage;
                        const allowed =
                          !active &&
                          selectedBug.status !== "Retest" &&
                          canTransitionBug(selectedBug, stage);

                        return (
                          <div key={stage} className="flex items-center gap-2">
                            {allowed ? (
                              <button
                                type="button"
                                onClick={() => updateBugStatus(selectedBug.id, stage)}
                                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                              >
                                {stage}
                              </button>
                            ) : (
                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                  active
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                                }`}
                              >
                                {stage}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedBug.status === "Reopened" &&
                    canTransitionBug(selectedBug, "In Progress") && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                          Bug Reopened
                        </p>
                        <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                          The retest failed. Move the bug back to In Progress for
                          another fix.
                        </p>
                      </div>
                    )}

                  {selectedBug.status === "Retest" &&
                    (canTransitionBug(selectedBug, "Closed") ||
                      canTransitionBug(selectedBug, "Reopened")) && (
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/20 dark:bg-yellow-500/10">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                          Retest Required
                        </p>
                        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                          Select the result after testing the developer&apos;s
                          fix.
                        </p>

                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleRetest(selectedBug.id, "Passed")}
                            disabled={!canTransitionBug(selectedBug, "Closed")}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Passed
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRetest(selectedBug.id, "Failed")}
                            disabled={!canTransitionBug(selectedBug, "Reopened")}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Failed
                          </button>
                        </div>
                      </div>
                    )}

                  {selectedBug.retestResult && (
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last Retest Result
                      </p>
                      <p
                        className={`mt-1 text-sm font-semibold ${
                          selectedBug.retestResult === "Passed"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {selectedBug.retestResult}
                      </p>
                    </div>
                  )}

                  {selectedBug.attachments?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Stored attachment references
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        These names were saved without uploading file contents.
                      </p>

                      <div className="mt-3 space-y-2">
                        {selectedBug.attachments.map((file, index) => (
                          <div
                            key={`${file}-${index}`}
                            className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          >
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {detailTab === "comments" && (
                <BugComments
                  bug={selectedBug}
                  localComments={comments}
                  members={projectMembers}
                  currentUserName={currentUserName}
                  onAdd={addComment}
                />
              )}

              {detailTab === "activity" && (
                <BugActivityTimeline bug={selectedBug} localEvents={activity} />
              )}

              {modalNotice && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  {modalNotice}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
                {/* Navigation buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openProject}
                    disabled={!selectedBug.projectId}
                    className={`${linkBtnBase} ${selectedColor.solid}`}
                  >
                    Open Project
                    <PiArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={openLinkedTask}
                    disabled={!hasLinkedTask || !selectedBug.projectId}
                    title={
                      hasLinkedTask
                        ? "Open linked task"
                        : "No task linked to this bug"
                    }
                    className={`${linkBtnBase} ${selectedColor.soft}`}
                  >
                    Open Task
                    <PiArrowRight size={16} />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {canManageBug(selectedProject) && (
                    <button
                      type="button"
                      onClick={() => deleteBug(selectedBug.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                    >
                      <PiTrash size={17} />
                      Delete Bug
                    </button>
                  )}

                  {nextStatus && (
                    <button
                      type="button"
                      onClick={() => updateBugStatus(selectedBug.id, nextStatus)}
                      className={primaryBtn}
                    >
                      Move to {nextStatus}
                      <PiArrowRight size={17} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugReporting;