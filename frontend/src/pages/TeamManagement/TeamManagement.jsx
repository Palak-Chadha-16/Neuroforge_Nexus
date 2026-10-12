import { useEffect, useState, useCallback } from "react";
import { IoAddSharp } from "react-icons/io5";
import {
  PiPencilSimple, PiTrash, PiDotsThreeVertical,
  PiUsers, PiMagnifyingGlass, PiFunnel,
} from "react-icons/pi";
import { useTeams } from "../../context/TeamsContext.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import { useProjects } from "../../context/ProjectContext.jsx";
import { normalizeRole, ROLES } from "../../constants/roles.js";
import TeamTable from "../../components/team/TeamTable.jsx";
import EditMemberForm from "../../components/team/EditMemberForm.jsx";

// Backend MemberInfo has fullName/email at top level; TeamTable expects member.user.*
const adaptMembers = (members) =>
  (members || []).map((m) => ({
    ...m,
    user: { id: m.userId, fullName: m.fullName, email: m.email },
  }));

const emptyForm = () => ({ projectId: "", name: "", teamLeadId: "", memberIds: [] });

// ── TeamForm (Create / Edit) ──────────────────────────────────────────────────
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

  // When editing, the project is fixed; when creating, derive it from form.projectId
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
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
        {/* Row 1: Project + Team Name */}
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

        {/* Team ID (edit only, read-only) */}
        {isEdit && initial?.teamCode && (
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold text-[#475569] dark:text-slate-300">Team ID</label>
            <input type="text" value={initial.teamCode} readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" />
          </div>
        )}

        {/* Team Lead */}
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

        {/* Members */}
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
                  {u.skill && <span className="text-xs text-slate-400">({u.skill})</span>}
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
  );
};
