import { Link } from "react-router-dom";
import {
  PiUsersThree,
  PiCheckSquareOffset,
  PiCalendarBlank,
  PiUserPlus,
  PiBriefcase,
} from "react-icons/pi";
import { useAuth } from "../../../context/AuthContextStore.js";
import { useTasks } from "../../../context/TasksContextStore.js";
import { useUsers } from "../../../context/UsersContextStore.js";
import { useTeams } from "../../../context/TeamsContextStore.js";

const TeamLeadDashboard = () => {
  const { currentUser } = useAuth();
  const { subtasks = [] } = useTasks();
  const { users } = useUsers();
  const { teams } = useTeams();

  // Find team where current user is lead
  const myTeam = teams.find((t) => String(t.leadId) === String(currentUser?.id)) || teams[0];
  const teamMembers = myTeam?.members || users.slice(0, 4);

  // Subtasks relevant to this team
  const teamSubtasks = subtasks.filter(
    (s) => String(s.teamId) === String(myTeam?.id) || subtasks.length <= 4
  );

  const unassignedSubtasks = teamSubtasks.filter((s) => !s.assigneeId);
  const inProgressSubtasks = teamSubtasks.filter((s) => s.status === "In Progress");

  return (
    <div className="space-y-8">
      {/* Team Lead Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-[#0e1424] dark:to-[#0a0e17] p-6 shadow-xs dark:shadow-xl transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-100/80 dark:bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Squad Team Leadership
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Team Operations Hub
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-[#e8eef8]/60">
              Balance team capacity, distribute sprint subtasks, and track sprint deliverables.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/my-tasks"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              <PiBriefcase size={16} />
              Team Work Queue
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-[#e8eef8]/15 bg-white dark:bg-[#181b23] px-4 py-2 text-xs font-medium text-slate-700 dark:text-white transition hover:bg-slate-50 dark:hover:bg-[#e8eef8]/10"
            >
              <PiUsersThree size={16} />
              My Team Squad
            </Link>
          </div>
        </div>
      </div>

      {/* Team KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Squad Members</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <PiUsersThree size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{teamMembers.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">{myTeam?.name || "Engineering Squad"}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Active Subtasks</span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
              <PiCheckSquareOffset size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400">{inProgressSubtasks.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Currently in progress</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Unassigned</span>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <PiUserPlus size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">{unassignedSubtasks.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">Awaiting allocation</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-5 shadow-xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-[#e8eef8]/50 uppercase tracking-wider">Total Subtasks</span>
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-400">
              <PiCalendarBlank size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{teamSubtasks.length}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#e8eef8]/50">In team scope</p>
        </div>
      </div>

      {/* Team Member Workload */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] p-6 shadow-xs dark:shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Squad Workload Distribution</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[#e8eef8]/50">Active subtask count allocated per team engineer</p>
          </div>
          <Link to="/my-tasks" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
            Manage Work Queue
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => {
            const memberId = member.userId || member.id;
            const memberName = member.user?.fullName || member.fullName || member.name || "Engineer";
            const memberSubtasks = subtasks.filter((s) => String(s.assigneeId) === String(memberId));
            const inProg = memberSubtasks.filter((s) => s.status === "In Progress").length;

            return (
              <div
                key={memberId}
                className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0a0e17] p-4 transition hover:border-emerald-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                    {memberName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{memberName}</p>
                    <p className="text-xs text-slate-500 dark:text-[#e8eef8]/40">
                      {member.teamRole || member.projectRole || "Team Member"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-600 dark:text-[#e8eef8]/60">
                  <span>Assigned Work:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {memberSubtasks.length} subtasks ({inProg} active)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamLeadDashboard;
