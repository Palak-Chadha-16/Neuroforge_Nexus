import { useState } from "react";
import {
  PiX,
  PiPlus,
  PiCheckCircle,
  PiXCircle,
  PiClock,
} from "react-icons/pi";
import {
  ROLE_DEFAULT_SKILLS,
  normalizeUserRole,
} from "../../context/UsersContextStore.js";
import { formatRole } from "../../constants/roles.js";

const AVAILABLE_ROLES = [
  "admin",
  "project_manager",
  "project_lead",
  "team_lead",
  "developer",
  "tester",
  "qa",
];

const EditUserForm = ({ user, currentUserId, onCancel, onSave }) => {
  const isSelf = Boolean(
    currentUserId && String(user.id) === String(currentUserId)
  );

  const [fullName, setFullName] = useState(user.fullName || "");
  const [email, setEmail] = useState(user.email || "");
  const [role, setRole] = useState(user.role || "developer");
  const [status, setStatus] = useState(user.status || "Active");
  const [skills, setSkills] = useState(
    Array.isArray(user.skills) ? [...user.skills] : []
  );
  const [newSkillInput, setNewSkillInput] = useState("");

  const roleKey = normalizeUserRole(role);
  const suggestedSkills = ROLE_DEFAULT_SKILLS[roleKey] || [];

  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || newSkillInput).trim();

    if (!trimmed) return;

    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }

    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);

    const newRoleKey = normalizeUserRole(newRole);
    const defaults = ROLE_DEFAULT_SKILLS[newRoleKey] || [];

    if (skills.length === 0) {
      setSkills(defaults);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const updatedUser = {
      ...user,
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: email.trim(),
      role,
      status: isSelf ? status : user.status || "Active",
      skills,
    };

    onSave(updatedUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Edit User Profile
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update user details, role responsibilities, skills, and profile
              data
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <PiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="edit-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Full Name
            </label>

            <input
              id="edit-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
            />
          </div>

          <div>
            <label
              htmlFor="edit-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Email Address
            </label>

            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
            />
          </div>

          <div>
            <label
              htmlFor="edit-role"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              System Role
            </label>

            <select
              id="edit-role"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r} className="dark:bg-slate-800 dark:text-white">
                  {formatRole(r)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Active Status
            </label>

            {isSelf ? (
              <>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStatus("Active")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      status === "Active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                    }`}
                  >
                    <PiCheckCircle
                      size={16}
                      className={
                        status === "Active"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400"
                      }
                    />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("In Meeting")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      status === "In Meeting"
                        ? "border-amber-200 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                    }`}
                  >
                    <PiClock
                      size={16}
                      className={
                        status === "In Meeting"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400"
                      }
                    />
                    <span>In Meeting</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("Inactive")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      status === "Inactive"
                        ? "border-slate-300 bg-slate-100 text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                    }`}
                  >
                    <PiXCircle size={16} className="text-slate-400" />
                    <span>Inactive</span>
                  </button>
                </div>

                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Update your current working status visible across the team.
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      (user.status || "Active") === "Active"
                        ? "animate-pulse bg-emerald-500"
                        : (user.status || "Active") === "In Meeting"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    }`}
                  />

                  <span className="font-semibold text-slate-900 dark:text-white">
                    {user.status || "Active"}
                  </span>
                </div>

                <span className="text-xs italic text-slate-500 dark:text-slate-400">
                  (Members can only update their own status)
                </span>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Skills & Responsibilities
              </label>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                {skills.length} skills listed
              </span>
            </div>

            <div className="mb-3 flex min-h-[36px] flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  {skill}

                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="rounded text-blue-500 transition hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    <PiX size={13} />
                  </button>
                </span>
              ))}

              {skills.length === 0 && (
                <span className="py-1 text-xs italic text-slate-400 dark:text-slate-500">
                  No skills added yet. Add custom skills or choose from
                  suggestions below.
                </span>
              )}
            </div>

            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Add custom skill (e.g. Docker, GraphQL, Kubernetes)..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />

              <button
                type="button"
                onClick={() => handleAddSkill()}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
              >
                <PiPlus size={14} />
                <span>Add</span>
              </button>
            </div>

            {suggestedSkills.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Suggested for {formatRole(role)}:
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkills.map((suggested) => {
                    const isSelected = skills.includes(suggested);

                    return (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() =>
                          isSelected
                            ? handleRemoveSkill(suggested)
                            : handleAddSkill(suggested)
                        }
                        className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition ${
                          isSelected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        }`}
                      >
                        {isSelected ? `✓ ${suggested}` : `+ ${suggested}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserForm;