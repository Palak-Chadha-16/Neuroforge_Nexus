import { useState } from "react";
import { PiX, PiPlus, PiCheckCircle, PiXCircle } from "react-icons/pi";
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

const UserAddForm = ({ onCancel, onCreateUser }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("developer");
  const [status, setStatus] = useState("Active");
  const [skills, setSkills] = useState(
    ROLE_DEFAULT_SKILLS.developer || []
  );
  const [newSkillInput, setNewSkillInput] = useState("");

  const roleKey = normalizeUserRole(role);
  const suggestedSkills = ROLE_DEFAULT_SKILLS[roleKey] || [];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    const newRoleKey = normalizeUserRole(newRole);
    const defaults = ROLE_DEFAULT_SKILLS[newRoleKey] || [];
    setSkills(defaults);
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert("Please enter a user full name.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter an email address.");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    const newUser = {
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: email.trim(),
      password,
      role,
      status,
      skills,
    };

    onCreateUser(newUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Add New User
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create a new user account with role-based skills and active
              status
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
              htmlFor="add-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Full Name
            </label>

            <input
              id="add-name"
              type="text"
              placeholder="e.g. Rachel Adams"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
            />
          </div>

          <div>
            <label
              htmlFor="add-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Email Address
            </label>

            <input
              id="add-email"
              type="email"
              placeholder="e.g. rachel.adams@neuroforge.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
            />
          </div>

          <div>
            <label
              htmlFor="add-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Password
            </label>

            <input
              id="add-password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
            />

            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              The user logs in with this password.
            </p>
          </div>

          <div>
            <label
              htmlFor="add-role"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              System Role
            </label>

            <select
              id="add-role"
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

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("Active")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition ${
                  status === "Active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                }`}
              >
                <PiCheckCircle
                  size={18}
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
                onClick={() => setStatus("Inactive")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition ${
                  status === "Inactive"
                    ? "border-slate-300 bg-slate-100 text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                }`}
              >
                <PiXCircle
                  size={18}
                  className="text-slate-400"
                />
                <span>Inactive</span>
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Skills & Responsibilities
              </label>

              <span className="text-xs text-slate-500 dark:text-slate-400">
                {skills.length} skills selected
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
                  No skills selected yet.
                </span>
              )}
            </div>

            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Add custom skill..."
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
                  Recommended for {formatRole(role)}:
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
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserAddForm;