import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  PiArrowLeft,
  PiCalendarBlank,
  PiCheck,
  PiListChecks,
  PiPencilSimple,
  PiPlus,
  PiTrash,
  PiUserCircle,
  PiUsersThree,
  PiX,
  PiDotsThreeVertical,
  PiArrowSquareOut,
  PiGithubLogo,
  PiRocket,
} from "react-icons/pi";

import { useProjects } from "../../context/ProjectContext.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import { useProjectTeam } from "../../context/ProjectTeamContext.jsx";
import { useTasks } from "../../context/TasksContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES, normalizeRole } from "../../constants/roles.js";
import ConnectRepoModal from "../../components/project/ConnectRepoModal.jsx";
import DevOpsPipelineView from "../../components/project/DevOpsPipelineView.jsx";

const PROJECT_ROLES = ["Team Lead", "Developer", "Tester", "QA"];

const TASK_STATUSES = ["To Do", "In Progress", "In Review", "Done"];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const MEMBER_STATUSES = ["Active", "Inactive", "In Meeting"];

const EMPTY_TASK_FORM = {
  title: "",
  description: "",
  assigneeId: "",
  priority: "Medium",
  status: "To Do",
  dueDate: "",
};

const ProjectWorkspace = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();

  const { currentUser } = useAuth();

  const {
    getProjectById,
    selectedProject,
    selectProject,
    updateProject,
  } = useProjects();

  const {
    getProjectMembers,
    addProjectMember,
    updateProjectMember,
    removeProjectMember,
    updateProjectMemberStatus,
  } = useProjectTeam();

  const { users } = useUsers();

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    createTask,
    updateTask,
    deleteTask,
    getSubtasksByTaskId,
  } = useTasks();

  const project = getProjectById(projectId) || selectedProject;

  const initialSection =
    location.state?.section ||
    new URLSearchParams(location.search).get("section") ||
    "overview";

  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    const querySection =
      location.state?.section ||
      new URLSearchParams(location.search).get("section");
    if (querySection && querySection !== activeSection) {
      setActiveSection(querySection);
    }
  }, [location.state?.section, location.search]);

  const [showEditProject, setShowEditProject] = useState(false);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    code: "",
    repository: "",
    status: "Not Started",
    startDate: "",
    endDate: "",
  });

  const [showAddMember, setShowAddMember] = useState(false);

  const [memberForm, setMemberForm] = useState({
    userId: "",
    projectRole: "Developer",
  });

  const [editingMember, setEditingMember] = useState(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);

  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);
  const [taskMenuAnchor, setTaskMenuAnchor] = useState(null);
  const [showConnectRepo, setShowConnectRepo] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setTaskMenuAnchor(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null);

  useEffect(() => {
    if (project?.id) {
      selectProject(project.id);
    }
  }, [project?.id, selectProject]);

  useEffect(() => {
    if (project) {
      setProjectForm({
        name: project.name || "",
        description: project.description || "",
        code: project.code || "",
        repository: project.repository || "",
        status: project.status || "Not Started",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
      });
    }
  }, [project]);

  const projectMembers = useMemo(() => {
    if (!project?.id) return [];

    const members = getProjectMembers(project.id);

    return members.map((member) => {
      const user = users.find(
        (item) => String(item.id) === String(member.userId)
      );

      return {
        ...member,
        user,
        status: member.status || "Active",
      };
    });
  }, [project?.id, getProjectMembers, users]);

  const teamLeadMember = useMemo(() => {
    return projectMembers.find(
      (member) => member.projectRole === "Team Lead"
    );
  }, [projectMembers]);

  const teamLeadId = teamLeadMember?.userId || null;

  const teamLeadName =
    teamLeadMember?.user?.fullName ||
    teamLeadMember?.user?.name ||
    "No Team Lead assigned";

  const availableUsers = useMemo(() => {
    if (!project?.id) return [];

    return users.filter((user) => {
      const alreadyInProject = projectMembers.some(
        (member) => String(member.userId) === String(user.id)
      );

      return !alreadyInProject;
    });
  }, [users, project?.id, projectMembers]);

  const projectTasks = useMemo(() => {
    if (!project?.id) return [];

    return tasks.filter((task) => {
      const taskProjId = task.projectId ?? task.project?.id ?? task.project_id;
      return String(taskProjId) === String(project.id);
    });
  }, [tasks, project?.id]);

  const getUserName = (userId) => {
    const user = users.find(
      (item) => String(item.id) === String(userId)
    );

    return user?.fullName || user?.name || "Unassigned";
  };

  const getTaskAssigneeName = (task) => {
    if (task.assignee?.fullName) {
      return task.assignee.fullName;
    }

    if (task.assignee?.name) {
      return task.assignee.name;
    }

    if (task.assigneeId) {
      return getUserName(task.assigneeId);
    }

    return "Unassigned";
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "Critical":
        return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300";

      case "High":
        return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-300";

      case "Medium":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300";

      case "Low":
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300";

      default:
        return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Done":
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300";

      case "In Progress":
        return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300";

      case "In Review":
        return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300";

      case "To Do":
      default:
        return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const getMemberStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300";

      case "In Meeting":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300";

      case "Inactive":
      default:
        return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const isCurrentUser = (member) => {
    const currentUserId = currentUser?.id ?? currentUser?._id;

    return (
      currentUserId != null &&
      String(member.userId) === String(currentUserId)
    );
  };

  const currentRole = normalizeRole(currentUser?.role);

  const canManageProjects = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.PROJECT_LEAD,
  ].includes(currentRole);

  const canManageTeam = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.PROJECT_LEAD,
    ROLES.TEAM_LEAD,
  ].includes(currentRole);

  const canManageTasks = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.PROJECT_LEAD,
  ].includes(currentRole);

  const userSkillStr = String(currentUser?.skill || "").toLowerCase();
  const canTriggerPipeline =
    canManageProjects ||
    userSkillStr.includes("devops") ||
    (Array.isArray(currentUser?.skills) &&
      currentUser.skills.some((s) => String(s).toLowerCase().includes("devops")));

  const handleProjectFormChange = (event) => {
    const { name, value } = event.target;

    setProjectForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();

    if (!project?.id) return;

        const result = await updateProject(project.id, projectForm);

    if (result?.success) {
      setShowEditProject(false);
    } else {
      alert(result?.message || "Failed to update project.");
    }
  };

  const openAddMember = () => {
    setEditingMember(null);

    setMemberForm({
      userId: "",
      projectRole: "Developer",
    });

    setShowAddMember(true);
  };

  const openEditMember = (member) => {
    setEditingMember(member);

    setMemberForm({
      userId: member.userId,
      projectRole: member.projectRole,
    });

    setShowAddMember(true);
  };

  const handleMemberSubmit = async (event) => {
    event.preventDefault();

    if (!project?.id) return;

    if (!memberForm.userId) {
      alert("Please select a user.");
      return;
    }

    if (memberForm.projectRole === "Team Lead" && !editingMember) {
      const existingTeamLead = projectMembers.find(
        (member) => member.projectRole === "Team Lead"
      );

      if (existingTeamLead) {
        alert("This project already has a Team Lead.");
        return;
      }
    }

    if (
      memberForm.projectRole === "Team Lead" &&
      editingMember &&
      editingMember.projectRole !== "Team Lead"
    ) {
      const existingTeamLead = projectMembers.find(
        (member) =>
          member.projectRole === "Team Lead" &&
          String(member.userId) !== String(editingMember.userId)
      );

      if (existingTeamLead) {
        alert("This project already has a Team Lead.");
        return;
      }
    }

    let result;

        if (editingMember) {
      result = await updateProjectMember(
        project.id,
        editingMember.userId,
        memberForm.projectRole
      );
    } else {
      result = await addProjectMember(
        project.id,
        Number(memberForm.userId),
        memberForm.projectRole
      );
    }

    if (result?.success) {
      setShowAddMember(false);
      setEditingMember(null);

      setMemberForm({
        userId: "",
        projectRole: "Developer",
      });
    } else {
      alert(result?.message || "Failed to update project team.");
    }
  };

  const handleMemberStatusChange = async (member, status) => {
    if (!project?.id || !member?.userId) return;

    if (!isCurrentUser(member)) {
      return;
    }

        const result = await updateProjectMemberStatus(
      project.id,
      member.userId,
      status
    );

    if (!result?.success) {
      alert(result?.message || "Failed to update your status.");
    }
  };

  const handleDeleteMember = async () => {
    if (!project?.id || !confirmDeleteMember) return;

        const result = await removeProjectMember(
      project.id,
      confirmDeleteMember.userId
    );

    if (!result?.success) {
      alert(result?.message || "Failed to remove team member.");
    }

    setConfirmDeleteMember(null);
  };

  const openCreateTask = () => {
    setEditingTask(null);

    const defaultAssignee = teamLeadId
      ? String(teamLeadId)
      : projectMembers[0]?.userId
      ? String(projectMembers[0].userId)
      : "";

    setTaskForm({
      ...EMPTY_TASK_FORM,
      assigneeId: defaultAssignee,
    });

    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);

    const existingAssignee = task.assigneeId ?? task.assignee?.id ?? "";

    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      assigneeId: existingAssignee ? String(existingAssignee) : "",
      priority: task.priority || "Medium",
      status: task.status || "To Do",
      dueDate: task.dueDate || "",
    });

    setShowTaskModal(true);
  };

  const handleTaskFormChange = (event) => {
    const { name, value } = event.target;

    setTaskForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();

    if (!project?.id) return;

    if (!taskForm.title.trim()) {
      alert("Please enter a parent task title.");
      return;
    }

    const existingAssigneeId =
      editingTask?.assigneeId ??
      editingTask?.assignee?.id ??
      null;

    const chosenAssigneeId = taskForm.assigneeId
      ? Number(taskForm.assigneeId)
      : existingAssigneeId ?? (teamLeadId ? Number(teamLeadId) : null);

    const payload = {
      ...(editingTask || {}),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      projectId: Number(project.id),
      assigneeId: chosenAssigneeId,
      priority: taskForm.priority,
      status: taskForm.status,
      dueDate: taskForm.dueDate || null,
    };

    let result;

        if (editingTask) {
      result = await updateTask(payload);
    } else {
      result = await createTask(payload);
    }

    if (result?.success) {
      setShowTaskModal(false);
      setEditingTask(null);

      setTaskForm({
        ...EMPTY_TASK_FORM,
      });
    } else {
      alert(result?.message || "Failed to save parent task.");
    }
  };

  const handleDeleteTask = async () => {
    if (!confirmDeleteTask) return;

        const result = await deleteTask(confirmDeleteTask.id);

    if (!result?.success) {
      alert(result?.message || "Failed to delete task.");
    }

    setConfirmDeleteTask(null);
  };

  const taskStats = useMemo(() => {
    const total = projectTasks.length;

    const toDo = projectTasks.filter(
      (task) => task.status === "To Do"
    ).length;

    const inProgress = projectTasks.filter(
      (task) => task.status === "In Progress"
    ).length;

    const completed = projectTasks.filter(
      (task) => task.status === "Done"
    ).length;

    return {
      total,
      toDo,
      inProgress,
      completed,
    };
  }, [projectTasks]);

  if (!project) {
    return (
      <div className="min-h-screen bg-transparent p-6 text-[#172033] dark:text-slate-100">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => navigate("/projects")}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-[#64748B] transition hover:text-[#172033] dark:text-slate-400 dark:hover:text-white"
          >
            <PiArrowLeft size={20} />
            Back to Projects
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
            <h2 className="text-xl font-semibold text-[#172033] dark:text-white">
              Project not found
            </h2>

            <p className="mt-2 text-[#64748B] dark:text-slate-400">
              The project you are looking for does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 text-[#172033] dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          {/* HIERARCHICAL BREADCRUMB */}
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#64748B] dark:text-slate-400">
            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="transition hover:text-[#2563EB] dark:hover:text-blue-400"
            >
              Projects
            </button>
            <span>/</span>
            <span className="font-semibold text-[#172033] dark:text-slate-200">
              {project.name}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-[#172033] dark:text-white sm:text-3xl">
                    {project.name}
                  </h1>

                  {project.code && (
                    <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {project.code}
                    </span>
                  )}

                  {project.status && (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        project.status === "Completed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : project.status === "In Progress"
                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"
                          : project.status === "On Hold"
                          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300"
                          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {project.status}
                    </span>
                  )}
                </div>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#475569] dark:text-slate-400">
                  {project.description ||
                    "Manage project details, team members and tasks."}
                </p>
              </div>

              {canManageProjects && (
                <button
                  onClick={() => setShowEditProject(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
                >
                  <PiPencilSimple size={18} />
                  Edit Project
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex min-w-max">
            <button
              onClick={() => setActiveSection("overview")}
              className={`border-b-2 px-5 py-4 text-sm font-semibold transition ${
                activeSection === "overview"
                  ? "border-[#2563EB] text-[#2563EB] dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-[#64748B] hover:text-[#172033] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveSection("team")}
              className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition ${
                activeSection === "team"
                  ? "border-[#2563EB] text-[#2563EB] dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-[#64748B] hover:text-[#172033] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Team

              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeSection === "team"
                    ? "bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300"
                    : "bg-slate-100 text-[#64748B] dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {projectMembers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection("tasks")}
              className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition ${
                activeSection === "tasks"
                  ? "border-[#2563EB] text-[#2563EB] dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-[#64748B] hover:text-[#172033] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Parent Tasks

              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeSection === "tasks"
                    ? "bg-blue-50 text-[#2563EB] dark:bg-blue-950/60 dark:text-blue-300"
                    : "bg-slate-100 text-[#64748B] dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {projectTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection("devops")}
              className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition ${
                activeSection === "devops"
                  ? "border-[#2563EB] text-[#2563EB] dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-[#64748B] hover:text-[#172033] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <PiRocket size={16} />
              <span>DevOps & CI/CD</span>
            </button>
          </div>
        </div>

        {activeSection === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm text-[#64748B] dark:text-slate-400">Project Status</p>
                <p className="mt-2 text-xl font-bold text-[#172033] dark:text-white">
                  {project.status || "Not Started"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm text-[#64748B] dark:text-slate-400">Project Lead</p>
                <p className="mt-2 text-xl font-bold text-[#172033] dark:text-white">
                  {project.projectLead?.fullName ||
                    project.projectLead?.name ||
                    project.projectLeadName ||
                    "Not assigned"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm text-[#64748B] dark:text-slate-400">Project Manager</p>
                <p className="mt-2 text-xl font-bold text-[#172033] dark:text-white">
                  {project.projectManager?.fullName ||
                    project.projectManager?.name ||
                    project.projectManagerName ||
                    "Not assigned"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm text-[#64748B] dark:text-slate-400">Team Members</p>
                <p className="mt-2 text-xl font-bold text-[#172033] dark:text-white">
                  {projectMembers.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm text-[#64748B] dark:text-slate-400">Repository</p>

                <div className="mt-2.5">
                  {project.repository ? (
                    <a
                      href={
                        project.repository.startsWith("http")
                          ? project.repository
                          : `https://${project.repository}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-xs transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700"
                      title={`Open GitHub Repository: ${project.repository}`}
                    >
                      <PiGithubLogo size={20} className="text-slate-900 dark:text-white" />
                      <span>Connected</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConnectRepo(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-3.5 py-2 text-sm font-semibold text-[#2563EB] shadow-xs transition hover:border-blue-400 hover:bg-blue-100/70 hover:text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/50"
                      title="Connect a GitHub repository to this project"
                    >
                      <PiPlus size={16} />
                      <span>Add Repository</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="mb-5 flex items-center gap-3">
                <PiCalendarBlank size={22} className="text-[#2563EB] dark:text-blue-400" />

                <h2 className="text-lg font-bold text-[#172033] dark:text-white">
                  Project Timeline
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm text-[#64748B] dark:text-slate-400">Start Date</p>
                  <p className="mt-1 font-semibold text-[#172033] dark:text-slate-200">
                    {project.startDate || "Not set"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#64748B] dark:text-slate-400">End Date</p>
                  <p className="mt-1 font-semibold text-[#172033] dark:text-slate-200">
                    {project.endDate || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "team" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <PiUsersThree size={24} className="text-[#2563EB] dark:text-blue-400" />

                  <h2 className="text-xl font-bold text-[#172033] dark:text-white">
                    Project Team
                  </h2>
                </div>

                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                  Manage members assigned to this project.
                </p>
              </div>

              {canManageTeam && (
                <button
                  onClick={openAddMember}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  <PiPlus size={18} />
                  Add Member
                </button>
              )}
            </div>

            <div className="border-b border-slate-200 bg-[#F1F5F9] p-5 dark:border-slate-800 dark:bg-[#162032]">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                  Project Team Lead
                </p>

                <p className="font-semibold text-[#172033] dark:text-white">
                  {teamLeadName}
                </p>

                {!teamLeadMember && (
                  <p className="text-xs text-[#D97706] dark:text-amber-400">
                    A Team Lead is required before creating tasks.
                  </p>
                )}
              </div>
            </div>

            {projectMembers.length === 0 ? (
              <div className="p-10 text-center">
                <PiUsersThree
                  size={42}
                  className="mx-auto text-slate-300 dark:text-slate-600"
                />

                <h3 className="mt-4 font-semibold text-[#172033] dark:text-slate-200">
                  No team members
                </h3>

                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                  Add members to start building the project team.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
                      <th className="px-5 py-4">Member</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Project Role</th>
                      <th className="px-5 py-4">Status</th>

                      {canManageTeam && (
                        <th className="px-5 py-4 text-right">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {projectMembers.map((member) => (
                      <tr
                        key={`${member.userId}-${member.projectRole}`}
                        className="border-b border-slate-200 last:border-0 hover:bg-[#F1F5F9] dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                              <PiUserCircle
                                size={25}
                                className="text-slate-500 dark:text-slate-400"
                              />
                            </div>

                            <div>
                              <p className="font-semibold text-[#172033] dark:text-slate-100">
                                {member.user?.fullName ||
                                  member.user?.name ||
                                  "Unknown User"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#475569] dark:text-slate-400">
                          {member.user?.email || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563EB] dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
                            {member.projectRole}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {isCurrentUser(member) ? (
                            <select
                              value={member.status || "Active"}
                              onChange={(event) =>
                                handleMemberStatusChange(
                                  member,
                                  event.target.value
                                )
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-[#2563EB] ${getMemberStatusClass(
                                member.status || "Active"
                              )}`}
                              title="Update your status"
                            >
                              {MEMBER_STATUSES.map((status) => (
                                <option key={status} value={status} className="dark:bg-[#1e293b] dark:text-white">
                                  {status}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getMemberStatusClass(
                                member.status || "Active"
                              )}`}
                            >
                              {member.status || "Active"}
                            </span>
                          )}
                        </td>

                        {canManageTeam && (
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditMember(member)}
                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                                title="Edit"
                              >
                                <PiPencilSimple size={18} />
                              </button>

                              <button
                                onClick={() =>
                                  setConfirmDeleteMember(member)
                                }
                                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                                title="Delete"
                              >
                                <PiTrash size={18} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === "tasks" && (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2.5">
                  <PiListChecks size={26} className="text-[#2563EB] dark:text-blue-400" />

                  <h2 className="text-2xl font-bold text-[#172033] dark:text-white">
                    Task Management
                  </h2>

                  <span className="ml-2 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-[#4F46E5] dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {projectTasks.length}{" "}
                    {projectTasks.length === 1
                      ? "parent task"
                      : "parent tasks"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                  Decompose {project.name} into major deliverable parent work
                  items. Click any task to enter its workspace and manage
                  subtasks.
                </p>
              </div>

              {canManageTasks && (
                <button
                  onClick={openCreateTask}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110 active:scale-95"
                >
                  <PiPlus size={18} />
                  Add Task
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total Parent Tasks
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {taskStats.total}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">To Do</p>

                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {taskStats.toDo}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">In Progress</p>

                <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {taskStats.inProgress}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Completed</p>

                <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {taskStats.completed}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="text-lg font-bold text-[#172033] dark:text-white">
                  All Parent Tasks
                </h3>
              </div>

              {tasksLoading ? (
                <div className="p-10 text-center text-sm text-[#64748B] dark:text-slate-400">
                  Loading tasks...
                </div>
              ) : tasksError ? (
                <div className="p-10 text-center text-sm text-[#DC2626] dark:text-red-400">
                  {tasksError}
                </div>
              ) : projectTasks.length === 0 ? (
                <div className="p-10 text-center">
                  <PiCheck
                    size={40}
                    className="mx-auto text-slate-300 dark:text-slate-600"
                  />

                  <h3 className="mt-4 font-semibold text-[#172033] dark:text-slate-200">
                    No parent tasks yet
                  </h3>

                  <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                    Create a parent task to decompose project deliverables
                    into subtasks.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
                        <th className="px-5 py-4">#</th>
                        <th className="px-5 py-4">Parent Task</th>
                        <th className="px-5 py-4">Assignee</th>
                        <th className="px-5 py-4">Subtasks</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Priority</th>
                        <th className="px-5 py-4">Deadline</th>

                        {canManageTasks && (
                          <th className="px-5 py-4 text-right">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {projectTasks.map((task, index) => (
                        <tr
                          key={task.id}
                          onClick={() =>
                            navigate(
                              `/projects/${project.id}/tasks/${task.id}`
                            )
                          }
                          className="group cursor-pointer border-b border-slate-200 transition last:border-0 hover:bg-[#F1F5F9] dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                            {index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <div>
                              <p className="font-semibold text-[#172033] transition group-hover:text-[#2563EB] dark:text-slate-100 dark:group-hover:text-blue-400">
                                {task.title}
                              </p>

                              {task.description && (
                                <p className="mt-1 max-w-md truncate text-xs text-[#64748B] dark:text-slate-400">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <PiUserCircle
                                size={22}
                                className="text-slate-400"
                              />

                              <span className="text-sm text-[#475569] dark:text-slate-300">
                                {getTaskAssigneeName(task)}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {(() => {
                              const subCount = getSubtasksByTaskId
                                ? getSubtasksByTaskId(task.id).length
                                : 0;

                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                    subCount > 0
                                      ? "border-indigo-200 bg-indigo-50 text-[#4F46E5] dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300 group-hover:border-indigo-300"
                                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  <PiListChecks size={14} />
                                  {subCount}{" "}
                                  {subCount === 1 ? "subtask" : "subtasks"}
                                </span>
                              );
                            })()}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                                task.status
                              )}`}
                            >
                              {task.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClass(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-[#64748B] dark:text-slate-400">
                              <PiCalendarBlank size={18} />
                              {task.dueDate || "No deadline"}
                            </div>
                          </td>

                          {canManageTasks && (
                            <td
                              className="px-5 py-4 text-right"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div
                                className="inline-block text-left"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (taskMenuAnchor?.task?.id === task.id) {
                                      setTaskMenuAnchor(null);
                                    } else {
                                      const rect = event.currentTarget.getBoundingClientRect();
                                      setTaskMenuAnchor({
                                        task,
                                        top: rect.bottom + 6,
                                        right: window.innerWidth - rect.right,
                                      });
                                    }
                                  }}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                    taskMenuAnchor?.task?.id === task.id
                                      ? "border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-400 shadow-xs"
                                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  }`}
                                  title="Task actions"
                                  aria-expanded={taskMenuAnchor?.task?.id === task.id}
                                >
                                  <PiDotsThreeVertical size={18} weight="bold" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "devops" && (
          <DevOpsPipelineView
            project={project}
            canTriggerPipeline={canTriggerPipeline}
            onConnectRepo={() => setShowConnectRepo(true)}
          />
        )}
      </div>

      {showEditProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-[#172033] dark:text-white">
                  Edit Project
                </h2>

                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                  Update project information.
                </p>
              </div>

              <button
                onClick={() => setShowEditProject(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#172033] dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <PiX size={22} />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Project Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={projectForm.name}
                  onChange={handleProjectFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Project Code
                </label>

                <input
                  type="text"
                  name="code"
                  value={projectForm.code}
                  onChange={handleProjectFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Description
                </label>

                <textarea
                  name="description"
                  value={projectForm.description}
                  onChange={handleProjectFormChange}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Repository Link
                </label>

                <input
                  type="url"
                  name="repository"
                  value={projectForm.repository}
                  onChange={handleProjectFormChange}
                  placeholder="e.g. https://github.com/organization/repository"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                    Status
                  </label>

                  <select
                    name="status"
                    value={projectForm.status}
                    onChange={handleProjectFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                  >
                    <option value="Not Started" className="dark:bg-[#1e293b] dark:text-white">Not Started</option>
                    <option value="In Progress" className="dark:bg-[#1e293b] dark:text-white">In Progress</option>
                    <option value="On Hold" className="dark:bg-[#1e293b] dark:text-white">On Hold</option>
                    <option value="Completed" className="dark:bg-[#1e293b] dark:text-white">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                    Start Date
                  </label>

                  <input
                    type="date"
                    name="startDate"
                    value={projectForm.startDate}
                    onChange={handleProjectFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                    End Date
                  </label>

                  <input
                    type="date"
                    name="endDate"
                    value={projectForm.endDate}
                    onChange={handleProjectFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditProject(false)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-[#172033] dark:text-white">
                  {editingMember ? "Edit Team Member" : "Add Team Member"}
                </h2>

                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                  Assign a project role to the member.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAddMember(false);
                  setEditingMember(null);
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#172033] dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <PiX size={22} />
              </button>
            </div>

            <form onSubmit={handleMemberSubmit} className="space-y-5 p-5">
              {!editingMember ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                    User
                  </label>

                  <select
                    value={memberForm.userId}
                    onChange={(event) =>
                      setMemberForm((previous) => ({
                        ...previous,
                        userId: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                    required
                  >
                    <option value="" className="dark:bg-[#1e293b] dark:text-white">Select a user</option>

                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id} className="dark:bg-[#1e293b] dark:text-white">
                        {user.fullName || user.name} — {user.email}
                      </option>
                    ))}
                  </select>

                  {availableUsers.length === 0 && (
                    <p className="mt-2 text-xs text-[#64748B] dark:text-slate-400">
                      No available users to add.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                    User
                  </label>

                  <div className="rounded-xl border border-slate-200 bg-[#F1F5F9] px-4 py-3 dark:border-slate-800 dark:bg-[#162032]">
                    <p className="font-semibold text-[#172033] dark:text-slate-100">
                      {editingMember.user?.fullName ||
                        editingMember.user?.name ||
                        "Unknown User"}
                    </p>

                    <p className="text-sm text-[#64748B] dark:text-slate-400">
                      {editingMember.user?.email || ""}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Project Role
                </label>

                <select
                  value={memberForm.projectRole}
                  onChange={(event) =>
                    setMemberForm((previous) => ({
                      ...previous,
                      projectRole: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                  required
                >
                  {PROJECT_ROLES.map((role) => (
                    <option key={role} value={role} className="dark:bg-[#1e293b] dark:text-white">
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setEditingMember(null);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                >
                  {editingMember ? "Save Changes" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-[#172033] dark:text-white">
                  {editingTask ? "Edit Parent Task" : "Create Parent Task"}
                </h2>

                <p className="mt-1 text-sm text-[#64748B] dark:text-slate-400">
                  {editingTask
                    ? "Update parent task information."
                    : "Define a deliverable parent work item decomposed into subtasks."}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#172033] dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <PiX size={22} />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Parent Task Title *
                </label>

                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleTaskFormChange}
                  placeholder="e.g. Implement Core Authentication Service"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Description
                </label>

                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleTaskFormChange}
                  rows={4}
                  placeholder="Describe the high-level work item and deliverables..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Assignee
                </label>

                <select
                  name="assigneeId"
                  value={taskForm.assigneeId}
                  onChange={handleTaskFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                >
                  <option value="" className="dark:bg-[#1e293b] dark:text-white">Select Assignee</option>

                  {projectMembers.map((m) => (
                    <option key={m.userId} value={m.userId} className="dark:bg-[#1e293b] dark:text-white">
                      {m.user?.fullName ||
                        m.user?.name ||
                        `User #${m.userId}`}{" "}
                      — {m.projectRole}
                    </option>
                  ))}

                  {projectMembers.length === 0 &&
                    users.map((u) => (
                      <option key={u.id} value={u.id} className="dark:bg-[#1e293b] dark:text-white">
                        {u.fullName || u.name} ({u.email})
                      </option>
                    ))}
                </select>

                <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
                  Assign to any team member or lead on this project.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleTaskFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority} className="dark:bg-[#1e293b] dark:text-white">
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                    Status
                  </label>

                  <select
                    name="status"
                    value={taskForm.status}
                    onChange={handleTaskFormChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status} className="dark:bg-[#1e293b] dark:text-white">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200">
                  Due Date
                </label>

                <input
                  type="date"
                  name="dueDate"
                  value={taskForm.dueDate}
                  onChange={handleTaskFormChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
                >
                  {editingTask ? "Save Changes" : "Create Parent Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/50">
              <PiTrash size={24} className="text-[#DC2626] dark:text-red-400" />
            </div>

            <h2 className="mt-4 text-xl font-bold text-[#172033] dark:text-white">
              Remove Team Member?
            </h2>

            <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-[#172033] dark:text-slate-100">
                {confirmDeleteMember.user?.fullName ||
                  confirmDeleteMember.user?.name}
              </span>{" "}
              from this project?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteMember(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteMember}
                className="rounded-xl bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/50">
              <PiTrash size={24} className="text-[#DC2626] dark:text-red-400" />
            </div>

            <h2 className="mt-4 text-xl font-bold text-[#172033] dark:text-white">
              Delete Parent Task?
            </h2>

            <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#172033] dark:text-slate-100">
                {confirmDeleteTask.title}
              </span>
              ? This will also remove any decomposed subtasks under this
              parent task.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteTask(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteTask}
                className="rounded-xl bg-[#DC2626] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Delete Parent Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Menu rendered OUTSIDE the table/list via React Portal */}
      {taskMenuAnchor && createPortal(
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          onClick={() => setTaskMenuAnchor(null)}
        >
          <div
            className="fixed z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-[#1e293b] text-left animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${Math.min(taskMenuAnchor.top, window.innerHeight - 260)}px`,
              right: `${Math.max(16, taskMenuAnchor.right)}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Parent Task Actions
              </span>
              <button
                type="button"
                onClick={() => setTaskMenuAnchor(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
              >
                <PiX size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  const task = taskMenuAnchor.task;
                  setTaskMenuAnchor(null);
                  navigate(`/projects/${project.id}/tasks/${task.id}`);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shrink-0">
                  <PiArrowSquareOut size={15} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Open Task Details</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">View deliverables & description</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const task = taskMenuAnchor.task;
                  setTaskMenuAnchor(null);
                  navigate(`/projects/${project.id}/tasks/${task.id}/subtasks`);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 shrink-0">
                  <PiListChecks size={15} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Manage Subtasks</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">View & decompose subtasks</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const task = taskMenuAnchor.task;
                  setTaskMenuAnchor(null);
                  openEditTask(task);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-amber-950/50 dark:hover:text-amber-300 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
                  <PiPencilSimple size={15} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Edit Parent Task</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">Modify title & details</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const task = taskMenuAnchor.task;
                  setTaskMenuAnchor(null);
                  setConfirmDeleteTask(task);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 shrink-0">
                  <PiTrash size={15} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Delete Parent Task</p>
                  <p className="text-[10px] text-rose-400/80 dark:text-rose-400/80 font-normal">Permanently remove</p>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Connect GitHub Repository Modal */}
      {showConnectRepo && project && (
        <ConnectRepoModal
          isOpen={showConnectRepo}
          project={project}
          onClose={() => setShowConnectRepo(false)}
        />
      )}
    </div>
  );
};

export default ProjectWorkspace;