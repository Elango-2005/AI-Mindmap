import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Icon } from "@/components/Icon";
import { LOGO_URL } from "@/lib/assets";
import { cn } from "@/lib/utils";

const TITLE = "Neural Networking 101 — MindVault AI Workspace";
const DESCRIPTION =
  "Explore and expand the Neural Networking 101 mind map with AI-assisted node generation.";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Workspace,
});

const NODES = [
  {
    id: "perceptron",
    top: "18%",
    left: "26%",
    icon: "hub",
    badge: "98% Importance",
    title: "Perceptron",
    body: "The fundamental building block of a neural network.",
    accent: "border-l-tertiary",
  },
  {
    id: "activation",
    top: "52%",
    left: "44%",
    icon: "functions",
    badge: "82% Importance",
    title: "Activation Functions",
    body: "ReLU, sigmoid and tanh shape how signals propagate.",
    accent: "border-l-primary",
  },
  {
    id: "backprop",
    top: "70%",
    left: "20%",
    icon: "sync_alt",
    badge: "74% Importance",
    title: "Backpropagation",
    body: "Gradient descent adjusts weights layer by layer.",
    accent: "border-l-secondary",
  },
];

const AI_ACTIONS = [
  {
    icon: "expand_content",
    title: "Expand Concept",
    body: "Generate sub-nodes exploring activation functions.",
  },
  {
    icon: "summarize",
    title: "Summarize Node",
    body: "Create a concise technical summary of 'Perceptron'.",
  },
  {
    icon: "conversion_path",
    title: "Find Connections",
    body: "Discover hidden links to other map sectors.",
  },
];

function Workspace() {
  const [zoom, setZoom] = useState(100);
  const [selected, setSelected] = useState<string | null>("perceptron");

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <nav className="bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm flex justify-between items-center w-full px-lg py-md sticky top-0 z-50">
        <div className="flex items-center gap-md">
          <img src={LOGO_URL} alt="MindVault AI logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-headline-md font-bold text-primary tracking-tight">
            MindVault AI
          </span>
        </div>
        <div className="hidden md:flex items-center gap-lg">
          <Link
            to="/dashboard"
            className="text-on-surface-variant hover:text-primary transition-colors text-label-md"
          >
            Dashboard
          </Link>
          <span className="text-primary font-bold border-b-2 border-primary pb-1 text-label-md">
            Workspace
          </span>
          <Link
            to="/present"
            className="text-on-surface-variant hover:text-primary transition-colors text-label-md"
          >
            Explore
          </Link>
        </div>
        <div className="flex items-center gap-sm">
          <span className="text-label-md text-on-surface-variant mr-md hidden md:inline">
            Neural Networking 101
          </span>
          <button
            aria-label="Share"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all"
          >
            <Icon name="share" />
          </button>
          <button
            aria-label="Download"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all"
          >
            <Icon name="download" />
          </button>
          <button className="hidden md:block px-md py-sm rounded-lg text-primary bg-surface-container-high/50 text-label-md hover:bg-surface-container-high transition-all">
            Upgrade
          </button>
          <button className="bg-primary text-on-primary px-md py-sm rounded-lg text-label-md hover:bg-on-primary-fixed-variant transition-all flex items-center gap-xs ai-glow">
            <Icon name="auto_awesome" className="text-[18px]" />
            Generate AI
          </button>
          <button
            aria-label="Notifications"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all ml-sm"
          >
            <Icon name="notifications" />
          </button>
          <button
            aria-label="Help"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all"
          >
            <Icon name="help" />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar active="Projects" showBrand={false} ctaVariant="muted" />

        <main className="flex-1 relative dot-grid overflow-hidden bg-background">
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <path
              d="M 400 220 C 520 240, 480 420, 600 440"
              fill="none"
              stroke="var(--color-outline-variant)"
              strokeWidth="2"
              className="opacity-50"
            />
            <path
              d="M 380 240 C 320 380, 340 520, 300 600"
              fill="none"
              stroke="var(--color-outline-variant)"
              strokeWidth="2"
              className="opacity-50"
            />
          </svg>

          <div
            className="absolute inset-0 origin-top-left transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {NODES.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelected(node.id)}
                style={{ top: node.top, left: node.left }}
                className={cn(
                  "absolute text-left bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/30 border-l-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] w-[260px] cursor-grab hover:shadow-md transition-all z-10",
                  node.accent,
                  selected === node.id && "ring-2 ring-primary/40",
                )}
              >
                <div className="flex justify-between items-start mb-sm">
                  <div className="bg-primary-container/10 p-xs rounded-lg text-primary">
                    <Icon name={node.icon} className="text-[20px]" />
                  </div>
                  <span className="bg-tertiary-container/20 text-tertiary text-label-sm px-2 py-1 rounded-full">
                    {node.badge}
                  </span>
                </div>
                <h3 className="text-body-lg font-bold text-on-surface mb-xs">{node.title}</h3>
                <p className="text-label-md text-on-surface-variant leading-tight">{node.body}</p>
              </button>
            ))}
          </div>

          <div className="absolute bottom-lg left-1/2 -translate-x-1/2 glass-panel border border-outline-variant/30 rounded-full px-md py-sm flex items-center gap-sm shadow-sm z-30">
            <button
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              <Icon name="remove" className="text-[20px]" />
            </button>
            <span className="text-label-md text-on-surface-variant px-xs w-12 text-center">
              {zoom}%
            </span>
            <button
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              <Icon name="add" className="text-[20px]" />
            </button>
            <div className="w-px h-6 bg-outline-variant/30 mx-xs" />
            <button
              aria-label="Pan tool"
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              <Icon name="pan_tool" className="text-[20px]" />
            </button>
            <button
              aria-label="Add node"
              className="text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              <Icon name="add_circle" className="text-[20px]" />
            </button>
            <button
              aria-label="AI assist"
              className="text-tertiary hover:bg-tertiary-container/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors ai-glow ml-xs"
            >
              <Icon name="auto_awesome" className="text-[20px]" />
            </button>
          </div>
        </main>

        <aside className="hidden lg:flex w-[320px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-sm flex-col z-20 overflow-y-auto">
          <div className="p-lg border-b border-outline-variant/20 flex items-center gap-sm sticky top-0 bg-surface-container-lowest">
            <Icon name="psychology" className="text-tertiary text-[24px]" />
            <h3 className="text-headline-md text-on-surface">AI Intelligence</h3>
          </div>
          <div className="p-lg flex flex-col gap-md">
            <p className="text-label-md text-on-surface-variant mb-sm">
              Select a node to analyze or generate structural suggestions.
            </p>
            {AI_ACTIONS.map((action) => (
              <button
                key={action.title}
                className="text-left bg-surface p-md rounded-xl border border-outline-variant/20 hover:border-tertiary/50 transition-colors group"
              >
                <div className="flex items-center gap-sm mb-xs">
                  <Icon
                    name={action.icon}
                    className="text-tertiary text-[18px] group-hover:scale-110 transition-transform"
                  />
                  <h4 className="text-label-md font-semibold text-on-surface">{action.title}</h4>
                </div>
                <p className="text-label-sm text-on-surface-variant">{action.body}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
