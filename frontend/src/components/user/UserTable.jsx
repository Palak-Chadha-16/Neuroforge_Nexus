import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import {
  PiEnvelopeSimple,
  PiFolder,
  PiBriefcase,
  PiUserPlus,
} from "react-icons/pi";
import Pagination from "./Pagination.jsx";
import { formatRole, normalizeRole, ROLES } from "../../constants/roles.js";
import { useProjectTeam } from "../../context/ProjectTeamContext.jsx";
import { useProjects } from "../../context/ProjectContext.jsx";

const UserTable = ({
  users,
  onEdit,
  onDelete,
  onUpdateStatus,
  onOpenAssignModal,
  currentUserId,
  currentPage = 1,
  setCurrentPage = () => {},
}) => {
  const navigate = useNavigate();

  const { projectTeams } = useProjectTeam() || {};
  const { projects } = useProjects() || {};

  const [usersPerPage, setUsersPerPage] = useState(5);
  const showActions = Boolean(onEdit || onDelete);

  const totalPages = Math.max(1, Math.ceil(users.length / usersPerPage));
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = users.slice(
    startIndex,
    startIndex + usersPerPage
  );

  // Auto-clamp currentPage if filtered list changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const getUserAssignments = (userId) => {
    const list = [];
    const seenProjectIds = new Set();

    // 1. Check ProjectTeamContext members
    if (projectTeams) {
      for (const [projId, members] of Object.entries(projectTeams)) {
        if (Array.isArray(members)) {
          const memberRecord = members.find(
            (m) => String(m.userId) === String(userId)
          );
          if (memberRecord) {
            const proj = projects?.find((p) => String(p.id) === String(projId));
            seenProjectIds.add(String(projId));
            list.push({
              projectId: projId,
              projectName: proj?.name || `Project #${projId}`,
              projectCode: proj?.code || null,
              role: memberRecord.projectRole || "Member",
            });
          }
        }
      }
    }

    // 2. Check if user is Project Lead or Project Manager on projects
    if (Array.isArray(projects)) {
      projects.forEach((p) => {
        if (seenProjectIds.has(String(p.id))) return;
        if (String(p.projectLeadId) === String(userId)) {
          seenProjectIds.add(String(p.id));
          list.push({
            projectId: String(p.id),
            projectName: p.name,
            projectCode: p.code || null,
            role: "Project Lead",
          });
        } else if (String(p.projectManagerId) === String(userId)) {
          seenProjectIds.add(String(p.id));
          list.push({
            projectId: String(p.id),
            projectName: p.name,
            projectCode: p.code || null,
            role: "Project Manager",
          });
        }
      });
    }

    return {
      isAssigned: list.length > 0,
      assignments: list,
    };
  };

  const getRoleBadgeStyle = (role) => {
    const normalized = (role || "").toLowerCase();

    if (normalized.includes("admin")) {
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300";
    }

    if (normalized.includes("manager")) {
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300";
    }

    if (normalized.includes("lead")) {
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-300";
    }

    if (normalized.includes("dev")) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    }

    if (normalized.includes("test")) {
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300";
    }

    if (normalized.includes("qa")) {
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300";
    }

    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Active":
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300";

      case "In Meeting":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300";

      case "Inactive":
      default:
        return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const getStatusDotStyle = (status) => {
    switch (status) {
      case "Active":
        return "animate-pulse bg-emerald-500";

      case "In Meeting":
        return "bg-amber-500";

      case "Inactive":
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">
                Skills (Role & Responsibilities)
              </th>
              <th className="px-6 py-4">Working Status</th>
              <th className="px-6 py-4">Project Assignment</th>

              {showActions && (
                <th className="px-6 py-4 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {currentUsers.length > 0 ? (
              currentUsers.map((user) => {
                const assignment = getUserAssignments(user.id);

                const isSelf = Boolean(
                  currentUserId &&
                    String(user.id) === String(currentUserId)
                );

                const skills = Array.isArray(user.skills)
                  ? user.skills
                  : [];

                const currentStatus =
                  user.status || "Active";

                const canBeAssigned = [
                  ROLES.DEVELOPER,
                  ROLES.TESTER,
                  ROLES.QA,
                  ROLES.TEAM_LEAD,
                ].includes(normalizeRole(user.role));

                return (
                  <tr
                    key={user.id}
                    className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/user-management/${user.id}`
                          )
                        }
                        className="flex w-full items-center gap-3.5 text-left"
                        title={`View ${user.fullName}'s details`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] font-bold text-white shadow-md shadow-blue-500/20">
                          {user.fullName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            <span className="transition hover:text-blue-600">
                              {user.fullName}
                            </span>

                            {isSelf && (
                              <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                                YOU
                              </span>
                            )}
                          </div>

                          <div className="mt-1">
                            <span
                              className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${getRoleBadgeStyle(
                                user.role
                              )}`}
                            >
                              {formatRole(user.role)}
                            </span>
                          </div>
                        </div>
                      </button>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <PiEnvelopeSimple
                          size={16}
                          className="text-slate-400"
                        />

                        <span className="font-mono text-xs">
                          {user.email}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}

                        {skills.length > 3 && (
                          <span
                            className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                            title={skills.slice(3).join(", ")}
                          >
                            +{skills.length - 3}
                          </span>
                        )}

                        {skills.length === 0 && (
                          <span className="text-xs italic text-slate-400">
                            No skills listed
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {isSelf ? (
                        <div className="relative inline-block">
                          <select
                            value={currentStatus}
                            onChange={(e) =>
                              onUpdateStatus &&
                              onUpdateStatus(
                                user.id,
                                e.target.value
                              )
                            }
                            className={`cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs font-semibold outline-none transition hover:border-blue-400 focus:border-blue-400 dark:bg-slate-800 ${getStatusBadgeStyle(
                              currentStatus
                            )}`}
                            title="Click to change your own status"
                          >
                            <option value="Active">
                              🟢 Active (You)
                            </option>

                            <option value="In Meeting">
                              🟡 In Meeting (You)
                            </option>

                            <option value="Inactive">
                              ⚪ Inactive (You)
                            </option>
                          </select>
                        </div>
                      ) : (
                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeStyle(
                            currentStatus
                          )}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${getStatusDotStyle(
                              currentStatus
                            )}`}
                          />

                          <span>{currentStatus}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {assignment.isAssigned ? (
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {assignment.assignments.slice(0, 1).map((p) => (
                              <Link
                                key={p.projectId}
                                to={`/projects/${p.projectId}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 hover:text-cyan-950 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/40 transition"
                                title={`Navigate to ${p.projectName} (${p.role})`}
                              >
                                <PiFolder size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                                <span className="max-w-[140px] truncate">{p.projectName}</span>
                                <span className="rounded bg-cyan-200/60 dark:bg-cyan-800/40 px-1 py-0.2 text-[10px] text-cyan-800 dark:text-cyan-200 font-medium">
                                  {p.role}
                                </span>
                              </Link>
                            ))}

                            {assignment.assignments.length > 1 && (
                              <span
                                className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 cursor-default"
                                title={assignment.assignments.map((a) => `${a.projectName} (${a.role})`).join("\n")}
                              >
                                +{assignment.assignments.length - 1} more
                              </span>
                            )}
                          </div>

                          {onOpenAssignModal && canBeAssigned && (
                            <button
                              type="button"
                              onClick={() => onOpenAssignModal(user, assignment.assignments)}
                              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              <PiUserPlus size={12} />
                              <span>Assign to another project</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                            <PiBriefcase size={13} className="text-amber-500 dark:text-amber-400" />
                            <span>Unassigned</span>
                          </div>

                          {onOpenAssignModal && canBeAssigned && (
                            <button
                              type="button"
                              onClick={() => onOpenAssignModal(user, [])}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700 transition"
                            >
                              <PiUserPlus size={12} />
                              <span>+ Assign to Project</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {showActions && (
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(user)}
                              title="Edit User"
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                            >
                              <FaEdit size={14} />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              onClick={() => onDelete(user)}
                              title="Delete User"
                              className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-500 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/30"
                            >
                              <FaTrash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={showActions ? 6 : 5}
                  className="px-6 py-12 text-center text-sm text-slate-400"
                >
                  No users found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={users.length}
        pageSize={usersPerPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setUsersPerPage(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
};

export default UserTable;