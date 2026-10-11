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

const TeamManagement = () => {
  const { currentUser } = useAuth();
  const {
    teams,
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
    users,
    loading: usersLoading,
    error: usersError,
    refetchUsers,
  } = useUsers();
  const { projects } = useProjects();

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamProjectId, setNewTeamProjectId] = useState("");
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [teamRole, setTeamRole] = useState("Developer");

  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");

  const manageableProjects = projects.filter((project) =>
    normalizeRole(currentUser?.role) === ROLES.ADMIN ||
    String(project.projectManager?.id ?? project.projectManagerId) === String(currentUser?.id)
  );
  const manageableTeams = teams.filter((team) =>
    normalizeRole(currentUser?.role) === ROLES.ADMIN ||
    manageableProjects.some((project) => String(project.id) === String(team.projectId))
  );
  const visibleActiveTeamId = activeTeamId ?? manageableTeams[0]?.id ?? null;
  const visibleActiveTeam = manageableTeams.find(
    (team) => String(team.id) === String(visibleActiveTeamId)
  );
  const activeTeam = visibleActiveTeam;
  const assignableUsers = users.filter((user) =>
    user.active !== false &&
    user.status !== "Inactive" &&
    SYSTEM_ROLE_BY_TEAM_ROLE[teamRole]?.includes(normalizeRole(user.role)) &&
    !(visibleActiveTeam?.members || []).some((member) => String(member.userId) === String(user.id)) &&
    !(teamRole === "Team Lead" && teams.some((team) =>
      String(team.projectId) === String(visibleActiveTeam?.projectId) &&
      String(team.id) !== String(visibleActiveTeam?.id) &&
      (team.members || []).some((member) =>
        String(member.userId) === String(user.id) &&
        member.teamRole === "Team Lead"
      )
    ))
  );

  const handleCreateTeam = async (e) => {
    e.preventDefault();

    if (!newTeamName.trim()) return;

    if (!newTeamProjectId) {
      alert("Select a project for this team.");
      return;
    }

    const result = await createTeam(newTeamName.trim(), Number(newTeamProjectId));

    if (!result.success) {
      alert(result.message);
      return;
    }

    setNewTeamName("");
    setNewTeamProjectId("");
  };

  const handleEditTeam = () => {
    if (!activeTeam) return;

    setEditingTeamId(activeTeam.id);
    setEditingTeamName(activeTeam.name);
  };

  const handleSaveTeam = async () => {
    if (!editingTeamName.trim()) return;

    const result = await updateTeam(editingTeamId, {
      name: editingTeamName.trim(),
    });

    if (!result.success) {
      alert(result.message);
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
      `Are you sure you want to delete "${activeTeam.name}"?`
    );

    if (!confirmed) return;

    const deletedTeamId = activeTeam.id;

    const result = await deleteTeam(deletedTeamId);

    if (!result.success) {
      alert(result.message);
      return;
    }

    const remainingTeams = manageableTeams.filter(
      (team) => String(team.id) !== String(deletedTeamId)
    );

    setActiveTeamId(
      remainingTeams.length > 0 ? remainingTeams[0].id : null
    );
    setEditingMember(null);
    setShowAddMember(false);
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    const user = assignableUsers.find(
      (u) => String(u.id) === String(selectedUserId)
    );

    if (!user || !activeTeam) {
      alert("Select an active user whose system role matches the team role.");
      return;
    }

    const alreadyMember = (activeTeam.members || []).some(
      (member) => String(member.userId) === String(user.id)
    );

    if (alreadyMember) {
      alert(`${user.fullName} is already a member of this team.`);
      return;
    }

    const result = await addMember(activeTeam.id, {
      userId: user.id,
      teamRole,
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    setSelectedUserId("");
    setTeamRole("Developer");
    setShowAddMember(false);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
  };

  const handleSaveMember = async (updated) => {
    if (!activeTeam) return;

    const result = await updateMember(
      activeTeam.id,
      updated.userId,
      updated
    );

    if (!result.success) {
      alert(result.message);
      return;
    }

    setEditingMember(null);
  };

  const handleRemoveMember = async (member) => {
    if (!activeTeam) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the team?"
    );

    if (!confirmed) return;

    const result = await removeMember(activeTeam.id, member.userId);

    if (!result.success) {
      alert(result.message);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#172033]">
            Teams
          </h2>

          <p className="mt-1 text-sm text-[#64748B]">
            Manage teams and members
          </p>
        </div>

        <form onSubmit={handleCreateTeam} className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="New team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#172033] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
          />

          <select
            value={newTeamProjectId}
            onChange={(event) => setNewTeamProjectId(event.target.value)}
            required
            aria-label="Project for new team"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#172033]"
          >
            <option value="">Select project</option>
            {manageableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            <IoAddSharp size={18} />
            Create
          </button>
        </form>
      </div>

      {teamsError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {teamsError}
        </p>
      )}
      {teamsLoading && <p className="mt-3 text-sm text-slate-500">Loading teams...</p>}

      {manageableTeams.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-300 pb-3">
          {manageableTeams.map((team) => (
            <button
              key={team.id}
              onClick={() => setActiveTeamId(team.id)}
              className={`rounded-xl px-3.5 py-2 text-sm transition ${
                String(team.id) === String(visibleActiveTeamId)
                  ? "bg-gradient-to-r from-[#2563EB] to-[#4F46E5] font-semibold text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>
      )}

      {manageableTeams.length === 0 && (
        <div className="mt-6 rounded-2xl border border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-[#64748B]">
            No teams created yet.
          </p>
        </div>
      )}

      {activeTeam && (
        <div className="mt-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editingTeamId ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingTeamName}
                    onChange={(e) => setEditingTeamName(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                  />

                  <button
                    onClick={handleSaveTeam}
                    className="rounded-xl bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    Save
                  </button>

                  <button
                    onClick={handleCancelEditTeam}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-[#172033]">
                    Team - {activeTeam.name}
                  </h3>

                  <p className="mt-1 text-xs text-[#64748B]">
                    {(activeTeam.members || []).length} member(s)
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!editingTeamId && (
                <button
                  onClick={handleEditTeam}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033]"
                >
                  Edit Team
                </button>
              )}

              <button
                onClick={handleDeleteTeam}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Delete Team
              </button>

              <button
                onClick={() => setShowAddMember((value) => !value)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                <IoAddSharp size={18} />
                Add Member
              </button>
            </div>
          </div>

          {showAddMember && (
            <form
              onSubmit={handleAddMember}
              className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-[#F1F5F9] p-4"
            >
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                disabled={usersLoading || Boolean(usersError) || assignableUsers.length === 0}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
              >
                <option value="">
                  {usersLoading
                    ? "Loading active users..."
                    : usersError
                      ? "Users could not be loaded"
                      : assignableUsers.length === 0
                        ? "No eligible users"
                        : "Select user"}
                </option>

                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.fullName}
                    {user.email ? ` (${user.email})` : ""}
                  </option>
                ))}
              </select>

              <select
                value={teamRole}
                onChange={(e) => {
                  setTeamRole(e.target.value);
                  setSelectedUserId("");
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
              >
                {TEAM_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {usersError ? (
                <div className="w-full text-xs text-red-700" role="alert">
                  <span>{usersError}</span>{" "}
                  <button type="button" className="font-semibold underline" onClick={refetchUsers}>
                    Retry
                  </button>
                </div>
              ) : assignableUsers.length === 0 && !usersLoading ? (
                <p className="w-full text-xs text-slate-600">
                  No eligible active users are available for this team role.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={usersLoading || Boolean(usersError) || !selectedUserId}
                className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Add
              </button>
            </form>
          )}

          <TeamTable
            members={activeTeam.members || []}
            onEdit={handleEditMember}
            onRemove={handleRemoveMember}
          />
        </div>
      )}

      {editingMember && activeTeam && (
        <EditMemberForm
          member={editingMember}
          onCancel={() => setEditingMember(null)}
          onSave={handleSaveMember}
        />
      )}
    </>
  );
};

export default TeamManagement;