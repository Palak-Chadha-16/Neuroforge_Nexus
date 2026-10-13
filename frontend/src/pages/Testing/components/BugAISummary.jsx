import { useEffect, useState } from "react";
import {
  PiCheckCircle,
  PiCircleNotch,
  PiCopy,
  PiSparkle,
} from "react-icons/pi";
import axios, { getApiBase } from "../../../services/api.js";

const API_BASE = getApiBase();

// Set VITE_AI_SUMMARY_ENABLED=true once the backend has POST /bugs/:id/summary
const AI_ENABLED = import.meta.env.VITE_AI_SUMMARY_ENABLED === "true";

const nextStepByStatus = {
  New: "Triage the bug, confirm it is reproducible and set the right severity.",
  Triaged: "Assign the bug to a developer who owns this module.",
  Assigned: "Developer should reproduce the issue and start on a fix.",
  "In Progress":
    "Finish the fix and move the bug to Fixed with notes for the tester.",
  Fixed: "Hand over to QA and move the bug to Retest.",
  Retest: "Tester should verify the fix and record Passed or Failed.",
  Reopened: "Developer should review the failed retest and fix it again.",
  Closed: "No action needed. The fix was verified.",
};

const clip = (text, max) =>
  text.length > max ? `${text.slice(0, max).trim()}...` : text;

const buildLocalSummary = ({ bug, comments, activity }) => {
  const description = String(bug.description || "")
    .replace(/\s+/g, " ")
    .trim();
  const lastComment = comments[comments.length - 1];
  const updates = activity.filter(
    (event) => event.type === "status" || event.type === "retest"
  ).length;

  const sections = [
    {
      label: "Overview",
      text: `${bug.severity} severity, ${String(
        bug.priority || ""
      ).toLowerCase()} priority issue in the ${bug.module} module of ${
        bug.project
      }, found in ${bug.environment}.`,
    },
    {
      label: "Problem",
      text: description ? clip(description, 240) : "No description was provided.",
    },
    {
      label: "Current state",
      text: `${bug.status}, assigned to ${bug.assignedTo}. ${
        updates ? `${updates} status update(s) recorded.` : "No status updates yet."
      }`,
    },
  ];

  if (lastComment) {
    sections.push({
      label: "Discussion",
      text: `${comments.length} comment(s). Latest from ${
        lastComment.author
      }: "${clip(lastComment.text, 140)}"`,
    });
  }

  sections.push({
    label: "Suggested next step",
    text:
      nextStepByStatus[bug.status] ||
      "Review the bug and decide the next action.",
  });

  return sections;
};

const BugAISummary = ({ bug, comments, activity, onGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [localReason, setLocalReason] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setResult(null);
        setCopied(false);
        setLocalReason("");
      }
    });
    return () => {
      active = false;
    };
  }, [bug.id]);

  const generate = async () => {
    setLoading(true);
    setCopied(false);
    setLocalReason("");

    let next = null;
    let fallbackReason = AI_ENABLED
      ? "The AI service did not return a summary; this local summary is based on bug details."
      : "AI summaries are disabled; this local summary is based on bug details.";

    if (AI_ENABLED) {
      try {
        const response = await axios.post(`${API_BASE}/bugs/${bug.id}/summary`, {});
        const text = response.data?.summary ?? response.data?.text;

        if (typeof text === "string" && text.trim()) {
          next = {
            source: "ai",
            sections: [{ label: "Summary", text: text.trim() }],
          };
        } else {
          fallbackReason = "The AI service returned no summary; showing a local summary instead.";
        }
      } catch (error) {
        const message =
          error.response?.data?.message ||
          "The AI service is unavailable.";
        fallbackReason = `${message} Showing a local summary instead.`;
      }
    }

    if (!next) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      next = {
        source: "local",
        sections: buildLocalSummary({ bug, comments, activity }),
      };
      setLocalReason(fallbackReason);
    }

    setResult(next);
    setLoading(false);
    if (onGenerated) onGenerated(next.source);
  };

  const copy = async () => {
    if (!result) return;

    const text = result.sections
      .map((section) => `${section.label}: ${section.text}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 dark:border-violet-500/30 dark:from-violet-500/10 dark:to-indigo-500/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white dark:bg-violet-500">
            <PiSparkle size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              AI Summary
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              A quick read of this bug, its discussion and its status.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        >
          {loading ? (
            <PiCircleNotch size={16} className="animate-spin" />
          ) : (
            <PiSparkle size={16} />
          )}
          {loading
            ? "Generating..."
            : result
              ? "Regenerate"
              : "Generate AI Summary"}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-3 rounded-lg bg-white/70 p-4 dark:bg-gray-900/40">
          {result.sections.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                {section.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-200">
                {section.text}
              </p>
            </div>
          ))}

          <div className="flex items-center justify-between border-t border-violet-100 pt-3 dark:border-violet-500/20">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {result.source === "ai"
                ? "Generated by AI"
                : localReason}
            </span>

            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
            >
              {copied ? <PiCheckCircle size={14} /> : <PiCopy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugAISummary;