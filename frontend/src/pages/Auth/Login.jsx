import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PiEye, PiEyeSlash, PiLockKey, PiEnvelope } from "react-icons/pi";
import { useAuth } from "../../context/AuthContextStore.js";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result?.success) {
        setError(result?.message || "Invalid email or password.");
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6fa] dark:bg-[#0b1120] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#172033] dark:text-slate-100">
            NeuroForge Nexus
          </h1>

          <p className="mt-2 text-sm text-[#475569] dark:text-slate-400">
            Sign in to continue
          </p>
        </div>

        <div className="rounded-2xl border border-[#CBD5E1] dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 shadow-lg shadow-slate-900/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200"
              >
                Email
              </label>

              <div className="relative">
                <PiEnvelope
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-slate-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-[#111927] py-3 pl-10 pr-4 text-sm text-[#172033] dark:text-slate-100 outline-none transition placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 hover:border-slate-400 dark:hover:border-slate-600 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-[#172033] dark:text-slate-200"
              >
                Password
              </label>

              <div className="relative">
                <PiLockKey
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-slate-400"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-[#111927] py-3 pl-10 pr-11 text-sm text-[#172033] dark:text-slate-100 outline-none transition placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 hover:border-slate-400 dark:hover:border-slate-600 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-slate-400 transition hover:text-[#172033] dark:hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <PiEyeSlash size={19} />
                  ) : (
                    <PiEye size={19} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-[#2563EB] dark:text-blue-400 transition hover:text-[#1D4ED8] dark:hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 shadow-md shadow-blue-500/20"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#475569] dark:text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#2563EB] dark:text-blue-400 transition hover:text-[#1D4ED8] dark:hover:text-blue-300"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-5 border-t border-[#E2E8F0] dark:border-slate-800 pt-4 text-center text-[11px] font-medium text-[#94A3B8] dark:text-slate-500">
            Enterprise IAM • 256-Bit SSL Encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;