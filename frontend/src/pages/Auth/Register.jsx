import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/Auth/AuthLayout.jsx";
import { useAuth } from "../../context/AuthContextStore.js";

const Register = () => {
  const navigate = useNavigate();
  const { register, currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, navigate]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setMessage("");
  };

  const validate = () => {
    const newErrors = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid work email address.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!form.terms) {
      newErrors.terms = "You must agree to the terms and privacy policy.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const result = await register({
        name: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "developer",
      });

      if (!result.success) {
        setMessage(
          result.message ||
            "Unable to create your account. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      navigate("/dashboard");
    } catch {
      setMessage("An unexpected error occurred during account creation.");
      setIsSubmitting(false);
    }
  };

  const hasValidLength = form.password.length >= 6;

  const passwordsMatch =
    hasValidLength &&
    form.confirmPassword &&
    form.password === form.confirmPassword;

  const passwordsMismatch =
    Boolean(form.confirmPassword) &&
    form.password !== form.confirmPassword;

  return (
    <AuthLayout>
      <div className="w-full max-w-xl">
        <section className="relative overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10">
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#2563EB]" />

          <div className="mb-7 text-left">
            <h2 className="text-2xl font-bold tracking-tight text-[#172033]">
              Create your account
            </h2>

            <p className="mt-1.5 text-sm text-[#64748B]">
              Join your team on the NeuroForge Nexus SDLC platform
            </p>
          </div>

          {message && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#475569]"
                >
                  Full Name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={handleChange}
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#94A3B8] ${
                    errors.fullName
                      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                      : "border-[#CBD5E1] hover:border-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                  }`}
                />

                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#475569]"
                >
                  Work Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={handleChange}
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#94A3B8] ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                      : "border-[#CBD5E1] hover:border-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                  }`}
                />

                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#475569]"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-white py-2.5 pl-4 pr-16 text-sm text-[#172033] outline-none transition placeholder:text-[#94A3B8] ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                        : "border-[#CBD5E1] hover:border-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-xs font-medium text-[#64748B] transition hover:text-[#172033]"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-semibold uppercase tracking-wider text-[#475569]"
                  >
                    Confirm Password
                  </label>

                  {passwordsMatch && (
                    <span className="text-[11px] font-medium text-emerald-600">
                      Passwords match
                    </span>
                  )}

                  {passwordsMismatch && (
                    <span className="text-[11px] font-medium text-red-600">
                      Passwords don't match
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-white py-2.5 pl-4 pr-16 text-sm text-[#172033] outline-none transition placeholder:text-[#94A3B8] ${
                      errors.confirmPassword
                        ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
                        : passwordsMatch
                        ? "border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                        : "border-[#CBD5E1] hover:border-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-xs font-medium text-[#64748B] transition hover:text-[#172033]"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-start justify-start">
                <label className="flex cursor-pointer select-none items-start gap-2.5 text-[11px] leading-normal text-[#64748B] transition hover:text-[#475569]">
                  <input
                    type="checkbox"
                    id="terms"
                    name="terms"
                    checked={form.terms}
                    onChange={handleChange}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 bg-white text-blue-600 accent-blue-600 focus:ring-0"
                  />

                  <span>
                    I agree to the{" "}
                    <span className="cursor-pointer text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8]">
                      Terms & Conditions
                    </span>{" "}
                    and{" "}
                    <span className="cursor-pointer text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8]">
                      Privacy Policy
                    </span>
                  </span>
                </label>
              </div>

              {errors.terms && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.terms}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/15 transition-all hover:bg-[#1D4ED8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>

            <span className="relative bg-white px-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
              OR
            </span>
          </div>

          <p className="text-center text-xs text-[#64748B]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#2563EB] underline underline-offset-4 transition hover:text-[#1D4ED8]"
            >
              Sign in to your account
            </Link>
          </p>

          <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-center text-[11px] font-medium text-[#94A3B8]">
            IAM Powered by Keycloak • Enterprise-Grade Protection
          </div>
        </section>
      </div>
    </AuthLayout>
  );
};

export default Register;