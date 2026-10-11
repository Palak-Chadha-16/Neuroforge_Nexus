import { createContext, useContext } from "react";

export const TeamsContext = createContext(null);

export const useTeams = () => useContext(TeamsContext);
