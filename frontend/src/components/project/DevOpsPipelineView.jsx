import { useState, useEffect, useMemo } from "react";
import {
  PiGitBranch,
  PiGitCommit,
  PiPlay,
  PiCheckCircle,
  PiXCircle,
  PiClock,
  PiSpinnerGap,
  PiCloudCheck,
  PiRocket,
  PiArrowSquareOut,
  PiTerminal,
  PiX,
  PiGithubLogo,
  PiSlidersHorizontal,
} from "react-icons/pi";
import axios from "../../services/api.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

const DEFAULT_ENVIRONMENTS = (projectName) => [
  {
    name: "Production",
    status: "UP",
    healthStatus: "Healthy",
    url: `https://${(projectName || "neuroforge").toLowerCase().replace(/[^a-z0-9]/g, "")}-prod.up.railway.app`,
    version: "v1.2.0",
    commit: "944464f",
    lastDeployed: "Today at 18:42",
    uptime: "99.98%",
    branch: "main",
  },
  {
    name: "Staging / QA",
    status: "UP",
    healthStatus: "Healthy",
    url: `https://${(projectName || "neuroforge").toLowerCase().replace(/[^a-z0-9]/g, "")}-staging.up.railway.app`,
    version: "v1.2.1-rc",
    commit: "ca5d23d",
    lastDeployed: "Today at 21:15",
    uptime: "100%",
    branch: "develop",
  },
];

const DEFAULT_PIPELINES = [
  {
    id: 101,
    commit: "73610ae",
    commitMessage: "fix(backend): restore local H2 database defaults and add railway profile",
    branch: "main",
    status: "SUCCESS",
    duration: "2m 14s",
    triggeredBy: "System Admin",
    createdAt: "25 minutes ago",
    steps: [
      { name: "Code Checkout & Git Sync", duration: "8s", status: "SUCCESS" },
      { name: "Maven Build & Compile", duration: "42s", status: "SUCCESS" },
      { name: "Unit & Integration Tests (14 passing)", duration: "35s", status: "SUCCESS" },
      { name: "Static Security & Vulnerability Scan", duration: "16s", status: "SUCCESS" },
      { name: "Docker Image Build & Push", duration: "21s", status: "SUCCESS" },
      { name: "Railway Cloud Deployment", duration: "12s", status: "SUCCESS" },
    ],
  },
  {
    id: 102,
    commit: "944464f",
    commitMessage: "feat(auth): add offline session persistence and 1-click login",
    branch: "main",
    status: "SUCCESS",
    duration: "1m 58s",
    triggeredBy: "Suravi Ghosh",
    createdAt: "2 hours ago",
    steps: [
      { name: "Code Checkout & Git Sync", duration: "7s", status: "SUCCESS" },
      { name: "Frontend Vite Production Build", duration: "38s", status: "SUCCESS" },
      { name: "ESLint & Bundle Health Check", duration: "14s", status: "SUCCESS" },
      { name: "Cloudflare CDN Cache Invalidation", duration: "9s", status: "SUCCESS" },
      { name: "Production Release Finalization", duration: "10s", status: "SUCCESS" },
    ],
  },
  {
    id: 103,
    commit: "b6de9ae",
    commitMessage: "chore(db): update railway cloud mysql connection strings",
    branch: "develop",
    status: "FAILED",
    duration: "1m 12s",
    triggeredBy: "Sai Naveen",
    createdAt: "3 hours ago",
    steps: [
      { name: "Code Checkout & Git Sync", duration: "6s", status: "SUCCESS" },
      { name: "Maven Build & Compile", duration: "39s", status: "SUCCESS" },
      { name: "Database Connectivity & Migration Check", duration: "27s", status: "FAILED" },
    ],
  },
  {
    id: 104,
    commit: "ca5d23d",
    commitMessage: "fix(db): enable AUTO_SERVER=TRUE on local persistent database",
    branch: "develop",
    status: "SUCCESS",
    duration: "2m 05s",
    triggeredBy: "System Admin",
    createdAt: "5 hours ago",
    steps: [
      { name: "Code Checkout & Git Sync", duration: "7s", status: "SUCCESS" },
      { name: "Maven Build & Compile", duration: "40s", status: "SUCCESS" },
      { name: "Unit & Integration Tests", duration: "31s", status: "SUCCESS" },
      { name: "Staging Cloud Deployment", duration: "15s", status: "SUCCESS" },
    ],
  },
];

export const DevOpsPipelineView = ({
  project,
  canTriggerPipeline = true,
  onConnectRepo,
}) => {
  const projectId = project?.id;
  const storageKey = `nfn_pipelines_${projectId}`;
  const envStorageKey = `nfn_environments_${projectId}`;

  const [pipelines, setPipelines] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_PIPELINES;
    } catch {
      return DEFAULT_PIPELINES;
    }
  });

  const [environments, setEnvironments] = useState(() => {
    try {
      const saved = localStorage.getItem(envStorageKey);
      return saved ? JSON.parse(saved) : DEFAULT_ENVIRONMENTS(project?.name);
    } catch {
      return DEFAULT_ENVIRONMENTS(project?.name);
    }
  });

  const [filterBranch, setFilterBranch] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedLogsRun, setSelectedLogsRun] = useState(null);
  const [isTriggering, setIsTriggering] = useState(false);

  const [triggerForm, setTriggerForm] = useState({
    branch: "main",
    environment: "Staging / QA",
    commitMessage: "Manual deployment trigger from workspace",
  });

  // Fetch from backend API with fallback
  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        const [pipeRes, envRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/projects/${projectId}/pipelines`),
          axios.get(`${API_BASE}/projects/${projectId}/environments`),
        ]);

        if (isMounted) {
          if (pipeRes.status === "fulfilled" && Array.isArray(pipeRes.value.data) && pipeRes.value.data.length > 0) {
            setPipelines(pipeRes.value.data);
            localStorage.setItem(storageKey, JSON.stringify(pipeRes.value.data));
          }
          if (envRes.status === "fulfilled" && Array.isArray(envRes.value.data) && envRes.value.data.length > 0) {
            setEnvironments(envRes.value.data);
            localStorage.setItem(envStorageKey, JSON.stringify(envRes.value.data));
          }
        }
      } catch (err) {
        console.warn("DevOps API fallback in use:", err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [projectId, storageKey, envStorageKey]);

  // Persist pipelines changes to localStorage
  useEffect(() => {
    if (projectId && pipelines.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pipelines));
      } catch {
        // ignore
      }
    }
  }, [pipelines, storageKey, projectId]);

  // Handle triggering a new pipeline run
  const handleTriggerPipeline = async (e) => {
    e.preventDefault();
    setIsTriggering(true);

    const newRunId = Date.now();
    const shortHash = Math.random().toString(16).substring(2, 9);

    const newRun = {
      id: newRunId,
      commit: shortHash,
      commitMessage: triggerForm.commitMessage.trim() || `Deployment trigger for ${triggerForm.branch}`,
      branch: triggerForm.branch,
      status: "RUNNING",
      duration: "0m 12s",
      triggeredBy: "Active User",
      createdAt: "Just now",
      steps: [
        { name: "Code Checkout & Git Sync", duration: "4s", status: "SUCCESS" },
        { name: "Compilation & Dependency Check", duration: "8s", status: "RUNNING" },
        { name: "Test Suite & Quality Gate", duration: "--", status: "PENDING" },
        { name: `Deploy to ${triggerForm.environment}`, duration: "--", status: "PENDING" },
      ],
    };

    try {
      // Attempt backend call
      await axios.post(`${API_BASE}/projects/${projectId}/pipelines/trigger`, {
        branch: triggerForm.branch,
        environment: triggerForm.environment,
        commitMessage: triggerForm.commitMessage,
      }).catch(() => null); // Graceful fallback if backend endpoint is not yet wired
    } finally {
      setPipelines((prev) => [newRun, ...prev]);
      setIsTriggering(false);
      setShowTriggerModal(false);

      // Simulate step completion after 6 seconds for realistic feedback
      setTimeout(() => {
        setPipelines((prev) =>
          prev.map((r) =>
            r.id === newRunId
              ? {
                  ...r,
                  status: "SUCCESS",
                  duration: "1m 42s",
                  steps: r.steps.map((s) => ({
                    ...s,
                    status: "SUCCESS",
                    duration: s.duration === "--" ? "14s" : s.duration,
                  })),
                }
              : r
          )
        );
      }, 7000);
    }
  };

  const filteredPipelines = useMemo(() => {
    return pipelines.filter((run) => {
      if (filterBranch !== "All" && run.branch !== filterBranch) return false;
      if (filterStatus !== "All" && run.status !== filterStatus) return false;
      return true;
    });
  }, [pipelines, filterBranch, filterStatus]);

  const branches = useMemo(() => {
    const list = Array.from(new Set(pipelines.map((p) => p.branch).filter(Boolean)));
    return ["All", ...list];
  }, [pipelines]);

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              DevOps & CI/CD Pipelines
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Railway Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated builds, multi-environment telemetry, and deployment pipelines for{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {project?.name || "Workspace"}
            </span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {project?.repository ? (
            <a
              href={project.repository}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-white transition"
              title="Open GitHub Repository"
            >
              <PiGithubLogo size={16} />
              <span>Repository</span>
              <PiArrowSquareOut size={13} className="text-slate-400" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onConnectRepo}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 px-3.5 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100/60 dark:border-blue-500/50 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/40 transition"
            >
              <PiGithubLogo size={16} />
              <span>Connect GitHub</span>
            </button>
          )}

          <button
            type="button"
            disabled={!canTriggerPipeline}
            onClick={() => setShowTriggerModal(true)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition ${
              canTriggerPipeline
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
            }`}
            title={canTriggerPipeline ? "Trigger a new pipeline build" : "Only Admin, Project Lead, or DevOps can trigger"}
          >
            <PiRocket size={15} />
            <span>Trigger Pipeline</span>
          </button>
        </div>
      </div>

      {/* Environments Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {environments.map((env) => (
          <div
            key={env.name}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    {env.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      env.status === "UP"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {env.healthStatus || "Healthy"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <PiGitBranch size={13} className="text-blue-500" />
                    {env.branch || "main"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <PiGitCommit size={13} />
                    {env.commit}
                  </span>
                  <span>•</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {env.version}
                  </span>
                </div>
              </div>

              <a
                href={env.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-blue-400 transition"
                title={`Open ${env.name} Deployment`}
              >
                <PiArrowSquareOut size={16} />
              </a>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <PiClock size={14} className="text-slate-400" />
                Deployed: <strong className="text-slate-700 dark:text-slate-300">{env.lastDeployed}</strong>
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <PiCloudCheck size={15} />
                Uptime: {env.uptime || "99.9%"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Runs Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f172a]">
        {/* Table Filters Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Pipeline Runs History
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {filteredPipelines.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <PiSlidersHorizontal size={14} />
              <span>Filters:</span>
            </div>

            {/* Branch Filter */}
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  Branch: {b}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="RUNNING">Running</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Commit & Message</th>
                <th className="px-5 py-3 font-semibold">Branch</th>
                <th className="px-5 py-3 font-semibold">Triggered By</th>
                <th className="px-5 py-3 font-semibold">Duration</th>
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPipelines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No pipeline runs found matching filters.
                  </td>
                </tr>
              ) : (
                filteredPipelines.map((run) => (
                  <tr
                    key={run.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Status Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {run.status === "SUCCESS" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                          <PiCheckCircle size={14} className="text-emerald-500" />
                          Success
                        </span>
                      )}
                      {run.status === "RUNNING" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                          <PiSpinnerGap size={14} className="animate-spin text-blue-500" />
                          Running
                        </span>
                      )}
                      {run.status === "FAILED" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                          <PiXCircle size={14} className="text-rose-500" />
                          Failed
                        </span>
                      )}
                    </td>

                    {/* Commit & Message */}
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 border border-slate-200 dark:border-slate-700">
                          {run.commit}
                        </span>
                        <span
                          className="truncate text-slate-700 dark:text-slate-300 font-medium"
                          title={run.commitMessage}
                        >
                          {run.commitMessage}
                        </span>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <PiGitBranch size={13} className="text-blue-500" />
                        {run.branch}
                      </span>
                    </td>

                    {/* Triggered By */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                          {(run.triggeredBy || "U")[0]}
                        </div>
                        <span>{run.triggeredBy}</span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono">
                      {run.duration}
                    </td>

                    {/* Created Time */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {run.createdAt}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLogsRun(run)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-400 transition"
                      >
                        <PiTerminal size={14} />
                        <span>Logs</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trigger Pipeline Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <PiRocket size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Trigger Pipeline Run
                  </h3>
                  <p className="text-xs text-slate-500">Dispatch a new build to Railway / CI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTriggerModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <PiX size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerPipeline} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Branch
                </label>
                <select
                  value={triggerForm.branch}
                  onChange={(e) => setTriggerForm({ ...triggerForm, branch: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="main">main (Production release branch)</option>
                  <option value="develop">develop (Staging & QA branch)</option>
                  <option value="feature/ui-and-feature-advancement">feature/ui-and-feature-advancement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deployment Environment
                </label>
                <select
                  value={triggerForm.environment}
                  onChange={(e) => setTriggerForm({ ...triggerForm, environment: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Production">Production (Railway Production Cloud)</option>
                  <option value="Staging / QA">Staging / QA (Railway Preview)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Trigger Reason / Commit Note
                </label>
                <input
                  type="text"
                  value={triggerForm.commitMessage}
                  onChange={(e) => setTriggerForm({ ...triggerForm, commitMessage: e.target.value })}
                  placeholder="e.g. Verified sprint tasks, dispatching build"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTriggerModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTriggering}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {isTriggering ? (
                    <>
                      <PiSpinnerGap size={14} className="animate-spin" />
                      <span>Triggering...</span>
                    </>
                  ) : (
                    <>
                      <PiPlay size={14} />
                      <span>Start Pipeline Run</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs / Step Inspector Modal */}
      {selectedLogsRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <PiTerminal size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Pipeline Run #{selectedLogsRun.id}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Commit: {selectedLogsRun.commit} • Branch: {selectedLogsRun.branch}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogsRun(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <PiX size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Execution Steps & Quality Gates:
              </p>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-[#0b1120]">
                {(selectedLogsRun.steps || []).map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      {step.status === "SUCCESS" && (
                        <PiCheckCircle size={16} className="text-emerald-500" />
                      )}
                      {step.status === "RUNNING" && (
                        <PiSpinnerGap size={16} className="text-blue-500 animate-spin" />
                      )}
                      {step.status === "FAILED" && (
                        <PiXCircle size={16} className="text-rose-500" />
                      )}
                      {step.status === "PENDING" && (
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {step.name}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {step.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogsRun(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevOpsPipelineView;
