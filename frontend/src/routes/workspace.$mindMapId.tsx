import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  applyNodeChanges,
  type NodeChange,
  type Node as FlowNode,
  type ReactFlowInstance,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { generateAIMindMap, getMindMap, chatMindMap, updateMindMap, createSnapshot, restoreSnapshot, getSnapshots, type Snapshot } from "@/api/mindmaps";
import { getMindMapNodes, createNode, updateNode, summarizeNode, expandNode, findConnectionsNode, deleteNode } from "@/api/nodes";
import { getMindMapEdges, deleteEdge, createEdge, updateEdge } from "@/api/edges";
import { addEdge, reconnectEdge, type Connection, type Edge as FlowEdge } from "@xyflow/react";
import { exportMindMap, importMindMap } from "@/api/integrations";
import { toPng } from "html-to-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [chatMessages, setChatMessages] = useState<{
    id: string;
    role: 'user' | 'ai';
    content: string;
    mapChanges?: { nodesAdded: number; nodesDeleted: number; snapshotId?: string; isUndone?: boolean };
  }[]>([]);

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
  const [showGrid, setShowGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeTool, setActiveTool] = useState<"select" | "add_node" | "connect">("select");
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  
  // Right panel mode
  const [rightPanelMode, setRightPanelMode] = useState<"ai" | "inspector" | "versions">("ai");

  const [aiPanelState, setAiPanelState] = useState<"collapsed" | "expanded" | "full">("collapsed");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);

  // Focus Mode
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Command Palette
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const descendantsSet = useMemo(() => {
    if (!focusedNodeId) return null;
    const set = new Set<string>();
    const queue = [focusedNodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      set.add(current);
      const children = flowEdges.filter(e => e.source === current).map(e => e.target);
      queue.push(...children);
    }
    return set;
  }, [focusedNodeId, flowEdges]);

  const visibleNodes = useMemo(() => {
    if (!descendantsSet) return flowNodes;
    return flowNodes.map(n => ({
      ...n,
      hidden: !descendantsSet.has(n.id)
    }));
  }, [flowNodes, descendantsSet]);

  const visibleEdges = useMemo(() => {
    if (!descendantsSet) return flowEdges;
    return flowEdges.map(e => ({
      ...e,
      hidden: !descendantsSet.has(e.source) || !descendantsSet.has(e.target)
    }));
  }, [flowEdges, descendantsSet]);

  useEffect(() => {
    if (rightPanelMode === "versions" && mindMapId) {
      loadSnapshots();
    }
  }, [rightPanelMode, mindMapId]);

  async function loadSnapshots() {
    if (!mindMapId) return;
    setIsLoadingSnapshots(true);
    try {
      const data = await getSnapshots(mindMapId);
      // sort descending by created_at
      setSnapshots(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.error("Failed to load snapshots", e);
    } finally {
      setIsLoadingSnapshots(false);
    }
  }

  async function handleRestoreSnapshot(snapshotId: string) {
    if (!mindMapId) return;
    try {
      toast.info("Restoring version...");
      await restoreSnapshot(mindMapId, snapshotId);
      await loadGraph();
      toast.success("Version restored successfully");
    } catch (e) {
      toast.error("Failed to restore version");
    }
  }

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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (e.key === "Escape") {
        if (activeTool !== "select") {
          setActiveTool("select");
          setConnectSourceNodeId(null);
          toast.info("Returned to select tool");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history, activeTool]);

  const handleToolbarAddNode = async () => {
    if (!mindMapId) return;
    if (selectedNodeId) {
      const parentNode = flowNodes.find((n) => n.id === selectedNodeId);
      const parentPos = parentNode ? parentNode.position : { x: 200, y: 200 };
      try {
        const newNode = await createNode(mindMapId, {
          label: "New Node",
          position_x: parentPos.x + 220,
          position_y: parentPos.y + 40,
        });
        const newEdge = await createEdge(mindMapId, {
          source: selectedNodeId,
          target: newNode.id,
        });
        const rfNode: FlowNode = {
          id: newNode.id,
          type: "editable",
          position: { x: newNode.position_x, y: newNode.position_y },
          selected: true,
          data: {
            label: newNode.label,
            mindMapId,
            depth: ((parentNode?.data?.depth as number) || 1) + 1,
            theme: currentTheme,
            isNew: true,
            onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),
            onDelete: (id?: string) =>
              setConfirmAction({ type: "delete", nodeId: id || newNode.id, nodeLabel: newNode.label }),
            onRegenerate: () =>
              setConfirmAction({ type: "regenerate", nodeId: newNode.id, nodeLabel: newNode.label }),
          },
        };
        const rfEdge: FlowEdge = {
          id: newEdge.id,
          source: selectedNodeId,
          target: newNode.id,
          type: "editable",
        };
        const nextNodes = [...flowNodes.map((n) => ({ ...n, selected: false })), rfNode];
        const nextEdges = [...flowEdges, rfEdge];
        setFlowNodes(nextNodes);
        setFlowEdges(nextEdges);
        setSelectedNodeId(newNode.id);
        pushToHistory(nextNodes, nextEdges);
        toast.success("Child node added");
      } catch (err) {
        console.error(err);
        toast.error("Failed to add child node");
      }
    } else {
      setActiveTool("add_node");
      toast.info("Click anywhere on the canvas to place a new node.", { duration: 3000 });
    }
  };

  const handleCanvasClick = async (event: React.MouseEvent) => {
    if (activeTool === "add_node" && mindMapId && rfInstance) {
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      try {
        const newNode = await createNode(mindMapId, {
          label: "New Node",
          position_x: Math.round(position.x),
          position_y: Math.round(position.y),
        });
        const rfNode: FlowNode = {
          id: newNode.id,
          type: "editable",
          position: { x: newNode.position_x, y: newNode.position_y },
          selected: true,
          data: {
            label: newNode.label,
            mindMapId,
            depth: 1,
            theme: currentTheme,
            isNew: true,
            onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),
            onDelete: (id?: string) =>
              setConfirmAction({ type: "delete", nodeId: id || newNode.id, nodeLabel: newNode.label }),
            onRegenerate: () =>
              setConfirmAction({ type: "regenerate", nodeId: newNode.id, nodeLabel: newNode.label }),
          },
        };
        const nextNodes = [...flowNodes.map((n) => ({ ...n, selected: false })), rfNode];
        setFlowNodes(nextNodes);
        setSelectedNodeId(newNode.id);
        pushToHistory(nextNodes, flowEdges);
        setActiveTool("select");
        toast.success("Node placed on canvas");
      } catch (err) {
        console.error(err);
        toast.error("Failed to create node");
      }
    } else {
      setSelectedNodeId(null);
      if (activeTool === "connect") {
        setConnectSourceNodeId(null);
      }
    }
  };

  const handleNodeClick = async (_e: React.MouseEvent, node: FlowNode) => {
    if (activeTool === "connect" && mindMapId) {
      if (!connectSourceNodeId) {
        setConnectSourceNodeId(node.id);
        setSelectedNodeId(node.id);
        toast.info(`Source: "${node.data.label}". Click target node to connect.`);
      } else if (connectSourceNodeId === node.id) {
        toast.info("Source and target cannot be the same node.");
      } else {
        try {
          const newEdge = await createEdge(mindMapId, {
            source: connectSourceNodeId,
            target: node.id,
          });
          const rfEdge: FlowEdge = {
            id: newEdge.id,
            source: newEdge.source,
            target: newEdge.target,
            type: "editable",
          };
          const nextEdges = addEdge(rfEdge, flowEdges);
          setFlowEdges(nextEdges);
          pushToHistory(flowNodes, nextEdges);
          toast.success("Nodes connected successfully");
          setConnectSourceNodeId(null);
          setActiveTool("select");
        } catch (err) {
          console.error(err);
          toast.error("Failed to connect nodes");
        }
      }
    } else {
      setSelectedNodeId(node.id);
    }
  };

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
            onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),
            onDelete: (id?: string) => {
               if (id) {
                   // From context menu, silent delete (managed by standard ReactFlow handlers via onNodesDelete)
                   // wait, context menu calls onDelete(id). 
                   // We actually just want to open the prompt OR just delete it.
                   // User wants to be able to delete a node manually.
                   // The safe AI regeneration rule means if they delete manually it shouldn't be terrifying, but the backend is safe.
                   // Actually, if we pass id, let's just trigger the confirmAction for deletion to be safe, or just do it.
                   // Standard React Flow selection + Backspace works. We will just use standard selection + backspace for quick delete.
                   setConfirmAction({ type: 'delete', nodeId: id, nodeLabel: node.label });
               } else {
                   setConfirmAction({ type: 'delete', nodeId: node.id, nodeLabel: node.label });
               }
            },
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

  const handleExpandNode = async (nodeId: string) => {
    toast.info("Expanding node...");
    try {
      await expandNode(nodeId);
      await loadGraph();
      toast.success("Node expanded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to expand node");
    }
  };

  const handleSummarizeNode = async (nodeId: string) => {
    toast.info("Summarizing node...");
    try {
      const { summary } = await summarizeNode(nodeId);
      setFlowNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: summary } } : n));
      toast.success("Node summarized");
    } catch (e) {
      console.error(e);
      toast.error("Failed to summarize node");
    }
  };

  const handleFindConnections = async (nodeId: string) => {
    toast.info("Analyzing relationships...");
    try {
      const connections = await findConnectionsNode(nodeId);
      if (connections.length > 0) {
        toast.success(`Found ${connections.length} possible connection(s).`);
        await loadGraph();
      } else {
        toast.info("No missing connections found.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to find connections");
    }
  };

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


  async function handleUndoAIChat(messageId: string, snapshotId: string) {
    if (!mindMapId) return;
    try {
      toast.info("Undoing AI changes...");
      await restoreSnapshot(mindMapId, snapshotId);
      setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, mapChanges: { ...m.mapChanges!, isUndone: true } } : m));
      await loadGraph();
      toast.success("AI changes undone");
    } catch (e) {
      console.error(e);
      toast.error("Failed to undo changes");
    }
  }

  async function handleSendChat(overrideMessage?: string) {
    const userMessage = (typeof overrideMessage === "string" ? overrideMessage : chatInput).trim();
    if (!userMessage || !mindMapId) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: userMessage }]);
    setIsChatting(true);
    
    let snapshotId: string | undefined = undefined;
    try {
      const snap = await createSnapshot(mindMapId, `Pre-AI: ${userMessage.substring(0,20)}`);
      snapshotId = snap.id;
    } catch(e) { console.warn("Failed to snapshot", e); }

    try {
      const currentNodesIds = new Set(flowNodes.map(n => n.id));
      const response = await chatMindMap(mindMapId, userMessage, selectedNodeId);
      
      const newNodesIds = new Set(response.nodes.map(n => n.id));
      let added = 0; let deleted = 0;
      newNodesIds.forEach(id => { if (!currentNodesIds.has(id)) added++; });
      currentNodesIds.forEach(id => { if (!newNodesIds.has(id)) deleted++; });
      
      const mapChanges = (added > 0 || deleted > 0) ? { nodesAdded: added, nodesDeleted: deleted, snapshotId } : undefined;
      
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: "ai", content: response.response_text, mapChanges }]);
      await loadGraph(); // fully reload the graph based on new backend state
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: "ai", content: "Error modifying the map." }]);
    } finally {
      setIsChatting(false);
    }
  }



  const handleNodesDelete = async (deleted: FlowNode[]) => {
    try {
      await Promise.all(deleted.map(n => deleteNode(n.id)));
      setFlowNodes(current => {
        pushToHistory(current, flowEdges);
        return current;
      });
    } catch(e) { console.error(e); }
  };

  const handleEdgesDelete = async (deleted: FlowEdge[]) => {
    try {
      await Promise.all(deleted.map(e => deleteEdge(e.id)));
      setFlowEdges(current => {
        pushToHistory(flowNodes, current);
        return current;
      });
    } catch(e) { console.error(e); }
  };

  function handleNodesChange(changes: NodeChange[]) {

    setFlowNodes(current => applyNodeChanges(changes, current));
    broadcastNodesChange(changes);
  }


  
  const onReconnect = async (oldEdge: FlowEdge, newConnection: Connection) => {
    try {
      await updateEdge(oldEdge.id, {
        source: newConnection.source,
        target: newConnection.target
      });
      setFlowEdges(eds => {
        const next = reconnectEdge(oldEdge, newConnection, eds);
        pushToHistory(flowNodes, next);
        return next;
      });
      toast.success("Edge reconnected");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reconnect edge");
    }
  };

  const onConnect = async (connection: Connection) => {
    if (!mindMapId) return;
    try {
      const newEdge = await createEdge(mindMapId, {
        source: connection.source,
        target: connection.target
      });
      const rfEdge: FlowEdge = {
        id: newEdge.id,
        source: newEdge.source,
        target: newEdge.target,
        type: "editable"
      };
      setFlowEdges(eds => {
        const next = addEdge(rfEdge, eds);
        pushToHistory(flowNodes, next);
        return next;
      });
      toast.success("Connected nodes");
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect nodes");
    }
  };

  const handleNodeDragStop = async (_e: any, node: any) => {
    try {
      await updateNode(node.id, { position_x: node.position.x, position_y: node.position.y });
      setFlowNodes(current => {
        pushToHistory(current, flowEdges);
        return current;
      });
    } catch (error) { console.error(error); }
  };


  const handleExport = async (format: "markdown" | "opml" | "xmind" | "freemind" | "html") => {
    if (!mindMapId) return;
    const toastId = toast.loading("Preparing export...");
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
      toast.success("Export ready.", { id: toastId });
    } catch (e) {
      toast.error("Export failed", { id: toastId });
    }
  };

  const handleExportImage = () => {
    const toastId = toast.loading("Preparing export...");
    const nodesBounds = getNodesBounds(flowNodes);
    const imageWidth = nodesBounds.width + 100;
    const imageHeight = nodesBounds.height + 100;
    const transform = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2, 0.1);
    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportEl) {
      toast.error("Viewport not found", { id: toastId });
      return;
    }
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
      toast.success("Export ready.", { id: toastId });
    }).catch(() => toast.error("Failed to export image", { id: toastId }));
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

          
          <button onClick={() => setIsKeyboardHelpOpen(true)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Keyboard Shortcuts">
            <Icon name="keyboard" className="text-[20px]" />
          </button>
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
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container text-label-sm font-semibold rounded-lg transition-colors">
                <Icon name="ios_share" className="text-[16px]" /> Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Image & PDF</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportImage} className="cursor-pointer"><Icon name="image" className="mr-2 text-[16px]" /> Export as PNG</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer"><Icon name="picture_as_pdf" className="mr-2 text-[16px]" /> Export as PDF</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Text</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("markdown")} className="cursor-pointer"><Icon name="description" className="mr-2 text-[16px]" /> Export as Markdown</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("html")} className="cursor-pointer"><Icon name="code" className="mr-2 text-[16px]" /> Export as HTML</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Project Data</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("xmind")} className="cursor-pointer"><Icon name="account_tree" className="mr-2 text-[16px]" /> Export as XMind</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("freemind")} className="cursor-pointer"><Icon name="account_tree" className="mr-2 text-[16px]" /> Export as FreeMind</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("opml")} className="cursor-pointer"><Icon name="account_tree" className="mr-2 text-[16px]" /> Export as OPML</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="More Options">
                <Icon name="more_vert" className="text-[20px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <label className="cursor-pointer flex items-center w-full">
                  <Icon name="upload_file" className="mr-2 text-[16px]" /> Import Map
                  <input type="file" className="hidden" accept=".md,.opml,.mm,.xmind" onChange={handleImport} />
                </label>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* WORKSPACE BODY */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* 2. LEFT TOOL RAIL - 7 TOOLS */}
        <TooltipProvider delayDuration={150}>
          <div className="w-14 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col items-center py-3 gap-1.5 z-20 shrink-0 select-none">
            {/* Tool 1: Select */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setActiveTool("select");
                    setConnectSourceNodeId(null);
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === "select"
                      ? "bg-primary/15 text-primary ring-1 ring-primary/20 shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                  aria-label="Select mode"
                >
                  <Icon name="near_me" className="text-[20px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Select (Pan & Select)
              </TooltipContent>
            </Tooltip>

            {/* Tool 2: Add Node */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToolbarAddNode}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === "add_node"
                      ? "bg-primary/15 text-primary ring-1 ring-primary/20 shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                  aria-label="Add Node"
                >
                  <Icon name="add_box" className="text-[20px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {selectedNodeId ? "Add Child Node (Tab)" : "Add Node (Click canvas)"}
              </TooltipContent>
            </Tooltip>

            {/* Tool 3: Connect */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (activeTool === "connect") {
                      setActiveTool("select");
                      setConnectSourceNodeId(null);
                    } else {
                      setActiveTool("connect");
                      if (selectedNodeId) {
                        setConnectSourceNodeId(selectedNodeId);
                        toast.info("Selected source node. Now click another node to connect.");
                      } else {
                        setConnectSourceNodeId(null);
                        toast.info("Click the first node to start connecting.");
                      }
                    }
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeTool === "connect"
                      ? "bg-primary/15 text-primary ring-1 ring-primary/20 shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                  aria-label="Connect Nodes"
                >
                  <Icon name="cable" className="text-[20px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Connect Nodes
              </TooltipContent>
            </Tooltip>

            {/* Tool 4: Text / Note */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled
                  className="w-10 h-10 rounded-xl flex items-center justify-center opacity-40 cursor-not-allowed text-on-surface-variant transition-colors"
                  aria-label="Text or Note"
                >
                  <Icon name="notes" className="text-[20px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Text / Note (Coming soon)
              </TooltipContent>
            </Tooltip>

            <div className="w-6 h-px bg-outline-variant/30 my-0.5" />

            {/* Tool 5: AI */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (aiPanelState === "collapsed") {
                      setAiPanelState("expanded");
                      setRightPanelMode("ai");
                    } else {
                      setAiPanelState("collapsed");
                    }
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    aiPanelState !== "collapsed"
                      ? "bg-primary/15 text-primary ring-1 ring-primary/20 shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                  aria-label="AI Assistant"
                >
                  <Icon name="auto_awesome" className="text-[20px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                AI Assistant
              </TooltipContent>
            </Tooltip>

            {/* Tool 6: Layout */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
                      aria-label="Layout Options"
                    >
                      <Icon name="account_tree" className="text-[20px]" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Layout Options
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" className="ml-2 w-52">
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Auto Layout</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleApplyLayout("balanced")} className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center"><Icon name="bubble_chart" className="mr-2 text-[16px]" /> Balanced Radial</span>
                  {currentLayout === "balanced" && <Icon name="check" className="text-[16px] text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleApplyLayout("horizontal")} className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center"><Icon name="align_horizontal_left" className="mr-2 text-[16px]" /> Horizontal</span>
                  {currentLayout === "horizontal" && <Icon name="check" className="text-[16px] text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleApplyLayout("vertical")} className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center"><Icon name="align_vertical_top" className="mr-2 text-[16px]" /> Vertical</span>
                  {currentLayout === "vertical" && <Icon name="check" className="text-[16px] text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => rfInstance?.fitView({ duration: 500, padding: 0.2 })} className="cursor-pointer">
                  <Icon name="crop_free" className="mr-2 text-[16px]" /> Fit Map to View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tool 7: View */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
                      aria-label="View & Canvas Options"
                    >
                      <Icon name="visibility" className="text-[20px]" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  View & Canvas
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" className="ml-2 w-56">
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Canvas View</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShowMiniMap(!showMiniMap)} className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center"><Icon name="map" className="mr-2 text-[16px]" /> MiniMap</span>
                  {showMiniMap && <Icon name="check" className="text-[16px] text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsOutlineOpen(!isOutlineOpen)} className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center"><Icon name="list_alt" className="mr-2 text-[16px]" /> Outline Panel</span>
                  {isOutlineOpen && <Icon name="check" className="text-[16px] text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowGrid(!showGrid)} className="cursor-pointer flex items-center justify-between">
                  <span className="flex items-center"><Icon name="grid_view" className="mr-2 text-[16px]" /> Canvas Grid</span>
                  {showGrid && <Icon name="check" className="text-[16px] text-primary" />}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Focus & Zoom</DropdownMenuLabel>
                {focusedNodeId ? (
                  <DropdownMenuItem onClick={() => setFocusedNodeId(null)} className="cursor-pointer">
                    <Icon name="center_focus_weak" className="mr-2 text-[16px]" /> Exit Focus Mode
                  </DropdownMenuItem>
                ) : selectedNodeId ? (
                  <DropdownMenuItem onClick={() => setFocusedNodeId(selectedNodeId)} className="cursor-pointer">
                    <Icon name="center_focus_strong" className="mr-2 text-[16px]" /> Focus on Selected Node
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => rfInstance?.fitView({ duration: 500, padding: 0.2 })} className="cursor-pointer">
                  <Icon name="crop_free" className="mr-2 text-[16px]" /> Fit to View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => rfInstance?.zoomTo(1, { duration: 250 })} className="cursor-pointer">
                  <Icon name="search" className="mr-2 text-[16px]" /> Reset Zoom (100%)
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Color Theme</DropdownMenuLabel>
                {Object.values(THEME_PALETTES).map(t => (
                  <DropdownMenuItem key={t.id} onClick={() => handleSelectTheme(t.id)} className="cursor-pointer flex items-center justify-between">
                    <span>{t.name}</span>
                    {currentTheme === t.id && <Icon name="check" className="text-[16px] text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </TooltipProvider>

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
              nodes={visibleNodes}
              edges={visibleEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={setRfInstance}
              fitView
              nodesDraggable={true}
              elementsSelectable={true}
              nodesConnectable={true}
              deleteKeyCode={['Backspace', 'Delete']}
              onConnect={onConnect}
              onReconnect={onReconnect}
              edgesUpdatable={true}
              onNodesDelete={handleNodesDelete}
              onEdgesDelete={handleEdgesDelete}
              onNodesChange={handleNodesChange}
              onNodeDragStop={handleNodeDragStop}
              onNodeClick={handleNodeClick}
              onPaneClick={handleCanvasClick}
              onMove={(_e, viewport) => setZoomLevel(Math.round(viewport.zoom * 100))}
            >
              {showGrid && <Background color="var(--color-outline-variant)" gap={24} size={2} />}
              {showMiniMap && (
                <MiniMap
                  className="!bg-surface-container-lowest !border-outline-variant/30 !bottom-4 !left-4 !right-auto rounded-xl shadow-level-1 overflow-hidden"
                />
              )}
            </ReactFlow>
          )}

          {/* Mode indicator banner for Connect and Add Node modes */}
          {activeTool === "connect" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-primary/40 text-primary px-3.5 py-1.5 rounded-full shadow-level-2 text-label-sm font-semibold flex items-center gap-2 z-10 animate-in fade-in">
              <Icon name="cable" className="text-[16px] animate-pulse" />
              <span>{connectSourceNodeId ? "Click target node to connect" : "Click source node to start connecting"}</span>
              <button
                onClick={() => {
                  setActiveTool("select");
                  setConnectSourceNodeId(null);
                }}
                className="ml-1 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container"
                title="Cancel (Esc)"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            </div>
          )}
          {activeTool === "add_node" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-primary/40 text-primary px-3.5 py-1.5 rounded-full shadow-level-2 text-label-sm font-semibold flex items-center gap-2 z-10 animate-in fade-in">
              <Icon name="add_box" className="text-[16px] animate-pulse" />
              <span>Click anywhere on canvas to place node</span>
              <button
                onClick={() => setActiveTool("select")}
                className="ml-1 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container"
                title="Cancel (Esc)"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            </div>
          )}

          {/* 4. FLOATING CANVAS CONTROLS */}
          {flowNodes.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-md border border-outline-variant/40 rounded-full shadow-level-3 flex items-center p-1.5 gap-1 z-10">
              {focusedNodeId && (
                <>
                  <button
                    onClick={() => setFocusedNodeId(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors text-label-sm font-semibold"
                    title="Exit Focus Mode"
                  >
                    <Icon name="center_focus_weak" className="text-[18px]" /> Exit Focus
                  </button>
                  <div className="w-px h-6 bg-outline-variant/50 mx-1" />
                </>
              )}
              <button
                onClick={() => setShowMiniMap(!showMiniMap)}
                className={`p-2 rounded-full transition-colors ${
                  showMiniMap ? "text-primary bg-primary/10" : "text-on-surface hover:bg-surface-container"
                }`}
                title="Toggle MiniMap"
              >
                <Icon name="map" className="text-[20px]" />
              </button>
              <div className="w-px h-6 bg-outline-variant/50 mx-1" />
              <button
                onClick={() => rfInstance?.fitView({ duration: 500, padding: 0.2 })}
                className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors"
                title="Fit View"
              >
                <Icon name="crop_free" className="text-[20px]" />
              </button>
              <button
                onClick={() => rfInstance?.zoomOut({ duration: 250 })}
                className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors"
                title="Zoom Out"
              >
                <Icon name="remove" className="text-[20px]" />
              </button>
              <button
                onClick={() => rfInstance?.zoomTo(1, { duration: 250 })}
                className="px-2.5 py-1 text-label-sm font-semibold text-on-surface hover:bg-surface-container rounded-full transition-colors min-w-[54px] text-center"
                title="Click to reset zoom to 100%"
              >
                {zoomLevel}%
              </button>
              <button
                onClick={() => rfInstance?.zoomIn({ duration: 250 })}
                className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors"
                title="Zoom In"
              >
                <Icon name="add" className="text-[20px]" />
              </button>
            </div>
          )}
        </main>


        {/* 5. RIGHT PANEL (AI Copilot / Node Inspector) */}
        {flowNodes.length > 0 && aiPanelState === "collapsed" && (
           <div className="absolute bottom-6 right-6 z-20">
             <button onClick={() => setAiPanelState("expanded")} className="bg-surface shadow-level-3 text-primary p-4 rounded-full flex items-center gap-2 hover:bg-surface-container-low transition-colors">
                <Icon name="auto_awesome" className="text-[24px] text-accent-violet" />
             </button>
           </div>
        )}

        {flowNodes.length > 0 && aiPanelState !== "collapsed" && (
          <aside className={`${aiPanelState === "full" ? "w-[600px] absolute right-0 bottom-0 top-0 shadow-2xl" : "w-[360px]"} bg-surface border-l border-outline-variant/30 flex flex-col z-20 shrink-0 transition-all duration-300`}>
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-outline-variant/30 bg-surface-container-lowest">
               <div className="flex items-center p-1 bg-surface-container-low rounded-lg gap-1">
                  <button onClick={() => setRightPanelMode("ai")} className={`px-3 py-1.5 rounded-md text-label-sm font-semibold transition-colors flex items-center gap-1 ${rightPanelMode === "ai" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                     <Icon name="auto_awesome" className="text-[16px]" /> AI Copilot
                  </button>
                  <button onClick={() => setRightPanelMode("inspector")} className={`px-3 py-1.5 rounded-md text-label-sm font-semibold transition-colors flex items-center gap-1 ${rightPanelMode === "inspector" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                     <Icon name="tune" className="text-[16px]" /> Inspector
                  </button>
                  <button onClick={() => setRightPanelMode("versions")} className={`px-3 py-1.5 rounded-md text-label-sm font-semibold transition-colors flex items-center gap-1 ${rightPanelMode === "versions" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                     <Icon name="history" className="text-[16px]" /> History
                  </button>
               </div>
               <div className="flex items-center gap-1">
                  <button onClick={() => setAiPanelState(aiPanelState === "full" ? "expanded" : "full")} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title={aiPanelState === "full" ? "Collapse to Sidebar" : "Expand to Full"}>
                     <Icon name={aiPanelState === "full" ? "close_fullscreen" : "open_in_full"} className="text-[18px]" />
                  </button>
                  <button onClick={() => setAiPanelState("collapsed")} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Hide AI Panel">
                     <Icon name="close" className="text-[18px]" />
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {rightPanelMode === "ai" ? (
                <div className="flex flex-col h-full bg-surface-container-lowest">
                  
                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center mt-10 p-4">
                        <Icon name="forum" className="text-[32px] text-primary/40 mb-2" />
                        <h4 className="text-label-lg font-semibold">Ready to transform your map?</h4>
                        <p className="text-body-sm text-on-surface-variant mt-2">I can organize ideas, expand branches, and summarize concepts.</p>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`p-3 rounded-2xl text-body-sm ${msg.role === "user" ? "bg-primary text-on-primary max-w-[85%] rounded-br-sm" : "bg-surface-container-low text-on-surface border border-outline-variant/30 max-w-[90%] rounded-bl-sm"}`}>
                          {msg.content}
                        </div>
                        {msg.mapChanges && !msg.mapChanges.isUndone && (
                           <div className="mt-2 bg-surface border border-outline-variant/40 rounded-xl p-2.5 flex items-center justify-between w-full max-w-[90%] shadow-sm">
                              <div className="flex items-center gap-3 text-label-xs font-semibold">
                                 {msg.mapChanges.nodesAdded > 0 && <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">+{msg.mapChanges.nodesAdded} nodes</span>}
                                 {msg.mapChanges.nodesDeleted > 0 && <span className="text-error bg-error/10 px-2 py-0.5 rounded">-{msg.mapChanges.nodesDeleted} nodes</span>}
                              </div>
                              {msg.mapChanges.snapshotId && (
                                <button onClick={() => handleUndoAIChat(msg.id, msg.mapChanges!.snapshotId!)} className="text-primary hover:bg-primary/10 px-3 py-1 rounded text-label-xs font-bold transition-colors">
                                   Undo
                                </button>
                              )}
                           </div>
                        )}
                        {msg.mapChanges?.isUndone && (
                           <div className="mt-1 text-label-xs text-outline-variant flex items-center gap-1">
                              <Icon name="undo" className="text-[12px]" /> AI changes reverted
                           </div>
                        )}
                      </div>
                    ))}
                    {isChatting && (
                      <div className="p-3 rounded-2xl bg-surface-container-low flex items-center gap-2 text-label-sm self-start text-on-surface-variant">
                        <Icon name="sync" className="animate-spin text-primary" /> <span>Analyzing and modifying map...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions (only if empty input) */}
                  {!chatInput && !isChatting && (
                    <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar snap-x">
                      {selectedNode ? (
                         <>
                            <button onClick={() => handleSendChat("Expand this branch in detail")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Expand branch</button>
                            <button onClick={() => handleSendChat("Simplify this branch")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Simplify</button>
                            <button onClick={() => handleSendChat("Find missing related concepts")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Find related</button>
                         </>
                      ) : (
                         <>
                            <button onClick={() => handleSendChat("Improve map structure")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface whitespace-nowrap">Improve structure</button>
                            <button onClick={() => handleSendChat("Analyze this map for coverage, duplication, structure, missing concepts, and complexity")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface whitespace-nowrap">Analyze map</button>
                            <button onClick={() => handleSendChat("Identify gaps and missing concepts")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface whitespace-nowrap">Identify gaps</button>
                            <button onClick={() => handleSendChat("Summarize entire map")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface whitespace-nowrap">Summarize map</button>
                            <button onClick={() => handleSendChat("Convert to study guide")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface whitespace-nowrap">Create study guide</button>
                            <button onClick={() => handleSendChat("Convert to project plan")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface whitespace-nowrap">Create project plan</button>
                         </>
                      )}
                    </div>
                  )}

                  {/* AI Composer */}
                  <div className="p-3 border-t border-outline-variant/20 bg-surface">
                    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-2 flex flex-col focus-within:border-primary focus-within:shadow-sm transition-all">
                      
                      {/* Context Chip */}
                      <div className="flex items-center gap-2 mb-2 px-2 pt-1 text-label-xs font-semibold text-primary">
                         <Icon name={selectedNode ? "my_location" : "public"} className="text-[14px]" />
                         <span className="truncate max-w-[250px]">
                            {selectedNode ? `Targeting: ${selectedNode.data.label}` : 'Scope: Entire Map'}
                         </span>
                      </div>
                      
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                        placeholder="Ask AI to modify..."
                        className="w-full bg-transparent resize-none text-body-md outline-none min-h-[44px] px-2 text-on-surface placeholder:text-outline-variant"
                        disabled={isChatting}
                      />
                      
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex gap-1 ml-1 text-outline">
                           <button className="p-1.5 hover:bg-surface-container rounded-lg transition-colors tooltip-trigger" title="Attach file (Coming soon)" disabled><Icon name="attach_file" className="text-[18px]" /></button>
                        </div>
                        <button
                          onClick={() => handleSendChat()}
                          disabled={!chatInput.trim() || isChatting}
                          className="p-1.5 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:bg-surface-container-high disabled:text-outline transition-colors"
                        >
                          <Icon name="arrow_upward" className="text-[20px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : rightPanelMode === "versions" ? (
                <div className="p-4 flex flex-col gap-4 h-full bg-surface-container-lowest">
                  <div className="flex items-center justify-between">
                    <h3 className="text-label-md font-bold text-on-surface">Version History</h3>
                    <button onClick={loadSnapshots} className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg" title="Refresh history">
                      <Icon name="refresh" className="text-[18px]" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 pb-4">
                    {isLoadingSnapshots ? (
                      <div className="flex items-center justify-center p-8"><Icon name="sync" className="animate-spin text-primary text-[24px]" /></div>
                    ) : snapshots.length === 0 ? (
                       <div className="text-center text-on-surface-variant mt-10">
                         <Icon name="history" className="text-[32px] opacity-40 mb-2" />
                         <p className="text-body-sm">No versions saved yet.</p>
                       </div>
                    ) : (
                       <div className="flex flex-col gap-3 relative pb-4">
                          <div className="absolute left-[11px] top-4 bottom-4 w-px bg-outline-variant/50 z-0"></div>
                          {snapshots.map((snap) => (
                             <div key={snap.id} className="relative z-10 flex gap-3">
                                <div className="mt-1 w-6 h-6 rounded-full bg-surface border-2 border-primary flex items-center justify-center shrink-0">
                                   <div className="w-2 h-2 rounded-full bg-primary"></div>
                                </div>
                                <div className="flex-1 bg-surface border border-outline-variant/30 rounded-xl p-3 shadow-sm hover:border-primary/50 transition-colors">
                                   <div className="flex justify-between items-start mb-1 gap-2">
                                      <p className="text-label-sm font-bold text-on-surface line-clamp-2">
                                         {snap.name || "Manual save"}
                                      </p>
                                      <span className="text-[10px] font-medium text-outline shrink-0 mt-0.5">
                                         {new Date(snap.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                   </div>
                                   <p className="text-[11px] text-on-surface-variant mb-3">
                                      {new Date(snap.created_at).toLocaleDateString()}
                                   </p>
                                   <button onClick={() => handleRestoreSnapshot(snap.id)} className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-label-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5">
                                      <Icon name="restore" className="text-[14px]" /> Restore Version
                                   </button>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Inspector View */
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
                         <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-3 block">AI Node Actions</label>
                         <div className="grid grid-cols-2 gap-2 mb-4">
                            <button onClick={() => handleExpandNode(selectedNode.id)} className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors">
                               <Icon name="account_tree" className="text-primary text-[20px]" />
                               <span className="font-semibold text-on-surface text-label-sm mt-1">Expand</span>
                            </button>
                            <button onClick={() => handleSummarizeNode(selectedNode.id)} className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors">
                               <Icon name="short_text" className="text-primary text-[20px]" />
                               <span className="font-semibold text-on-surface text-label-sm mt-1">Summarize</span>
                            </button>
                            <button onClick={() => handleFindConnections(selectedNode.id)} className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors">
                               <Icon name="hub" className="text-primary text-[20px]" />
                               <span className="font-semibold text-on-surface text-label-sm mt-1">Connections</span>
                            </button>
                            <button onClick={() => setConfirmAction({ type: 'regenerate', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })} className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors">
                               <Icon name="auto_awesome" className="text-primary text-[20px]" />
                               <span className="font-semibold text-on-surface text-label-sm mt-1">Regenerate</span>
                            </button>
                            <button onClick={() => {
                               setFocusedNodeId(selectedNode.id);
                               if (rfInstance) {
                                 const targetNode = flowNodes.find((n) => n.id === selectedNode.id);
                                 if (targetNode) {
                                   rfInstance.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 600 });
                                 }
                               }
                            }} className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors">
                               <Icon name="center_focus_strong" className="text-primary text-[20px]" />
                               <span className="font-semibold text-on-surface text-label-sm mt-1">Focus Branch</span>
                            </button>
                         </div>
                         <div className="h-px bg-outline-variant/30 mb-4" />
                         <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-3 block">Metadata (Coming Soon)</label>
                         <div className="flex gap-2 opacity-50 pointer-events-none mb-4">
                           <span className="px-2 py-1 bg-surface-container rounded text-[10px] uppercase font-bold text-on-surface-variant flex items-center gap-1"><Icon name="sell" className="text-[12px]"/> Tags</span>
                           <span className="px-2 py-1 bg-surface-container rounded text-[10px] uppercase font-bold text-on-surface-variant flex items-center gap-1"><Icon name="link" className="text-[12px]"/> Source</span>
                         </div>
                         <div className="h-px bg-outline-variant/30 mb-4" />
                         <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-3 block">Danger Zone</label>
                         <button onClick={() => setConfirmAction({ type: 'delete', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })} className="flex items-center gap-3 w-full p-2 hover:bg-error-container/30 rounded-lg text-left text-body-sm text-error transition-colors">
                            <div className="w-8 h-8 rounded bg-error/10 flex items-center justify-center text-error"><Icon name="delete" /></div>
                            <div><div className="font-semibold">Delete Node</div><div className="opacity-70 text-[11px]">Remove node & children</div></div>
                         </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        mindMapTitle={mindMapTitle}
        remoteUsers={remoteUsers}
      />

      
      {isKeyboardHelpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl shadow-level-3 w-full max-w-[32rem] p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2"><Icon name="keyboard" /> Keyboard Shortcuts</h2>
              <button onClick={() => setIsKeyboardHelpOpen(false)} className="p-1.5 hover:bg-surface-container rounded-lg text-outline"><Icon name="close" /></button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm text-on-surface-variant mb-6">
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Delete Node / Edge</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Del / Backspace</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Edit Node</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Enter / Double Click</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Cancel Edit</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Escape</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Undo</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Ctrl + Z</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Redo</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Ctrl + Y / Shift+Ctrl+Z</span></div>
              <div className="flex justify-between border-b border-outline-variant/20 py-2"><span>Pan Canvas</span><span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">Space + Drag</span></div>
            </div>
            <button onClick={() => setIsKeyboardHelpOpen(false)} className="self-end px-4 py-2 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90">Got it</button>
          </div>
        </div>
      )}

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

      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-background/80 backdrop-blur-sm pt-[15vh] p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsCommandPaletteOpen(false); }}>
          <div className="bg-surface border border-outline-variant/30 rounded-2xl shadow-level-3 w-full max-w-[36rem] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-outline-variant/30">
              <Icon name="search" className="text-[24px] text-outline" />
              <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes... (e.g. API)"
                className="flex-1 bg-transparent border-none outline-none text-body-lg text-on-surface placeholder:text-outline-variant"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCommandPaletteOpen(false);
                }}
              />
              <button onClick={() => setIsCommandPaletteOpen(false)} className="text-outline-variant hover:text-on-surface text-label-sm font-semibold bg-surface-container px-2 py-1 rounded">ESC</button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {flowNodes.filter(n => (n.data.label as string).toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 15).map(node => (
                <button
                  key={node.id}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    if (rfInstance) {
                      rfInstance.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 600 });
                    }
                    setIsCommandPaletteOpen(false);
                    setSearchQuery("");
                  }}
                  className="w-full text-left p-3 hover:bg-surface-container rounded-xl flex flex-col gap-1 transition-colors"
                >
                  <span className="text-body-md font-semibold text-on-surface">{node.data.label as string}</span>
                </button>
              ))}
              {flowNodes.filter(n => (n.data.label as string).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="p-4 text-center text-on-surface-variant text-body-sm">No results found.</div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
