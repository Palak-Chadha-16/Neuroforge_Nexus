import { useState, useEffect, useRef } from "react";
import {
  PiRobot,
  PiPaperPlaneRight,
  PiTrash,
  PiSparkle,
  PiUser,
  PiCheckCircle,
  PiCopy,
} from "react-icons/pi";
import { useAuth } from "../../context/AuthContextStore.js";
import { useProjects } from "../../context/ProjectContextStore.js";
import { useTasks } from "../../context/TasksContextStore.js";
import axios, { getApiBase } from "../../services/api.js";

const QUICK_PROMPTS = [
  {
    category: "Projects",
    items: [
      "How many projects do I have?",
      "Which projects are in progress?",
      "Show high priority projects",
      "Any upcoming project deadlines?",
    ],
  },
  {
    category: "Tasks & Sprints",
    items: [
      "What tasks are assigned to me?",
      "Show all open parent tasks",
      "Which tasks are overdue?",
      "Give me a sprint progress summary",
    ],
  },
  {
    category: "Calendar & Schedule",
    items: [
      "What's on today?",
      "What's scheduled for tomorrow?",
      "List all my saved events",
      "Mark tomorrow as Sprint Review",
    ],
  },
];

const API_BASE = getApiBase();
const CHAT_ENDPOINT = `${API_BASE}/chat`;

const AIAssistant = () => {
  const { currentUser } = useAuth();
  const { projects = [] } = useProjects() || {};
  const { tasks = [] } = useTasks() || {};

  const [messages, setMessages] = useState(() => [
    {
      id: "msg-init",
      sender: "ai",
      text: `Hello ${
        currentUser?.fullName || "there"
      }! 👋\n\nI'm your **NeuroForge SDLC AI Assistant**. Ask me questions about your projects, tasks, sprints, deadlines, and engineering workspace.`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const createMessage = (sender, text) => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text,
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  const handleSend = async (e) => {
    e?.preventDefault();

    const query = input.trim();

    if (!query || isTyping) return;

    const userMessage = createMessage("user", query);
    const previousMessages = messages;

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      /*
       * Send recent conversation history to the backend.
       * The backend uses the authenticated JWT user to determine
       * the user's accessible projects/tasks.
       */
      const history = previousMessages
        .filter(
          (message) =>
            message?.text && message.id !== "msg-init"
        )
        .slice(-10)
        .map((message) => ({
          role:
            message.sender === "ai"
              ? "assistant"
              : "user",
          content: message.text,
        }));

      const response = await axios.post(CHAT_ENDPOINT, {
        message: query,
        history,
      });

      if (/\b(calendar|schedule|meeting|event|deadline|due date|remind(?:er)?|mark|today|tomorrow|overdue|reschedule|postpone|move|change)\b/i.test(query)) {
        window.dispatchEvent(new Event("nfn-calendar-events-updated"));
      }

      const reply = response.data?.reply;

      if (!reply) {
        throw new Error(
          "The AI backend returned an empty reply."
        );
      }

      setMessages((prev) => [
        ...prev,
        createMessage("ai", reply),
      ]);
    } catch (error) {
      console.error(
        "AI Assistant request failed:",
        error
      );

      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "AI Assistant is currently unavailable. Make sure the Spring Boot backend and Groq configuration are running.";

      setMessages((prev) => [
        ...prev,
        createMessage(
          "ai",
          `⚠️ ${backendMessage}`
        ),
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleClear = () => {
    setMessages([
      createMessage(
        "ai",
        "Chat cleared. Ask me anything about your projects, tasks, sprints, or engineering workspace."
      ),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <PiRobot size={26} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                AI Engineering Assistant
              </h1>

              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Copilot
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              AI-powered SDLC context engine • Project metrics,
              sprint deliverables, and engineering insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white shadow-xs"
            title="Clear current conversation"
          >
            <PiTrash size={15} />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#111827]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Live Workspace Scope
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {projects.length}
                </span>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Projects in Scope
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {tasks.length}
                </span>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Active Tasks
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#111827] space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <PiSparkle
                className="text-indigo-500"
                size={16}
              />

              <span>Recommended Prompts</span>
            </div>

            {QUICK_PROMPTS.map((group) => (
              <div
                key={group.category}
                className="space-y-1.5"
              >
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {group.category}
                </p>

                <div className="space-y-1">
                  {group.items.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="w-full text-left rounded-lg border border-slate-200/80 bg-slate-50/60 px-2.5 py-1.5 text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/80 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Conversation Window */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#111827] h-[640px]">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isAi = msg.sender === "ai";

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    isAi
                      ? "items-start"
                      : "items-start flex-row-reverse"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
                      isAi
                        ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {isAi ? (
                      <PiRobot size={18} />
                    ) : (
                      <PiUser size={16} />
                    )}
                  </div>

                  <div
                    className={`group relative max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed transition ${
                      isAi
                        ? "border border-slate-200 bg-slate-50/70 text-slate-800 dark:border-slate-800 dark:bg-[#1e293b] dark:text-slate-100"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {msg.text}
                    </div>

                    <div
                      className={`mt-2 flex items-center justify-between gap-4 text-[10px] ${
                        isAi
                          ? "text-slate-400 dark:text-slate-500"
                          : "text-blue-100/80"
                      }`}
                    >
                      <span>{msg.timestamp}</span>

                      {isAi && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(msg.text, msg.id)
                          }
                          className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition hover:text-slate-700 dark:hover:text-slate-200"
                          title="Copy reply text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <PiCheckCircle
                                className="text-emerald-500"
                                size={13}
                              />
                              <span className="text-emerald-500 font-medium">
                                Copied
                              </span>
                            </>
                          ) : (
                            <>
                              <PiCopy size={13} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <PiRobot size={18} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#1e293b] dark:text-slate-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                  <span>
                    Assistant is analyzing your SDLC workspace...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
            <span className="text-slate-400 font-medium shrink-0">
              Try asking:
            </span>

            {[
              "Which projects are in progress?",
              "What tasks are assigned to me?",
              "Explain a backend error in my project",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-300 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSend}
            className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask anything about projects, tasks, sprints, schedules, or development..."
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-400"
            />

            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <PiPaperPlaneRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;