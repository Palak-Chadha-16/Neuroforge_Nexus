import { createContext, useContext } from "react";

export const ProjectTeamContext = createContext(null);
export const MEMBER_STATUSES = ["Active", "Inactive", "In Meeting"];

export const useProjectTeam = () => useContext(ProjectTeamContext);
