import { useState } from "react";

const TEAM_ROLES = ["Team Lead", "Developer", "Tester", "QA"];

const EditMemberForm = ({ member, onCancel, onSave }) => {
  const [teamRole, setTeamRole] = useState(member.teamRole);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...member,
      teamRole,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <h2 className="text-lg font-semibold text-[#172033]">
          Edit team role
        </h2>

        <p className="mb-5 mt-1 text-sm text-[#64748B]">
          {member.fullName || "Unknown User"}
        </p>

        <form onSubmit={handleSubmit}>
          <select
            value={teamRole}
            onChange={(e) => setTeamRole(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
          >
            {TEAM_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#172033]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberForm;