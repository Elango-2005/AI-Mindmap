import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

const TITLE = "Appearance Settings — MindVault AI";
const DESCRIPTION = "Customize the theme, accent color, interface scaling, and motion of your workspace.";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Settings,
});

const SECTIONS = [
  { label: "Profile", icon: "person" },
  { label: "Account", icon: "badge" },
  { label: "Appearance", icon: "palette" },
  { label: "Notifications", icon: "notifications" },
  { label: "API Keys", icon: "key" },
];

const ACCENTS = [
  { name: "Indigo", className: "bg-primary" },
  { name: "Emerald", className: "bg-accent-emerald" },
  { name: "Rose", className: "bg-accent-rose" },
  { name: "Amber", className: "bg-accent-amber" },
  { name: "Violet", className: "bg-accent-violet" },
  { name: "Slate", className: "bg-accent-slate" },
];

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(Boolean(defaultChecked));
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        on ? "bg-primary" : "bg-surface-variant",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-surface-container-lowest border border-outline-variant transition-transform",
          on && "translate-x-full",
        )}
      />
    </button>
  );
}

function Settings() {
  const [section, setSection] = useState("Appearance");
  const [theme, setTheme] = useState("Light");
  const [accent, setAccent] = useState("Indigo");
  const [scale, setScale] = useState(2);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-[280px] h-full bg-surface border-r border-outline-variant/20 flex-col p-md gap-sm shrink-0">
        <div className="px-md py-lg mb-4">
          <Link
            to="/workspace"
            className="flex items-center gap-sm hover:opacity-80 transition-opacity"
          >
            <Icon name="arrow_back" className="text-on-surface-variant text-xl" />
            <span className="text-label-md text-on-surface-variant">Back to Workspace</span>
          </Link>
          <h1 className="text-headline-lg text-on-surface mt-6">Settings</h1>
        </div>

        <nav className="flex flex-col gap-xs flex-grow">
          {SECTIONS.map((item) => (
            <button
              key={item.label}
              onClick={() => setSection(item.label)}
              className={cn(
                "flex items-center gap-md px-md py-sm rounded-xl transition-all duration-200 text-left",
                section === item.label
                  ? "bg-secondary-fixed text-on-secondary-fixed font-bold shadow-sm translate-x-1"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <Icon name={item.icon} filled={section === item.label} />
              <span className="text-label-md">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-outline-variant/20">
          <a
            href="#help"
            className="text-on-surface-variant flex items-center gap-md px-md py-sm rounded-xl hover:bg-surface-container transition-all duration-200"
          >
            <Icon name="help_outline" />
            <span className="text-label-md">Help Center</span>
          </a>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto bg-background p-lg md:p-xxl">
        <div className="max-w-3xl mx-auto">
          <header className="mb-lg border-b border-outline-variant/30 pb-sm">
            <h2 className="text-headline-md text-on-surface">Appearance</h2>
            <p className="text-body-md text-on-surface-variant mt-xs">
              Customize the look and feel of your workspace.
            </p>
          </header>

          <div className="flex flex-col gap-xl">
            {/* Theme */}
            <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm ai-glow">
              <div className="mb-md">
                <h3 className="text-label-md text-on-surface font-semibold">Theme Preference</h3>
                <p className="text-label-md text-on-surface-variant mt-1">
                  Select your preferred color scheme.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
                {[
                  { name: "Light", icon: "light_mode" },
                  { name: "Dark", icon: "dark_mode" },
                  { name: "System", icon: "contrast" },
                ].map((option) => (
                  <button
                    key={option.name}
                    onClick={() => setTheme(option.name)}
                    className={cn(
                      "relative rounded-lg overflow-hidden p-1 bg-surface transition-colors",
                      theme === option.name
                        ? "border-2 border-primary shadow-sm"
                        : "border border-outline-variant/30 opacity-70 hover:opacity-100",
                    )}
                  >
                    <div
                      className={cn(
                        "h-24 rounded flex items-center justify-center relative overflow-hidden border",
                        option.name === "Dark"
                          ? "bg-inverse-surface border-outline/20"
                          : option.name === "System"
                            ? "bg-surface-container-highest border-outline-variant/20"
                            : "bg-surface-container-lowest border-outline-variant/20",
                      )}
                    >
                      {option.name === "System" ? (
                        <>
                          <div className="w-1/2 h-full bg-surface-container-lowest" />
                          <div className="w-1/2 h-full bg-inverse-surface" />
                        </>
                      ) : null}
                      <Icon
                        name={option.icon}
                        filled={theme === option.name}
                        className={cn(
                          "absolute text-3xl",
                          option.name === "Dark"
                            ? "text-inverse-on-surface"
                            : theme === option.name
                              ? "text-primary"
                              : "text-on-surface",
                        )}
                      />
                    </div>
                    <div
                      className={cn(
                        "text-center mt-2 pb-1 text-label-md",
                        theme === option.name
                          ? "font-bold text-primary"
                          : "text-on-surface-variant",
                      )}
                    >
                      {option.name}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Accent */}
            <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
              <div className="mb-md">
                <h3 className="text-label-md text-on-surface font-semibold">Accent Color</h3>
                <p className="text-label-md text-on-surface-variant mt-1">
                  Choose the primary color for buttons and active states.
                </p>
              </div>
              <div className="flex flex-wrap gap-md">
                {ACCENTS.map((option) => (
                  <button
                    key={option.name}
                    aria-label={option.name}
                    onClick={() => setAccent(option.name)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-black/10",
                      option.className,
                      accent === option.name && "ring-2 ring-primary ring-offset-2",
                    )}
                  >
                    {accent === option.name ? (
                      <Icon name="check" filled className="text-on-primary text-sm" />
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

            {/* Scaling */}
            <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
              <div className="mb-md">
                <h3 className="text-label-md text-on-surface font-semibold">Interface Scaling</h3>
                <p className="text-label-md text-on-surface-variant mt-1">
                  Adjust the overall size of text and UI elements.
                </p>
              </div>
              <div className="flex items-center gap-lg mt-6">
                <span className="text-sm text-on-surface-variant">A</span>
                <div className="flex-grow">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    aria-label="Interface scaling"
                    className="w-full accent-primary"
                  />
                </div>
                <span className="text-headline-sm text-on-surface">A</span>
              </div>
              <div className="flex justify-between mt-2 px-1 text-label-sm text-on-surface-variant">
                <span>Compact</span>
                <span>Standard</span>
                <span>Comfortable</span>
              </div>
            </section>

            {/* Motion */}
            <section className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant/30 shadow-sm">
              <div className="flex justify-between items-center gap-md">
                <div>
                  <h3 className="text-label-md text-on-surface font-semibold">Reduced Motion</h3>
                  <p className="text-label-md text-on-surface-variant mt-1">
                    Minimize animations and transition effects.
                  </p>
                </div>
                <Toggle />
              </div>
              <div className="flex justify-between items-center gap-md mt-md pt-md border-t border-outline-variant/20">
                <div>
                  <h3 className="text-label-md text-on-surface font-semibold">
                    AI Intelligence Glow
                  </h3>
                  <p className="text-label-md text-on-surface-variant mt-1">
                    Show subtle visual cues on AI-enhanced elements.
                  </p>
                </div>
                <Toggle defaultChecked />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
