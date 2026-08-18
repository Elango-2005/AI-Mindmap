import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { LOGO_URL } from "@/lib/assets";
import { register } from "@/api/auth";

const TITLE = "Create account — MindVault AI";
const DESCRIPTION =
  "Create your MindVault AI account and start building intelligent mind maps.";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });

      navigate({ to: "/login" });
    } catch (error: any) {
      console.error("Registration failed:", error);

      setError(
        error?.response?.data?.detail ||
          "Registration failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient p-md">
      <div className="glass-panel rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] w-full max-w-[28rem] p-lg sm:p-xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-xl">
          <img
            src={LOGO_URL}
            alt="MindVault AI logo"
            className="w-16 h-16 rounded-lg mb-md shadow-sm border border-outline-variant/30"
          />

          <h1 className="text-headline-lg text-primary text-center mb-xs">
            Create your account
          </h1>

          <p className="text-body-md text-on-surface-variant text-center">
            Start building intelligent mind maps
          </p>
        </div>

        <form className="space-y-md" onSubmit={handleSubmit}>
          <div className="relative">
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder=" "
              className="block px-sm pb-sm pt-lg w-full text-body-md text-on-surface bg-transparent rounded-lg border border-outline-variant appearance-none focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] peer transition-all duration-200"
            />

            <label
              htmlFor="fullName"
              className="absolute text-label-md text-on-surface-variant duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-sm peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
            >
              Full name
            </label>
          </div>

          <div className="relative">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder=" "
              className="block px-sm pb-sm pt-lg w-full text-body-md text-on-surface bg-transparent rounded-lg border border-outline-variant appearance-none focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] peer transition-all duration-200"
            />

            <label
              htmlFor="email"
              className="absolute text-label-md text-on-surface-variant duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-sm peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
            >
              Email address
            </label>
          </div>

          <div className="relative">
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder=" "
              className="block px-sm pb-sm pt-lg w-full text-body-md text-on-surface bg-transparent rounded-lg border border-outline-variant appearance-none focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] peer transition-all duration-200"
            />

            <label
              htmlFor="password"
              className="absolute text-label-md text-on-surface-variant duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-sm peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
            >
              Password
            </label>
          </div>

          {error && (
            <p className="text-label-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-on-primary bg-primary hover:bg-on-primary-fixed-variant disabled:opacity-50 disabled:cursor-not-allowed text-label-md rounded-xl px-lg py-md text-center transition-all duration-200 shadow-md hover:shadow-lg flex justify-center items-center gap-sm"
          >
            {isSubmitting ? "Creating account..." : "Create account"}

            <Icon
              name={isSubmitting ? "progress_activity" : "person_add"}
              className="text-[18px]"
            />
          </button>
        </form>

        <p className="mt-lg text-center text-label-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}