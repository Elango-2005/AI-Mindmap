import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  type NodeChange,
  type NodeDragHandler,
  type Node as FlowNode,
  type Edge as FlowEdge,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import {
  generateAIMindMap,
  getMindMap,
  chatMindMap,
} from "@/api/mindmaps";
import {
  getMindMapNodes,
  updateNode,
  summarizeNode,
  expandNode,
  findConnectionsNode,
} from "@/api/nodes";
import { getMindMapEdges } from "@/api/edges";
import { exportMindMap, importMindMap } from "@/api/integrations";
import { toPng } from "html-to-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateMindMap } from "@/api/mindmaps";

import { AppSidebar } from "@/components/AppSidebar";
import { Icon } from "@/components/Icon";
import { EditableNode } from "@/components/EditableNode";
import { applyColorsToGraph } from "@/lib/graphColoring";
import { LOGO_URL } from "@/lib/assets";
import { useMindMapSync } from "@/hooks/useMindMapSync";

const TITLE = "Neural Networking 101 — MindVault AI Workspace";

const DESCRIPTION =
  "Explore and expand the Neural Networking 101 mind map with AI-assisted node generation.";

export const Route = createFileRoute("/workspace")({
  validateSearch: (search: Record<string, unknown>) => ({
    mindMapId:
      typeof search.mindMapId === "string"
        ? search.mindMapId
        : undefined,
    topic: 
      typeof search.topic === "string" 
        ? search.topic 
        : undefined,
  }),

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

const AI_ACTIONS = [
  {
    id: "expand",
    icon: "expand_content",
    title: "Expand Concept",
    body: "Generate sub-nodes exploring this concept.",
  },
  {
    id: "summarize",
    icon: "summarize",
    title: "Summarize Node",
    body: "Create a concise technical summary of this node.",
  },
  {
    id: "connect",
    icon: "conversion_path",
    title: "Find Connections",
    body: "Discover hidden links to other map sectors.",
  },
];

const nodeTypes = {
  editable: EditableNode,
};

function Workspace() {
  const { mindMapId, topic: initialTopic } = useSearch({
    from: "/workspace",
  });

  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);

  const {
    isConnected,
    remoteUsers,
    broadcastNodesChange,
    broadcastEdgesChange,
    broadcastCursorMove,
  } = useMindMapSync({
    mindMapId: mindMapId || null,
    setNodes: setFlowNodes,
    setEdges: setFlowEdges
  });

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const [topic, setTopic] = useState(initialTopic || "");
  const [depth, setDepth] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);

  const [generationError, setGenerationError] =
    useState<string | null>(null);

  const [generationSuccess, setGenerationSuccess] =
    useState(false);

  const [mindMapTitle, setMindMapTitle] = useState("Loading...");

  const [isExpanding, setIsExpanding] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [nodeSummary, setNodeSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Chat Interface State
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);


  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleRenameSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!titleEditValue.trim() || !mindMapId) {
      setIsRenamingTitle(false);
      return;
    }
    
    try {
      setIsSaving(true);
      const updated = await updateMindMap(mindMapId, { title: titleEditValue });
      setMindMapTitle(updated.title);
    } catch (e) {
      console.error(e);
      setGraphError("Failed to rename project.");
    } finally {
      setIsSaving(false);
      setIsRenamingTitle(false);
    }
  };

  // Clear summary when selected node changes
  useEffect(() => {
    setNodeSummary(null);
    setSummaryError(null);
  }, [selectedNodeId]);

  async function loadGraph() {
    if (!mindMapId) {
      return;
    }

    setIsLoadingGraph(true);
    setGraphError(null);

    try {
      const [nodes, edges, mindMapData] = await Promise.all([
        getMindMapNodes(mindMapId),
        getMindMapEdges(mindMapId),
        getMindMap(mindMapId),
      ]);

      setMindMapTitle(mindMapData.title);

      const columns = 4;
      const spacingX = 300;
      const spacingY = 220;

      /*
       * Nodes with non-zero coordinates already have a saved
       * position. We must preserve those positions.
       */
      const nodesWithStoredPositions = nodes.filter(
        (node) =>
          node.position_x !== 0 ||
          node.position_y !== 0,
      );

      /*
       * Nodes at (0, 0) are treated as newly generated/
       * uninitialized nodes.
       */
      const nodesWithoutPositions = nodes.filter(
        (node) =>
          node.position_x === 0 &&
          node.position_y === 0,
      );

      /*
       * Find the lowest safe Y position below the existing
       * graph. This prevents newly positioned nodes from
       * overlapping nodes that already have saved positions.
       */
      let nextY = 0;

      if (nodesWithStoredPositions.length > 0) {
        const maxStoredY = Math.max(
          ...nodesWithStoredPositions.map(
            (node) => node.position_y,
          ),
        );

        nextY = maxStoredY + spacingY;
      }

      /*
       * Convert backend nodes into React Flow nodes.
       */
      const mappedNodes: FlowNode[] = nodes.map(
        (node) => {
          const hasStoredPosition =
            node.position_x !== 0 ||
            node.position_y !== 0;

          if (hasStoredPosition) {
            return {
              id: node.id,
              position: {
                x: node.position_x,
                y: node.position_y,
              },
              data: {
                label: node.label,
                mindMapId,
              },
              type: "editable",
            };
          }

          /*
           * This position will be replaced for the
           * uninitialized nodes below.
           */
          return {
            id: node.id,
            position: {
              x: 0,
              y: 0,
            },
            data: {
              label: node.label,
            },
            type: "editable",
          };
        },
      );

      /*
       * Assign deterministic positions to nodes that don't
       * have saved coordinates yet.
       */
      const nodesToPersist: Array<{
        id: string;
        position_x: number;
        position_y: number;
      }> = [];

      nodesWithoutPositions.forEach(
        (node, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);

          const positionX =
            column * spacingX;

          const positionY =
            nextY + row * spacingY;

          const flowNode = mappedNodes.find(
            (item) => item.id === node.id,
          );

          if (flowNode) {
            flowNode.position = {
              x: positionX,
              y: positionY,
            };
          }

          nodesToPersist.push({
            id: node.id,
            position_x: positionX,
            position_y: positionY,
          });
        },
      );

      /*
       * Convert backend edges into React Flow edges.
       */
      const mappedEdges: FlowEdge[] = edges.map(
        (edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label ?? undefined,
          type: edge.type || "default",
          animated: edge.animated,
        }),
      );

      /*
       * Apply attractive colors based on tree depth and branches
       */
      const { nodes: coloredNodes, edges: coloredEdges } = applyColorsToGraph(mappedNodes, mappedEdges);

      /*
       * Update the UI immediately.
       */
      setFlowNodes(coloredNodes);
      setFlowEdges(coloredEdges);

      /*
       * Persist the generated initial positions so that
       * subsequent reloads use the database coordinates.
       */
      if (nodesToPersist.length > 0) {
        await Promise.all(
          nodesToPersist.map((node) =>
            updateNode(node.id, {
              position_x: node.position_x,
              position_y: node.position_y,
            }),
          ),
        );
      }
    } catch (error) {
      console.error(
        "Failed to load mind map graph:",
        error,
      );

      setGraphError(
        "Failed to load the mind map graph.",
      );
    } finally {
      setIsLoadingGraph(false);
    }
  }

  useEffect(() => {
    loadGraph();
  }, [mindMapId]);

  async function handleGenerateAI(fallbackTopic?: string) {
    // Determine root node to use as fallback topic if input is empty
    const rootNode = flowNodes.find(node => !flowEdges.some(edge => edge.target === node.id)) || flowNodes[0];
    const rootTopic = rootNode ? (rootNode.data.label as string) : "";
    
    const finalTopic = (topic.trim() || (typeof fallbackTopic === 'string' ? fallbackTopic : '') || rootTopic || mindMapTitle).trim();
    
    if (
      !mindMapId ||
      !finalTopic ||
      isGenerating
    ) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(false);

    try {
      await generateAIMindMap(mindMapId, {
        topic: finalTopic,
        depth: depth,
      });

      await loadGraph();

      setGenerationSuccess(true);
    } catch (error) {
      console.error(
        "AI mind map generation failed:",
        error,
      );

      setGenerationError(
        "Failed to generate the mind map. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSummarizeNode() {
    if (!selectedNodeId) return;

    setIsSummarizing(true);
    setNodeSummary(null);
    setSummaryError(null);

    try {
      const response = await summarizeNode(selectedNodeId);
      setNodeSummary(response.summary);
    } catch (error) {
      console.error("Failed to summarize node:", error);
      setSummaryError("Failed to summarize node. Please try again.");
    } finally {
      setIsSummarizing(false);
    }
  }

  async function handleExpandNode() {
    if (!selectedNodeId) return;

    setIsExpanding(true);
    setSummaryError(null);

    try {
      await expandNode(selectedNodeId);
      await loadGraph(); // Reload to get new nodes and edges
    } catch (error) {
      console.error("Failed to expand node:", error);
      setSummaryError("Failed to expand node. Please try again.");
    } finally {
      setIsExpanding(false);
    }
  }

  async function handleFindConnections() {
    if (!selectedNodeId) return;

    setIsConnecting(true);
    setSummaryError(null);

    try {
      await findConnectionsNode(selectedNodeId);
      await loadGraph(); // Reload to get new edges
    } catch (error) {
      console.error("Failed to find connections:", error);
      setSummaryError("Failed to find connections. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleSendChat(overrideMessage?: string) {
    const userMessage = (typeof overrideMessage === "string" ? overrideMessage : chatInput).trim();
    if (!userMessage || !mindMapId) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsChatting(true);

    try {
      const response = await chatMindMap(mindMapId, userMessage, selectedNodeId);
      setChatMessages((prev) => [...prev, { role: "ai", content: response.response_text }]);
      await loadGraph(); // Reload to get updated graph
    } catch (error) {
      console.error("Chat failed:", error);
      setChatMessages((prev) => [...prev, { role: "ai", content: "Sorry, I encountered an error modifying the map." }]);
    } finally {
      setIsChatting(false);
    }
  }

  /*
   * React Flow calls this whenever a node changes.
   *
   * This keeps the local React state synchronized with
   * React Flow while dragging, selecting, etc.
   */
  function handleNodesChange(
    changes: NodeChange[],
  ) {
    setFlowNodes((currentNodes) =>
      applyNodeChanges(
        changes,
        currentNodes,
      ),
    );
    broadcastNodesChange(changes);
  }

  /*
   * Save the final node position to the backend
   * after the user finishes dragging the node.
   */
  const handleNodeDragStop: NodeDragHandler =
    async (_event, node) => {
      try {
        await updateNode(node.id, {
          position_x: node.position.x,
          position_y: node.position.y,
        });
      } catch (error) {
        console.error(
          "Failed to save node position:",
          error,
        );
      }
    };

  const handleNodeClick = (_event: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleExport = async (format: "markdown" | "opml") => {
    if (!mindMapId) return;
    try {
      const blob = await exportMindMap(mindMapId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${mindMapTitle.replace(/\s+/g, '_')}.${format === 'markdown' ? 'md' : 'opml'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (e) {
      console.error(e);
      alert("Export failed");
    }
  };

    const handleExportImage = () => {
    const nodesBounds = getNodesBounds(flowNodes);
    
    // Add padding to the bounds
    const imageWidth = nodesBounds.width + 100;
    const imageHeight = nodesBounds.height + 100;

    const transform = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0.1 // padding
    );

    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportEl) return;

    toPng(viewportEl, {
      backgroundColor: document.documentElement.classList.contains('dark') ? '#111318' : '#f8f9ff',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
      },
    }).then((dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${mindMapTitle.replace(/\s+/g, '_')}.png`;
      a.click();
    }).catch((err) => {
      console.error(err);
      alert("Failed to export image");
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mindMapId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const format = file.name.endsWith(".opml") ? "opml" : "markdown";
    try {
      setIsLoadingGraph(true);
      await importMindMap(mindMapId, format, file);
      await loadGraph(); // Reload after import
      alert("Import successful!");
    } catch (err) {
      console.error(err);
      alert("Import failed");
      setIsLoadingGraph(false);
    }
  };

  const selectedNode = selectedNodeId ? flowNodes.find(n => n.id === selectedNodeId) : null;
  const incomingEdges = selectedNodeId ? flowEdges.filter(e => e.target === selectedNodeId) : [];
  const outgoingEdges = selectedNodeId ? flowEdges.filter(e => e.source === selectedNodeId) : [];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      {/* Editor Header */}
      <header className="h-14 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 px-4 flex items-center justify-between shrink-0 z-50">
        {/* Left: Branding & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="MindVault AI logo" className="w-6 h-6 rounded" />
            <span className="font-bold text-primary hidden md:inline">MindVault AI</span>
          </div>
          <div className="w-px h-4 bg-outline-variant/50 hidden md:block" />
          <div className="flex items-center gap-2 text-label-sm max-w-full">
            <Link to="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors hidden md:block">Dashboard</Link>
            <Icon name="chevron_right" className="text-[14px] text-outline hidden md:block" />
            
            {/* Inline Editable Title */}
            {isRenamingTitle ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center">
                <input
                  autoFocus
                  type="text"
                  value={titleEditValue}
                  onChange={(e) => setTitleEditValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => { if (e.key === 'Escape') setIsRenamingTitle(false); }}
                  className="bg-surface-container border border-primary rounded px-2 py-0.5 text-label-md font-semibold focus:outline-none w-48"
                />
              </form>
            ) : (
              <span 
                className="text-on-surface font-medium hover:bg-surface-container-low px-2 py-0.5 rounded cursor-text flex items-center gap-1 group truncate max-w-[200px] sm:max-w-[300px]"
                onClick={() => { setTitleEditValue(mindMapTitle); setIsRenamingTitle(true); }}
                title="Click to rename"
              >
                {mindMapTitle} <Icon name="edit" className="text-[14px] opacity-0 group-hover:opacity-100 text-outline-variant" />
              </span>
            )}
          </div>
        </div>

        {/* Right: Save Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Save Status */}
          <div className="hidden sm:flex text-label-sm text-on-surface-variant items-center gap-1 mr-2 transition-all">
            {isSaving || isLoadingGraph ? (
              <><Icon name="sync" className="animate-spin text-[14px]" /> <span>Saving...</span></>
            ) : (
              <><Icon name="check_circle" className="text-[14px]" /> <span>Saved</span></>
            )}
          </div>

          <div className="w-px h-4 bg-outline-variant/50 hidden sm:block mx-1" />

          {/* Undo / Redo */}
          <button className="p-1.5 hover:bg-surface-container-low rounded-lg text-on-surface-variant transition-colors" title="Undo (Coming in Phase J)">
            <Icon name="undo" className="text-[18px]" />
          </button>
          <button className="p-1.5 hover:bg-surface-container-low rounded-lg text-on-surface-variant transition-colors" title="Redo (Coming in Phase J)">
            <Icon name="redo" className="text-[18px]" />
          </button>
          
          <div className="w-px h-4 bg-outline-variant/50 mx-1" />

          {/* Import / Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-sm font-medium">
                <Icon name="ios_share" className="text-[16px]" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <label className="cursor-pointer flex items-center w-full">
                  <Icon name="upload" className="mr-2 text-[18px]" /> Import MD/OPML
                  <input type="file" className="hidden" accept=".md,.opml" onChange={handleImport} />
                </label>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportImage}>
                <Icon name="image" className="mr-2 text-[18px]" /> Export PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("markdown")}>
                <Icon name="article" className="mr-2 text-[18px]" /> Export Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("opml")}>
                <Icon name="list" className="mr-2 text-[18px]" /> Export OPML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share Button Placeholder */}
          <button 
            className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5 rounded-lg text-label-sm font-semibold flex items-center gap-1.5 transition-colors"
            onClick={() => alert("Sharing features coming in Phase K")}
          >
            <Icon name="group_add" className="text-[18px]" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {/* Main 3-Panel Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL: Context / Sidebar */}
        <AppSidebar showBrand={false} ctaVariant="muted" />

        {/* CENTER PANEL: Canvas */}
        <main className="flex-1 flex flex-col relative bg-surface-container-lowest dot-matrix">
          
          {/* Top Integrated Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-surface/80 backdrop-blur-md border border-outline-variant/30 rounded-xl shadow-sm flex items-center p-1.5 gap-1">
            <button className="px-3 py-1.5 rounded-lg text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-1.5" onClick={() => alert("Layouts coming in Phase J")}>
              <Icon name="account_tree" className="text-[16px]" /> Layout
            </button>
            <div className="w-px h-4 bg-outline-variant/50 mx-1" />
            <button className="px-3 py-1.5 rounded-lg text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors flex items-center gap-1.5" onClick={() => alert("Themes coming in Phase J")}>
              <Icon name="palette" className="text-[16px]" /> Theme
            </button>
            <div className="w-px h-4 bg-outline-variant/50 mx-1" />
            <button className="px-3 py-1.5 rounded-lg text-label-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5" onClick={() => alert("Safe regeneration coming in Phase I")}>
              <Icon name="auto_awesome" className="text-[16px]" /> Regenerate
            </button>
          </div>

          <div className="flex-1 w-full h-full relative">
            {graphError && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-error-container text-on-error-container border border-error/30 rounded-lg px-md py-sm shadow-md">
                {graphError}
              </div>
            )}

            {Object.values(remoteUsers).map((user) => {
              if (!user.cursor) return null;
              return (
                <div
                  key={user.userId}
                  className="fixed pointer-events-none z-[100] flex flex-col items-start transition-all duration-75"
                  style={{ top: user.cursor.y, left: user.cursor.x }}
                >
                  <Icon name="near_me" className="text-primary text-xl" />
                  <div className="bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-sm shadow-md whitespace-nowrap -ml-2 -mt-1">
                    {user.userName}
                  </div>
                </div>
              );
            })}

            {!isLoadingGraph && flowNodes.length > 0 && (
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                onNodesChange={handleNodesChange}
                onNodeDragStop={handleNodeDragStop}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                className="[&_.react-flow__controls]:left-4 [&_.react-flow__controls]:bottom-4 [&_.react-flow__controls]:right-auto"
              >
                <Background color="var(--color-outline-variant)" gap={24} size={2} />
                <Controls showInteractive={false} />
                <MiniMap className="!bg-surface-container-lowest !border !border-outline-variant/30 !rounded-xl !shadow-sm !bottom-4 !right-4" />
              </ReactFlow>
            )}
            
            {isLoadingGraph && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/50 backdrop-blur-sm z-50">
                <div className="flex flex-col items-center gap-4">
                  <Icon name="sync" className="animate-spin text-primary text-[32px]" />
                  <span className="text-label-lg text-on-surface-variant font-medium">Loading map...</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT PANEL: AI Assistant */}
        {flowNodes.length > 0 && (
          <aside className="hidden lg:flex w-[320px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-sm flex-col z-20 h-full relative">
            <div className="p-md border-b border-outline-variant/20 flex items-center justify-between bg-surface/50 backdrop-blur shrink-0">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="psychology" className="text-[20px]" />
                <h3 className="text-label-lg font-bold">AI Assistant</h3>
              </div>
              <button className="text-outline hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container">
                <Icon name="close_fullscreen" className="text-[18px]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center text-center p-6 gap-3 mt-10">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon name="auto_awesome" className="text-primary text-[24px]" />
                  </div>
                  <h4 className="text-body-lg font-semibold text-on-surface">How can I help?</h4>
                  <p className="text-body-sm text-on-surface-variant">Select a node to get contextual suggestions, or ask me to restructure your map.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-2xl text-body-sm ${msg.role === 'user' ? 'bg-primary text-on-primary self-end max-w-[85%] rounded-br-sm' : 'bg-surface-container-low text-on-surface border border-outline-variant/30 max-w-[90%] rounded-bl-sm'}`}>
                   {msg.content}
                </div>
              ))}
              {isChatting && (
                <div className="p-3 rounded-2xl bg-surface-container-low text-on-surface border border-outline-variant/30 max-w-[90%] flex items-center gap-2 text-label-sm rounded-bl-sm self-start">
                   <Icon name="sync" className="animate-spin text-[16px] text-primary" />
                   <span className="opacity-80">Modifying map...</span>
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-outline-variant/20 bg-surface-container-lowest shrink-0">
              <div className="bg-surface border border-outline-variant/50 rounded-2xl flex flex-col p-2 shadow-sm focus-within:border-primary transition-colors">
                {selectedNode && (
                  <div className="flex items-center gap-2 px-2 pt-1 pb-2 mb-1 border-b border-outline-variant/10 text-label-xs text-primary">
                    <Icon name="adjust" className="text-[14px]" />
                    <span>Targeting: <strong className="font-bold truncate max-w-[150px] inline-block align-bottom">{selectedNode.data.label as string}</strong></span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1.5 px-2 pb-2 mt-1">
                  <button onClick={() => handleSendChat("Highlight the most important nodes")} className="text-[11px] font-medium bg-surface-container hover:bg-surface-container-high text-on-surface px-2.5 py-1 rounded-full transition-colors flex items-center gap-1">
                    <Icon name="star" className="text-[12px] text-accent-amber" /> Prioritize
                  </button>
                  <button onClick={() => handleSendChat("Find missing connections between branches")} className="text-[11px] font-medium bg-surface-container hover:bg-surface-container-high text-on-surface px-2.5 py-1 rounded-full transition-colors flex items-center gap-1">
                    <Icon name="conversion_path" className="text-[12px] text-primary" /> Connect
                  </button>
                </div>
                
                <textarea 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                     }
                  }}
                  disabled={isChatting}
                  placeholder={selectedNode ? "Ask AI to modify this branch..." : "Ask AI to modify the map..."}
                  className="w-full bg-transparent resize-none text-body-md text-on-surface p-2 focus:outline-none min-h-[44px] disabled:opacity-50 placeholder:text-outline"
                  rows={1}
                />
                <div className="flex justify-end px-1 pb-1">
                  <button 
                    onClick={() => handleSendChat()}
                    disabled={!chatInput.trim() || isChatting}
                    className="p-1.5 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors"
                  >
                    <Icon name="arrow_upward" className="text-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
