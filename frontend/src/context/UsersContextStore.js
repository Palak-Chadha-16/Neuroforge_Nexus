import { createContext, useContext } from "react";

export const UsersContext = createContext(null);

export const ROLE_DEFAULT_SKILLS = {
  admin: ["System Admin", "Access Control", "Security Compliance", "DevOps"],
  project_manager: ["Agile / Scrum", "Risk Management", "Resource Planning", "Stakeholder Mgmt"],
  project_lead: ["System Architecture", "Sprint Planning", "Technical Strategy", "Mentorship"],
  team_lead: ["Sprint Leadership", "Code Review", "Task Delegation", "Architecture"],
  developer: ["React", "Spring Boot", "REST APIs", "PostgreSQL", "Git"],
  tester: ["Test Automation", "Selenium", "Jest", "Manual Testing", "JIRA"],
  qa: ["Quality Assurance", "Cypress", "Performance Testing", "CI/CD", "API Testing"],
};

export const normalizeUserRole = (role) => {
  if (!role || typeof role !== "string") return "unassigned";
  return role.trim().toLowerCase().replace(/[\s-]+/g, "_");
};

export const normalizeUser = (user) => {
  const roleKey = normalizeUserRole(user.role);
  const defaultSkills =
    ROLE_DEFAULT_SKILLS[roleKey] || ROLE_DEFAULT_SKILLS.developer;

  const backendSkills =
    Array.isArray(user.skills) && user.skills.length > 0
      ? user.skills
      : null;

  return {
    ...user,
    id: user.id != null ? Number(user.id) : Date.now(),
    fullName: user.fullName || user.name || "User",
    name: user.fullName || user.name || "User",
    email: user.email || "",
    role: user.role || "unassigned",
    skills: backendSkills || defaultSkills,
    status: user.status || "Active",
  };
};

export const useUsers = () => useContext(UsersContext);
