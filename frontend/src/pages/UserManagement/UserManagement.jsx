import { useState, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContextStore.js";
import { useUsers } from "../../context/UsersContextStore.js";
import { useProjectTeam } from "../../context/ProjectTeamContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import UserSearch from "../../components/user/UserSearch.jsx";
import EditUserForm from "../../components/user/EditUserForm.jsx";
import DeleteUserModal from "../../components/user/DeleteUserModal.jsx";
import UserAddForm from "../../components/user/UserAddForm.jsx";
import AssignUserModal from "../../components/user/AssignUserModal.jsx";
import UserTable from "../../components/user/UserTable.jsx";
import { ROLES, normalizeRole } from "../../constants/roles.js";
import { PiPlus, PiUsers, PiUserCheck, PiBriefcase } from "react-icons/pi";

const FILTERABLE_ROLES = [
  "admin",
  "project_manager",
  "project_lead",
  "team_lead",
  "developer",
  "tester",
  "qa",
];

const UserManagement = () => {
  const { currentUser } = useAuth();
  const {
    users,
    updateUser,
    updateUserStatus,
    deleteUser,
    createUser,
  } = useUsers();
  const { projectTeams, addProjectMember } = useProjectTeam() || {};
  const { projects = [] } = useProjects() || {};

  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [assignModalUser, setAssignModalUser] = useState(null);
  const [assignModalAssignments, setAssignModalAssignments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assignmentFilter, setAssignmentFilter] = useState("All");

  const updateSearchTerm = (value) => {
    setCurrentPage(1);
    setSearchTerm(value);
  };
  const updateRoleFilter = (value) => {
    setCurrentPage(1);
    setRoleFilter(value);
  };
  const updateStatusFilter = (value) => {
    setCurrentPage(1);
    setStatusFilter(value);
  };
  const updateAssignmentFilter = (value) => {
    setCurrentPage(1);
    setAssignmentFilter(value);
  };

  const isUserAssigned = useCallback((userId) => {
    // Check ProjectTeam assignments
    if (projectTeams) {
      const inTeam = Object.values(projectTeams).some(
        (members) =>
          Array.isArray(members) &&
          members.some((m) => String(m.userId) === String(userId))
      );
      if (inTeam) return true;
    }

    // Check project lead or manager assignments
    if (Array.isArray(projects)) {
      return projects.some(
        (p) =>
          String(p.projectLeadId) === String(userId) ||
          String(p.projectManagerId) === String(userId)
      );
    }

    return false;
  }, [projectTeams, projects]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => (u.status || "Active") === "Active").length;
    const assigned = users.filter((u) => isUserAssigned(u.id)).length;
    return { total, active, assigned };
  }, [users, isUserAssigned]);

  const isSuperAdmin = normalizeRole(currentUser?.role) === ROLES.ADMIN;

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const userStatus = user.status || "Active";

      if (!isSuperAdmin && userStatus === "Inactive") {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();

        const matchesName = (user.fullName || user.name || "")
          .toLowerCase()
          .includes(term);

        const matchesEmail = (user.email || "")
          .toLowerCase()
          .includes(term);

        const matchesSkill =
          Array.isArray(user.skills) &&
          user.skills.some((s) => s.toLowerCase().includes(term));

        if (!matchesName && !matchesEmail && !matchesSkill) {
          return false;
        }
      }

      if (roleFilter !== "All") {
        if (normalizeRole(user.role) !== normalizeRole(roleFilter)) {
          return false;
        }
      }

      if (statusFilter !== "All") {
        if (userStatus !== statusFilter) return false;
      }

      if (assignmentFilter !== "All") {
        const assigned = isUserAssigned(user.id);

        if (assignmentFilter === "Assigned" && !assigned) return false;
        if (assignmentFilter === "Unassigned" && assigned) return false;
      }

      return true;
    });
  }, [
    users,
    searchTerm,
    roleFilter,
    statusFilter,
    assignmentFilter,
    isSuperAdmin,
    isUserAssigned,
  ]);

  if (!currentUser) {
    return <div className="text-slate-500">Loading user...</div>;
  }

  const handleCreateUser = async (newUser) => {
    const result = await createUser(newUser);

    if (result.success) {
      setShowAddUser(false);
    } else {
      alert(result.message || "Failed to create user.");
    }
  };

  const handleEdit = (user) => setEditingUser(user);

  const handleSaveEdit = async (updated) => {
    const result = await updateUser(updated, currentUser?.id);

    if (!result.success) {
      alert(result.message || "Failed to update user.");
      return;
    }

    setEditingUser(null);
  };

  const handleUpdateStatus = async (targetUserId, newStatus) => {
    if (!updateUserStatus) return;

    const res = await updateUserStatus(
      targetUserId,
      newStatus,
      currentUser?.id
    );

    if (!res?.success) {
      alert(res?.message || "Failed to update status.");
    }
  };

  const handleDelete = (user) => setDeletingUser(user);

  const handleConfirmDelete = async () => {
    const result = await deleteUser(deletingUser.id);

    if (!result.success) {
      alert(result.message || "Failed to delete user.");
      return;
    }

    setDeletingUser(null);
  };

  const handleResetFilters = () => {
    updateSearchTerm("");
    updateRoleFilter("All");
    updateStatusFilter("All");
    updateAssignmentFilter("All");
  };

  const handleAssignUser = async (projectId, userId, projectRole) => {
        if (!addProjectMember) return { success: false, message: "Assignment service is not available." };
    return await addProjectMember(projectId, userId, projectRole);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Management & Resource Directory
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage system users, skill profiles based on roles, active status,
            and project allocations
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddUser(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:brightness-110"
        >
          <PiPlus size={18} />
          <span>Add User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <PiUsers size={16} className="text-blue-500 dark:text-blue-400" />
            <span>Total Users</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <PiUserCheck size={16} className="text-emerald-500 dark:text-emerald-400" />
            <span>Active Users</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.active}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <PiBriefcase size={16} className="text-indigo-500 dark:text-indigo-400" />
            <span>Assigned to Projects</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.assigned}
          </p>
        </div>
      </div>

      <UserSearch
        searchTerm={searchTerm}
        onSearchChange={updateSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={updateRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={updateStatusFilter}
        assignmentFilter={assignmentFilter}
        onAssignmentFilterChange={updateAssignmentFilter}
        roles={FILTERABLE_ROLES}
        onResetFilters={handleResetFilters}
      />

      <div>
        <UserTable
          users={filteredUsers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateStatus={handleUpdateStatus}
          onOpenAssignModal={(user, currentAssignments) => {
            setAssignModalUser(user);
            setAssignModalAssignments(currentAssignments || []);
          }}
          currentUserId={currentUser?.id}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

      {showAddUser && (
        <UserAddForm
          onCancel={() => setShowAddUser(false)}
          onCreateUser={handleCreateUser}
        />
      )}

      {editingUser && (
        <EditUserForm
          user={editingUser}
          currentUserId={currentUser?.id}
          onCancel={() => setEditingUser(null)}
          onSave={handleSaveEdit}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          onCancel={() => setDeletingUser(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {assignModalUser && (
        <AssignUserModal
          isOpen={Boolean(assignModalUser)}
          user={assignModalUser}
          projects={projects}
          currentAssignments={assignModalAssignments}
          onAssign={handleAssignUser}
          onClose={() => {
            setAssignModalUser(null);
            setAssignModalAssignments([]);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;