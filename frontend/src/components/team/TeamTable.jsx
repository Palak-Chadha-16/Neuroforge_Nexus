import { FaEdit, FaTrash } from "react-icons/fa";

const TeamTable = ({ members, onEdit, onRemove }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Team Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm text-[#64748B]"
                >
                  No members yet
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.memberId}
                  className="border-b border-slate-200 transition last:border-b-0 hover:bg-[#F1F5F9]"
                >
                  <td className="px-6 py-4 font-medium text-[#172033]">
                    {member.fullName || "Unknown User"}
                  </td>

                  <td className="px-6 py-4 text-sm text-[#475569]">
                    {member.email || "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        member.teamRole === "Team Lead"
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {member.teamRole}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(member)}
                        aria-label={`Edit ${member.fullName || "member"}`}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563EB]"
                      >
                        <FaEdit size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemove(member)}
                        aria-label={`Remove ${member.fullName || "member"}`}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-[#DC2626]"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamTable;