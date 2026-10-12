import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PiArrowLeft,
  PiBriefcase,
  PiCalendarBlank,
  PiCheckCircle,
  PiEnvelopeSimple,
  PiIdentificationCard,
  PiPhone,
  PiUsersThree,
  PiWarningCircle,
} from "react-icons/pi";
import axios, { getApiBase } from "../../services/api.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useProjectTeam } from "../../context/ProjectTeamContextStore.js";
import { useTeams } from "../../context/TeamsContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";

const API_BASE = getApiBase();

const getMemberUserId = (member) =>
  member?.userId ?? member?.user?.id ?? "";

const getProjectId = (team) =>
  team?.projectId ?? team?.project?.id ?? "";

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { users = [] } = useUsers() || {};
  const { projects: allProjects = [] } = useProjects() || {};
  const { projectTeams = {} } = useProjectTeam() || {};
  const { teams: allTeams = [] } = useTeams() || {};
  const { tasks = [] } = useTasks() || {};

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_BASE}/users/${userId}/profile`
        );

        if (!cancelled) {
          setUser(response.data);
        }
      } catch (err) {
        if (cancelled) return;

        const foundUser = users.find(
          (item) => String(item.id) === String(userId)
        );

        if (foundUser) {
          const userProjects = [];

          const userTeamMemberships = (
            Array.isArray(allTeams) ? allTeams : []
          )
            .map((team) => {
              const member = (
                Array.isArray(team?.members) ? team.members : []
              ).find(
                (item) =>
                  String(getMemberUserId(item)) === String(userId)
              );

              return member ? { team, member } : null;
            })
            .filter(Boolean);

          if (Array.isArray(allProjects)) {
            allProjects.forEach((project) => {
              const projectMembers =
                projectTeams?.[String(project.id)] || [];

              const memberRecord = projectMembers.find(
                (member) =>
                  String(getMemberUserId(member)) === String(userId)
              );

              const managerId =
                project.projectManagerId ??
                project.projectManager?.id ??
                project.projectManager?.userId;

              const leadId =
                project.projectLeadId ??
                project.projectLead?.id ??
                project.projectLead?.userId;

              const isManager =
                String(managerId ?? "") === String(userId);

              const isProjectLead =
                String(leadId ?? "") === String(userId);

              const teamRecord = userTeamMemberships.find(
                ({ team }) =>
                  String(getProjectId(team)) === String(project.id)
              );

              const isProjectMember = Boolean(memberRecord);
              const isTeamMember = Boolean(teamRecord);

              if (
                isProjectMember ||
                isManager ||
                isProjectLead ||
                isTeamMember
              ) {
                const assignmentRole = isManager
                  ? "Project Manager"
                  : isProjectLead
                    ? "Project Lead"
                    : teamRecord?.member?.teamRole ||
                      memberRecord?.projectRole ||
                      memberRecord?.teamRole ||
                      memberRecord?.role ||
                      "Member";

                userProjects.push({
                  id: project.id,
                  name: project.name,
                  code: project.code,
                  status: project.status || "In Progress",
                  startDate: project.startDate,
                  endDate: project.endDate,
                  priority: project.priority || "High",
                  assignmentRole,
                });
              }
            });
          }

          const userTasks = (tasks || []).filter(
            (task) =>
              String(task.assigneeId ?? task.assignee?.id ?? "") ===
              String(userId)
          );

          setUser({
            ...foundUser,
            userCode:
              foundUser.userCode ||
              `USR-${String(foundUser.id).padStart(4, "0")}`,
            roleLabel: foundUser.role,
            skill: Array.isArray(foundUser.skills)
              ? foundUser.skills.join(", ")
              : foundUser.skills || "Full Stack",
            projects: userProjects,
            teams: userTeamMemberships.map(({ team, member }) => ({
              id: team.id,
              name: team.name,
              teamCode: team.teamCode || team.code || null,
              teamRole: member.teamRole || member.role || null,
              projectId: getProjectId(team) || null,
              projectName:
                team.projectName || team.project?.name || null,
              projectCode:
                team.projectCode || team.project?.code || null,
            })),
            assignedTasks: userTasks.map((task) => ({
              id: task.id,
              title: task.title || task.name,
              taskKey: task.code || `TSK-${task.id}`,
              priority: task.priority || "Medium",
              status: task.status || "In Progress",
              dueDate: task.dueDate,
              projectName: task.projectName || "",
            })),
          });
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load this user's details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    allProjects,
    projectTeams,
    allTeams,
    tasks,
    users,
  ]);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusStyle = (status) => {
    if (status === "Active") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
    }

    if (status === "In Meeting") {
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400";
    }

    return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  const getProjectStatusStyle = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized.includes("complete")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    }

    if (normalized.includes("progress")) {
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
    }

    return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  const getTaskStatusStyle = (status) => {
    const normalized = String(status || "").toLowerCase();

    if (
      normalized.includes("complete") ||
      normalized.includes("done")
    ) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    }

    if (
      normalized.includes("progress") ||
      normalized.includes("active")
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
    }

    if (
      normalized.includes("blocked") ||
      normalized.includes("cancel")
    ) {
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    }

    return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Loading user details...
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900/40 dark:bg-slate-900">
          <PiWarningCircle
            size={36}
            className="mx-auto text-rose-500"
          />

          <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
            Unable to load user
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error || "The requested user could not be found."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/user-management")}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <PiArrowLeft size={16} />
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  const projects = Array.isArray(user.projects) ? user.projects : [];
  const teams = Array.isArray(user.teams) ? user.teams : [];
  const assignedTasks = Array.isArray(user.assignedTasks)
    ? user.assignedTasks
    : [];

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/user-management")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <PiArrowLeft size={17} />
            Back to User Management
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Details
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Complete profile, project, team and task information.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-blue-500/20">
              {initials}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {user.fullName}
                </h2>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                    user.status
                  )}`}
                >
                  {user.status || "Inactive"}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {user.roleLabel || user.role || "User"}
              </p>

              {user.skill && (
                <p className="mt-2 inline-flex rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                  {user.skill}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Projects
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {projects.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Teams
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {teams.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tasks
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {assignedTasks.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Status
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {user.active ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <PiIdentificationCard size={20} className="text-blue-600 dark:text-blue-400" />

          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Basic Information
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              User ID
            </p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
              {user.id ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              User Code
            </p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
              {user.userCode || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              <PiEnvelopeSimple size={15} />
              Email
            </div>
            <p className="mt-1 break-all font-medium text-slate-800 dark:text-slate-200">
              {user.email || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              <PiPhone size={15} />
              Contact Number
            </div>
            <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
              {user.contactNumber || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Role
            </p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
              {user.roleLabel || user.role || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              <PiCalendarBlank size={15} />
              Joined
            </div>
            <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <PiBriefcase size={20} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Assigned Projects
          </h2>
        </div>

        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
            No projects assigned.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-blue-800 dark:hover:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {project.name}
                    </h3>

                    {project.code && (
                      <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-400">
                        {project.code}
                      </p>
                    )}

                    {project.assignmentRole && (
                      <span className="mt-2 inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-300">
                        {project.assignmentRole}
                      </span>
                    )}
                  </div>

                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${getProjectStatusStyle(
                      project.status
                    )}`}
                  >
                    {project.status || "Unknown"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {project.priority && (
                    <span className="rounded-md bg-white px-2 py-1 dark:bg-slate-800 dark:text-slate-300">
                      Priority: {project.priority}
                    </span>
                  )}

                  {project.startDate && (
                    <span className="rounded-md bg-white px-2 py-1 dark:bg-slate-800 dark:text-slate-300">
                      Start: {formatDate(project.startDate)}
                    </span>
                  )}

                  {project.endDate && (
                    <span className="rounded-md bg-white px-2 py-1 dark:bg-slate-800 dark:text-slate-300">
                      End: {formatDate(project.endDate)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <PiUsersThree size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Team Membership
          </h2>
        </div>

        {teams.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
            No team assignments.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {team.name}
                    </h3>

                    {team.teamCode && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                        {team.teamCode}
                      </p>
                    )}
                  </div>

                  {team.teamRole && (
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {team.teamRole}
                    </span>
                  )}
                </div>

                {team.projectName && (
                  <div className="mt-4 rounded-lg bg-white px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Project:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {team.projectName}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-2">
          <PiCheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Assigned Tasks
          </h2>
        </div>

        {assignedTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
            No tasks assigned.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Due Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-4">
                      <div>
                        {task.taskKey && (
                          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {task.taskKey}
                          </p>
                        )}

                        <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                          {task.title}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {task.projectName || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getTaskStatusStyle(
                          task.status
                        )}`}
                      >
                        {task.status || "Unknown"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {task.priority || "—"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(task.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default UserDetails;