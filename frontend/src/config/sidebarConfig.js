import {
PiSquaresFour,
PiUsersThree,
PiListChecks,
PiUser,
PiFolder,
PiCalendarBlank,
PiBug,
PiGearSix,
PiShieldCheck,
} from "react-icons/pi";

import { ROLES, MEMBER_ROLES, normalizeRole } from "../constants/roles.js";

export const sidebarItems = [
{
label: "Dashboard",
path: "/dashboard",
icon: PiSquaresFour,
roles: [
ROLES.ADMIN,
ROLES.PROJECT_MANAGER,
ROLES.PROJECT_LEAD,
ROLES.TEAM_LEAD,
...MEMBER_ROLES,
ROLES.UNASSIGNED,
],
},
{
label: "Projects",
path: "/projects",
icon: PiFolder,
roles: [
ROLES.ADMIN,
ROLES.PROJECT_MANAGER,
ROLES.PROJECT_LEAD,
ROLES.TEAM_LEAD,
...MEMBER_ROLES,
],
},
{
label: "Tasks",
path: "/tasks",
icon: PiListChecks,
roles: [
ROLES.ADMIN,
ROLES.PROJECT_MANAGER,
ROLES.PROJECT_LEAD,
ROLES.TEAM_LEAD,
...MEMBER_ROLES,
],
},
{
label: "Calendar",
path: "/calendar",
icon: PiCalendarBlank,
roles: [
ROLES.ADMIN,
ROLES.PROJECT_MANAGER,
ROLES.PROJECT_LEAD,
ROLES.TEAM_LEAD,
...MEMBER_ROLES,
],
},
{
label: "Testing",
path: "/testing",
icon: PiBug,
roles: [
ROLES.ADMIN,
ROLES.PROJECT_MANAGER,
ROLES.PROJECT_LEAD,
ROLES.TEAM_LEAD,
...MEMBER_ROLES,
],
},

{
label: "Teams",
path: "/teams",
icon: PiUsersThree,
roles: [
ROLES.ADMIN,
ROLES.PROJECT_MANAGER,
ROLES.PROJECT_LEAD,
ROLES.TEAM_LEAD,
],
},
{
label: "Users",
path: "/user-management",
icon: PiUser,
roles: [ROLES.ADMIN],
},
{
label: "Settings",
path: "/settings",
icon: PiGearSix,
roles: [
ROLES.ADMIN,
ROLES.PROJECT_MANAGER,
ROLES.PROJECT_LEAD,
ROLES.TEAM_LEAD,
...MEMBER_ROLES,
ROLES.UNASSIGNED,
],
},
{
label: "Admin Settings",
path: "/admin-settings",
icon: PiShieldCheck,
roles: [ROLES.ADMIN],
},
];

export const getSidebarItems = (role) => {
const normalized = normalizeRole(role);

return sidebarItems.filter((item) =>
item.roles.map(normalizeRole).includes(normalized)
);
};
