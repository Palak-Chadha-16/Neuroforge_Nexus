import { Link, useNavigate } from "react-router-dom";
import { PiShieldWarning, PiArrowLeft, PiHouse } from "react-icons/pi";
import { useAuth } from "../context/AuthContextStore.js";
import { formatRole } from "../constants/roles.js";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-xl shadow-amber-500/5">
        <div className="absolute inset-0 animate-ping rounded-3xl bg-amber-500/10 opacity-75 duration-1000" />
        <PiShieldWarning size={48} className="relative z-10" />
      </div>

      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
        403 • Access Denied
      </span>

      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Restricted Workspace
      </h1>

      <p className="mt-3 max-w-md text-sm text-[#e8eef8]/60">
        You do not have sufficient permissions or assignment scope to view this section with your current role of{" "}
        <span className="font-semibold text-white">
          {formatRole(currentUser?.role)}
        </span>
        .
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e8eef8]/15 bg-[#181b23] px-5 py-2.5 text-sm font-medium text-[#e8eef8] transition hover:bg-[#e8eef8]/10"
        >
          <PiArrowLeft size={16} />
          Go Back
        </button>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
        >
          <PiHouse size={16} />
          Dashboard Home
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
