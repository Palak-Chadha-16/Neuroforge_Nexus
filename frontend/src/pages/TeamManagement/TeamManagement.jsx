import { useState } from "react";
import { IoAddSharp } from "react-icons/io5";
import { useTeams } from "../../context/TeamsContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useAuth } from "../../context/AuthContextStore.js";
import { ROLES, normalizeRole } from "../../constants/roles.js";
import TeamTable from "../../components/team/TeamTable.jsx";
import EditMemberForm from "../../components/team/EditMemberForm.jsx";

const TEAM_ROLES = ["Team Lead", "Developer", "Tester", "QA"];

const SYSTEM_ROLE_BY_TEAM_ROLE = {
  "Team Lead": [ROLES.TEAM_LEAD],
  Developer: [ROLES.DEVELOPER, ROLES.TEAM_MEMBER],
  Tester: [ROLES.TESTER],
  QA: [ROLES.QA],
};

const getProjectId = (team) => team?.projectId ?? team?.project?.id ?? null;
const getMemberUserId = (member) =>
  member?.userId ?? member?.user?.id ?? member?.id;

const normalizeTeamRole = (role) =>
  String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isTeamLead = (member) =>
  normalizeTeamRole(member?.teamRole) === "team lead";

const isUserActive = (user) =>
  user?.active !== false &&
  String(user?.status ?? "active").trim().toLowerCase() !== "inactive";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const TeamManagement = () => {
  const { currentUser } = useAuth();

  const {
    teams: contextTeams,
    loading: teamsLoading,
    error: teamsError,
    createTeam,
    updateTeam,
    deleteTeam,
    addMember,
    updateMember,
    removeMember,
  } = useTeams();

  const {
    users: contextUsers,
    loading: usersLoading,
    error: usersError,
    refetchUsers,
  } = useUsers();

  const { projects: contextProjects } = useProjects();

  const teams = Array.isArray(contextTeams) ? contextTeams : [];
  const users = Array.isArray(contextUsers) ? contextUsers : [];
  const projects = Array.isArray(contextProjects) ? contextProjects : [];

  const currentRole = normalizeRole(currentUser?.role);
  const currentUserId = String(currentUser?.id ?? "");

  const canManageTeams = [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.PROJECT_LEAD,
    ROLES.TEAM_LEAD,
  ].includes(currentRole);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamProjectId, setNewTeamProjectId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [editingMember, setEditingMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [teamRole, setTeamRole] = useState("Developer");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");

  const projectsLedByTeamLead = new Set(
    teams
      .filter(
        (team) =>
          String(team.teamLeadId ?? "") === currentUserId ||
          (team.members || []).some(
            (member) =>
              String(getMemberUserId(member) ?? "") === currentUserId &&
              isTeamLead(member),
          ),
      )
      .map((team) => String(getProjectId(team) ?? ""))
      .filter(Boolean),
  );

  const manageableProjects = projects.filter((project) => {
    if (currentRole === ROLES.ADMIN) return true;

    if (currentRole === ROLES.PROJECT_MANAGER) {
      const managerId =
        project.projectManager?.id ??
        project.projectManagerId ??
        project.managerId;

      return String(managerId ?? "") === currentUserId;
    }

    if (currentRole === ROLES.PROJECT_LEAD) {
      const leadId =
        project.projectLead?.id ??
        project.projectLeadId ??
        project.leadId;

      return String(leadId ?? "") === currentUserId;
    }

    if (currentRole === ROLES.TEAM_LEAD) {
      const projectId = String(project.id ?? "");

      return (
        projectsLedByTeamLead.has(projectId) ||
        String(project.team?.leadId ?? "") === currentUserId ||
        (project.members || []).some(
          (member) =>
            String(member.userId ?? member.id ?? "") === currentUserId &&
            isTeamLead(member),
        )
      );
    }

    return false;
  });

  const manageableProjectIds = new Set(
    manageableProjects.map((project) => String(project.id)),
  );

  const manageableTeams = teams.filter((team) => {
    if (currentRole === ROLES.ADMIN) return true;

    const projectId = String(getProjectId(team) ?? "");

    if (currentRole === ROLES.TEAM_LEAD) {
      const isAssignedTeamLead =
        String(team.teamLeadId ?? "") === currentUserId ||
        (team.members || []).some(
          (member) =>
            String(getMemberUserId(member) ?? "") === currentUserId &&
            isTeamLead(member),
        );

      return (
        isAssignedTeamLead || manageableProjectIds.has(projectId)
      );
    }

    return manageableProjectIds.has(projectId);
  });

  const availableProjectsForNewTeam = manageableProjects.filter(
    (project) =>
      !teams.some(
        (team) =>
          String(getProjectId(team) ?? "") === String(project.id),
      ),
  );

  const filteredTeams = manageableTeams
    .filter((team) => {
      if (
        projectFilter !== "all" &&
        String(getProjectId(team)) !== String(projectFilter)
      ) {
        return false;
      }

      const project = projects.find(
        (item) => String(item.id) === String(getProjectId(team)),
      );

      const searchText = [
        team.name,
        team.teamCode,
        team.projectName,
        team.projectCode,
        project?.name,
        project?.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(searchTerm.trim().toLowerCase());
    })
    .sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? "")),
    );

  const activeTeam =
    filteredTeams.find(
      (team) => String(team.id) === String(activeTeamId),
    ) ??
    filteredTeams[0] ??
    null;

  const activeProjectId = getProjectId(activeTeam);

  const activeProject = projects.find(
    (project) => String(project.id) === String(activeProjectId),
  );

  const activeProjectName =
    activeTeam?.projectName ??
    activeProject?.name ??
    "Unlinked project";

  const projectHasTeamLead = Boolean(
    activeTeam &&
      teams.some(
        (team) =>
          String(getProjectId(team) ?? "") ===
            String(activeProjectId ?? "") &&
          (team.teamLeadId != null ||
            (team.members || []).some(isTeamLead)),
      ),
  );

  const assignableUsers = users.filter((user) => {
    if (!activeTeam || !isUserActive(user)) return false;

    if (teamRole === "Team Lead" && projectHasTeamLead) {
      return false;
    }

    const allowedRoles = SYSTEM_ROLE_BY_TEAM_ROLE[teamRole] || [];

    if (!allowedRoles.includes(normalizeRole(user.role))) {
      return false;
    }

    const alreadyMember = (activeTeam.members || []).some(
      (member) =>
        String(getMemberUserId(member)) === String(user.id),
    );

    return !alreadyMember;
  });

  const resetMemberForm = () => {
    setSelectedUserId("");
    setTeamRole("Developer");
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();

    const name = newTeamName.trim();

    if (!name) return;

    if (!newTeamProjectId) {
      window.alert("Select a project for this team.");
      return;
    }

    const result = await createTeam(
      name,
      Number(newTeamProjectId),
    );

    if (!result.success) {
      window.alert(
        result.message || "Could not create the team.",
      );
      return;
    }

    const createdForProject = String(newTeamProjectId);

    setNewTeamName("");
    setNewTeamProjectId("");
    setShowCreateModal(false);
    setActiveTeamId(null);
    setProjectFilter(createdForProject);
    setSearchTerm("");
  };

  const handleEditTeam = () => {
    if (!activeTeam) return;

    setEditingTeamId(activeTeam.id);
    setEditingTeamName(activeTeam.name ?? "");
  };

  const handleSaveTeam = async (event) => {
    event.preventDefault();

    if (!activeTeam || !editingTeamName.trim()) return;

    const result = await updateTeam(activeTeam.id, {
      name: editingTeamName.trim(),
    });

    if (!result.success) {
      window.alert(
        result.message || "Could not update the team.",
      );
      return;
    }

    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleCancelEditTeam = () => {
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${activeTeam.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    const result = await deleteTeam(activeTeam.id);

    if (!result.success) {
      window.alert(
        result.message || "Could not delete the team.",
      );
      return;
    }

    setActiveTeamId(null);
    setEditingMember(null);
    setShowAddMember(false);
    setEditingTeamId(null);
    setEditingTeamName("");
    resetMemberForm();
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    const user = assignableUsers.find(
      (candidate) =>
        String(candidate.id) === String(selectedUserId),
    );

    if (!user || !activeTeam) {
      window.alert(
        "Select an eligible active user whose system role matches the team role.",
      );
      return;
    }

    const alreadyMember = (activeTeam.members || []).some(
      (member) =>
        String(getMemberUserId(member)) === String(user.id),
    );

    if (alreadyMember) {
      window.alert(
        `${user.fullName || user.name || "This user"} is already a member of this team.`,
      );
      return;
    }

    const result = await addMember(activeTeam.id, {
      userId: user.id,
      teamRole,
    });

    if (!result.success) {
      window.alert(
        result.message || "Could not add the team member.",
      );
      return;
    }

    resetMemberForm();
    setShowAddMember(false);
  };

  const handleSaveMember = async (updated) => {
    if (!activeTeam) return;

    const result = await updateMember(
      activeTeam.id,
      updated.userId,
      updated,
    );

    if (!result.success) {
      window.alert(
        result.message || "Could not update the member role.",
      );
      return;
    }

    setEditingMember(null);
  };

  const handleRemoveMember = async (member) => {
    if (!activeTeam) return;

    const confirmed = window.confirm(
      `Remove ${member.fullName || "this member"} from ${activeTeam.name}?`,
    );

    if (!confirmed) return;

    const result = await removeMember(
      activeTeam.id,
      getMemberUserId(member),
    );

    if (!result.success) {
      window.alert(
        result.message || "Could not remove the team member.",
      );
    }
  };

  const openCreateModal = () => {
    setNewTeamName("");
    setNewTeamProjectId(
      availableProjectsForNewTeam[0]?.id?.toString() ?? "",
    );
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Workspace / Organization
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Teams
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage project teams, members, and team responsibilities.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={
            !canManageTeams ||
            teamsLoading ||
            availableProjectsForNewTeam.length === 0
          }
          title={
            availableProjectsForNewTeam.length === 0
              ? "Every accessible project already has a team"
              : "Create a team"
          }
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 lg:self-auto"
        >
          <IoAddSharp size={18} />
          Create Team
        </button>
      </header>

      {(teamsError || (!canManageTeams && !teamsLoading)) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {teamsError ||
            "Your role does not have permission to manage teams."}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search teams</span>

            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <circle
                cx="10.8"
                cy="10.8"
                r="6.8"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="m16 16 4.2 4.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search teams or projects..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
            />
          </label>

          <label className="block md:w-64">
            <span className="sr-only">
              Filter teams by project
            </span>

            <select
              value={projectFilter}
              onChange={(event) =>
                setProjectFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="all">
                All accessible projects
              </option>

              {manageableProjects.map((project) => (
                <option
                  key={project.id}
                  value={String(project.id)}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {teamsLoading && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading teams...
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Team list
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {filteredTeams.length}{" "}
                {filteredTeams.length === 1 ? "team" : "teams"}
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {manageableTeams.length}
            </span>
          </div>

          <div className="max-h-[360px] space-y-1 overflow-y-auto p-2 lg:max-h-[calc(100vh-340px)]">
            {filteredTeams.map((team) => {
              const selected =
                String(activeTeam?.id) === String(team.id);

              const project = projects.find(
                (item) =>
                  String(item.id) ===
                  String(getProjectId(team)),
              );

              const projectName =
                team.projectName ??
                project?.name ??
                "Unlinked project";

              const memberCount = Array.isArray(team.members)
                ? team.members.length
                : Number(team.memberCount ?? 0);

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    setActiveTeamId(team.id);
                    setEditingMember(null);
                    setShowAddMember(false);
                    setEditingTeamId(null);
                    setEditingTeamName("");
                  }}
                  aria-current={selected ? "true" : undefined}
                  className={cx(
                    "group flex w-full min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition",
                    selected
                      ? "border-blue-200 bg-blue-50 ring-1 ring-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:ring-blue-900"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/70",
                  )}
                >
                  <span
                    className={cx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                    )}
                  >
                    {String(team.name ?? "T")
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "T"}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cx(
                        "block truncate text-sm font-semibold",
                        selected
                          ? "text-blue-800 dark:text-blue-200"
                          : "text-slate-800 dark:text-slate-100",
                      )}
                      title={team.name}
                    >
                      {team.name || "Unnamed team"}
                    </span>

                    <span
                      className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400"
                      title={projectName}
                    >
                      {projectName}
                    </span>

                    <span className="mt-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {memberCount}{" "}
                      {memberCount === 1 ? "member" : "members"}
                    </span>
                  </span>

                  <span
                    className={cx(
                      "mt-1 text-slate-400 transition",
                      selected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100",
                    )}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              );
            })}

            {!teamsLoading && filteredTeams.length === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <path
                      d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {manageableTeams.length === 0
                    ? "No teams yet"
                    : "No matching teams"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {manageableTeams.length === 0
                    ? "Create a team for one of your accessible projects."
                    : "Try another search term or project filter."}
                </p>

                {manageableTeams.length === 0 &&
                  availableProjectsForNewTeam.length > 0 &&
                  canManageTeams && (
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      <IoAddSharp size={15} />
                      Create Team
                    </button>
                  )}
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0">
          {activeTeam ? (
            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    {editingTeamId === activeTeam.id ? (
                      <form
                        onSubmit={handleSaveTeam}
                        className="flex max-w-xl flex-col gap-2 sm:flex-row"
                      >
                        <label className="min-w-0 flex-1">
                          <span className="sr-only">Team name</span>

                          <input
                            autoFocus
                            type="text"
                            value={editingTeamName}
                            onChange={(event) =>
                              setEditingTeamName(event.target.value)
                            }
                            required
                            maxLength={120}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>

                        <button
                          type="submit"
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelEditTeam}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="break-words text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                            {activeTeam.name || "Unnamed team"}
                          </h2>

                          {activeTeam.teamCode && (
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {activeTeam.teamCode}
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                          <span>{activeProjectName}</span>
                          {activeProject?.code && (
                            <span>· {activeProject.code}</span>
                          )}
                        </p>

                        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {(activeTeam.members || []).length} team{" "}
                          {(activeTeam.members || []).length === 1
                            ? "member"
                            : "members"}
                        </p>
                      </>
                    )}
                  </div>

                  {canManageTeams &&
                    editingTeamId !== activeTeam.id && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleEditTeam}
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Edit Team
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteTeam}
                          className="rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:hover:bg-red-950/30"
                        >
                          Delete
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAddMember((visible) => !visible);
                            if (!showAddMember) resetMemberForm();
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                        >
                          <IoAddSharp size={17} />
                          Add Member
                        </button>
                      </div>
                    )}
                </div>
              </div>

              {showAddMember && canManageTeams && (
                <div className="border-b border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Add a team member
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Choose a user whose system role matches the team role.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>

                  <form
                    onSubmit={handleAddMember}
                    className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto] md:items-end"
                  >
                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        User
                      </span>

                      <select
                        value={selectedUserId}
                        onChange={(event) =>
                          setSelectedUserId(event.target.value)
                        }
                        required
                        disabled={
                          usersLoading ||
                          Boolean(usersError) ||
                          assignableUsers.length === 0
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                      >
                        <option value="">
                          {usersLoading
                            ? "Loading eligible users..."
                            : usersError
                              ? "Users could not be loaded"
                              : assignableUsers.length === 0
                                ? teamRole === "Team Lead" &&
                                  projectHasTeamLead
                                  ? "Project already has a Team Lead"
                                  : "No eligible active users"
                                : "Select a user"}
                        </option>

                        {assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.displayName ||
                              user.fullName ||
                              user.name ||
                              "User"}
                            {user.email ? ` (${user.email})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Team role
                      </span>

                      <select
                        value={teamRole}
                        onChange={(event) => {
                          setTeamRole(event.target.value);
                          setSelectedUserId("");
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {TEAM_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="submit"
                      disabled={
                        usersLoading ||
                        Boolean(usersError) ||
                        !selectedUserId ||
                        !canManageTeams
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Member
                    </button>

                    {usersError ? (
                      <div
                        className="flex flex-wrap items-center gap-2 text-xs text-red-700 md:col-span-3"
                        role="alert"
                      >
                        <span>{usersError}</span>

                        <button
                          type="button"
                          onClick={refetchUsers}
                          className="font-semibold underline underline-offset-2"
                        >
                          Retry loading users
                        </button>
                      </div>
                    ) : (
                      !usersLoading &&
                      assignableUsers.length === 0 && (
                        <p
                          className="text-xs text-slate-500 dark:text-slate-400 md:col-span-3"
                          role="status"
                        >
                          {teamRole === "Team Lead" &&
                          projectHasTeamLead
                            ? "This project already has a Team Lead. Remove or change the existing lead before assigning another."
                            : "No eligible active users are available for this team role. Check user roles and active status in User Management."}
                        </p>
                      )
                    )}
                  </form>
                </div>
              )}

              <div className="p-3 sm:p-5">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Team members
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Manage member roles and team access.
                    </p>
                  </div>
                </div>

                <TeamTable
                  members={activeTeam.members || []}
                  onEdit={(member) => setEditingMember(member)}
                  onRemove={handleRemoveMember}
                />
              </div>
            </section>
          ) : (
            <section className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-7 w-7"
                >
                  <path
                    d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                {manageableTeams.length === 0
                  ? "Create your first team"
                  : "Select a team"}
              </h2>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                {manageableTeams.length === 0
                  ? "Create a team for an accessible project to assign a Team Lead and members."
                  : "Choose a team from the list to view and manage its members."}
              </p>

              {manageableTeams.length === 0 &&
                canManageTeams &&
                availableProjectsForNewTeam.length > 0 && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <IoAddSharp size={17} />
                    Create Team
                  </button>
                )}
            </section>
          )}
        </main>
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-team-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div>
                <h2
                  id="create-team-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Create a team
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Choose a name and link the team to a project.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close create team dialog"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateTeam}
              className="space-y-4 p-5 sm:p-6"
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Team name <span className="text-red-500">*</span>
                </span>

                <input
                  autoFocus
                  type="text"
                  value={newTeamName}
                  onChange={(event) =>
                    setNewTeamName(event.target.value)
                  }
                  placeholder="e.g. LMS Development Team"
                  maxLength={120}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Project <span className="text-red-500">*</span>
                </span>

                <select
                  value={newTeamProjectId}
                  onChange={(event) =>
                    setNewTeamProjectId(event.target.value)
                  }
                  required
                  disabled={availableProjectsForNewTeam.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800"
                >
                  <option value="">Select a project</option>

                  {availableProjectsForNewTeam.map((project) => (
                    <option
                      key={project.id}
                      value={String(project.id)}
                    >
                      {project.name}
                      {project.code ? ` (${project.code})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {availableProjectsForNewTeam.length === 0 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  Every accessible project already has a team.
                  Select another project or delete an existing team
                  before creating one.
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    teamsLoading ||
                    availableProjectsForNewTeam.length === 0 ||
                    !newTeamName.trim() ||
                    !newTeamProjectId
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IoAddSharp size={17} />
                  Create Team
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editingMember && activeTeam && (
        <EditMemberForm
          member={editingMember}
          onCancel={() => setEditingMember(null)}
          onSave={handleSaveMember}
        />
      )}
    </div>
  );
};

export default TeamManagement;