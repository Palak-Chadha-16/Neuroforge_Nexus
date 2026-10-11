import { useState } from "react";
import { useAuth } from "../../context/AuthContextStore.js";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";
import ChatBot from "../Chatbot/Chatbot.jsx";

const DashboardLayout = ({ children }) => {
  const { currentUser, deleteAccount } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return false;
    }
    const saved = sessionStorage.getItem("sidebarOpen");
    return saved === null ? true : saved === "true";
  });

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      const nextOpen = !open;
      sessionStorage.setItem("sidebarOpen", String(nextOpen));
      return nextOpen;
    });
  };

  const closeSidebarMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");

    const result = await deleteAccount();

    setDeleting(false);

    if (!result.success) {
      setDeleteError(result.message);
      return;
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900 dark:bg-[#0b1120] dark:text-slate-100 transition-colors duration-200">
      <Navbar
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        onRequestDeleteAccount={() => {
          setDeleteError("");
          setConfirmDeleteOpen(true);
        }}
      />

      <div className="relative flex">
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs md:hidden"
            aria-hidden="true"
          />
        )}

        <Sidebar
          role={currentUser.role}
          isOpen={sidebarOpen}
          onClose={closeSidebarMobile}
        />

        <main className="min-w-0 flex-1 px-3 py-6 sm:px-6 lg:px-8 max-w-full">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>
      </div>

      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] p-6 shadow-2xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold">
              !
            </div>

            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Delete your account?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This permanently deletes your account. You will be removed from
              all projects and teams, and this cannot be undone.
            </p>

            {deleteError && (
              <p className="mt-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#24324a] px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-[#2d3c56] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatBot />
    </div>
  );
};

export default DashboardLayout;