import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Icon } from "@/components/Icon";
import { LOGO_URL, SLIDE_VISUAL } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { getMindMapNodes } from "@/api/nodes";
import { getMindMapEdges } from "@/api/edges";
import { getMindMap } from "@/api/mindmaps";
import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";

const TITLE = "Presentation Mode — Strategic Q4 Roadmap";
const DESCRIPTION =
  "Present your MindVault AI map as a slide deck, node by node, with AI-generated summaries.";

export const Route = createFileRoute("/present")({
  validateSearch: (search: Record<string, unknown>) => ({
    mindMapId: typeof search.mindMapId === "string" ? search.mindMapId : undefined,
  }),
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

function Present() {
  const { mindMapId } = useSearch({ from: "/present" });
  const navigate = useNavigate();

  const [active, setActive] = useState(0);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [title, setTitle] = useState("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mindMapId) return;
    setIsLoading(true);
    Promise.all([
      getMindMapNodes(mindMapId),
      getMindMapEdges(mindMapId),
      getMindMap(mindMapId)
    ]).then(([n, e, m]) => {
      setNodes(n);
      setEdges(e);
      setTitle(m.title);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [mindMapId]);

  // Generate slide order via DFS
  const slides = useMemo(() => {
    if (nodes.length === 0) return [];
    
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    for (const n of nodes) {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    }
    for (const e of edges) {
      if (adj.has(e.source) && inDegree.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        inDegree.set(e.target, inDegree.get(e.target)! + 1);
      }
    }

    const roots = nodes.filter(n => inDegree.get(n.id) === 0);
    const ordered: FlowNode[] = [];
    const visited = new Set<string>();

    function dfs(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) ordered.push(node);
      const children = adj.get(nodeId) || [];
      for (const child of children) {
        dfs(child);
      }
    }

    roots.forEach(r => dfs(r.id));
    // If there are unlinked nodes, just append them
    nodes.forEach(n => {
      if (!visited.has(n.id)) dfs(n.id);
    });

    return ordered;
  }, [nodes, edges]);

  if (!mindMapId) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-stage text-inverse-on-surface">
        <div className="text-center">
          <h2 className="text-headline-md mb-md">No Mind Map Selected</h2>
          <Link to="/dashboard" className="px-lg py-sm bg-primary text-on-primary rounded-full">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-stage text-inverse-on-surface">Loading Presentation...</div>;
  }

  if (slides.length === 0) {
    return <div className="h-screen w-full flex items-center justify-center bg-stage text-inverse-on-surface">Empty Mind Map</div>;
  }

  const currentSlide = slides[active];
  // Find children of current slide
  const childrenEdges = edges.filter(e => e.source === currentSlide?.id);
  const childrenNodes = childrenEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as FlowNode[];


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
            {slides.map((slide, i) => (
              <button
                key={slide.data?.label as string}
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
                      {slide.data?.label as string}
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
                    {currentSlide?.data?.label as string || "Untitled Node"}
                  </h2>
                </div>
                {currentSlide?.data?.label?.toString().includes("?") && (<span className="px-3 py-1 rounded-full bg-error-container text-on-error-container text-label-sm flex items-center gap-xs shrink-0"><span className="w-2 h-2 rounded-full bg-error" /> High Priority</span>)}
              </header>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-lg overflow-hidden">
                <div className="md:col-span-8 flex flex-col gap-lg">
                  <div className="p-lg rounded-xl bg-surface-container-lowest border border-outline-variant/50 shadow-sm flex-1">
                    <p className="text-body-md md:text-body-lg text-on-surface-variant mb-md">
                      {currentSlide?.data?.isImportant ? "? Highly prioritized concept requiring strategic focus." : "Detailed breakdown of the conceptual branch."}
                    </p>
                                        <ul className="flex flex-col gap-sm text-body-md text-on-surface">
                      {childrenNodes.length > 0 ? childrenNodes.map(child => (
                        <li key={child.id} className="flex items-start gap-sm">
                          <Icon
                            name="chevron_right"
                            className="text-secondary text-[20px] shrink-0 mt-0.5"
                          />
                          <span className="text-body-lg text-on-surface-variant">
                            {child.data?.label as string}
                          </span>
                        </li>
                      )) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 py-lg">
                          <Icon name="account_tree" className="text-[48px] mb-sm" />
                          <span>End of this branch</span>
                        </div>
                      )}
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
                <span className="text-on-surface font-semibold">{currentSlide?.data?.label as string || "Untitled Node"}</span>
              </div>
              <span>Slide {active + 1} of {slides.length}</span>
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
              onClick={() => setActive((i) => Math.min(slides.length - 1, i + 1))}
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
