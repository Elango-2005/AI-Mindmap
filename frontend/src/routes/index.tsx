import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/SiteFooter";
import { AVATAR_URLS, LOGO_URL } from "@/lib/assets";
import { cn } from "@/lib/utils";

const TITLE = "MindForge AI — Turn Thoughts into Intelligent Maps";
const DESCRIPTION =
  "The AI-powered knowledge workspace that transforms your text into interactive, expandable mind maps.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-background text-on-background overflow-x-hidden">
      <header
        className={cn(
          "fixed w-full top-0 z-50 transition-all duration-300",
          scrolled &&
            "bg-surface/80 backdrop-blur-lg border-b border-outline-variant/20 shadow-sm",
        )}
      >
        <div
          className={cn(
            "mx-auto px-margin md:px-xxl flex justify-between items-center max-w-7xl h-[72px] transition-all",
            scrolled ? "py-sm" : "py-md",
          )}
        >
          <Link to="/" className="flex items-center gap-sm group">
            <img
              alt="MindVault AI logo"
              className="h-8 w-8 rounded-lg group-hover:scale-105 transition-transform duration-200 shadow-sm border border-outline-variant/30"
              src={LOGO_URL}
            />
            <span className="text-headline-md font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors">
              MindForge AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-lg">
            {[
              ["Product", "#product"],
              ["Features", "#features"],
              ["Pricing", "#pricing"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-high/50 px-sm py-xs rounded-lg transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-md">
            <Link
              to="/login"
              className="hidden md:block text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/dashboard"
              className="bg-primary text-on-primary text-label-md px-md py-sm rounded-lg hover:bg-on-primary-fixed-variant transition-all duration-150 active:scale-95 shadow-sm flex items-center gap-xs ai-glow"
            >
              Start Mapping for Free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative pt-[120px]">
        <div className="absolute inset-x-0 top-0 h-[80vh] -z-10 dot-grid opacity-60" />
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-primary-container rounded-full blur-[120px] opacity-10 animate-pulse -z-10" />
        <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-tertiary-container rounded-full blur-[100px] opacity-[0.06] -z-10" />

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-margin md:px-xxl py-xxl text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-sm bg-surface-container px-sm py-xs rounded-full mb-lg border border-outline-variant/30 shadow-sm">
            <Icon name="auto_awesome" className="text-[16px] text-tertiary-container" />
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Introducing AI Generation 2.0
            </span>
          </div>
          <h1 className="text-display md:text-[64px] md:leading-[1.1] text-on-surface max-w-4xl mx-auto mb-lg">
            Turn Thoughts into <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary-container pb-2">
              Intelligent Maps.
            </span>
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-xl">
            The AI-powered knowledge workspace that transforms your text into interactive,
            expandable mind maps. Professional velocity meets cognitive clarity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-md w-full sm:w-auto">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto bg-primary text-on-primary text-body-md font-semibold px-xl py-md rounded-xl hover:bg-on-primary-fixed-variant transition-all duration-200 active:scale-[0.98] shadow-md flex items-center justify-center gap-sm ai-glow"
            >
              Start Mapping for Free
              <Icon name="arrow_forward" className="text-[20px]" />
            </Link>
            <Link
              to="/present"
              className="w-full sm:w-auto border border-outline-variant text-on-surface-variant text-body-md font-semibold px-xl py-md rounded-xl hover:bg-surface-container hover:text-on-surface transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-sm"
            >
              View Demo
              <Icon name="play_circle" className="text-[20px]" />
            </Link>
          </div>
          <div className="mt-xl flex items-center gap-sm text-on-surface-variant text-label-md opacity-80">
            <div className="flex -space-x-2">
              {AVATAR_URLS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="MindVault AI customer"
                  className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                />
              ))}
            </div>
            <span className="ml-sm">Joined by 10,000+ forward-thinkers</span>
          </div>
        </section>

        {/* Product mockup */}
        <section id="product" className="max-w-6xl mx-auto px-margin md:px-xxl py-xl relative z-20">
          <div className="relative rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="h-12 bg-surface-container border-b border-outline-variant/30 flex items-center px-md gap-sm">
              <div className="flex gap-xs">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-outline-variant/50" />
                ))}
              </div>
              <div className="mx-auto bg-surface-container-lowest text-on-surface-variant text-[11px] px-xl py-1 rounded-lg border border-outline-variant/20 flex items-center gap-xs w-64 justify-center">
                <Icon name="lock" className="text-[14px]" />
                mindforge.ai/workspace
              </div>
            </div>

            <div className="relative h-[500px] w-full bg-surface-container-low dot-grid overflow-hidden">
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  className="animate-[dash_20s_linear_infinite]"
                  d="M 45 40 Q 55 25 65 25"
                  fill="none"
                  stroke="var(--color-outline-variant)"
                  strokeDasharray="4 4"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 45 40 Q 55 60 65 60"
                  fill="none"
                  stroke="var(--color-outline-variant)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 45 40 Q 30 30 25 35"
                  fill="none"
                  stroke="var(--color-outline-variant)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              <div className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 z-10 ai-glow">
                <div className="bg-surface-container-lowest border border-outline-variant/50 border-l-4 border-l-tertiary-container rounded-xl p-md shadow-sm w-48 relative">
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-error rounded-full border-2 border-surface-container-lowest shadow-sm" />
                  <div className="flex items-center gap-xs mb-xs">
                    <Icon name="neurology" className="text-tertiary-container text-[18px]" />
                    <span className="text-label-sm font-bold text-on-surface">Core Strategy</span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant leading-tight">
                    Q4 Market Expansion &amp; AI Integration Plan
                  </p>
                </div>
              </div>

              {[
                {
                  top: "25%",
                  icon: "group",
                  color: "text-primary",
                  title: "Target Audience",
                  body: "Enterprise decision makers looking for cognitive tools.",
                },
                {
                  top: "60%",
                  icon: "lightbulb",
                  color: "text-secondary",
                  title: "Feature Set",
                  body: "Real-time collaboration, infinite canvas.",
                },
              ].map((node) => (
                <div
                  key={node.title}
                  className="absolute left-[65%] -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ top: node.top }}
                >
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-sm shadow-sm w-40 hover:-translate-y-1 transition-transform">
                    <div className="flex items-center gap-xs mb-xs">
                      <Icon name={node.icon} className={cn("text-[16px]", node.color)} />
                      <span className="text-label-sm text-on-surface">{node.title}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">{node.body}</p>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-lg left-1/2 -translate-x-1/2 w-full max-w-[28rem] px-md z-30">
                <div className="glass-panel rounded-full p-xs flex items-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] ai-glow">
                  <Icon name="auto_awesome" className="text-tertiary-container px-sm" />
                  <input
                    className="bg-transparent border-none outline-none w-full text-[14px] text-on-surface placeholder:text-on-surface-variant/60"
                    placeholder="Expand 'Target Audience' with 3 specific personas..."
                    type="text"
                    aria-label="AI prompt"
                  />
                  <button
                    aria-label="Send prompt"
                    className="bg-primary text-on-primary rounded-full p-xs hover:bg-on-primary-fixed-variant transition-colors ml-sm"
                  >
                    <Icon name="arrow_upward" className="text-[20px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section
          id="features"
          className="max-w-7xl mx-auto px-margin md:px-xxl py-xxl relative z-20"
        >
          <div className="text-center mb-xl">
            <h2 className="text-headline-lg text-on-surface mb-sm">Cognitive Velocity Unleashed</h2>
            <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Everything you need to capture, organize, and expand complex ideas at the speed of
              thought.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md md:gap-lg auto-rows-[minmax(250px,auto)]">
            <div className="md:col-span-2 md:row-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-lg flex flex-col justify-between overflow-hidden relative group hover:border-primary/30 transition-colors shadow-sm">
              <div className="relative z-10 max-w-[28rem]">
                <div className="w-12 h-12 bg-tertiary-fixed rounded-xl flex items-center justify-center mb-md border border-tertiary-fixed-dim">
                  <Icon name="model_training" className="text-tertiary-container text-[24px]" />
                </div>
                <h3 className="text-headline-md text-on-surface mb-xs">AI Generation</h3>
                <p className="text-body-md text-on-surface-variant">
                  Type a single seed thought and watch as our AI instantly generates a comprehensive,
                  multi-layered mind map, expanding on context and finding hidden connections.
                </p>
              </div>
              <div className="absolute -bottom-10 -right-10 w-2/3 h-2/3 opacity-40 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 pointer-events-none">
                <div className="w-full h-full bg-gradient-to-tl from-tertiary-container/20 to-transparent rounded-tl-full" />
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-lg flex flex-col hover:border-outline-variant/60 transition-colors shadow-sm">
              <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center mb-sm border border-primary-fixed-dim">
                <Icon name="bolt" className="text-primary text-[20px]" />
              </div>
              <h3 className="text-headline-sm text-on-surface mb-xs">Instant Capture</h3>
              <p className="text-label-md text-on-surface-variant">
                Drop in notes, transcripts, or docs and get a structured map back in seconds — never
                lose a thought again.
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-lg flex flex-col hover:border-outline-variant/60 transition-colors shadow-sm">
              <div className="w-10 h-10 bg-secondary-fixed rounded-lg flex items-center justify-center mb-sm border border-secondary-fixed-dim">
                <Icon name="hub" className="text-secondary text-[20px]" />
              </div>
              <h3 className="text-headline-sm text-on-surface mb-xs">Smart Connections</h3>
              <p className="text-label-md text-on-surface-variant">
                Automatic relationship lines that redraw and optimize themselves as you drag nodes,
                keeping your map visually pristine.
              </p>
            </div>

            <div className="md:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-lg flex flex-col md:flex-row items-center gap-lg hover:border-outline-variant/60 transition-colors shadow-sm">
              <div className="flex-1">
                <div className="w-10 h-10 bg-surface-container-highest rounded-lg flex items-center justify-center mb-sm border border-outline-variant/40">
                  <Icon name="group_add" className="text-on-surface text-[20px]" />
                </div>
                <h3 className="text-headline-sm text-on-surface mb-xs">Real-time Collaboration</h3>
                <p className="text-label-md text-on-surface-variant">
                  Work simultaneously with your team. See cursors dance across the canvas as you
                  build complex strategies together, instantly synced.
                </p>
              </div>
              <div className="w-full md:w-1/3 flex justify-center p-sm">
                <div className="relative w-32 h-24">
                  <div className="absolute top-0 left-0 bg-surface border border-outline-variant/30 px-xs py-1 rounded shadow-sm flex items-center gap-xs z-20">
                    <div className="w-2 h-2 rounded-full bg-error" />
                    <span className="text-[10px] text-on-surface">Alex</span>
                  </div>
                  <div className="absolute bottom-4 right-0 bg-surface border border-outline-variant/30 px-xs py-1 rounded shadow-sm flex items-center gap-xs z-10">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[10px] text-on-surface">Sam</span>
                  </div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-[1]">
                    <path
                      d="M 10 20 L 80 60"
                      fill="none"
                      stroke="var(--color-outline)"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-5xl mx-auto px-margin md:px-xxl pb-xxl relative z-20">
          <div className="text-center mb-xl">
            <h2 className="text-headline-lg text-on-surface mb-sm">Simple, honest pricing</h2>
            <p className="text-body-lg text-on-surface-variant">
              Start free. Upgrade when your maps outgrow your desk.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {[
              { name: "Starter", price: "$0", note: "3 maps, 100 AI nodes / month" },
              { name: "Pro", price: "$18", note: "Unlimited maps, AI 2.0, presentation mode" },
              { name: "Team", price: "$42", note: "Shared workspaces, roles, SSO" },
            ].map((tier, i) => (
              <div
                key={tier.name}
                className={cn(
                  "rounded-2xl p-lg border shadow-sm flex flex-col gap-sm",
                  i === 1
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-container-lowest border-outline-variant/30",
                )}
              >
                <span className="text-label-sm uppercase tracking-wider opacity-80">
                  {tier.name}
                </span>
                <span className="text-display leading-none">{tier.price}</span>
                <p className={cn("text-label-md", i === 1 ? "opacity-90" : "text-on-surface-variant")}>
                  {tier.note}
                </p>
                <Link
                  to="/login"
                  className={cn(
                    "mt-auto text-label-md rounded-lg px-md py-sm text-center transition-colors",
                    i === 1
                      ? "bg-surface-container-lowest text-primary"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-highest",
                  )}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
