import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { LOGO_URL, SLIDE_VISUAL } from "@/lib/assets";
import { cn } from "@/lib/utils";

const TITLE = "Presentation Mode — Strategic Q4 Roadmap";
const DESCRIPTION =
  "Present your MindVault AI map as a slide deck, node by node, with AI-generated summaries.";

export const Route = createFileRoute("/present")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Present,
});

const SLIDES = ["Executive Summary", "Market Analysis", "Competitor Landscape", "Product Strategy"];

function Present() {
  const [active, setActive] = useState(0);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-stage text-inverse-on-surface">
      <header className="h-16 shrink-0 flex items-center justify-between px-lg border-b border-outline/10 glass-dark z-20 relative">
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-container-lowest shadow-sm">
            <img src={LOGO_URL} alt="MindVault AI logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-sm">
            <h1 className="text-headline-md text-inverse-on-surface">Strategic Q4 Roadmap</h1>
            <span className="px-2 py-1 rounded bg-primary/30 text-inverse-primary text-label-sm">
              Presentation
            </span>
          </div>
        </div>
        <Link
          to="/workspace"
          className="flex items-center gap-xs px-md py-sm rounded-lg hover:bg-surface-variant/20 transition-colors text-label-md text-outline-variant hover:text-inverse-on-surface group"
        >
          Exit
          <Icon name="close" className="text-[18px] group-hover:text-error transition-colors" />
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="hidden md:flex w-[260px] shrink-0 border-r border-outline/10 glass-dark flex-col z-10">
          <div className="px-md py-sm border-b border-outline/10 flex items-center justify-between text-label-sm text-outline-variant uppercase tracking-wider">
            <span>Slide Thumbnails</span>
            <span className="bg-surface-variant/10 px-2 py-0.5 rounded">8 Nodes</span>
          </div>
          <div className="flex-1 overflow-y-auto p-sm flex flex-col gap-sm">
            {SLIDES.map((slide, i) => (
              <button
                key={slide}
                onClick={() => setActive(i)}
                className={cn(
                  "w-full text-left rounded-xl p-sm relative group overflow-hidden transition-all duration-200 border",
                  active === i
                    ? "bg-primary/10 border-primary/30 ring-1 ring-primary"
                    : "border-transparent hover:bg-surface-variant/10 hover:border-outline/10 opacity-60 hover:opacity-100",
                )}
              >
                <div className="relative z-10 flex gap-sm items-start">
                  <span
                    className={cn(
                      "text-label-sm w-5 pt-0.5",
                      active === i ? "text-primary-fixed-dim" : "text-outline-variant",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <div className="aspect-video rounded-md mb-2 border border-outline/10 relative overflow-hidden flex flex-col items-center justify-center gap-1 bg-surface-container-lowest/10">
                      <div className="w-3/4 h-1.5 bg-primary-fixed-dim/40 rounded-full" />
                      <div className="w-1/2 h-1.5 bg-outline/30 rounded-full" />
                    </div>
                    <h3
                      className={cn(
                        "text-label-md truncate",
                        active === i
                          ? "text-inverse-on-surface"
                          : "text-outline-variant group-hover:text-inverse-on-surface",
                      )}
                    >
                      {slide}
                    </h3>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 relative flex items-center justify-center p-lg md:p-xl overflow-hidden bg-stage-deep">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="w-full max-w-5xl aspect-[16/9] bg-surface-container-lowest rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-outline-variant/30 flex flex-col overflow-hidden relative text-on-surface">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />

            <div className="flex-1 p-lg md:p-xxl flex flex-col overflow-hidden">
              <header className="flex justify-between items-start mb-lg">
                <div>
                  <div className="flex items-center gap-sm mb-xs">
                    <Icon name="auto_awesome" className="text-primary text-[20px]" />
                    <span className="text-label-sm text-primary uppercase tracking-widest">
                      AI Generated Node
                    </span>
                  </div>
                  <h2 className="text-headline-lg md:text-display text-on-surface leading-tight">
                    {SLIDES[active]}
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-error-container text-on-error-container text-label-sm flex items-center gap-xs shrink-0">
                  <span className="w-2 h-2 rounded-full bg-error" /> High Priority
                </span>
              </header>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-lg overflow-hidden">
                <div className="md:col-span-8 flex flex-col gap-lg">
                  <div className="p-lg rounded-xl bg-surface-container-lowest border border-outline-variant/50 shadow-sm flex-1">
                    <p className="text-body-md md:text-body-lg text-on-surface-variant mb-md">
                      The Q4 roadmap prioritizes aggressive expansion into the enterprise sector,
                      leveraging our recent advancements in predictive neural networks. Key focus
                      areas include seamless API integrations and enhanced data compliance protocols
                      to meet stringent corporate requirements.
                    </p>
                    <ul className="flex flex-col gap-sm text-body-md text-on-surface">
                      <li className="flex items-start gap-sm">
                        <Icon
                          name="check_circle"
                          className="text-secondary text-[20px] shrink-0 mt-0.5"
                        />
                        <span>Finalize SOC2 compliance certification by end of October.</span>
                      </li>
                      <li className="flex items-start gap-sm">
                        <Icon
                          name="check_circle"
                          className="text-secondary text-[20px] shrink-0 mt-0.5"
                        />
                        <span>Launch enterprise-tier dedicated hosting options.</span>
                      </li>
                      <li className="flex items-start gap-sm">
                        <Icon
                          name="radio_button_unchecked"
                          className="text-outline text-[20px] shrink-0 mt-0.5"
                        />
                        <span className="text-on-surface-variant">
                          Deploy advanced semantic search capabilities across all tiers.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="md:col-span-4 flex flex-col gap-lg">
                  <div className="flex-1 min-h-24 rounded-xl bg-surface-container overflow-hidden relative border border-outline-variant/30">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${SLIDE_VISUAL}')` }}
                      role="img"
                      aria-label="Abstract render of interconnected glass spheres"
                    />
                  </div>
                  <div className="p-lg rounded-xl bg-primary-container text-on-primary-container flex flex-col justify-center items-center text-center">
                    <span className="text-label-sm opacity-80 uppercase tracking-wider mb-1">
                      Target Growth
                    </span>
                    <span className="text-display font-bold leading-none">35%</span>
                    <span className="text-body-md mt-1 opacity-90">MoM in Q4</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-lg md:px-xxl py-md border-t border-outline-variant/20 bg-surface text-on-surface-variant text-label-md flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <span>Root</span>
                <Icon name="chevron_right" className="text-[16px] text-outline-variant/60" />
                <span className="text-on-surface font-semibold">{SLIDES[active]}</span>
              </div>
              <span>Slide {active + 1} of 8</span>
            </div>
          </div>

          <div className="absolute bottom-lg left-1/2 -translate-x-1/2 flex items-center p-1 bg-inverse-surface/80 backdrop-blur-xl border border-outline/20 rounded-full shadow-2xl z-20">
            <button
              aria-label="Previous slide"
              disabled={active === 0}
              onClick={() => setActive((i) => Math.max(0, i - 1))}
              className="w-10 h-10 flex items-center justify-center rounded-full text-inverse-on-surface hover:bg-surface-variant/20 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Icon name="chevron_left" />
            </button>
            <div className="w-px h-6 bg-outline/20 mx-1" />
            <button className="px-md h-10 flex items-center justify-center gap-sm rounded-full text-inverse-on-surface bg-primary/30 hover:bg-primary/40 text-label-md transition-colors mx-1">
              <Icon name="play_arrow" className="text-[20px]" />
              Autoplay
            </button>
            <div className="w-px h-6 bg-outline/20 mx-1" />
            <button
              aria-label="Next slide"
              onClick={() => setActive((i) => Math.min(SLIDES.length - 1, i + 1))}
              className="w-10 h-10 flex items-center justify-center rounded-full text-inverse-on-surface hover:bg-surface-variant/20 transition-colors"
            >
              <Icon name="chevron_right" />
            </button>
            <div className="w-px h-6 bg-outline/20 mx-1" />
            <button
              aria-label="Fullscreen"
              className="w-10 h-10 flex items-center justify-center rounded-full text-outline-variant hover:text-inverse-on-surface hover:bg-surface-variant/20 transition-colors"
            >
              <Icon name="fullscreen" className="text-[20px]" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
