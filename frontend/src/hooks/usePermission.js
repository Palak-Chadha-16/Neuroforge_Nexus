import { useAuth } from "../context/AuthContextStore.js";
import { normalizeRole, ROLES, MEMBER_ROLES } from "../constants/roles.js";
import { hasRolePermission } from "../constants/permissions.js";

/**
 * Hook to inspect user permissions (Layer 1) and combine with Layer 2 scope checks.
 */
export const usePermission = () => {
  const { currentUser } = useAuth();
  const role = normalizeRole(currentUser?.role);

  const can = (permission, scopeCheck = true) => {
    if (!currentUser) return false;
    const hasPerm = hasRolePermission(role, permission);
    if (!hasPerm) return false;

    if (typeof scopeCheck === "function") {
      return Boolean(scopeCheck(currentUser));
    }
    return Boolean(scopeCheck);
  };

  return {
    can,
    role,
    isAdmin: role === ROLES.ADMIN,
    isProjectManager: role === ROLES.PROJECT_MANAGER,
    isProjectLead: role === ROLES.PROJECT_LEAD,
    isTeamLead: role === ROLES.TEAM_LEAD,
    isMember: MEMBER_ROLES.includes(role),
    isDeveloper: role === ROLES.DEVELOPER,
    isTester: role === ROLES.TESTER,
    isQA: role === ROLES.QA,
    currentUser,
  };
};
