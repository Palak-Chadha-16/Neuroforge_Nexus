import {
  PiArrowRight,
  PiBug,
  PiChatCircleText,
  PiCheckCircle,
  PiSparkle,
  PiXCircle,
} from "react-icons/pi";
import { formatStamp, mergeActivity } from "../utils/bugHelpers.js";

const styles = {
  created: {
    icon: PiBug,
    className:
      "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
  },
  status: {
    icon: PiArrowRight,
    className:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
  comment: {
    icon: PiChatCircleText,
    className:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  assignment: {
    icon: PiArrowRight,
    className:
      "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300",
  },
  update: {
    icon: PiArrowRight,
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  },
  ai: {
    icon: PiSparkle,
    className:
      "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  },
  pass: {
    icon: PiCheckCircle,
    className:
      "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300",
  },
  fail: {
    icon: PiXCircle,
    className: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
  },
};

const getStyle = (event) => {
  if (event.type === "retest") {
    return event.result === "Passed" ? styles.pass : styles.fail;
  }
  return styles[event.type] || styles.status;
};

const BugActivityTimeline = ({ bug, localEvents }) => {
  const events = mergeActivity(bug, localEvents);

  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No activity yet.
      </p>
    );
  }

  return (
    <ol className="space-y-5">
      {events.map((event, index) => {
        const style = getStyle(event);
        const Icon = style.icon;

        return (
          <li key={event.id} className="relative flex gap-4">
            {index < events.length - 1 && (
              <span className="absolute left-[17px] top-9 -bottom-5 w-px bg-gray-200 dark:bg-gray-700" />
            )}

            <span
              className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.className}`}
            >
              <Icon size={18} />
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                <span className="font-semibold">{event.actor}</span>{" "}
                {event.text}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {formatStamp(event.at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default BugActivityTimeline;