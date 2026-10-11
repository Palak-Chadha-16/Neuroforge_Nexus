import { useState, useEffect } from "react";
import { PiGithubLogo, PiX, PiLink, PiCheck, PiInfo } from "react-icons/pi";
import { useProjects } from "../../context/ProjectContextStore.js";

const ConnectRepoModal = ({ isOpen, project, onClose }) => {
  const { updateProject } = useProjects();
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active && project) {
        setRepoUrl(project.repository || "");
        setError("");
      }
    });
    return () => {
      active = false;
    };
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = repoUrl.trim();

    if (!trimmed) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }

    // Auto prepend https:// if missing
    let fullUrl = trimmed;
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = `https://${fullUrl}`;
    }

    setIsSubmitting(true);
    setError("");

    try {
            const result = await updateProject(project.id, {
        ...project,
        repository: fullUrl,
      });

      if (result && !result.success) {
        setError(result.message || "Failed to link repository.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update project repository.");
      setIsSubmitting(false);
    }
  };

  const handleUseSample = () => {
    const org = "neuroforge";
    const slug = (project.name || "app")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setRepoUrl(`https://github.com/${org}/${slug}`);
    setError("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#1e293b] text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
              <PiGithubLogo size={22} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Connect GitHub Repository
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Project: <span className="font-semibold text-slate-700 dark:text-slate-300">{project.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
          >
            <PiX size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <PiInfo size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Repository URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <PiLink
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  if (error) setError("");
                }}
                placeholder="https://github.com/organization/repository"
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Must point to an accessible repository</span>
              <button
                type="button"
                onClick={handleUseSample}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Use sample URL
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-slate-300 flex items-start gap-2">
            <PiInfo size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Once connected, the project displays a <strong>Connected</strong> button with the GitHub icon that team members can click to access the codebase.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            >
              <PiCheck size={16} />
              <span>{isSubmitting ? "Connecting..." : "Connect Repository"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectRepoModal;
