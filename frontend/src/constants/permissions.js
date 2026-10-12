import { ROLES, MEMBER_ROLES } from "./roles.js";

export const PERMISSIONS = {
  "project:create": [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  "project:edit": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD],
  "project:delete": [ROLES.ADMIN],
  "project:assign": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD],

  "task:create": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD],
  "task:edit": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD],
  "task:delete": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD],
  "task:status": "ALL",

  "subtask:create": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD],
  "subtask:edit": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD],
  "subtask:delete": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD],
  "subtask:assign": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD],
  "subtask:reschedule": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD],
  "subtask:status": "ALL",

  "user:manage": [ROLES.ADMIN],
  "team:manage": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD],
  "team:view": [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD],

  "mywork:view": [ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD, ROLES.TEAM_LEAD, ...MEMBER_ROLES],
};

export const hasRolePermission = (role, permission) => {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  if (allowed === "ALL") return true;
  return Array.isArray(allowed) && allowed.includes(role);
};
