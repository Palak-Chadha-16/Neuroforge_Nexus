import { createContext, useContext } from "react";

export const ProjectContext = createContext(null);

export const useProjects = () => useContext(ProjectContext);
