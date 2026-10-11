import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useTeams } from "../../context/TeamsContextStore.js";
import { useProjectTeam } from "../../context/ProjectTeamContextStore.js";
import { useAuth } from "../../context/AuthContextStore.js";
import { usePermission } from "../../hooks/usePermission.js";
import Can from "../../components/common/Can.jsx";
import { ROLES, normalizeRole } from "../../constants/roles.js";
import {
  PiPlus,
  PiFolder,
  PiTrash,
  PiPencilSimple,
  PiDotsThreeVertical,
  PiArrowSquareOut,
  PiGithubLogo,
} from "react-icons/pi";
import ConnectRepoModal from "../../components/project/ConnectRepoModal.jsx";

// Builds a project code from the project name, e.g. "Cloud Migration Suite" -> "CMS-101".
// If the code already exists, the number goes up (CMS-102, CMS-103, ...).
const generateProjectCode = (name, existingCodes) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const raw =
    words.length === 1
      ? words[0].slice(0, 3)
      : words.map((w) => w[0]).join("").slice(0, 4);

  const prefix = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!prefix) return "";

  let n = 101;
  while (existingCodes.includes(`${prefix}-${n}`)) n++;

  return `${prefix}-${n}`;
};

const ProjectManagement = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { can } = usePermission();

  const {
    projects,
    error: projectsError,
    createProject,
    updateProject,
    updateProjectStatus,
    deleteProject,
    getVisibleProjects,
  } = useProjects();

  const { users, error: usersError } = useUsers();
  const { teams, loading: teamsLoading, error: teamsError } = useTeams();
  const { projectTeams } = useProjectTeam();

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState(null);
  const [connectRepoProject, setConnectRepoProject] = useState(null);

  // Close 3-dots action menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".project-actions-menu")) {
        setActiveMenuProjectId(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveMenuProjectId(null);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // true once the user types in the Project Code field by hand
  const [codeEdited, setCodeEdited] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    repository: "",
    projectLead: "",
    projectManager: "",
    teamId: "",
    status: "Not Started",
    startDate: "",
    endDate: "",
  });

  const visibleProjects = getVisibleProjects(
    currentUser,
    projectTeams,
    teams
  );

  const currentRole = normalizeRole(currentUser?.role);
  const activeUsers = users.filter((user) => user.status !== "Inactive");
  const projectLeadUsers = activeUsers.filter((user) =>
    [ROLES.PROJECT_LEAD, ROLES.ADMIN].includes(normalizeRole(user.role))
  );
  const projectManagerUsers = activeUsers.filter((user) =>
    [ROLES.PROJECT_MANAGER, ROLES.ADMIN].includes(normalizeRole(user.role))
  );
  const selectableTeams = teams.filter((team) =>
    !team.projectId ||
    (editingProject && String(team.projectId) === String(editingProject.id))
  );

  const showActions =
    (currentRole === ROLES.ADMIN || currentRole === ROLES.PROJECT_MANAGER) &&
    (can("project:edit") || can("project:delete"));

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Typing in the code field: stop auto-filling it
    if (name === "code") {
      setCodeEdited(true);
      setForm((prev) => ({ ...prev, code: value }));
      return;
    }

    // Typing the project name: auto-generate the code (unless edited by hand)
    if (name === "name") {
      setForm((prev) => ({
        ...prev,
        name: value,
        code: codeEdited
          ? prev.code
          : generateProjectCode(
              value,
              (projects || []).map((p) => p.code)
            ),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      code: "",
      description: "",
      repository: "",
      projectLead: "",
      projectManager: "",
      teamId: "",
      status: "Not Started",
      startDate: "",
      endDate: "",
    });

    setCodeEdited(false);
    setEditingProject(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Project name is required.");
      return;
    }

        if (editingProject) {
      const result = await updateProject({
        ...form,
        id: editingProject.id,
      });

      if (!result.success) {
        alert(result.message);
        return;
      }
    } else {
      const result = await createProject(form);

      if (!result.success) {
        alert(result.message);
        return;
      }
    }

    resetForm();
  };

  const handleCreateClick = () => {
    setCodeEdited(false);
    setEditingProject(null);

    setForm({
      name: "",
      code: "",
      description: "",
      repository: "",
      projectLead: "",
      projectManager: "",
      teamId: "",
      status: "Not Started",
      startDate: "",
      endDate: "",
    });

    setShowForm(true);
  };

  const handleEdit = (project, event) => {
    event.stopPropagation();

    // Keep the existing code when the name of an existing project changes
    setCodeEdited(true);
    setEditingProject(project);

    setForm({
      name: project.name || "",
      code: project.code || "",
      description: project.description || "",
      repository: project.repository || "",
      projectLead: String(
        project.projectLead?.id ?? project.projectLeadId ?? ""
      ),
      projectManager: String(
        project.projectManager?.id ?? project.projectManagerId ?? ""
      ),
      teamId: String(project.team?.id ?? project.teamId ?? ""),
      status: project.status || "Not Started",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
    });

    setShowForm(true);
  };

  const handleDelete = async (projectId, event) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

        const result = await deleteProject(projectId);

    if (!result.success) {
      alert(result.message);
    }
  };

  return (
    <div className="space-y-8 text-[#172033] dark:text-slate-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] dark:text-blue-400">
            Portfolio Management
          </span>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#172033] dark:text-white sm:text-3xl">
            Projects
          </h1>

          <p className="mt-1 text-sm text-[#475569] dark:text-slate-400">
            Select a project to enter its workspace and view its decomposed
            tasks.
          </p>
        </div>

        <Can perform="project:create">
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
          >
            <PiPlus size={18} />
            Create Project
          </button>
        </Can>
      </div>

      {(projectsError || usersError || teamsError) && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {projectsError || usersError || teamsError}
        </p>
      )}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#172033] dark:text-white">
                {editingProject ? "Edit Project" : "Create New Project"}
              </h2>

              <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
                Configure delivery timeline, managers, and assigned
                engineering team.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-[#172033] dark:hover:bg-slate-800 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                  Project Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Cloud Migration Suite"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                  Project Code
                </label>

                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. CMS-101"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="Scope and purpose of this project..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#172033] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                Repository Link
              </label>

              <input
                type="url"
                name="repository"
                value={form.repository}
                onChange={handleChange}
                placeholder="e.g. https://github.com/organization/repository"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                  Project Lead
                </label>

                <select
                  name="projectLead"
                  value={form.projectLead}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                >
                  <option value="" className="dark:bg-[#1e293b] dark:text-white">Select Project Lead</option>

                  {projectLeadUsers.map((user) => (
                    <option key={user.id} value={user.id} className="dark:bg-[#1e293b] dark:text-white">
                      {user.fullName}{" "}
                      {user.status === "Inactive" ? "(Inactive)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                  Project Manager
                </label>

                <select
                  name="projectManager"
                  value={form.projectManager}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                >
                  <option value="" className="dark:bg-[#1e293b] dark:text-white">Select Project Manager</option>

                  {projectManagerUsers.map((user) => (
                    <option key={user.id} value={user.id} className="dark:bg-[#1e293b] dark:text-white">
                      {user.fullName}{" "}
                      {user.status === "Inactive" ? "(Inactive)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                Project Team
              </label>
              <select
                name="teamId"
                value={form.teamId}
                onChange={handleChange}
                disabled={teamsLoading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
              >
                <option value="">
                  {editingProject ? "Keep current team" : "Create a default team"}
                </option>
                {selectableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}{team.projectName ? ` — ${team.projectName}` : ""}
                  </option>
                ))}
              </select>
              {!teamsLoading && teams.length === 0 && (
                <p className="mt-1 text-xs text-[#64748B]">
                  No existing teams are available; a default team will be created.
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                >
                  <option value="Not Started" className="dark:bg-[#1e293b] dark:text-white">Not Started</option>
                  <option value="In Progress" className="dark:bg-[#1e293b] dark:text-white">In Progress</option>
                  <option value="Completed" className="dark:bg-[#1e293b] dark:text-white">Completed</option>
                  <option value="On Hold" className="dark:bg-[#1e293b] dark:text-white">On Hold</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                  Start Date
                </label>

                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                  End Date
                </label>

                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
              >
                {editingProject ? "Update Project" : "Save Project"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-[#172033] dark:text-white">
              Project Workspaces
            </h2>

            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Click any project to enter its detailed workspace
            </p>
          </div>

          <span className="text-xs font-medium text-[#64748B] dark:text-slate-400">
            Showing {visibleProjects.length} projects
          </span>
        </div>

        {visibleProjects.length === 0 ? (
          <div className="py-16 text-center">
            <PiFolder
              size={44}
              className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
            />

            <h3 className="text-base font-medium text-[#172033] dark:text-slate-100">
              No projects found in your scope
            </h3>

            <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
              You are not currently assigned to any active projects.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px] pb-16">
            <table className="w-full min-w-[750px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Project</th>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Project Lead</th>
                  <th className="px-6 py-3.5">Project Manager</th>
                  <th className="px-6 py-3.5">Team Members</th>
                  <th className="px-6 py-3.5">Repository</th>
                  <th className="px-6 py-3.5">Status</th>
                  {showActions && (
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                {visibleProjects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="group cursor-pointer transition hover:bg-[#F1F5F9] dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-[#172033] transition group-hover:text-[#2563EB] dark:text-slate-100 dark:group-hover:text-blue-400">
                          {project.name}
                        </span>

                        {project.description && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-[#64748B] dark:text-slate-400">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {project.code || "NO-CODE"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {project.projectLead?.fullName || "—"}
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {project.projectManager?.fullName || "—"}
                    </td>

                    <td className="px-6 py-4 text-xs">
                      {(() => {
                        const count =
                          projectTeams?.[String(project.id)]?.length || 0;

                        return (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {count} {count === 1 ? "member" : "members"}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                      {project.repository ? (
                        <a
                          href={
                            project.repository.startsWith("http")
                              ? project.repository
                              : `https://${project.repository}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-750"
                          title={`Open GitHub Repository: ${project.repository}`}
                        >
                          <PiGithubLogo size={16} className="text-slate-900 dark:text-white" />
                          <span>Connected</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setConnectRepoProject(project);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50/70 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] transition hover:border-blue-400 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-800/80 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/50"
                          title="Connect a GitHub repository to this project"
                        >
                          <PiPlus size={13} />
                          <span>Add Repository</span>
                        </button>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {showActions ? (
                        <select
                          value={project.status || "Not Started"}
                          onClick={(event) => event.stopPropagation()}
                          onChange={async (event) => {
                            event.stopPropagation();

                            const newStatus = event.target.value;

                                                        const result = await updateProjectStatus(
                              project.id,
                              newStatus
                            );

                            if (result && !result.success) {
                              alert(
                                result.message ||
                                  "Failed to update project status"
                              );
                            }
                          }}
                          className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition ${
                            project.status === "Completed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : project.status === "In Progress"
                              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"
                              : project.status === "On Hold"
                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300"
                              : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <option value="Not Started" className="dark:bg-[#1e293b] dark:text-white">Not Started</option>
                          <option value="In Progress" className="dark:bg-[#1e293b] dark:text-white">In Progress</option>
                          <option value="On Hold" className="dark:bg-[#1e293b] dark:text-white">On Hold</option>
                          <option value="Completed" className="dark:bg-[#1e293b] dark:text-white">Completed</option>
                        </select>
                      ) : (
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                            project.status === "Completed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : project.status === "In Progress"
                              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"
                              : project.status === "On Hold"
                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300"
                              : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {project.status || "Not Started"}
                        </span>
                      )}
                    </td>

                    {showActions && (
                      <td className="px-6 py-4 text-right">
                        <div
                          className="project-actions-menu relative inline-block text-left"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveMenuProjectId((prev) =>
                                prev === project.id ? null : project.id
                              );
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                              activeMenuProjectId === project.id
                                ? "border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-400 shadow-xs"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            }`}
                            title="Project actions"
                            aria-expanded={activeMenuProjectId === project.id}
                          >
                            <PiDotsThreeVertical size={18} weight="bold" />
                          </button>

                          {activeMenuProjectId === project.id && (
                            <div
                              className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#1e293b] text-left animate-in fade-in zoom-in-95 duration-100"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveMenuProjectId(null);
                                  navigate(`/projects/${project.id}`);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700/60 dark:hover:text-white transition"
                              >
                                <PiArrowSquareOut size={16} className="text-blue-500 dark:text-blue-400" />
                                <span>Open Workspace</span>
                              </button>

                              <Can perform="project:edit">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveMenuProjectId(null);
                                    handleEdit(project, event);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700/60 dark:hover:text-white transition"
                                >
                                  <PiPencilSimple size={16} className="text-slate-500 dark:text-slate-400" />
                                  <span>Edit Project</span>
                                </button>
                              </Can>

                              <Can perform="project:delete">
                                <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveMenuProjectId(null);
                                    handleDelete(project.id, event);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition"
                                >
                                  <PiTrash size={16} />
                                  <span>Delete Project</span>
                                </button>
                              </Can>
                            </div>
                          )}
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

      {connectRepoProject && (
        <ConnectRepoModal
          isOpen={Boolean(connectRepoProject)}
          project={connectRepoProject}
          onClose={() => setConnectRepoProject(null)}
        />
      )}
    </div>
  );
};

export default ProjectManagement;