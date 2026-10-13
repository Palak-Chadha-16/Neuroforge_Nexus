import { useState } from "react";
import { PiAt, PiPaperPlaneTilt } from "react-icons/pi";
import {
  avatarColor,
  formatStamp,
  getInitials,
  mergeComments,
} from "../utils/bugHelpers.js";

const renderText = (text) =>
  text.split(/(@\w+)/g).map((part, index) =>
    /^@\w+$/.test(part) ? (
      <span
        key={index}
        className="rounded bg-blue-50 px-1 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
      >
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  );

const BugComments = ({
  bug,
  localComments,
  members,
  currentUserName,
  onAdd,
}) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const comments = mergeComments(bug, localComments);
  const myTag = `@${String(currentUserName).split(" ")[0]}`.toLowerCase();

  const mention = /@(\w*)$/.exec(text);
  const suggestions = mention
    ? members
        .filter((member) =>
          String(member.name || "")
            .toLowerCase()
            .includes(mention[1].toLowerCase())
        )
        .slice(0, 5)
    : [];

  const insertMention = (member) => {
    const first = String(member.name || "teammate").split(" ")[0];
    setText((current) => current.replace(/@(\w*)$/, `@${first} `));
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      if (await onAdd(trimmed)) {
        setText("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No comments yet. Start the conversation and use @ to mention a
            teammate.
          </p>
        )}

        {comments.map((comment) => {
          const mentionsMe = comment.text.toLowerCase().includes(myTag);

          return (
            <div key={comment.id} className="flex gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(
                  comment.author
                )}`}
              >
                {getInitials(comment.author)}
              </span>

              <div
                className={`min-w-0 flex-1 rounded-xl px-4 py-3 ${
                  mentionsMe
                    ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30"
                    : "bg-gray-50 dark:bg-gray-700/50"
                }`}
              >
                <p className="text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {comment.author}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    · {formatStamp(comment.at)}
                  </span>
                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {renderText(comment.text)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="Write a comment... type @ to mention someone"
          className="w-full resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />

        {suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => insertMention(member)}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
              >
                <PiAt size={13} />
                {member.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Ctrl + Enter to post</span>

          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || sending}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <PiPaperPlaneTilt size={16} />
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default BugComments;