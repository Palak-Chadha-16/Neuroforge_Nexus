import { createContext, useContext } from "react";

export const TasksContext = createContext(null);
export const SEED_TASKS = [];
export const SEED_SUBTASKS = [];

export const useTasks = () => useContext(TasksContext);
