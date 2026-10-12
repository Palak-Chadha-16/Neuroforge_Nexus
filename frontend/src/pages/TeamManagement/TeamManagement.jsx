import { useState, useCallback, Fragment } from "react";
import { IoAddSharp } from "react-icons/io5";
import {
  PiPencilSimple, PiTrash, PiDotsThreeVertical,
  PiUsers, PiMagnifyingGlass, PiPlus,
} from "react-icons/pi";
import { useTeams } from "../../context/TeamsContext.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import { useProjects } from "../../context/ProjectContext.jsx";
import { normalizeRole, ROLES } from "../../constants/roles.js";
import TeamTable from "../../components/team/TeamTable.jsx";
import EditMemberForm from "../../components/team/EditMemberForm.jsx";

const adaptMembers = (members) =>
  (members || []).map((m) => ({
    ...m,
    user: { id: m.userId, fullName: m.fullName, email: m.email },
  }));

const emptyForm = () => ({ projectId: "", name: "", teamLeadId: "", memberIds: [] });

// ── TeamForm ──────────────────────────────────────────────────────────────────
const TeamForm = ({
  projects,
  projectsWithoutTeam,
  teamLeadOptions,
  memberOptions,
  initial,
  isEdit,
  onSave,
  onCancel,
}) => {
  const [form, setForm] = useState(initial || emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedProject = projects.find((p) => String(p.id) === String(form.projectId));

  const toggle = (id) =>
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((x) => x !== id)
        : [...f.memberIds, id],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.projectId) { setError("Project is required."); return; }
    if (!form.name.trim()) { setError("Team name is required."); return; }
    setSaving(true);
    setError("");
    const result = await onSave(form);
    setSaving(false);
    if (!result.success) setError(result.message || "Failed to save team.");
  };

  const allProjectsHaveTeam = !isEdit && projectsWithoutTeam.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#172033] dark:text-white">
              {isEdit ? "Edit Team" : "Create New Team"}
            </h2>
            <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
              Configure team name, lead and members.
            </p>
          </div>
          <button type="button" onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-[#172033] dark:hover:bg-slate-800 dark:hover:text-white">
            ✕
          </button>
        </div>

        {allProjectsHaveTeam && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400">
            All projects already have a team. Delete an existing team first.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                Project *
              </label>
              {isEdit ? (
                <input type="text" value={selectedProject?.name || ""} readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" />
              ) : (
                <select value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  disabled={allProjectsHaveTeam}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white disabled:opacity-50">
                  <option value="">— Select a project —</option>
                  {projectsWithoutTeam.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
                Team Name *
              </label>
              <input type="text" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Alpha Squad"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white" />
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">Team ID</label>
            <input type="text" value={isEdit ? (initial?.teamCode || "") : ""} readOnly disabled
              placeholder="Auto-generated after saving"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">Team Lead</label>
            <select value={form.teamLeadId}
              onChange={(e) => setForm((f) => ({ ...f, teamLeadId: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white">
              <option value="">— Select Team Lead —</option>
              {teamLeadOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">
              Members <span className="font-normal text-slate-400">(Developer / Tester / QA)</span>
            </label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-[#1e293b]">
              {memberOptions.length === 0 ? (
                <p className="text-xs text-slate-400">No eligible users found.</p>
              ) : (
                memberOptions.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={form.memberIds.includes(u.id)}
                      onChange={() => toggle(u.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]" />
                    <span className="text-[#172033] dark:text-slate-200">{u.fullName}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033] dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={saving || allProjectsHaveTeam}
              className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? "Saving..." : isEdit ? "Update Team" : "Save Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── AddMemberForm (inline, since the component file is empty) ─────────────────
const TEAM_ROLES = ["Manager", "Member"];

const AddMemberForm = ({ teamId, memberOptions, onCancel, onSave }) => {
  const [userId, setUserId] = useState("");
  const [teamRole, setTeamRole] = useState("Member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) { setError("Please select a user."); return; }
    setSaving(true);
    setError("");
    const result = await onSave({ userId: Number(userId), teamRole });
    setSaving(false);
    if (!result.success) setError(result.message || "Failed to add member.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
        <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Add Member</h2>
        <p className="mb-5 mt-1 text-sm text-[#64748B] dark:text-slate-400">Select a user and assign a team role.</p>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white">
              <option value="">— Select user —</option>
              {memberOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">Team Role</label>
            <select value={teamRole} onChange={(e) => setTeamRole(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white">
              {TEAM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50">
              {saving ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── TeamManagement (main page) ────────────────────────────────────────────────
const TeamManagement = () => {
  const { teams, loading, error: teamsError, createTeam, updateTeam, deleteTeam, addMember, updateMember, removeMember } = useTeams();
  const { users } = useUsers();
  const { projects } = useProjects();

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [addingMemberTeamId, setAddingMemberTeamId] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Derive which projects already have a team
  const projectIdsWithTeam = new Set(teams.map((t) => String(t.projectId)));
  const projectsWithoutTeam = (projects || []).filter((p) => !projectIdsWithTeam.has(String(p.id)));
  const noTeamCount = projectsWithoutTeam.length;

  // User option lists
  const teamLeadOptions = (users || []).filter(
    (u) => normalizeRole(u.role) === ROLES.TEAM_LEAD
  );
  const memberOptions = (users || []).filter((u) => {
    const r = normalizeRole(u.role);
    return r === ROLES.DEVELOPER || r === ROLES.TESTER || r === ROLES.QA;
  });

  // Filtered teams for the table
  const filteredTeams = teams.filter((t) => {
    const matchSearch =
      !search ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.teamCode?.toLowerCase().includes(search.toLowerCase());
    const matchProject =
      !filterProject || String(t.projectId) === String(filterProject);
    return matchSearch && matchProject;
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCreateSave = async (form) => {
    const result = await createTeam({
      projectId: Number(form.projectId),
      name: form.name.trim(),
      teamLeadId: form.teamLeadId ? Number(form.teamLeadId) : null,
      memberIds: form.memberIds.map(Number),
    });
    if (result.success) {
      setShowCreate(false);
      showToast("Team created successfully.");
    }
    return result;
  };

  const handleEditSave = async (form) => {
    const result = await updateTeam(editingTeam.id, {
      name: form.name.trim(),
      teamLeadId: form.teamLeadId ? Number(form.teamLeadId) : null,
      memberIds: form.memberIds.map(Number),
    });
    if (result.success) {
      setEditingTeam(null);
      showToast("Team updated successfully.");
    }
    return result;
  };

  const handleDelete = async (team) => {
    const result = await deleteTeam(team.id);
    if (result.success) {
      showToast("Team deleted.");
      if (expandedTeamId === team.id) setExpandedTeamId(null);
    } else {
      showToast(result.message || "Failed to delete team.", "error");
    }
    setConfirmDelete(null);
  };

  const handleAddMember = async (data) => {
    const result = await addMember(addingMemberTeamId, data);
    if (result.success) {
      setAddingMemberTeamId(null);
      showToast("Member added.");
    }
    return result;
  };

  const handleEditMember = async (updated) => {
    const result = await updateMember(expandedTeamId, updated.userId, { teamRole: updated.teamRole });
    if (result.success) {
      setEditingMember(null);
      showToast("Member updated.");
    } else {
      showToast(result.message || "Failed to update member.", "error");
    }
  };

  const handleRemoveMember = async (member) => {
    const result = await removeMember(expandedTeamId, member.userId);
    if (result.success) showToast("Member removed.");
    else showToast(result.message || "Failed to remove member.", "error");
  };

  const openEdit = (team) => {
    setEditingTeam({
      ...team,
      projectId: String(team.projectId),
      teamLeadId: team.teamLeadId ? String(team.teamLeadId) : "",
      memberIds: (team.members || [])
        .filter((m) => !/lead/i.test(m.teamRole || ""))
        .map((m) => m.userId),
    });
    setOpenMenuId(null);
  };

  const getProjectForTeam = (team) =>
    (projects || []).find((p) => String(p.id) === String(team.projectId));

  const getTeamLeadName = (team) => {
    if (!team.teamLeadId) return "—";
    const u = (users || []).find((u) => String(u.id) === String(team.teamLeadId));
    return u?.fullName || team.teamLeadName || "—";
  };

  // Members eligible to add (not already in the team)
  const getAddMemberOptions = (team) => {
    const existingIds = new Set((team.members || []).map((m) => String(m.userId)));
    return memberOptions.filter((u) => !existingIds.has(String(u.id)));
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] px-4 py-8 dark:bg-[#0b1120] sm:px-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 rounded-xl border px-5 py-3 text-sm font-medium shadow-lg transition ${
          toast.type === "error"
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172033] dark:text-white">Teams</h1>
          {noTeamCount > 0 && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              {noTeamCount} project{noTeamCount !== 1 ? "s" : ""} have no team yet
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110">
          <IoAddSharp size={18} />
          Create Team
        </button>
      </div>

      {/* Filter row */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white"
          />
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-[#1e293b] dark:text-white">
          <option value="">All Projects</option>
          {(projects || []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Loading teams...</span>
        </div>
      )}

      {!loading && teamsError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
          {teamsError}
        </div>
      )}

      {/* Teams table */}
      {!loading && !teamsError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="px-6 py-4">Team Name</th>
                  <th className="px-6 py-4">Team ID</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Team Lead</th>
                  <th className="px-6 py-4">Members</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-400">
                      No teams found.
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => {
                    const proj = getProjectForTeam(team);
                    const isExpanded = expandedTeamId === team.id;
                    const adapted = adaptMembers(team.members);
                    return (
                      <Fragment key={team.id}>
                        <tr
                          onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                          className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 font-medium text-[#172033] dark:text-white">
                            <div className="flex items-center gap-2">
                              <PiUsers size={16} className="text-blue-500" />
                              {team.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {team.teamCode || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#475569] dark:text-slate-300">
                            {proj ? (
                              <span>{proj.name}{proj.code ? <span className="ml-1 text-xs text-slate-400">({proj.code})</span> : null}</span>
                            ) : "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#475569] dark:text-slate-300">
                            {getTeamLeadName(team)}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#475569] dark:text-slate-300">
                            {(team.members || []).length}
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === team.id ? null : team.id)}
                                className="rounded-lg border border-slate-400 bg-white p-2 text-slate-800 transition hover:bg-slate-100 hover:text-black dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white">
                                <PiDotsThreeVertical size={18} />
                              </button>
                              {openMenuId === team.id && (
                                <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-[#1e293b]">
                                  <button
                                    onClick={() => openEdit(team)}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                                    <PiPencilSimple size={14} /> Edit Team
                                  </button>
                                  <button
                                    onClick={() => { setConfirmDelete(team); setOpenMenuId(null); }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30">
                                    <PiTrash size={14} /> Delete Team
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50 dark:bg-slate-900/40">
                            <td colSpan={6} className="px-6 py-5">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Team Members
                                </span>
                                <button
                                  onClick={() => setAddingMemberTeamId(team.id)}
                                  className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/60">
                                  <PiPlus size={13} /> Add Member
                                </button>
                              </div>
                              <TeamTable
                                members={adapted}
                                onEdit={(m) => setEditingMember(m)}
                                onRemove={handleRemoveMember}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <TeamForm
          projects={projects || []}
          projectsWithoutTeam={projectsWithoutTeam}
          teamLeadOptions={teamLeadOptions}
          memberOptions={memberOptions}
          isEdit={false}
          onSave={handleCreateSave}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {editingTeam && (
        <TeamForm
          projects={projects || []}
          projectsWithoutTeam={projectsWithoutTeam}
          teamLeadOptions={teamLeadOptions}
          memberOptions={memberOptions}
          initial={editingTeam}
          isEdit={true}
          onSave={handleEditSave}
          onCancel={() => setEditingTeam(null)}
        />
      )}

      {addingMemberTeamId && (() => {
        const team = teams.find((t) => t.id === addingMemberTeamId);
        return (
          <AddMemberForm
            teamId={addingMemberTeamId}
            memberOptions={team ? getAddMemberOptions(team) : memberOptions}
            onCancel={() => setAddingMemberTeamId(null)}
            onSave={handleAddMember}
          />
        );
      })()}

      {editingMember && (
        <EditMemberForm
          member={editingMember}
          onCancel={() => setEditingMember(null)}
          onSave={handleEditMember}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
            <h2 className="text-lg font-semibold text-[#172033] dark:text-white">Delete Team</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete <span className="font-semibold text-[#172033] dark:text-white">{confirmDelete.name}</span>? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1e293b] dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;