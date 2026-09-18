
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "@/components/Icon";
import { LOGO_URL } from "@/lib/assets";
import { getMindMapNodes } from "@/api/nodes";
import { getMindMapEdges } from "@/api/edges";
import { getMindMap } from "@/api/mindmaps";
import { ReactFlow, ReactFlowProvider, Background, useReactFlow, Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { EditableNode } from "@/components/EditableNode";
import { EditableEdge } from "@/components/EditableEdge";

const TITLE = "Presentation Mode";

export const Route = createFileRoute("/present")({
  validateSearch: (search: Record<string, unknown>) => ({
    mindMapId: typeof search.mindMapId === "string" ? search.mindMapId : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
    ],
  }),
  component: PresentWrapper,
});

const nodeTypes = { editable: EditableNode };
const edgeTypes = { editable: EditableEdge };

function PresentWrapper() {
  return (
    <ReactFlowProvider>
      <Present />
    </ReactFlowProvider>
  );
}

function Present() {
  const { mindMapId } = useSearch({ from: "/present" });
  const navigate = useNavigate();
  const { fitView, setCenter } = useReactFlow();

  const [active, setActive] = useState(0);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [title, setTitle] = useState("Loading...");
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!mindMapId) return;
    setIsLoading(true);
    Promise.all([
      getMindMapNodes(mindMapId),
      getMindMapEdges(mindMapId),
      getMindMap(mindMapId)
    ]).then(([n, e, m]) => {
      // Map nodes to Flow format
      const mappedNodes: FlowNode[] = n.map(node => ({
        id: node.id,
        position: { x: node.position_x, y: node.position_y },
        data: { label: node.label, mindMapId },
        type: "editable"
      }));

      // Map edges to Flow format
      const mappedEdges: FlowEdge[] = e.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "editable",
        animated: edge.animated
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);
      setTitle(m.title);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [mindMapId]);

  // Generate slide order via BFS to show breadth first presentation
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

    // BFS
    const queue = [...roots];
    while(queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current.id)) {
        visited.add(current.id);
        ordered.push(current);
        const children = adj.get(current.id) || [];
        for (const childId of children) {
          const childNode = nodes.find(n => n.id === childId);
          if (childNode && !visited.has(childNode.id)) {
            queue.push(childNode);
          }
        }
      }
    }
    
    // Append disconnected nodes
    nodes.forEach(n => {
      if (!visited.has(n.id)) ordered.push(n);
    });

    return ordered;
  }, [nodes, edges]);

  const currentSlide = slides[active];
  const revealedNodeIds = new Set(slides.slice(0, active + 1).map(n => n.id));

  // Focus camera on active node
  useEffect(() => {
    if (currentSlide) {
      setTimeout(() => {
        setCenter(currentSlide.position.x + 100, currentSlide.position.y, { zoom: 1.2, duration: 800 });
      }, 50);
    }
  }, [currentSlide, setCenter]);

  // Autoplay functionality
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setActive(curr => {
          if (curr >= slides.length - 1) {
            setIsPlaying(false);
            return curr;
          }
          return curr + 1;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  // Compute presentation nodes/edges with dimming
  const presentationNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      style: { opacity: revealedNodeIds.has(n.id) ? 1 : 0.1, transition: 'opacity 0.8s ease' },
      draggable: false,
      selectable: false
    }));
  }, [nodes, revealedNodeIds]);

  const presentationEdges = useMemo(() => {
    return edges.map(e => ({
      ...e,
      style: { opacity: (revealedNodeIds.has(e.source) && revealedNodeIds.has(e.target)) ? 1 : 0.1, transition: 'opacity 0.8s ease' }
    }));
  }, [edges, revealedNodeIds]);

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

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background text-on-surface relative">
      <header className="h-16 shrink-0 flex items-center justify-between px-lg border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md z-50 absolute top-0 left-0 right-0">
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-container-lowest shadow-sm">
            <img src={LOGO_URL} alt="MindVault AI logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-sm">
            <h1 className="text-headline-md text-on-surface font-semibold truncate max-w-sm">{title}</h1>
            <span className="px-2 py-1 rounded bg-primary/20 text-primary text-label-sm font-bold uppercase tracking-wider hidden sm:inline-block">
              Presentation
            </span>
          </div>
        </div>
        <Link
          to="/workspace"
          search={{ mindMapId, topic: undefined }}
          className="flex items-center gap-xs px-md py-sm rounded-lg hover:bg-surface-container transition-colors text-label-md text-on-surface-variant hover:text-on-surface group"
        >
          Exit
          <Icon name="close" className="text-[18px] group-hover:text-error transition-colors" />
        </Link>
      </header>

      <main className="flex-1 w-full relative">
        <ReactFlow
          nodes={presentationNodes}
          edges={presentationEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          className="bg-surface-container-lowest"
        >
          <Background color="var(--color-outline-variant)" gap={24} size={2} />
        </ReactFlow>

        {/* Overlay Card for Active Node */}
        <div className="absolute top-24 right-8 w-80 bg-surface/95 backdrop-blur-xl border border-outline-variant/30 rounded-2xl shadow-level-3 p-lg flex flex-col z-40 transition-all duration-500 ease-in-out transform translate-y-0">
          <div className="flex items-center gap-sm mb-md text-primary">
            <Icon name="psychology" className="text-[24px]" />
            <span className="text-label-md uppercase tracking-widest font-semibold">Focus Mode</span>
          </div>
          <h2 className="text-headline-md text-on-surface font-bold leading-tight mb-sm">
            {currentSlide?.data?.['label'] as string}
          </h2>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            This node is part of the sequence exploring the concept of "{currentSlide?.data?.['label'] as string}". 
          </p>
          <div className="mt-md pt-md border-t border-outline-variant/20 flex justify-between items-center text-label-sm text-on-surface-variant">
            <span>Step {active + 1} of {slides.length}</span>
            <span className="px-2 py-1 bg-surface-container rounded-full text-xs">Node {currentSlide?.id.slice(0, 4)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center p-1.5 bg-surface/90 backdrop-blur-xl border border-outline-variant/30 rounded-full shadow-level-2 z-50">
          <button
            onClick={() => { setIsPlaying(false); setActive(0); }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors"
            title="Restart"
          >
            <Icon name="replay" />
          </button>
          
          <button
            disabled={active === 0}
            onClick={() => { setIsPlaying(false); setActive((i) => Math.max(0, i - 1)); }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Icon name="chevron_left" />
          </button>

          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-md h-10 flex items-center justify-center gap-xs rounded-full text-on-primary bg-primary hover:bg-primary/90 text-label-md font-bold transition-colors mx-2 shadow-sm"
          >
            <Icon name={isPlaying ? "pause" : "play_arrow"} className="text-[20px]" />
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            disabled={active === slides.length - 1}
            onClick={() => { setIsPlaying(false); setActive((i) => Math.min(slides.length - 1, i + 1)); }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Icon name="chevron_right" />
          </button>

          <button
            onClick={() => { setIsPlaying(false); setActive(slides.length - 1); }}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title="Jump to End"
          >
            <Icon name="skip_next" />
          </button>
        </div>
      </main>
    </div>
  );
}
