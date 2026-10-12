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
import { useProjectTeam } from "../../context/ProjectTeamContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useTeams } from "../../context/TeamsContextStore.js";

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

  const { projectTeams = {} } = useProjectTeam() || {};
  const { projects = [] } = useProjects() || {};
  const { teams = [] } = useTeams() || {};

  const [usersPerPage, setUsersPerPage] = useState(5);
  const showActions = Boolean(onEdit || onDelete);

  const totalPages = Math.max(1, Math.ceil(users.length / usersPerPage));
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = users.slice(
    startIndex,
    startIndex + usersPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const getUserAssignments = (userId) => {
    const assignmentsByProject = new Map();
    const targetUserId = String(userId ?? "");

    const assignProject = (projectId, assignment, priority) => {
      if (projectId == null || !targetUserId) return;

      const key = String(projectId);
      const current = assignmentsByProject.get(key);

      if (current && current.priority > priority) return;

      assignmentsByProject.set(key, {
        ...assignment,
        projectId: key,
        priority,
      });
    };

    const projectList = Array.isArray(projects) ? projects : [];

    // 1. Regular project-member assignments.
    Object.entries(projectTeams || {}).forEach(([projectId, members]) => {
      if (!Array.isArray(members)) return;

      const member = members.find(
        (item) =>
          String(item?.userId ?? item?.user?.id ?? "") === targetUserId
      );

      if (!member) return;

      const project = projectList.find(
        (item) => String(item.id) === String(projectId)
      );

      assignProject(
        projectId,
        {
          projectName: project?.name || `Project #${projectId}`,
          projectCode: project?.code || null,
          role:
            member.projectRole ||
            member.teamRole ||
            member.role ||
            "Member",
        },
        1
      );
    });

    // 2. Team memberships. This also detects Team Leads.
    (Array.isArray(teams) ? teams : []).forEach((team) => {
      const members = Array.isArray(team?.members) ? team.members : [];

      const member = members.find(
        (item) =>
          String(item?.userId ?? item?.user?.id ?? "") === targetUserId
      );

      if (!member) return;

      const projectId = team.projectId ?? team.project?.id;
      if (projectId == null) return;

      const project = projectList.find(
        (item) => String(item.id) === String(projectId)
      );

      assignProject(
        projectId,
        {
          projectName:
            team.projectName ||
            team.project?.name ||
            project?.name ||
            `Project #${projectId}`,
          projectCode:
            team.projectCode ||
            team.project?.code ||
            project?.code ||
            null,
          role:
            member.teamRole ||
            member.projectRole ||
            member.role ||
            "Team Member",
        },
        2
      );
    });

    // 3. Project Manager and Project Lead assignments.
    // The backend may return these as nested objects instead of flat IDs.
    projectList.forEach((project) => {
      const projectId = project?.id;
      if (projectId == null) return;

      const managerId =
        project.projectManagerId ??
        project.projectManager?.id ??
        project.projectManager?.userId;

      const leadId =
        project.projectLeadId ??
        project.projectLead?.id ??
        project.projectLead?.userId;

      if (String(managerId ?? "") === targetUserId) {
        assignProject(
          projectId,
          {
            projectName: project.name || `Project #${projectId}`,
            projectCode: project.code || null,
            role: "Project Manager",
          },
          4
        );
      } else if (String(leadId ?? "") === targetUserId) {
        assignProject(
          projectId,
          {
            projectName: project.name || `Project #${projectId}`,
            projectCode: project.code || null,
            role: "Project Lead",
          },
          3
        );
      }
    });

    const assignments = [...assignmentsByProject.values()].map(
      (assignment) => ({
        projectId: assignment.projectId,
        projectName: assignment.projectName,
        projectCode: assignment.projectCode,
        role: assignment.role,
      })
    );

    return {
      isAssigned: assignments.length > 0,
      assignments,
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
                <th className="px-6 py-4 text-right">Actions</th>
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

                const currentStatus = user.status || "Active";

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
                          navigate(`/user-management/${user.id}`)
                        }
                        className="flex w-full items-center gap-3.5 text-left"
                        title={`View ${user.fullName}'s details`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] font-bold text-white shadow-md shadow-blue-500/20">
                          {(user.fullName || user.name || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            <span className="transition hover:text-blue-600">
                              {user.fullName || user.name || "Unknown User"}
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
                          {user.email || "—"}
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
                            onChange={(event) =>
                              onUpdateStatus &&
                              onUpdateStatus(user.id, event.target.value)
                            }
                            className={`cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs font-semibold outline-none transition hover:border-blue-400 focus:border-blue-400 dark:bg-slate-800 ${getStatusBadgeStyle(
                              currentStatus
                            )}`}
                            title="Click to change your own status"
                          >
                            <option value="Active">🟢 Active (You)</option>
                            <option value="In Meeting">🟡 In Meeting (You)</option>
                            <option value="Inactive">⚪ Inactive (You)</option>
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
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {assignment.assignments.slice(0, 1).map((project) => (
                              <Link
                                key={project.projectId}
                                to={`/projects/${project.projectId}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100 hover:text-cyan-950 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/40"
                                title={`Navigate to ${project.projectName} (${project.role})`}
                              >
                                <PiFolder
                                  size={13}
                                  className="shrink-0 text-cyan-600 dark:text-cyan-400"
                                />

                                <span className="max-w-[140px] truncate">
                                  {project.projectName}
                                </span>

                                <span className="rounded bg-cyan-200/60 px-1 py-0.5 text-[10px] font-medium text-cyan-800 dark:bg-cyan-800/40 dark:text-cyan-200">
                                  {project.role}
                                </span>
                              </Link>
                            ))}

                            {assignment.assignments.length > 1 && (
                              <span
                                className="inline-flex cursor-default items-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                title={assignment.assignments
                                  .map(
                                    (item) =>
                                      `${item.projectName} (${item.role})`
                                  )
                                  .join("\n")}
                              >
                                +{assignment.assignments.length - 1} more
                              </span>
                            )}
                          </div>

                          {onOpenAssignModal && canBeAssigned && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenAssignModal(
                                  user,
                                  assignment.assignments
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <PiUserPlus size={12} />
                              <span>Assign to another project</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                            <PiBriefcase
                              size={13}
                              className="text-amber-500 dark:text-amber-400"
                            />
                            <span>Unassigned</span>
                          </div>

                          {onOpenAssignModal && canBeAssigned && (
                            <button
                              type="button"
                              onClick={() => onOpenAssignModal(user, [])}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
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
                              type="button"
                              onClick={() => onEdit(user)}
                              title="Edit User"
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                            >
                              <FaEdit size={14} />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              type="button"
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