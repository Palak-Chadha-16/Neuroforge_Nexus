import { useTasks } from "../../context/TasksContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";

const ProjectProgressList = () => {
  const { tasks } = useTasks();
  const { projects } = useProjects();

  const projectStats = projects.map((project) => {
    const projectTasks = tasks.filter(
      (task) =>
        String(task.project?.id ?? task.projectId) === String(project.id)
    );

    const done = projectTasks.filter(
      (task) => ["DONE", "Done"].includes(task.boardStatus || task.status)
    ).length;

    const percent = projectTasks.length
      ? Math.round((done / projectTasks.length) * 100)
      : 0;

    return {
      id: project.id,
      name: project.name,
      percent,
      totalTasks: projectTasks.length,
      completedTasks: done,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1e293b] p-5 shadow-xs dark:shadow-md transition-colors">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
        Project Progress
      </h3>

      {projectStats.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No projects yet.
        </p>
      ) : (
        <div className="space-y-5">
          {projectStats.map((project) => (
            <div key={project.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {project.name}
                </span>

                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {project.percent}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${project.percent}%`,
                  }}
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {project.completedTasks} of {project.totalTasks} tasks completed
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectProgressList;