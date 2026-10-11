import { useState, useMemo } from "react";
import {
  PiRocket,
  PiFolder,
  PiGithubLogo,
  PiCpu,
  PiCheckCircle,
  PiClock,
} from "react-icons/pi";
import { useProjects } from "../../context/ProjectContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES, normalizeRole } from "../../constants/roles.js";
import DevOpsPipelineView from "../../components/project/DevOpsPipelineView.jsx";
import ConnectRepoModal from "../../components/project/ConnectRepoModal.jsx";

const DevOpsManagement = () => {
  const { projects = [], selectedProject } = useProjects();
  const { currentUser } = useAuth();

  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return selectedProject?.id || (projects.length > 0 ? projects[0].id : null);
  });

  const [showConnectRepo, setShowConnectRepo] = useState(false);

  // Active project selection
  const activeProject = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        id: "global",
        name: "Enterprise SDLC Platform",
        repository: "https://github.com/SuraviGhosh45/NeuroForge_Nexus",
      };
    }
    const found = projects.find((p) => String(p.id) === String(selectedProjectId));
    return found || projects[0];
  }, [projects, selectedProjectId]);

  const currentRole = normalizeRole(currentUser?.role);
  const userSkillStr = String(currentUser?.skill || "").toLowerCase();
  const canTriggerPipeline =
    [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.PROJECT_LEAD].includes(currentRole) ||
    userSkillStr.includes("devops") ||
    (Array.isArray(currentUser?.skills) &&
      currentUser.skills.some((s) => String(s).toLowerCase().includes("devops")));

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <PiRocket size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                DevOps & CI/CD Pipelines
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuous delivery, automated test gates, and multi-environment deployment telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Project Selector (if projects exist) */}
        {projects.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
              <PiFolder size={16} className="text-blue-500" />
              <label htmlFor="project-picker" className="font-semibold text-slate-600 dark:text-slate-300">
                Project:
              </label>
              <select
                id="project-picker"
                value={activeProject?.id || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-[#0f172a]">
                    {p.name} {p.code ? `(${p.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* DevOps Pipeline Main Component */}
      <DevOpsPipelineView
        project={activeProject}
        canTriggerPipeline={canTriggerPipeline}
        onConnectRepo={() => setShowConnectRepo(true)}
      />

      {/* Connect Repo Modal */}
      {showConnectRepo && (
        <ConnectRepoModal
          isOpen={showConnectRepo}
          project={activeProject}
          onClose={() => setShowConnectRepo(false)}
        />
      )}
    </div>
  );
};

export default DevOpsManagement;
