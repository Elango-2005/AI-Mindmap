import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  type ReactFlowInstance,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { generateAIMindMap, getMindMap, chatMindMap, updateMindMap } from "@/api/mindmaps";
import { getMindMapNodes, updateNode, summarizeNode, expandNode, findConnectionsNode, deleteNode } from "@/api/nodes";
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

import { Icon } from "@/components/Icon";
import { EditableNode } from "@/components/EditableNode";
import { EditableEdge } from "@/components/EditableEdge";
import { THEME_PALETTES, type ThemeKey, applyColorsToGraph } from "@/lib/graphColoring";
import { applyLayout, type LayoutDirection } from "@/lib/layoutAlgorithms";
import { OutlinePanel } from "@/components/OutlinePanel";
import { ShareModal } from "@/components/ShareModal";
import { exportMindMapToPdf } from "@/lib/exportPdf";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useMindMapSync } from "@/hooks/useMindMapSync";

export const Route = createFileRoute("/workspace/$mindMapId")({
  validateSearch: (search: Record<string, unknown>) => ({
    topic: typeof search.topic === "string" ? search.topic : undefined,
  }),
  component: Workspace,
});

const nodeTypes = {
  editable: EditableNode,
};

const edgeTypes = {
  editable: EditableEdge,
};

function Workspace() {
  const { mindMapId } = Route.useParams();
  const { topic: initialTopic } = Route.useSearch() as any;

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

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const [topic, setTopic] = useState(initialTopic || "");
  const [depth, setDepth] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [mindMapTitle, setMindMapTitle] = useState("Loading...");

  // AI & Chat
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);

  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'regenerate';
    nodeId: string;
    nodeLabel: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutDirection>("horizontal");
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("vibrant");
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Right panel mode
  const [rightPanelMode, setRightPanelMode] = useState<"ai" | "inspector">("ai");

  const [history, setHistory] = useState<{ nodes: FlowNode[]; edges: FlowEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pushToHistory = (newNodes: FlowNode[], newEdges: FlowEdge[]) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { nodes: newNodes, edges: newEdges }].slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const snapshot = history[targetIdx];
      setFlowNodes(snapshot.nodes);
      setFlowEdges(snapshot.edges);
      setHistoryIndex(targetIdx);
      toast.info("Action undone");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const snapshot = history[targetIdx];
      setFlowNodes(snapshot.nodes);
      setFlowEdges(snapshot.edges);
      setHistoryIndex(targetIdx);
      toast.info("Action redone");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setIsConfirming(true);
    try {
      const descendants: string[] = [];
      const queue = [confirmAction.nodeId];
      while(queue.length > 0) {
        const current = queue.shift();
        const children = flowEdges.filter(e => e.source === current).map(e => e.target);
        for (const child of children) {
          if (!descendants.includes(child)) {
            descendants.push(child);
            queue.push(child);
          }
        }
      }
      
      if (confirmAction.type === 'delete') {
        const toDelete = [confirmAction.nodeId, ...descendants];
        await Promise.all(toDelete.map(id => deleteNode(id)));
        setFlowNodes(nds => nds.filter(n => !toDelete.includes(n.id)));
        setFlowEdges(eds => eds.filter(e => !toDelete.includes(e.source) && !toDelete.includes(e.target)));
        toast.success("Node and its branch deleted.");
      } else if (confirmAction.type === 'regenerate') {
        if (descendants.length > 0) {
          await Promise.all(descendants.map(id => deleteNode(id)));
          setFlowNodes(nds => nds.filter(n => !descendants.includes(n.id)));
          setFlowEdges(eds => eds.filter(e => !descendants.includes(e.source) && !descendants.includes(e.target)));
        }
        toast.info("AI is regenerating the branch...");
        await expandNode(confirmAction.nodeId);
        await loadGraph();
      }
    } catch (e) {
      console.error(e);
      toast.error(`Failed to ${confirmAction.type} branch.`);
    } finally {
      setIsConfirming(false);
      setConfirmAction(null);
    }
  };

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

  const handleApplyLayout = async (dir: LayoutDirection) => {
    if (flowNodes.length === 0) return;
    setCurrentLayout(dir);
    const result = applyLayout(flowNodes, flowEdges, dir);
    pushToHistory(result.nodes, result.edges);
    setFlowNodes(result.nodes);
    setFlowEdges(result.edges);
    setTimeout(() => rfInstance?.fitView({ duration: 600, padding: 0.2 }), 50);
    toast.success(`Applied ${dir.charAt(0).toUpperCase() + dir.slice(1)} layout`);
    try {
      await Promise.all(result.nodes.map((n) => updateNode(n.id, { position_x: n.position.x, position_y: n.position.y })));
    } catch (err) {
      console.warn("Could not persist all node positions:", err);
    }
  };

  const handleSelectTheme = (themeKey: ThemeKey) => {
    setCurrentTheme(themeKey);
    const { nodes: coloredNodes, edges: coloredEdges } = applyColorsToGraph(flowNodes, flowEdges, themeKey);
    pushToHistory(coloredNodes, coloredEdges);
    setFlowNodes(coloredNodes);
    setFlowEdges(coloredEdges);
    if (mindMapId) localStorage.setItem(`mindmap_theme_${mindMapId}`, themeKey);
    toast.success(`Theme updated to ${THEME_PALETTES[themeKey].name}`);
  };

  async function loadGraph() {
    if (!mindMapId) return;
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
      const nodesWithStoredPositions = nodes.filter(n => n.position_x !== 0 || n.position_y !== 0);
      const nodesWithoutPositions = nodes.filter(n => n.position_x === 0 && n.position_y === 0);

      let nextY = 0;
      if (nodesWithStoredPositions.length > 0) {
        nextY = Math.max(...nodesWithStoredPositions.map(n => n.position_y)) + spacingY;
      }

      const mappedNodes: FlowNode[] = nodes.map(node => {
        const hasStoredPosition = node.position_x !== 0 || node.position_y !== 0;
        return {
          id: node.id,
          position: hasStoredPosition ? { x: node.position_x, y: node.position_y } : { x: 0, y: 0 },
          data: {
            label: node.label,
            mindMapId,
            onDelete: () => setConfirmAction({ type: 'delete', nodeId: node.id, nodeLabel: node.label }),
            onRegenerate: () => setConfirmAction({ type: 'regenerate', nodeId: node.id, nodeLabel: node.label })
          },
          type: "editable",
        };
      });

      const nodesToPersist: any[] = [];
      nodesWithoutPositions.forEach((node, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const positionX = column * spacingX;
        const positionY = nextY + row * spacingY;
        const flowNode = mappedNodes.find(item => item.id === node.id);
        if (flowNode) flowNode.position = { x: positionX, y: positionY };
        nodesToPersist.push({ id: node.id, position_x: positionX, position_y: positionY });
      });

      const mappedEdges: FlowEdge[] = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? undefined,
        type: "editable",
        animated: edge.animated,
      }));

      const savedTheme = (localStorage.getItem(`mindmap_theme_${mindMapId}`) as ThemeKey) || "vibrant";
      setCurrentTheme(savedTheme);
      const { nodes: coloredNodes, edges: coloredEdges } = applyColorsToGraph(mappedNodes, mappedEdges, savedTheme);

      setFlowNodes(coloredNodes);
      setFlowEdges(coloredEdges);
      setHistory([{ nodes: coloredNodes, edges: coloredEdges }]);
      setHistoryIndex(0);

      if (nodesToPersist.length > 0) {
        await Promise.all(nodesToPersist.map(n => updateNode(n.id, { position_x: n.position_x, position_y: n.position_y })));
      }
    } catch (error) {
      console.error(error);
      setGraphError("Failed to load the mind map graph.");
    } finally {
      setIsLoadingGraph(false);
    }
  }

  useEffect(() => { loadGraph(); }, [mindMapId]);
  
  // Set selected node and automatically switch to Inspector mode if desired
  useEffect(() => {
      if (selectedNodeId) {
          setRightPanelMode("inspector");
      }
  }, [selectedNodeId]);

  async function handleGenerateAI(fallbackTopic?: string) {
    const rootNode = flowNodes.find(node => !flowEdges.some(edge => edge.target === node.id)) || flowNodes[0];
    const rootTopic = rootNode ? (rootNode.data.label as string) : "";
    const finalTopic = (topic.trim() || (typeof fallbackTopic === 'string' ? fallbackTopic : '') || rootTopic || mindMapTitle).trim();
    if (!mindMapId || !finalTopic || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      await generateAIMindMap(mindMapId, { topic: finalTopic, depth: depth });
      await loadGraph();
    } catch (error) {
      console.error(error);
      setGenerationError("Failed to generate the mind map.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSendChat(overrideMessage?: string) {
    const userMessage = (typeof overrideMessage === "string" ? overrideMessage : chatInput).trim();
    if (!userMessage || !mindMapId) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatting(true);
    try {
      const response = await chatMindMap(mindMapId, userMessage, selectedNodeId);
      setChatMessages(prev => [...prev, { role: "ai", content: response.response_text }]);
      const existingNodeIds = new Set(flowNodes.map(n => n.id));
      const existingEdgeIds = new Set(flowEdges.map(e => e.id));
      
      const newNodes = response.nodes.filter(n => !existingNodeIds.has(n.id)).map(n => ({
        id: n.id,
        position: { x: n.position_x || (selectedNode ? selectedNode.position.x + 200 : 0), y: n.position_y || (selectedNode ? selectedNode.position.y + 150 : 0) },
        data: { label: n.label, mindMapId },
        type: "editable"
      }));
      const newEdges = response.edges.filter(e => !existingEdgeIds.has(e.id)).map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "editable",
        animated: true
      }));
      if (newNodes.length > 0 || newEdges.length > 0) {
        const mergedNodes = [...flowNodes, ...newNodes];
        const mergedEdges = [...flowEdges, ...newEdges];
        const { nodes: coloredNodes, edges: coloredEdges } = applyColorsToGraph(mergedNodes, mergedEdges);
        setFlowNodes(coloredNodes);
        setFlowEdges(coloredEdges);
      } else {
        await loadGraph();
      }
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: "ai", content: "Error modifying the map." }]);
    } finally {
      setIsChatting(false);
    }
  }

  function handleNodesChange(changes: NodeChange[]) {
    setFlowNodes(current => applyNodeChanges(changes, current));
    broadcastNodesChange(changes);
  }

  const handleNodeDragStop: NodeDragHandler = async (_e, node) => {
    try {
      await updateNode(node.id, { position_x: node.position.x, position_y: node.position.y });
    } catch (error) { console.error(error); }
  };

  const handleExport = async (format: "markdown" | "opml" | "xmind" | "freemind") => {
    if (!mindMapId) return;
    try {
      const blob = await exportMindMap(mindMapId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = format === 'markdown' ? 'md' : (format === 'freemind' ? 'mm' : format);
      a.download = `${mindMapTitle.replace(/\s+/g, '_')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success(`Exported ${extension.toUpperCase()} successfully!`);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const handleExportImage = () => {
    const nodesBounds = getNodesBounds(flowNodes);
    const imageWidth = nodesBounds.width + 100;
    const imageHeight = nodesBounds.height + 100;
    const transform = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2, 0.1);
    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportEl) return;
    toPng(viewportEl, {
      backgroundColor: document.documentElement.classList.contains('dark') ? '#111318' : '#f8f9ff',
      width: imageWidth,
      height: imageHeight,
      style: { width: `${imageWidth}px`, height: `${imageHeight}px`, transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})` },
    }).then(dataUrl => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${mindMapTitle.replace(/\s+/g, '_')}.png`;
      a.click();
    }).catch(() => toast.error("Failed to export image"));
  };

  const handleExportPDF = () => exportMindMapToPdf({ nodes: flowNodes, title: mindMapTitle });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mindMapId || !e.target.files?.length) return;
    const file = e.target.files[0];
    let format: any = "markdown";
    if (file.name.endsWith(".xmind")) format = "xmind";
    else if (file.name.endsWith(".mm")) format = "freemind";
    else if (file.name.endsWith(".opml")) format = "opml";
    try {
      setIsLoadingGraph(true);
      await importMindMap(mindMapId, format, file);
      await loadGraph();
      toast.success(`Successfully imported!`);
    } catch (err) {
      toast.error("Import failed");
      setIsLoadingGraph(false);
    } finally {
      e.target.value = "";
    }
  };

  const selectedNode = selectedNodeId ? flowNodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
      
      {/* 1. TOP HEADER (Figma style) */}
      <header className="h-14 bg-surface border-b border-outline-variant/30 px-4 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors" title="Back to Projects">
            <Icon name="arrow_back" className="text-[20px]" />
          </Link>
          <div className="text-label-sm text-outline-variant flex items-center gap-2">
            <Link to="/projects" className="hover:text-on-surface transition-colors">Projects</Link>
            <Icon name="chevron_right" className="text-[14px]" />
          </div>
          {isRenamingTitle ? (
            <form onSubmit={handleRenameSubmit} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={titleEditValue}
                onChange={e => setTitleEditValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={e => { if (e.key === 'Escape') setIsRenamingTitle(false); }}
                className="bg-surface-container border border-primary rounded px-2 py-0.5 text-label-md font-semibold focus:outline-none w-48"
              />
            </form>
          ) : (
            <div 
              className="text-on-surface font-medium hover:bg-surface-container-low px-2 py-0.5 rounded cursor-text flex items-center gap-1 group"
              onClick={() => { setTitleEditValue(mindMapTitle); setIsRenamingTitle(true); }}
            >
              {mindMapTitle} <Icon name="edit" className="text-[14px] opacity-0 group-hover:opacity-100 text-outline-variant" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-label-xs text-on-surface-variant/70 flex items-center gap-1 mr-2">
            {isSaving || isLoadingGraph ? (
              <><Icon name="sync" className="animate-spin text-[14px]" /> Saving...</>
            ) : (
              <><Icon name="cloud_done" className="text-[14px]" /> Saved</>
            )}
          </div>

          <div className="w-px h-4 bg-outline-variant/50 hidden sm:block mx-1" />

          <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded disabled:opacity-30">
            <Icon name="undo" className="text-[18px]" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded disabled:opacity-30">
            <Icon name="redo" className="text-[18px]" />
          </button>
          
          <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-label-sm font-semibold rounded-lg transition-colors">
            <Icon name="share" className="text-[16px]" /> Share
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
                <Icon name="more_vert" className="text-[20px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportImage}>Export as PNG</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("markdown")}>Export as Markdown</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <label className="cursor-pointer flex items-center w-full">
                  Import Map
                  <input type="file" className="hidden" accept=".md,.opml,.mm,.xmind" onChange={handleImport} />
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* WORKSPACE BODY */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* 2. LEFT TOOL RAIL */}
        <div className="w-14 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
          <button
            onClick={() => setIsOutlineOpen(!isOutlineOpen)}
            className={`p-2 rounded-xl transition-colors ${isOutlineOpen ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
            title="Toggle Outline"
          >
            <Icon name="list_alt" className="text-[22px]" />
          </button>
          
          <div className="w-8 h-px bg-outline-variant/30" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" title="Layout Options">
                <Icon name="account_tree" className="text-[22px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="ml-2 w-48">
              <DropdownMenuItem onClick={() => handleApplyLayout("balanced")}>Balanced Radial</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleApplyLayout("horizontal")}>Horizontal</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleApplyLayout("vertical")}>Vertical</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" title="Theme Options">
                <Icon name="palette" className="text-[22px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="ml-2 w-48">
              {Object.values(THEME_PALETTES).map(t => (
                <DropdownMenuItem key={t.id} onClick={() => handleSelectTheme(t.id)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* OUTLINE PANEL */}
        {isOutlineOpen && (
          <OutlinePanel
            nodes={flowNodes}
            edges={flowEdges}
            selectedNodeId={selectedNodeId}
            onSelectNode={(nodeId) => {
              setSelectedNodeId(nodeId);
              const targetNode = flowNodes.find((n) => n.id === nodeId);
              if (targetNode && rfInstance) {
                rfInstance.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 600 });
              }
            }}
            onClose={() => setIsOutlineOpen(false)}
          />
        )}

        {/* 3. CENTER CANVAS */}
        <main className="flex-1 relative bg-surface-container-lowest dot-matrix flex flex-col">
          {isLoadingGraph ? (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/50 backdrop-blur-sm">
              <Icon name="sync" className="animate-spin text-primary text-[32px]" />
            </div>
          ) : flowNodes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <h2 className="text-display-sm font-semibold mb-4 text-center">Start Your Map</h2>
              <div className="bg-surface shadow-level-2 rounded-2xl w-full max-w-2xl p-4 flex gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="E.g., Microservices Architecture"
                  className="flex-1 bg-transparent border-none outline-none text-body-lg"
                  onKeyDown={e => { if (e.key === 'Enter' && !isGenerating) handleGenerateAI(); }}
                />
                <button
                  onClick={() => handleGenerateAI()}
                  disabled={isGenerating || !topic.trim()}
                  className="bg-primary text-on-primary px-6 py-2 rounded-xl font-semibold disabled:opacity-50"
                >
                  {isGenerating ? <Icon name="sync" className="animate-spin" /> : "Generate"}
                </button>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={setRfInstance}
              fitView
              nodesDraggable={true}
              elementsSelectable={true}
              onNodesChange={handleNodesChange}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
            >
              <Background color="var(--color-outline-variant)" gap={24} size={2} />
              <Controls showInteractive={false} className="!left-4 !bottom-4 !right-auto" />
              {showMiniMap && <MiniMap className="!bg-surface-container-lowest !border-outline-variant/30 !bottom-16 !left-4 !right-auto" />}
            </ReactFlow>
          )}

          {/* 4. FLOATING CANVAS CONTROLS */}
          {flowNodes.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-md border border-outline-variant/40 rounded-full shadow-level-3 flex items-center p-1.5 gap-1 z-10">
              <button onClick={() => setShowMiniMap(!showMiniMap)} className="p-2 text-on-surface hover:bg-surface-container rounded-full" title="Toggle MiniMap">
                <Icon name="map" className="text-[20px]" />
              </button>
              <div className="w-px h-6 bg-outline-variant/50 mx-1" />
              <button onClick={() => rfInstance?.fitView({ duration: 500 })} className="p-2 text-on-surface hover:bg-surface-container rounded-full" title="Fit View">
                <Icon name="crop_free" className="text-[20px]" />
              </button>
              <button onClick={() => rfInstance?.zoomIn({ duration: 250 })} className="p-2 text-on-surface hover:bg-surface-container rounded-full" title="Zoom In">
                <Icon name="add" className="text-[20px]" />
              </button>
              <button onClick={() => rfInstance?.zoomOut({ duration: 250 })} className="p-2 text-on-surface hover:bg-surface-container rounded-full" title="Zoom Out">
                <Icon name="remove" className="text-[20px]" />
              </button>
            </div>
          )}
        </main>

        {/* 5. RIGHT PANEL (AI Copilot / Node Inspector) */}
        {flowNodes.length > 0 && (
          <aside className="w-[340px] bg-surface border-l border-outline-variant/30 flex flex-col z-20 shrink-0">
            {/* Panel Tabs */}
            <div className="flex items-center p-2 border-b border-outline-variant/30 gap-1 bg-surface-container-lowest">
              <button
                onClick={() => setRightPanelMode("ai")}
                className={`flex-1 py-1.5 rounded-lg text-label-sm font-semibold transition-colors flex items-center justify-center gap-2 ${rightPanelMode === "ai" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
              >
                <Icon name="auto_awesome" className="text-[16px]" /> AI Copilot
              </button>
              <button
                onClick={() => setRightPanelMode("inspector")}
                className={`flex-1 py-1.5 rounded-lg text-label-sm font-semibold transition-colors flex items-center justify-center gap-2 ${rightPanelMode === "inspector" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
              >
                <Icon name="tune" className="text-[16px]" /> Inspector
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {rightPanelMode === "ai" ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center mt-10 p-4">
                        <Icon name="forum" className="text-[32px] text-primary/40 mb-2" />
                        <h4 className="text-label-lg font-semibold">How can I help?</h4>
                        <p className="text-body-sm text-on-surface-variant mt-2">Ask me to modify the map, add new branches, or summarize concepts.</p>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`p-3 rounded-2xl text-body-sm ${msg.role === "user" ? "bg-primary text-on-primary self-end max-w-[85%] rounded-br-sm" : "bg-surface-container-low text-on-surface border border-outline-variant/30 max-w-[90%] rounded-bl-sm"}`}>
                        {msg.content}
                      </div>
                    ))}
                    {isChatting && (
                      <div className="p-3 rounded-2xl bg-surface-container-low flex items-center gap-2 text-label-sm self-start">
                        <Icon name="sync" className="animate-spin text-primary" /> Modifying map...
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-outline-variant/20 bg-surface-container-lowest">
                    <div className="bg-surface border border-outline-variant/50 rounded-2xl p-2 flex flex-col">
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                        placeholder="Ask AI to update map..."
                        className="w-full bg-transparent resize-none text-body-md outline-none min-h-[60px]"
                        disabled={isChatting}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-outline-variant ml-2">{selectedNode ? `Targeting: ${selectedNode.data.label}` : 'Global'}</span>
                        <button
                          onClick={() => handleSendChat()}
                          disabled={!chatInput.trim() || isChatting}
                          className="p-1.5 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Icon name="arrow_upward" className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-6">
                  {!selectedNode ? (
                    <div className="text-center text-on-surface-variant mt-10">
                      <Icon name="touch_app" className="text-[32px] opacity-40 mb-2" />
                      <p className="text-body-sm">Select a node to inspect and edit details.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-2 block">Node Label</label>
                        <textarea 
                          value={selectedNode.data.label as string}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            setFlowNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n));
                          }}
                          onBlur={() => updateNode(selectedNode.id, { label: selectedNode.data.label as string })}
                          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-3 text-body-md focus:border-primary outline-none resize-none min-h-[80px]"
                        />
                      </div>
                      
                      <div className="h-px bg-outline-variant/30" />
                      
                      <div>
                         <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-3 block">Quick Actions</label>
                         <div className="flex flex-col gap-2">
                            <button onClick={() => setConfirmAction({ type: 'regenerate', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })} className="flex items-center gap-3 p-2 hover:bg-surface-container-low rounded-lg text-left text-body-sm">
                               <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary"><Icon name="auto_awesome" /></div>
                               <div>
                                  <div className="font-semibold text-on-surface">AI Regenerate</div>
                                  <div className="text-on-surface-variant text-[11px]">Replace descendants</div>
                                </div>
                            </button>
                            <button onClick={() => setConfirmAction({ type: 'delete', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })} className="flex items-center gap-3 p-2 hover:bg-error-container/30 rounded-lg text-left text-body-sm text-error">
                               <div className="w-8 h-8 rounded bg-error/10 flex items-center justify-center text-error"><Icon name="delete" /></div>
                               <div>
                                  <div className="font-semibold">Delete Node</div>
                                  <div className="opacity-70 text-[11px]">Remove node & children</div>
                                </div>
                            </button>
                         </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        mindMapTitle={mindMapTitle}
        remoteUsers={remoteUsers}
        onExport={(format) => {
          if (format === "png") handleExportImage();
          else if (format === "pdf") handleExportPDF();
          else handleExport(format as any);
        }}
      />

      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl shadow-level-3 w-full max-w-[28rem] p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-error">
              <Icon name="warning" className="text-[28px]" />
              <h2 className="text-headline-sm font-bold text-on-surface">
                {confirmAction.type === 'delete' ? 'Delete Branch?' : 'Regenerate Branch?'}
              </h2>
            </div>
            <p className="text-body-md text-on-surface-variant mb-6">
              {confirmAction.type === 'delete' 
                ? <>You are about to delete <strong>{confirmAction.nodeLabel}</strong> and all of its descendants. This action cannot be undone.</>
                : <>You are about to regenerate the descendants of <strong>{confirmAction.nodeLabel}</strong>. All existing child nodes will be permanently replaced with new AI-generated content.</>
              }
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} disabled={isConfirming} className="px-4 py-2 rounded-full text-label-md font-medium hover:bg-surface-container transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={executeConfirmAction} disabled={isConfirming} className="px-4 py-2 rounded-full text-label-md font-medium bg-error text-on-error hover:bg-error/90 flex items-center gap-2 transition-colors disabled:opacity-50">
                {isConfirming && <Icon name="sync" className="animate-spin text-[16px]" />}
                {confirmAction.type === 'delete' ? 'Delete' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
