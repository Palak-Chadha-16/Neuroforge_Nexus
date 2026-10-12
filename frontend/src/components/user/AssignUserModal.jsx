import { useState, useEffect } from "react";
import { PiX, PiFolder, PiBriefcase, PiUserPlus } from "react-icons/pi";

// Project Lead and Project Manager are set when the project is created.
// The backend only accepts these four roles for project members.
const PROJECT_ROLES = ["Developer", "Team Lead", "Tester", "QA"];

// The backend requires the project role to match the user's system role,
// so start with the role that matches this user.
const defaultRoleForUser = (user) => {
  const key = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (key === "team_lead") return "Team Lead";
  if (key === "tester") return "Tester";
  if (key === "qa") return "QA";
  return "Developer";
};

const AssignUserModal = ({
  isOpen,
  onClose,
  user,
  projects = [],
  currentAssignments = [],
  onAssign,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(
    projects.length > 0 ? String(projects[0].id) : ""
  );
  const [selectedRole, setSelectedRole] = useState(defaultRoleForUser(user));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset selections whenever the modal opens for a different user
  useEffect(() => {
    if (isOpen && user) {
      setSelectedProjectId(projects.length > 0 ? String(projects[0].id) : "");
      setSelectedRole(defaultRoleForUser(user));
      setError("");
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
            const result = await onAssign(selectedProjectId, user.id, selectedRole);
      if (result?.success) {
        onClose();
      } else {
        setError(result?.message || "Failed to assign user to project.");
      }
    } catch (err) {
      setError(err?.message || "An error occurred while assigning user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <PiUserPlus size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Assign User to Project
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Allocate {user.fullName || user.name} to an active project
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition"
          >
            <PiX size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* User Info Pill */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs">
                {(user.fullName || user.name || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {user.fullName || user.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
            </div>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              System Role: {user.role || "Member"}
            </span>
          </div>

          {/* Current Allocations (if any) */}
          {currentAssignments.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/30 dark:bg-blue-950/20">
              <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1.5">
                Current Active Allocations:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentAssignments.map((a) => (
                  <span
                    key={a.projectId}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-0.5 text-xs text-blue-700 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300"
                  >
                    <PiFolder size={12} />
                    {a.projectName} ({a.role})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Project Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Project <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="dark:bg-slate-800 dark:text-white">
                  {proj.name} {proj.code ? `(${proj.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Project Role Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assigned Project Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {PROJECT_ROLES.map((r) => (
                <option key={r} value={r} className="dark:bg-slate-800 dark:text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProjectId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              <PiBriefcase size={15} />
              <span>{isSubmitting ? "Assigning..." : "Assign to Project"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignUserModal;