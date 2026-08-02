import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { LOGO_URL } from "@/lib/assets";

const TITLE = "Sign in — MindVault AI";
const DESCRIPTION = "Sign in to your MindVault AI workspace and pick up where your thinking left off.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

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
          <h1 className="text-headline-lg text-primary text-center mb-xs">MindVault AI</h1>
          <p className="text-body-md text-on-surface-variant text-center">
            Intelligent Thought Mapping
          </p>
        </div>

        <form
          className="space-y-md"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/dashboard" });
          }}
        >
          <div className="relative">
            <input
              id="email"
              type="email"
              required
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

          <div className="flex items-center justify-between mt-sm mb-lg">
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 border border-outline-variant rounded bg-surface accent-primary"
              />
              <label htmlFor="remember" className="text-label-md text-on-surface-variant">
                Remember me
              </label>
            </div>
            <a href="#reset" className="text-label-md text-primary hover:underline">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full text-on-primary bg-primary hover:bg-on-primary-fixed-variant text-label-md rounded-xl px-lg py-md text-center transition-all duration-200 shadow-md hover:shadow-lg flex justify-center items-center gap-sm"
          >
            Sign in
            <Icon name="login" className="text-[18px]" />
          </button>
        </form>

        <div className="mt-lg">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-surface-container-lowest text-on-surface-variant text-label-sm rounded-full">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-lg grid grid-cols-2 gap-md">
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                type="button"
                className="flex justify-center items-center gap-2 w-full px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface text-label-md transition-colors duration-200"
              >
                <Icon
                  name={provider === "Google" ? "public" : "code"}
                  className="text-[18px] opacity-70"
                />
                {provider}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-lg text-center text-label-sm text-on-surface-variant">
          Don't have an account?{" "}
          <Link to="/dashboard" className="text-primary hover:underline font-bold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
