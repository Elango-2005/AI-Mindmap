import { createFileRoute, Link } from "@tanstack/react-router";







import { useEffect, useState, useMemo, useRef } from "react";







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















import { generateAIMindMap, getMindMap, chatMindMap, updateMindMap, createSnapshot, restoreSnapshot, getSnapshots, type Snapshot, type GroundingSource } from "@/api/mindmaps";







import { KnowledgeBaseModal } from "@/components/KnowledgeBaseModal";







import { listProjectDocuments, type ProjectDocument } from "@/api/documents";







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







import { THEME_PALETTES, type ThemeKey, applyColorsToGraph, normalizeThemeKey } from "@/lib/graphColoring";







import { buildSemanticGraph, toReactFlowGraph, resolveNodeVisualConfig } from "@/lib/semanticAdapter";







import type { SemanticNodeType, SemanticNode, NodeStyleOverride } from "@/types/semanticGraph";







import { applyLayout, type LayoutDirection } from "@/lib/layoutAlgorithms";







import { OutlinePanel } from "@/components/OutlinePanel";







import { ResizablePanel } from "@/components/ResizablePanel";







import { LeftToolPanel, type LeftToolView } from "@/components/LeftToolPanel";







import { ShareModal } from "@/components/ShareModal";







import { NotificationBell } from "@/components/NotificationBell";







import { MindMeisterModal } from "@/components/MindMeisterModal";







import { CoggleModal } from "@/components/CoggleModal";







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







  hierarchy: EditableEdge,







  relationship: EditableEdge,







  ai_suggestion: EditableEdge,







};















function Workspace() {







  const { mindMapId } = Route.useParams();







  const { topic: initialTopic } = Route.useSearch() as any;















  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);







  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);

  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);















  const {







    isConnected,







    remoteUsers,







    broadcastNodesChange,







    broadcastEdgesChange,







    broadcastCursorMove,







    broadcastNodeUpdate,







    broadcastNodeCreate,







    broadcastNodeDelete,







    broadcastEdgeCreate,







    broadcastEdgeDelete,







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







    isError?: boolean;







    failedPrompt?: string;







    sources?: GroundingSource[];







  }[]>([]);







  const messagesEndRef = useRef<HTMLDivElement>(null);







  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);















  // Knowledge Base & RAG state







  const [projectId, setProjectId] = useState<string | null>(null);







  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);







  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);















  const fetchProjectDocuments = async (pId?: string) => {







    const idToUse = pId || projectId;







    if (!idToUse) return;







    try {







      const docs = await listProjectDocuments(idToUse);







      setProjectDocuments(docs);







    } catch (e) {







      console.error("Failed to load project documents", e);







    }







  };















  useEffect(() => {







    if (chatMessages.length > 0 || isChatting) {







      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });







    }







  }, [chatMessages, isChatting]);















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







  const [currentLayout, setCurrentLayout] = useState<LayoutDirection>("radial");







  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("modern");







  const [isOutlineOpen, setIsOutlineOpen] = useState(false);







  const [showMiniMap, setShowMiniMap] = useState(true);







  const [showGrid, setShowGrid] = useState(true);







  const [zoomLevel, setZoomLevel] = useState(100);







  const [activeTool, setActiveTool] = useState<"select" | "add_node" | "connect">("select");







  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);







  const [isFullscreen, setIsFullscreen] = useState(false);















  const [isShareModalOpen, setIsShareModalOpen] = useState(false);







  const [isMindMeisterModalOpen, setIsMindMeisterModalOpen] = useState(false);







  const [isCoggleModalOpen, setIsCoggleModalOpen] = useState(false);







  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);







  







  // Right panel mode







  const [rightPanelMode, setRightPanelMode] = useState<"ai" | "inspector" | "versions">("ai");















  // Resizable Right AI Assistant Panel state (persistent)







  const [aiPanelWidth, setAiPanelWidth] = useState<number>(() => {







    if (typeof window === "undefined") return 380;







    const saved = localStorage.getItem("mindvault_ai_panel_width");







    const num = saved ? parseInt(saved, 10) : 380;







    return isNaN(num) ? 380 : Math.max(280, Math.min(600, num));







  });















  const [isAiPanelCollapsed, setIsAiPanelCollapsed] = useState<boolean>(() => {







    if (typeof window === "undefined") return false;







    const saved = localStorage.getItem("mindvault_ai_panel_collapsed");







    return saved === "true";







  });















  // Resizable Left Tool Panel state (persistent)







  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {







    if (typeof window === "undefined") return 300;







    const saved = localStorage.getItem("mindvault_left_panel_width");







    const num = saved ? parseInt(saved, 10) : 300;







    return isNaN(num) ? 300 : Math.max(220, Math.min(500, num));







  });















  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(() => {







    if (typeof window === "undefined") return true;







    const saved = localStorage.getItem("mindvault_left_panel_collapsed");







    return saved !== null ? saved === "true" : true;







  });















  const [activeLeftView, setActiveLeftView] = useState<LeftToolView>(() => {







    if (typeof window === "undefined") return "outline";







    const saved = localStorage.getItem("mindvault_active_tool");







    if (saved === "outline" || saved === "add_node" || saved === "layout" || saved === "view") {







      return saved;







    }







    return "outline";







  });















  const handleAiPanelResize = (newWidth: number) => {







    setAiPanelWidth(newWidth);







    if (typeof window !== "undefined") {







      localStorage.setItem("mindvault_ai_panel_width", String(newWidth));







    }







  };















  const handleToggleAiPanel = (open?: boolean) => {







    setIsAiPanelCollapsed((prev) => {







      const next = open !== undefined ? !open : !prev;







      if (typeof window !== "undefined") {







        localStorage.setItem("mindvault_ai_panel_collapsed", String(next));







      }







      return next;







    });







  };















  const handleLeftPanelResize = (newWidth: number) => {







    setLeftPanelWidth(newWidth);







    if (typeof window !== "undefined") {







      localStorage.setItem("mindvault_left_panel_width", String(newWidth));







    }







  };















  const handleToggleLeftPanel = (open?: boolean) => {







    setIsLeftPanelCollapsed((prev) => {







      const next = open !== undefined ? !open : !prev;







      if (typeof window !== "undefined") {







        localStorage.setItem("mindvault_left_panel_collapsed", String(next));







      }







      return next;







    });







  };















  const handleSelectLeftTool = (view: LeftToolView) => {







    if (!isLeftPanelCollapsed && activeLeftView === view) {







      handleToggleLeftPanel(false);







    } else {







      setActiveLeftView(view);







      setIsLeftPanelCollapsed(false);







      if (typeof window !== "undefined") {







        localStorage.setItem("mindvault_left_panel_collapsed", "false");







        localStorage.setItem("mindvault_active_tool", view);







      }







    }







  };















  // Restore persisted panel dimensions and collapse state on client mount (SSR hydration safe)







  useEffect(() => {







    if (typeof window === "undefined") return;







    try {







      const savedAiWidth = localStorage.getItem("mindvault_ai_panel_width");







      if (savedAiWidth) {







        const num = parseInt(savedAiWidth, 10);







        if (!isNaN(num)) setAiPanelWidth(Math.max(280, Math.min(600, num)));







      }







      const savedAiCollapsed = localStorage.getItem("mindvault_ai_panel_collapsed");







      if (savedAiCollapsed !== null) {







        setIsAiPanelCollapsed(savedAiCollapsed === "true");







      }















      const savedLeftWidth = localStorage.getItem("mindvault_left_panel_width");







      if (savedLeftWidth) {







        const num = parseInt(savedLeftWidth, 10);







        if (!isNaN(num)) setLeftPanelWidth(Math.max(220, Math.min(500, num)));







      }







      const savedLeftCollapsed = localStorage.getItem("mindvault_left_panel_collapsed");







      if (savedLeftCollapsed !== null) {







        setIsLeftPanelCollapsed(savedLeftCollapsed === "true");







      }















      const savedTool = localStorage.getItem("mindvault_active_tool");







      if (savedTool === "outline" || savedTool === "add_node" || savedTool === "layout" || savedTool === "view") {







        setActiveLeftView(savedTool as LeftToolView);







      }







    } catch (e) {







      console.warn("Failed to load panel state from localStorage", e);







    }







  }, []);















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

  const { hiddenDescendantsSet, directChildrenCountMap } = useMemo(() => {
    const childrenMap = new Map<string, string[]>();
    for (const edge of flowEdges) {
      if (!childrenMap.has(edge.source)) {
        childrenMap.set(edge.source, []);
      }
      childrenMap.get(edge.source)!.push(edge.target);
    }

    const directChildrenCountMap = new Map<string, number>();
    for (const [parentId, children] of childrenMap.entries()) {
      directChildrenCountMap.set(parentId, children.length);
    }

    const hiddenDescendantsSet = new Set<string>();
    for (const collapsedId of collapsedNodeIds) {
      const queue = [...(childrenMap.get(collapsedId) || [])];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (!hiddenDescendantsSet.has(curr)) {
          hiddenDescendantsSet.add(curr);
          queue.push(...(childrenMap.get(curr) || []));
        }
      }
    }

    return { hiddenDescendantsSet, directChildrenCountMap };
  }, [flowEdges, collapsedNodeIds]);

  const visibleNodes = useMemo(() => {
    return flowNodes.map((n) => {
      const isHiddenByFocus = descendantsSet ? !descendantsSet.has(n.id) : false;
      const isHiddenByCollapse = hiddenDescendantsSet.has(n.id);
      const isHidden = isHiddenByFocus || isHiddenByCollapse;

      const childrenCount = directChildrenCountMap.get(n.id) || 0;
      const isCollapsed = collapsedNodeIds.has(n.id);

      return {
        ...n,
        hidden: isHidden,
        data: {
          ...n.data,
          hasChildren: childrenCount > 0,
          childrenCount,
          isCollapsed,
          onToggleCollapse: handleToggleCollapse,
        },
      };
    });
  }, [flowNodes, descendantsSet, hiddenDescendantsSet, directChildrenCountMap, collapsedNodeIds, handleToggleCollapse]);

  const visibleEdges = useMemo(() => {
    return flowEdges.map((e) => {
      const isHiddenByFocus = descendantsSet
        ? !descendantsSet.has(e.source) || !descendantsSet.has(e.target)
        : false;
      const isHiddenByCollapse =
        hiddenDescendantsSet.has(e.target) ||
        collapsedNodeIds.has(e.source) ||
        hiddenDescendantsSet.has(e.source);
      return {
        ...e,
        hidden: isHiddenByFocus || isHiddenByCollapse,
      };
    });
  }, [flowEdges, descendantsSet, hiddenDescendantsSet, collapsedNodeIds]);















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







      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {







        e.preventDefault();







        handleToggleAiPanel();







      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "b") {







        e.preventDefault();







        handleToggleLeftPanel();







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







  }, [historyIndex, history, activeTool, isAiPanelCollapsed, isLeftPanelCollapsed]);















  const handleAddChildNode = async () => {







    if (!mindMapId) return;







    const parentId = selectedNodeId || flowNodes[0]?.id;







    if (!parentId) {







      handleAddRootNode();







      return;







    }







    const parentNode = flowNodes.find((n) => n.id === parentId);







    const parentPos = parentNode ? parentNode.position : { x: 200, y: 200 };







    const newDepth = ((parentNode?.data?.depth as number) || 1) + 1;







    const semanticType: SemanticNodeType = newDepth === 1 ? "topic" : "concept";







    const branchId = (parentNode?.data?.branchId as string) || (newDepth === 1 ? undefined : parentId);















    try {







      const newNode = await createNode(mindMapId, {







        label: "New Idea",







        type: semanticType,







        position_x: parentPos.x + 220,







        position_y: parentPos.y + 40,







      });







      const newEdge = await createEdge(mindMapId, {







        source: parentId,







        target: newNode.id,







      });















      const visualConfig = resolveNodeVisualConfig(







        {







          id: newNode.id,







          mindMapId,







          title: newNode.label,







          type: semanticType,







          depth: newDepth,







          parentId,







          branchId: branchId || newNode.id,







          position: { x: newNode.position_x, y: newNode.position_y },







          importanceScore: newNode.importance_score ?? 1.0,







        },







        currentTheme,







        true







      );















      const rfNode: FlowNode = {







        id: newNode.id,







        type: "editable",







        position: { x: newNode.position_x, y: newNode.position_y },







        selected: true,







        data: {







          label: newNode.label,







          semanticType,







          visualConfig,







          mindMapId,







          importance_score: newNode.importance_score ?? 1.0,







          depth: newDepth,







          parentId,







          branchId: branchId || newNode.id,







          theme: {







            bg: visualConfig.bgClasses,







            border: visualConfig.borderClasses,







            text: visualConfig.textColorClasses,







            stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",







          },







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







        source: parentId,







        target: newNode.id,







        type: "editable",







      };







      const nextNodes = [...flowNodes.map((n) => ({ ...n, selected: false })), rfNode];







      const nextEdges = [...flowEdges, rfEdge];







      setFlowNodes(nextNodes);







      setFlowEdges(nextEdges);







      setSelectedNodeId(newNode.id);







      pushToHistory(nextNodes, nextEdges);















      broadcastNodeCreate({







        id: newNode.id,







        label: newNode.label,







        type: semanticType,







        position_x: newNode.position_x,







        position_y: newNode.position_y,







        importance_score: newNode.importance_score ?? 1.0,







      });







      broadcastEdgeCreate({







        id: newEdge.id,







        source: parentId,







        target: newNode.id,







        type: "editable",







      });















      toast.success("Child node added");







    } catch (err) {







      console.error(err);







      toast.error("Failed to add child node");







    }







  };















  const handleAddSiblingNode = async () => {







    if (!mindMapId) return;







    if (!selectedNodeId) {







      handleAddChildNode();







      return;







    }







    const incomingEdge = flowEdges.find((e) => e.target === selectedNodeId);







    const parentId = incomingEdge ? incomingEdge.source : null;







    const currentNode = flowNodes.find((n) => n.id === selectedNodeId);







    const currentPos = currentNode ? currentNode.position : { x: 200, y: 200 };







    const curDepth = ((currentNode?.data?.depth as number) || 1);







    const semanticType: SemanticNodeType = (currentNode?.data?.semanticType as SemanticNodeType) || (curDepth === 1 ? "topic" : "concept");







    const branchId = (currentNode?.data?.branchId as string) || (parentId ? parentId : undefined);















    try {







      const newNode = await createNode(mindMapId, {







        label: "New Sibling",







        type: semanticType,







        position_x: currentPos.x,







        position_y: currentPos.y + 90,







      });















      let nextEdges = [...flowEdges];







      let newEdge: any = null;







      if (parentId) {







        newEdge = await createEdge(mindMapId, {







          source: parentId,







          target: newNode.id,







        });







        nextEdges.push({







          id: newEdge.id,







          source: parentId,







          target: newNode.id,







          type: "editable",







        });







      }















      const visualConfig = resolveNodeVisualConfig(







        {







          id: newNode.id,







          mindMapId,







          title: newNode.label,







          type: semanticType,







          depth: curDepth,







          parentId: parentId || undefined,







          branchId: branchId || newNode.id,







          position: { x: newNode.position_x, y: newNode.position_y },







          importanceScore: newNode.importance_score ?? 1.0,







        },







        currentTheme,







        true







      );















      const rfNode: FlowNode = {







        id: newNode.id,







        type: "editable",







        position: { x: newNode.position_x, y: newNode.position_y },







        selected: true,







        data: {







          label: newNode.label,







          semanticType,







          visualConfig,







          mindMapId,







          depth: curDepth,







          parentId: parentId || undefined,







          branchId: branchId || newNode.id,







          theme: {







            bg: visualConfig.bgClasses,







            border: visualConfig.borderClasses,







            text: visualConfig.textColorClasses,







            stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",







          },







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







      setFlowEdges(nextEdges);







      setSelectedNodeId(newNode.id);







      pushToHistory(nextNodes, nextEdges);















      broadcastNodeCreate({







        id: newNode.id,







        label: newNode.label,







        type: semanticType,







        position_x: newNode.position_x,







        position_y: newNode.position_y,







        importance_score: newNode.importance_score ?? 1.0,







      });







      if (parentId && newEdge) {







        broadcastEdgeCreate({







          id: newEdge.id,







          source: parentId,







          target: newNode.id,







          type: "editable",







        });







      }















      toast.success("Sibling node added");







    } catch (err) {







      console.error(err);







      toast.error("Failed to add sibling node");







    }







  };















  const handleAddRootNode = async () => {







    if (!mindMapId) return;







    try {







      const centerPos = rfInstance







        ? rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })







        : { x: 250, y: 250 };







      const semanticType: SemanticNodeType = "topic";







      const newNode = await createNode(mindMapId, {







        label: "Floating Topic",







        type: semanticType,







        position_x: centerPos.x,







        position_y: centerPos.y,







      });















      const visualConfig = resolveNodeVisualConfig(







        {







          id: newNode.id,







          mindMapId,







          title: newNode.label,







          type: semanticType,







          depth: 1,







          branchId: newNode.id,







          position: { x: newNode.position_x, y: newNode.position_y },







          importanceScore: newNode.importance_score ?? 1.0,







        },







        currentTheme,







        true







      );















      const rfNode: FlowNode = {







        id: newNode.id,







        type: "editable",







        position: { x: newNode.position_x, y: newNode.position_y },







        selected: true,







        data: {







          label: newNode.label,







          semanticType,







          visualConfig,







          mindMapId,







          depth: 1,







          branchId: newNode.id,







          theme: {







            bg: visualConfig.bgClasses,







            border: visualConfig.borderClasses,







            text: visualConfig.textColorClasses,







            stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",







          },







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















      broadcastNodeCreate({







        id: newNode.id,







        label: newNode.label,







        type: semanticType,







        position_x: newNode.position_x,







        position_y: newNode.position_y,







        importance_score: newNode.importance_score ?? 1.0,







      });















      toast.success("Floating topic created");







    } catch (err) {







      console.error(err);







      toast.error("Failed to create floating topic");







    }







  };















  const handleAddTemplateNode = async (label: string, category?: string) => {







    if (!mindMapId) return;







    if (selectedNodeId) {







      const parentNode = flowNodes.find((n) => n.id === selectedNodeId);







      const parentPos = parentNode ? parentNode.position : { x: 200, y: 200 };















      let semanticType: SemanticNodeType = "concept";







      const targetCat = (category || label).toLowerCase();







      if (targetCat.includes("action") || targetCat.includes("task") || targetCat.includes("todo")) {







        semanticType = "task";







      } else if (







        targetCat.includes("question") ||







        targetCat.includes("risk") ||







        targetCat.includes("alert") ||







        targetCat.includes("insight")







      ) {







        semanticType = "insight";







      } else if (







        targetCat.includes("idea") ||







        targetCat.includes("goal") ||







        targetCat.includes("note")







      ) {







        semanticType = "concept";







      }















      try {







        const newNode = await createNode(mindMapId, {







          label,







          type: semanticType,







          position_x: parentPos.x + 220,







          position_y: parentPos.y + 40,







        });







        const newEdge = await createEdge(mindMapId, {







          source: selectedNodeId,







          target: newNode.id,







        });















        const newDepth = ((parentNode?.data?.depth as number) || 1) + 1;







        const visualConfig = resolveNodeVisualConfig(







          {







            id: newNode.id,







            mindMapId,







            title: newNode.label,







            type: semanticType,







            depth: newDepth,







            parentId: selectedNodeId,







            branchId: (parentNode?.data?.branchId as string) || selectedNodeId,







            position: { x: newNode.position_x, y: newNode.position_y },







            importanceScore: newNode.importance_score ?? 1.0,







          },







          currentTheme,







          true







        );















        const rfNode: FlowNode = {







          id: newNode.id,







          type: "editable",







          position: { x: newNode.position_x, y: newNode.position_y },







          selected: true,







          data: {







            label: newNode.label,







            semanticType,







            visualConfig,







            mindMapId,







            depth: newDepth,







            branchId: (parentNode?.data?.branchId as string) || selectedNodeId,







            parentId: selectedNodeId,







            theme: {







              bg: visualConfig.bgClasses,







              border: visualConfig.borderClasses,







              text: visualConfig.textColorClasses,







              stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",







            },







            isNew: true,







            onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),







            onDelete: (id?: string) =>







              setConfirmAction({ type: "delete", nodeId: id || newNode.id, nodeLabel: newNode.label }),







            onRegenerate: () =>







              setConfirmAction({ type: "regenerate", nodeId: newNode.id, nodeLabel: newNode.label }),







          },







        };







        const nextNodes = [...flowNodes.map((n) => ({ ...n, selected: false })), rfNode];







        const nextEdges = [







          ...flowEdges,







          { id: newEdge.id, source: selectedNodeId, target: newNode.id, type: "editable" },







        ];







        setFlowNodes(nextNodes);







        setFlowEdges(nextEdges);







        setSelectedNodeId(newNode.id);







        pushToHistory(nextNodes, nextEdges);















        broadcastNodeCreate({







          id: newNode.id,







          label: newNode.label,







          type: semanticType,







          position_x: newNode.position_x,







          position_y: newNode.position_y,







          importance_score: newNode.importance_score ?? 1.0,







        });







        broadcastEdgeCreate({







          id: newEdge.id,







          source: selectedNodeId,







          target: newNode.id,







          type: "editable",







        });















        toast.success(`Added ${label}`);







      } catch (err) {







        console.error(err);







        toast.error("Failed to add template node");







      }







    } else {







      handleAddRootNode();







    }







  };















  const handleToolbarAddNode = async () => {







    if (!mindMapId) return;







    if (selectedNodeId) {







      const parentNode = flowNodes.find((n) => n.id === selectedNodeId);







      const parentPos = parentNode ? parentNode.position : { x: 200, y: 200 };







      const newDepth = ((parentNode?.data?.depth as number) || 1) + 1;







      const semanticType: SemanticNodeType = newDepth === 1 ? "topic" : "concept";







      const branchId = (parentNode?.data?.branchId as string) || (newDepth === 1 ? undefined : selectedNodeId);















      try {







        const newNode = await createNode(mindMapId, {







          label: "New Node",







          type: semanticType,







          position_x: parentPos.x + 220,







          position_y: parentPos.y + 40,







        });







        const newEdge = await createEdge(mindMapId, {







          source: selectedNodeId,







          target: newNode.id,







        });















        const visualConfig = resolveNodeVisualConfig(







          {







            id: newNode.id,







            mindMapId,







            title: newNode.label,







            type: semanticType,







            depth: newDepth,







            parentId: selectedNodeId,







            branchId: branchId || newNode.id,







            position: { x: newNode.position_x, y: newNode.position_y },







            importanceScore: newNode.importance_score ?? 1.0,







          },







          currentTheme,







          true







        );















        const rfNode: FlowNode = {







          id: newNode.id,







          type: "editable",







          position: { x: newNode.position_x, y: newNode.position_y },







          selected: true,







          data: {







            label: newNode.label,







            semanticType,







            visualConfig,







            mindMapId,







            depth: newDepth,







            parentId: selectedNodeId,







            branchId: branchId || newNode.id,







            theme: {







              bg: visualConfig.bgClasses,







              border: visualConfig.borderClasses,







              text: visualConfig.textColorClasses,







              stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",







            },







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















        broadcastNodeCreate({







          id: newNode.id,







          label: newNode.label,







          type: semanticType,







          position_x: newNode.position_x,







          position_y: newNode.position_y,







          importance_score: newNode.importance_score ?? 1.0,







        });







        broadcastEdgeCreate({







          id: newEdge.id,







          source: selectedNodeId,







          target: newNode.id,







          type: "editable",







        });















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







      const semanticType: SemanticNodeType = "topic";







      try {







        const newNode = await createNode(mindMapId, {







          label: "New Node",







          type: semanticType,







          position_x: Math.round(position.x),







          position_y: Math.round(position.y),







        });















        const visualConfig = resolveNodeVisualConfig(







          {







            id: newNode.id,







            mindMapId,







            title: newNode.label,







            type: semanticType,







            depth: 1,







            branchId: newNode.id,







            position: { x: newNode.position_x, y: newNode.position_y },







            importanceScore: newNode.importance_score ?? 1.0,







          },







          currentTheme,







          true







        );















        const rfNode: FlowNode = {







          id: newNode.id,







          type: "editable",







          position: { x: newNode.position_x, y: newNode.position_y },







          selected: true,







          data: {







            label: newNode.label,







            semanticType,







            visualConfig,







            mindMapId,







            depth: 1,







            branchId: newNode.id,







            theme: {







              bg: visualConfig.bgClasses,







              border: visualConfig.borderClasses,







              text: visualConfig.textColorClasses,







              stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",







            },







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















        broadcastNodeCreate({







          id: newNode.id,







          label: newNode.label,







          type: semanticType,







          position_x: newNode.position_x,







          position_y: newNode.position_y,







          importance_score: newNode.importance_score ?? 1.0,







        });















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







        toDelete.forEach(id => broadcastNodeDelete(id));







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
        localStorage.setItem(`mindmap_force_layout_${mindMapId}`, 'true');
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

    if (mindMapId) {

      localStorage.setItem(`mindmap_layout_${mindMapId}`, dir);

    }

    const result = applyLayout(flowNodes, flowEdges, dir);







    pushToHistory(result.nodes, result.edges);







    setFlowNodes(result.nodes);







    setFlowEdges(result.edges);







    setTimeout(() => rfInstance?.fitView({ duration: 500, padding: 0.2, minZoom: 0.2, maxZoom: 1.5 }), 50);







    toast.success(`Applied ${dir.charAt(0).toUpperCase() + dir.slice(1)} layout`);







    try {







      await Promise.all(result.nodes.map((n) => updateNode(n.id, { position_x: n.position.x, position_y: n.position.y })));







    } catch (err) {







      console.warn("Could not persist all node positions:", err);







    }







  };















    const handleSelectTheme = (themeKey: ThemeKey) => {



    const normalized = normalizeThemeKey(themeKey);



    setCurrentTheme(normalized);







    let savedOverrides: Record<string, NodeStyleOverride> = {};



    if (mindMapId) {



      try {



        const raw = localStorage.getItem(`mindmap_node_overrides_${mindMapId}`);



        if (raw) savedOverrides = JSON.parse(raw);



      } catch (e) {



        console.error("Failed to parse node overrides:", e);



      }



    }







    const semanticGraph = buildSemanticGraph(flowNodes, flowEdges);



    const { nodes: coloredNodes, edges: coloredEdges } = toReactFlowGraph(



      semanticGraph,



      normalized,



      (node: SemanticNode) => ({



        onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),



        onBroadcastUpdate: (id: string, fields: any) => broadcastNodeUpdate(id, fields),



        onBroadcastCreate: (nodeItem: any, edgeItem?: any) => {



          broadcastNodeCreate(nodeItem);



          if (edgeItem) broadcastEdgeCreate(edgeItem);



        },



        onDelete: (id?: string) => {



          setConfirmAction({ type: "delete", nodeId: id || node.id, nodeLabel: node.title });



        },



        onRegenerate: () => setConfirmAction({ type: "regenerate", nodeId: node.id, nodeLabel: node.title }),



        onOpenInspector: (id: string) => {



          setSelectedNodeId(id);



          setIsRightPanelOpen(true);



          setRightPanelMode("inspector");



        },



      }),



      savedOverrides



    );







    pushToHistory(coloredNodes, coloredEdges);



    setFlowNodes(coloredNodes);



    setFlowEdges(coloredEdges);



    if (mindMapId) localStorage.setItem(`mindmap_theme_${mindMapId}`, normalized);



    toast.success(`Theme updated to ${THEME_PALETTES[normalized].name}`);



  };







  const handleUpdateNodeOverride = (nodeId: string, partialOverride: Partial<NodeStyleOverride>) => {



    if (!mindMapId) return;



    let savedOverrides: Record<string, NodeStyleOverride> = {};



    try {



      const raw = localStorage.getItem(`mindmap_node_overrides_${mindMapId}`);



      if (raw) savedOverrides = JSON.parse(raw);



    } catch (e) {



      console.error("Failed to parse overrides", e);



    }







    const currentOverride = savedOverrides[nodeId] || {};



    const updatedOverride: NodeStyleOverride = {



      ...currentOverride,



      ...partialOverride,



    };







    // Clean up "auto" or default values so only explicit user overrides are persisted



    if (updatedOverride.shape === "auto") delete updatedOverride.shape;



    if (updatedOverride.color === "auto" || updatedOverride.color === "branch") delete updatedOverride.color;



    if (updatedOverride.icon === "auto" || updatedOverride.icon === "none") delete updatedOverride.icon;



    if (updatedOverride.style === "auto") delete updatedOverride.style;







    if (Object.keys(updatedOverride).length === 0) {



      delete savedOverrides[nodeId];



    } else {



      savedOverrides[nodeId] = updatedOverride;



    }



    localStorage.setItem(`mindmap_node_overrides_${mindMapId}`, JSON.stringify(savedOverrides));







    const theme = THEME_PALETTES[currentTheme] || THEME_PALETTES.modern;



    setFlowNodes((nds) =>



      nds.map((n) => {



        if (n.id !== nodeId) return n;



        const semNode: SemanticNode = {



          id: n.id,



          mindMapId: mindMapId,



          title: (n.data.label as string) || "",



          type: n.data.semanticType || "concept",



          depth: n.data.depth ?? 1,



          parentId: n.data.parentId ?? null,



          branchId: n.data.branchId ?? null,



          importanceScore: n.data.importanceScore ?? 0.5,



          position: n.position,



          styleOverride: Object.keys(updatedOverride).length > 0 ? updatedOverride : undefined,



        };



        const visualConfig = resolveNodeVisualConfig(



          semNode,



          theme,



          n.selected || false,



          Object.keys(updatedOverride).length > 0 ? updatedOverride : undefined



        );



        return {



          ...n,



          data: {



            ...n.data,



            styleOverride: Object.keys(updatedOverride).length > 0 ? updatedOverride : undefined,



            visualConfig,



            theme: {



              bg: visualConfig.bgClasses,



              border: visualConfig.borderClasses,



              text: visualConfig.textColorClasses,



              stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",



            },



          },



        };



      })



    );







    broadcastNodeUpdate(nodeId, { styleOverride: Object.keys(updatedOverride).length > 0 ? updatedOverride : null });



    toast.success("Node style updated");



  };







  const handleResetNodeOverride = (nodeId: string) => {



    if (!mindMapId) return;



    let savedOverrides: Record<string, NodeStyleOverride> = {};



    try {



      const raw = localStorage.getItem(`mindmap_node_overrides_${mindMapId}`);



      if (raw) savedOverrides = JSON.parse(raw);



    } catch (e) {



      console.error("Failed to parse overrides", e);



    }







    delete savedOverrides[nodeId];



    localStorage.setItem(`mindmap_node_overrides_${mindMapId}`, JSON.stringify(savedOverrides));







    const theme = THEME_PALETTES[currentTheme] || THEME_PALETTES.modern;



    setFlowNodes((nds) =>



      nds.map((n) => {



        if (n.id !== nodeId) return n;



        const semNode: SemanticNode = {



          id: n.id,



          mindMapId: mindMapId,



          title: (n.data.label as string) || "",



          type: n.data.semanticType || "concept",



          depth: n.data.depth ?? 1,



          parentId: n.data.parentId ?? null,



          branchId: n.data.branchId ?? null,



          importanceScore: n.data.importanceScore ?? 0.5,



          position: n.position,



          styleOverride: undefined,



        };



        const visualConfig = resolveNodeVisualConfig(semNode, theme, n.selected || false, undefined);



        const nextData = { ...n.data };



        delete nextData.styleOverride;



        return {



          ...n,



          data: {



            ...nextData,



            visualConfig,



            theme: {



              bg: visualConfig.bgClasses,



              border: visualConfig.borderClasses,



              text: visualConfig.textColorClasses,



              stroke: THEME_PALETTES[currentTheme]?.root?.stroke || "#6366f1",



            },



          },



        };



      })



    );







    broadcastNodeUpdate(nodeId, { styleOverride: null });



    toast.success("Reset node to auto style");



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







      setProjectId(mindMapData.project_id);







      fetchProjectDocuments(mindMapData.project_id);















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







            importance_score: node.importance_score ?? 1.0,







            onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),







            onBroadcastUpdate: (id: string, fields: any) => broadcastNodeUpdate(id, fields),







            onBroadcastCreate: (node: any, edge?: any) => {







              broadcastNodeCreate(node);







              if (edge) broadcastEdgeCreate(edge);







            },







            onDelete: (id?: string) => {







               if (id) {







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















            const rawTheme = (localStorage.getItem(`mindmap_theme_${mindMapId}`) as ThemeKey) || "modern";



      const savedTheme = normalizeThemeKey(rawTheme);



      setCurrentTheme(savedTheme);







      let savedOverrides: Record<string, NodeStyleOverride> = {};



      try {



        const raw = localStorage.getItem(`mindmap_node_overrides_${mindMapId}`);



        if (raw) savedOverrides = JSON.parse(raw);



      } catch (e) {



        console.error("Failed to parse node overrides:", e);



      }







      // Decoupled Semantic Graph transformation



      const semanticGraph = buildSemanticGraph(nodes, edges);



      const { nodes: flowNodesResult, edges: flowEdgesResult } = toReactFlowGraph(



        semanticGraph,



        savedTheme,



        (node: SemanticNode) => ({



          onPushHistory: (newNodes: any, newEdges: any) => pushToHistory(newNodes, newEdges),



          onBroadcastUpdate: (id: string, fields: any) => broadcastNodeUpdate(id, fields),



          onBroadcastCreate: (nodeItem: any, edgeItem?: any) => {



            broadcastNodeCreate(nodeItem);



            if (edgeItem) broadcastEdgeCreate(edgeItem);



          },



          onDelete: (id?: string) => {



            setConfirmAction({ type: "delete", nodeId: id || node.id, nodeLabel: node.title });



          },



          onRegenerate: () => setConfirmAction({ type: "regenerate", nodeId: node.id, nodeLabel: node.title }),



          onOpenInspector: (id: string) => {



            setSelectedNodeId(id);



            setIsRightPanelOpen(true);



            setRightPanelMode("inspector");



          },



        }),



        savedOverrides



      );





      let finalNodes = flowNodesResult;







      let finalEdges = flowEdgesResult;















      // Automatically organize maps if nodes lack positions (fresh generation, template, or import)







      const rawLayout = (localStorage.getItem(`mindmap_layout_${mindMapId}`) as LayoutDirection) || "radial";

      setCurrentLayout(rawLayout);



      const isForceLayout = localStorage.getItem(`mindmap_force_layout_${mindMapId}`) === "true";

      const needsInitialLayout = nodes.length > 0 && (nodesWithoutPositions.length === nodes.length || nodesWithStoredPositions.length === 0 || isForceLayout);



      if (needsInitialLayout) {

        const layoutResult = applyLayout(flowNodesResult, flowEdgesResult, rawLayout);

        if (isForceLayout) {

          localStorage.removeItem(`mindmap_force_layout_${mindMapId}`);

        }







        finalNodes = layoutResult.nodes;







        finalEdges = layoutResult.edges;







        try {







          await Promise.all(







            finalNodes.map((n) => updateNode(n.id, { position_x: n.position.x, position_y: n.position.y }))







          );







        } catch (e) {







          console.warn("Could not persist initial auto-layout coordinates:", e);







        }







      }















      setFlowNodes(finalNodes);







      setFlowEdges(finalEdges);







      setHistory([{ nodes: finalNodes, edges: finalEdges }]);







      setHistoryIndex(0);















      if (nodesToPersist.length > 0 && !needsInitialLayout) {







        await Promise.all(nodesToPersist.map(n => updateNode(n.id, { position_x: n.position_x, position_y: n.position_y })));







      }















      // Smooth bounded Fit-View after load







      setTimeout(() => {







        rfInstance?.fitView({ duration: 500, padding: 0.2, minZoom: 0.2, maxZoom: 1.5 });







      }, 100);







    } catch (error) {







      console.error(error);







      setGraphError("Failed to load the mind map graph.");







    } finally {







      setIsLoadingGraph(false);







    }







  }















  useEffect(() => { loadGraph(); }, [mindMapId]);







  







  // When a node is selected, keep AI Assistant active if in AI mode, or stay in inspector if in inspector mode







  useEffect(() => {







    if (selectedNodeId && rightPanelMode === "inspector") {







      setRightPanelMode("inspector");







    }







  }, [selectedNodeId, rightPanelMode]);















  const handleExpandNode = async (nodeId: string) => {







    toast.info("Expanding node...");







    try {







      await expandNode(nodeId);
      localStorage.setItem(`mindmap_force_layout_${mindMapId}`, 'true');
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
        toast.success(`Found ${connections.length} suggested connection(s). Review and accept or dismiss on canvas.`);
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







      const result = await generateAIMindMap(mindMapId, { topic: finalTopic, depth: depth });
      localStorage.setItem(`mindmap_force_layout_${mindMapId}`, 'true');
      await loadGraph();







      if (result.sources && result.sources.length > 0) {







        toast.success(`Generated mind map grounded in ${result.sources.length} document source(s)!`);







      }







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







      







      setChatMessages(prev => [







        ...prev,







        {







          id: crypto.randomUUID(),







          role: "ai",







          content: response.response_text,







          mapChanges,







          sources: response.sources







        }







      ]);







      await loadGraph(); // fully reload the graph based on new backend state







    } catch (error) {







      console.error(error);







      setChatMessages(prev => [







        ...prev,







        {







          id: crypto.randomUUID(),







          role: "ai",







          content: "Something went wrong while updating your map.",







          isError: true,







          failedPrompt: userMessage







        }







      ]);







    } finally {







      setIsChatting(false);







    }







  }































  const handleNodesDelete = async (deleted: FlowNode[]) => {







    try {







      await Promise.all(deleted.map(n => deleteNode(n.id)));







      deleted.forEach(n => broadcastNodeDelete(n.id));







      setFlowNodes(current => {







        pushToHistory(current, flowEdges);







        return current;







      });







    } catch(e) { console.error(e); }







  };















  const handleEdgesDelete = async (deleted: FlowEdge[]) => {







    try {







      await Promise.all(deleted.map(e => deleteEdge(e.id)));







      deleted.forEach(e => broadcastEdgeDelete(e.id));







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







      broadcastEdgeCreate({







        id: newEdge.id,







        source: newEdge.source,







        target: newEdge.target,







        type: "editable"







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







      broadcastNodeUpdate(node.id, { position_x: node.position.x, position_y: node.position.y });







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







            <Icon name="undo" className="text-[16px]" />







          </button>







          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded disabled:opacity-30">







            <Icon name="redo" className="text-[16px]" />







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







              <DropdownMenuSeparator />







              <DropdownMenuGroup>







                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Cloud Sync</DropdownMenuLabel>







                <DropdownMenuItem onClick={() => setIsMindMeisterModalOpen(true)} className="cursor-pointer text-primary font-medium">







                  <Icon name="cloud_sync" className="mr-2 text-[16px]" /> MindMeister Cloud...







                </DropdownMenuItem>







                <DropdownMenuItem onClick={() => setIsCoggleModalOpen(true)} className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium">







                  <Icon name="share" className="mr-2 text-[16px]" /> Coggle Cloud...







                </DropdownMenuItem>







              </DropdownMenuGroup>







            </DropdownMenuContent>







          </DropdownMenu>















          <DropdownMenu>







            <DropdownMenuTrigger asChild>







              <button className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="More Options">







                <Icon name="more_vert" className="text-[20px]" />







              </button>







            </DropdownMenuTrigger>







            <DropdownMenuContent align="end" className="w-52">







              <DropdownMenuItem asChild>







                <label className="cursor-pointer flex items-center w-full">







                  <Icon name="upload_file" className="mr-2 text-[16px]" /> Import Map File







                  <input type="file" className="hidden" accept=".md,.opml,.mm,.xmind" onChange={handleImport} />







                </label>







              </DropdownMenuItem>







              <DropdownMenuItem onClick={() => setIsMindMeisterModalOpen(true)} className="cursor-pointer">







                <Icon name="cloud_sync" className="mr-2 text-[16px]" /> MindMeister Cloud Sync







              </DropdownMenuItem>







              <DropdownMenuItem onClick={() => setIsCoggleModalOpen(true)} className="cursor-pointer">







                <Icon name="share" className="mr-2 text-[16px]" /> Coggle Cloud Sync







              </DropdownMenuItem>







            </DropdownMenuContent>







          </DropdownMenu>















          <div className="w-px h-4 bg-outline-variant/50 hidden sm:block mx-1" />







          <NotificationBell />







        </div>







      </header>















      {/* WORKSPACE BODY */}







      <div className="flex-1 flex flex-row overflow-hidden relative">







        







        {/* 2. LEVEL 1: COMPACT ACTIVITY BAR (VS Code-style) */}







        <TooltipProvider delayDuration={150}>







          <div className="w-12 bg-surface border-r border-outline-variant/30 flex flex-col items-center py-2.5 gap-1 shrink-0 select-none z-20">







            {/* Outline / Structure Explorer */}







            <Tooltip>







              <TooltipTrigger asChild>







                <button







                  onClick={() => handleSelectLeftTool("outline")}







                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${







                    !isLeftPanelCollapsed && activeLeftView === "outline"







                      ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:bg-primary before:rounded-r"







                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"







                  }`}







                  aria-label="Outline & Structure (Ctrl+B)"







                >







                  <Icon name="list_alt" className="text-[16px]" />







                </button>







              </TooltipTrigger>







              <TooltipContent side="right" sideOffset={8}>







                Outline & Structure (Ctrl+B)







              </TooltipContent>







            </Tooltip>















            {/* Add Nodes & Templates */}







            <Tooltip>







              <TooltipTrigger asChild>







                <button







                  onClick={() => handleSelectLeftTool("add_node")}







                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${







                    !isLeftPanelCollapsed && activeLeftView === "add_node"







                      ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:bg-primary before:rounded-r"







                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"







                  }`}







                  aria-label="Add Nodes & Topics"







                >







                  <Icon name="add_box" className="text-[16px]" />







                </button>







              </TooltipTrigger>







              <TooltipContent side="right" sideOffset={8}>







                Add Nodes & Topics







              </TooltipContent>







            </Tooltip>















            {/* Layout Options */}







            <Tooltip>







              <TooltipTrigger asChild>







                <button







                  onClick={() => handleSelectLeftTool("layout")}







                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${







                    !isLeftPanelCollapsed && activeLeftView === "layout"







                      ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:bg-primary before:rounded-r"







                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"







                  }`}







                  aria-label="Layout & Alignment"







                >







                  <Icon name="account_tree" className="text-[16px]" />







                </button>







              </TooltipTrigger>







              <TooltipContent side="right" sideOffset={8}>







                Layout & Alignment







              </TooltipContent>







            </Tooltip>















            {/* Canvas View & Themes */}







            <Tooltip>







              <TooltipTrigger asChild>







                <button







                  onClick={() => handleSelectLeftTool("view")}







                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${







                    !isLeftPanelCollapsed && activeLeftView === "view"







                      ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:bg-primary before:rounded-r"







                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"







                  }`}







                  aria-label="Canvas View & Themes"







                >







                  <Icon name="visibility" className="text-[16px]" />







                </button>







              </TooltipTrigger>







              <TooltipContent side="right" sideOffset={8}>







                Canvas View & Themes







              </TooltipContent>







            </Tooltip>















            {/* Knowledge Base (RAG) */}







            <Tooltip>







              <TooltipTrigger asChild>







                <button







                  onClick={() => setIsKnowledgeModalOpen(true)}







                  className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all text-on-surface-variant hover:bg-surface-container hover:text-on-surface"







                  aria-label="Knowledge Base (RAG)"







                >







                  <Icon name="menu_book" className="text-[16px]" />







                  {projectDocuments.length > 0 && (







                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-surface" />







                  )}







                </button>







              </TooltipTrigger>







              <TooltipContent side="right" sideOffset={8}>







                Knowledge Base (RAG) {projectDocuments.length > 0 ? `(${projectDocuments.length} docs)` : ""}







              </TooltipContent>







            </Tooltip>















            <div className="w-6 h-px bg-outline-variant/30 my-1" />















            {/* Canvas Tool: Select Mode */}







            <Tooltip>







              <TooltipTrigger asChild>







                <button







                  onClick={() => {







                    setActiveTool("select");







                    setConnectSourceNodeId(null);







                  }}







                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${







                    activeTool === "select"







                      ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"







                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"







                  }`}







                  aria-label="Select mode"







                >







                  <Icon name="near_me" className="text-[16px]" />







                </button>







              </TooltipTrigger>







              <TooltipContent side="right" sideOffset={8}>







                Select (Pan & Select)







              </TooltipContent>







            </Tooltip>















            {/* Canvas Tool: Connect Mode */}







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







                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${







                    activeTool === "connect"







                      ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"







                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"







                  }`}







                  aria-label="Connect Nodes"







                >







                  <Icon name="cable" className="text-[16px]" />







                </button>







              </TooltipTrigger>







              <TooltipContent side="right" sideOffset={8}>







                Connect Nodes







              </TooltipContent>







            </Tooltip>















          </div>







        </TooltipProvider>















        {/* 2. LEVEL 2: EXPANDABLE RESIZABLE LEFT TOOL PANEL */}







        <ResizablePanel







          side="left"







          width={leftPanelWidth}







          minWidth={220}







          maxWidth={500}







          collapsed={isLeftPanelCollapsed}







          onResize={handleLeftPanelResize}







          onCollapse={() => handleToggleLeftPanel(false)}







          ariaLabel="Left tool panel"







        >







          <LeftToolPanel







            activeView={activeLeftView}







            onClose={() => handleToggleLeftPanel(false)}







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







            onAddRootNode={handleAddRootNode}







            onAddChildNode={handleAddChildNode}







            onAddSiblingNode={handleAddSiblingNode}







            onAddTemplateNode={handleAddTemplateNode}







            currentLayout={currentLayout}







            onApplyLayout={handleApplyLayout}







            currentTheme={currentTheme}







            onSelectTheme={handleSelectTheme}







            showMiniMap={showMiniMap}







            onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}







            showGrid={showGrid}







            onToggleGrid={() => setShowGrid(!showGrid)}







            focusedNodeId={focusedNodeId}







            onToggleFocus={(nodeId) => setFocusedNodeId(nodeId)}







            onFitView={() => rfInstance?.fitView({ duration: 500, padding: 0.2 })}







            onResetZoom={() => rfInstance?.zoomTo(1, { duration: 250 })}







          />







        </ResizablePanel>















        {/* 3. CENTER CANVAS */}







        <main className="flex-1 relative bg-surface-container-lowest flex flex-col">







          {isLoadingGraph ? (







            <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/50 backdrop-blur-sm">







              <Icon name="sync" className="animate-spin text-primary text-[32px]" />







            </div>







          ) : flowNodes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full z-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 border border-primary/20">
                  <Icon name="auto_awesome" className="text-[14px]" />
                  <span>MindVault Workspace</span>
                </div>
                <h2 className="text-display-sm font-bold text-on-surface tracking-tight mb-2">
                  Start Your Mind Map
                </h2>
                <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
                  Choose a generation mode, start from a curated blueprint, or build manually node by node.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {/* 1. Create with AI */}
                <div className="bg-surface border border-outline-variant/50 rounded-2xl p-5 shadow-level-1 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-accent-violet/10 text-accent-violet flex items-center justify-center mb-4">
                      <Icon name="auto_awesome" className="text-[22px]" />
                    </div>
                    <h3 className="text-title-md font-semibold text-on-surface mb-1">Create with AI</h3>
                    <p className="text-body-sm text-on-surface-variant mb-4">
                      Prompt AI to structure and generate an organized hierarchical map.
                    </p>
                    <div className="space-y-2 mb-4">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="E.g., System Architecture..."
                        className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-body-sm focus:border-primary outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isGenerating && topic.trim()) handleGenerateAI();
                        }}
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["Product Strategy", "Architecture", "Quarterly OKRs"].map((sugg) => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => setTopic(sugg)}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
                          >
                            +{sugg}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerateAI()}
                    disabled={isGenerating || !topic.trim()}
                    className="w-full bg-accent-violet hover:bg-accent-violet/90 text-white font-semibold py-2.5 px-4 rounded-xl text-label-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                  >
                    {isGenerating ? <Icon name="sync" className="animate-spin text-[18px]" /> : <Icon name="auto_awesome" className="text-[18px]" />}
                    <span>Generate Map</span>
                  </button>
                </div>

                {/* 2. Start from Template */}
                <div className="bg-surface border border-outline-variant/50 rounded-2xl p-5 shadow-level-1 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <Icon name="dashboard_customize" className="text-[22px]" />
                    </div>
                    <h3 className="text-title-md font-semibold text-on-surface mb-1">Start from Template</h3>
                    <p className="text-body-sm text-on-surface-variant mb-4">
                      Pick from 14 curated blueprints including SWOT, Sprint Planning, Architecture, and more.
                    </p>
                    <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface-variant mb-4">
                      Pre-configured semantic structures, themes, and automatic organization.
                    </div>
                  </div>
                  <Link
                    to="/templates"
                    className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold py-2.5 px-4 rounded-xl text-label-md flex items-center justify-center gap-2 border border-outline-variant/40 transition-colors"
                  >
                    <Icon name="auto_stories" className="text-[18px]" />
                    <span>Browse Blueprints</span>
                  </Link>
                </div>

                {/* 3. Create Manually */}
                <div className="bg-surface border border-outline-variant/50 rounded-2xl p-5 shadow-level-1 flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                      <Icon name="add_circle" className="text-[22px]" />
                    </div>
                    <h3 className="text-title-md font-semibold text-on-surface mb-1">Create Manually</h3>
                    <p className="text-body-sm text-on-surface-variant mb-4">
                      Start blank with a central root node and branch out interactively at your own pace.
                    </p>
                    <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface-variant mb-4">
                      Use Tab for child nodes, Enter for sibling nodes, or drag handles to connect.
                    </div>
                  </div>
                  <button
                    onClick={handleAddRootNode}
                    className="w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold py-2.5 px-4 rounded-xl text-label-md flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                  >
                    <Icon name="add" className="text-[18px]" />
                    <span>Insert Central Topic</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (







            <ReactFlow







              nodes={visibleNodes}







              edges={visibleEdges}







              nodeTypes={nodeTypes}







              edgeTypes={edgeTypes}







              onInit={(instance) => {







                setRfInstance(instance);







                setTimeout(() => {







                  instance.fitView({ duration: 500, padding: 0.2, minZoom: 0.2, maxZoom: 1.5 });







                }, 80);







              }}







              fitView







              fitViewOptions={{ padding: 0.2, minZoom: 0.2, maxZoom: 1.5 }}







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







              {showGrid && <Background color="currentColor" className="text-outline-variant/30 dark:text-outline-variant/20 pointer-events-none" gap={28} size={1.2} />}







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















          {/* PRIMARY FLOATING CANVAS TOOLBAR */}
          {flowNodes.length > 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-md border border-outline-variant/40 rounded-full shadow-level-2 flex items-center p-1 gap-1 z-20 transition-all">
              {/* Select Mode */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-semibold bg-primary/10 text-primary transition-colors cursor-default"
                title="Select Tool (Active)"
              >
                <Icon name="near_me" className="text-[16px]" />
                <span>Select</span>
              </button>

              <div className="w-px h-5 bg-outline-variant/50 mx-0.5" />

              {/* Add Node Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-label-sm font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title="Add Node"
                  >
                    <Icon name="add" className="text-[16px]" />
                    <span>Add</span>
                    <Icon name="arrow_drop_down" className="text-[14px] opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem onClick={handleAddChildNode} className="cursor-pointer">
                    <Icon name="subdirectory_arrow_right" className="mr-2 text-[16px]" /> Child Node (Tab)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAddSiblingNode} className="cursor-pointer">
                    <Icon name="view_stream" className="mr-2 text-[16px]" /> Sibling Node (Enter)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAddRootNode} className="cursor-pointer">
                    <Icon name="account_tree" className="mr-2 text-[16px]" /> Central Topic
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-5 bg-outline-variant/50 mx-0.5" />

              {/* Auto Layout Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-label-sm font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title="Auto Layout"
                  >
                    <Icon name="account_tree" className="text-[16px] text-primary" />
                    <span className="capitalize">{currentLayout}</span>
                    <Icon name="arrow_drop_down" className="text-[14px] opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem onClick={() => handleApplyLayout("radial")} className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="radio_button_checked" className="text-[16px]" />
                      <span>Radial Map</span>
                    </div>
                    {currentLayout === "radial" && <Icon name="check" className="text-primary text-[14px]" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleApplyLayout("horizontal")} className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="swap_horiz" className="text-[16px]" />
                      <span>Horizontal Flow</span>
                    </div>
                    {currentLayout === "horizontal" && <Icon name="check" className="text-primary text-[14px]" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleApplyLayout("vertical")} className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="swap_vert" className="text-[16px]" />
                      <span>Vertical Org</span>
                    </div>
                    {currentLayout === "vertical" && <Icon name="check" className="text-primary text-[14px]" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-5 bg-outline-variant/50 mx-0.5" />

              {/* Map Theme Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-label-sm font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title="Map Theme"
                  >
                    <Icon name="palette" className="text-[16px]" />
                    <span className="capitalize">{currentTheme}</span>
                    <Icon name="arrow_drop_down" className="text-[14px] opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-44">
                  <DropdownMenuItem onClick={() => handleSelectTheme("modern")} className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600" />
                      <span>Modern</span>
                    </div>
                    {currentTheme === "modern" && <Icon name="check" className="text-primary text-[14px]" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSelectTheme("minimal")} className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-zinc-600" />
                      <span>Minimal</span>
                    </div>
                    {currentTheme === "minimal" && <Icon name="check" className="text-primary text-[14px]" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSelectTheme("colorful")} className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-amber-500" />
                      <span>Colorful</span>
                    </div>
                    {currentTheme === "colorful" && <Icon name="check" className="text-primary text-[14px]" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-5 bg-outline-variant/50 mx-0.5" />

              {/* AI Assistant Quick Toggle */}
              <button
                onClick={() => {
                  setIsRightPanelOpen(true);
                  setRightPanelMode("ai");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-semibold bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20 transition-colors cursor-pointer"
                title="Open AI Assistant"
              >
                <Icon name="auto_awesome" className="text-[16px]" />
                <span>AI</span>
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







                    <Icon name="center_focus_weak" className="text-[16px]" /> Exit Focus







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







                <Icon name="map" className="text-[16px]" />







              </button>







              <div className="w-px h-6 bg-outline-variant/50 mx-1" />







              <button







                onClick={() => rfInstance?.fitView({ duration: 500, padding: 0.2 })}







                className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors"







                title="Fit View"







              >







                <Icon name="crop_free" className="text-[16px]" />







              </button>







              <button







                onClick={() => rfInstance?.zoomOut({ duration: 250 })}







                className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors"







                title="Zoom Out"







              >







                <Icon name="remove" className="text-[16px]" />







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







                <Icon name="add" className="text-[16px]" />







              </button>







            </div>







          )}







          {/* Subtle Floating AI restore pill on canvas when collapsed */}







          {flowNodes.length > 0 && isAiPanelCollapsed && (







            <div className="absolute bottom-6 right-6 z-20">







              <button







                onClick={() => handleToggleAiPanel(true)}







                className="bg-surface/95 hover:bg-surface backdrop-blur shadow-level-2 hover:shadow-level-3 text-on-surface hover:text-primary px-3.5 py-2.5 rounded-full flex items-center gap-2 border border-outline-variant/40 transition-all group select-none"







                title="Open AI Assistant (Ctrl+Shift+A)"







                aria-label="Open AI Assistant"







              >







                <Icon name="auto_awesome" className="text-[16px] text-accent-violet group-hover:rotate-12 transition-transform" />







                <span className="text-label-sm font-medium">AI Assistant</span>







              </button>







            </div>







          )}







        </main>















        {/* 4. RIGHT RESIZABLE AI ASSISTANT / INSPECTOR PANEL */}







        <ResizablePanel







          side="right"







          width={aiPanelWidth}







          minWidth={280}







          maxWidth={600}







          collapsed={isAiPanelCollapsed}







          onResize={handleAiPanelResize}







          onCollapse={() => handleToggleAiPanel(false)}







          ariaLabel="AI Assistant side panel"







        >







          {/* Panel Header */}







          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-outline-variant/30 bg-surface select-none shrink-0">







            <div className="flex items-center gap-2 min-w-0">







              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">







                <Icon







                  name={rightPanelMode === "ai" ? "auto_awesome" : rightPanelMode === "inspector" ? "tune" : "history"}







                  className="text-[16px]"







                />







              </div>







              <div className="flex flex-col min-w-0">







                <div className="flex items-center gap-1">







                  <h3 className="text-label-lg font-semibold text-on-surface truncate">







                    {rightPanelMode === "ai" ? "AI Assistant" : rightPanelMode === "inspector" ? "Node Inspector" : "Version History"}







                  </h3>















                  {/* View Switcher Menu */}







                  <DropdownMenu>







                    <DropdownMenuTrigger asChild>







                      <button







                        className="text-on-surface-variant hover:text-on-surface p-0.5 rounded hover:bg-surface-container flex items-center transition-colors"







                        title="Switch panel view"







                      >







                        <Icon name="expand_more" className="text-[14px]" />







                      </button>







                    </DropdownMenuTrigger>







                    <DropdownMenuContent align="start" className="w-48">







                      <DropdownMenuItem onClick={() => setRightPanelMode("ai")} className="cursor-pointer font-medium">







                        <Icon name="auto_awesome" className="mr-2 text-[16px] text-primary" /> AI Assistant







                      </DropdownMenuItem>







                      <DropdownMenuItem onClick={() => setRightPanelMode("inspector")} className="cursor-pointer">







                        <Icon name="tune" className="mr-2 text-[16px]" /> Node Inspector







                      </DropdownMenuItem>







                      <DropdownMenuItem onClick={() => setRightPanelMode("versions")} className="cursor-pointer">







                        <Icon name="history" className="mr-2 text-[16px]" /> Version History







                      </DropdownMenuItem>







                    </DropdownMenuContent>







                  </DropdownMenu>







                </div>















                {/* Subtle Contextual Line & RAG Badge */}







                <div className="flex items-center gap-1.5 flex-wrap">







                  <span className="text-xs text-on-surface-variant truncate">







                    Working on: <span className="text-on-surface font-medium">{selectedNode ? (selectedNode.data.label as string) : "Entire map"}</span>







                  </span>







                  {projectDocuments.length > 0 && (







                    <button







                      onClick={() => setIsKnowledgeModalOpen(true)}







                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"







                      title={`${projectDocuments.length} document(s) indexed. Click to manage.`}







                    >







                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />







                      RAG ({projectDocuments.length})







                    </button>







                  )}







                </div>







              </div>







            </div>















            {/* Header Action: Close */}







            <div className="flex items-center shrink-0">







              <button







                onClick={() => handleToggleAiPanel(false)}







                className="p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-md transition-colors"







                title="Close AI Assistant (Ctrl+Shift+A)"







                aria-label="Close AI Assistant"







              >







                <Icon name="close" className="text-[16px]" />







              </button>







            </div>







          </div>















          {/* Panel Body */}







          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-container-lowest">







            {rightPanelMode === "ai" ? (







              <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">







                







                {/* Messages / Intro Area */}







                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-w-0">







                  {chatMessages.length === 0 ? (







                    /* Empty State matching Reference Image */







                    <div className="flex flex-col gap-2.5 my-auto py-1 min-w-0">







                      {/* 1. Greeting Card */}







                      <div className="bg-surface border border-outline-variant/30 rounded-2xl p-3.5 shadow-xs">







                        <h4 className="text-title-sm font-semibold text-on-surface">Hi! I can help you work with your map.</h4>







                        <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">







                          You can ask me to improve, analyze, or summarize your ideas.







                        </p>







                      </div>















                      {/* 2. Context-Aware Quick Actions Grid (Dynamic 1 or 2 cols based on panel width) */}







                      <div className={`grid ${aiPanelWidth < 360 ? "grid-cols-1" : "grid-cols-2"} gap-2`}>







                          {selectedNode ? (







                            <>







                              {/* Selected Node Actions */}







                              <button







                                onClick={() => handleSendChat(`Expand node "${selectedNode.data.label}" with detailed subtopics and child concepts`)}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#F5F3FF] dark:bg-purple-950/20 border border-[#EDE9FE] dark:border-purple-900/30 hover:border-primary/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="account_tree" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Expand node</span>







                              </button>















                              <button







                                onClick={() => handleSendChat(`Explain "${selectedNode.data.label}" clearly in context of this mind map`)}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/20 border border-[#DBEAFE] dark:border-blue-900/30 hover:border-blue-500/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="description" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Explain concept</span>







                              </button>















                              <button







                                onClick={() => handleSendChat(`Rewrite and make "${selectedNode.data.label}" concise`)}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#ECFDF5] dark:bg-emerald-950/20 border border-[#D1FAE5] dark:border-emerald-900/30 hover:border-emerald-500/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="edit_note" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Rewrite / Simplify</span>







                              </button>















                              <button







                                onClick={() => handleSendChat(`Find connections between "${selectedNode.data.label}" and other parts of this mind map`)}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#FAF5FF] dark:bg-fuchsia-950/20 border border-[#F3E8FF] dark:border-fuchsia-900/30 hover:border-fuchsia-500/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="hub" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Find connections</span>







                              </button>







                            </>







                          ) : (







                            <>







                              {/* Entire Map Actions */}







                              <button







                                onClick={() => handleSendChat("Improve map structure")}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#F5F3FF] dark:bg-purple-950/20 border border-[#EDE9FE] dark:border-purple-900/30 hover:border-primary/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="schema" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Improve map structure</span>







                              </button>















                              <button







                                onClick={() => handleSendChat("Summarize entire map")}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/20 border border-[#DBEAFE] dark:border-blue-900/30 hover:border-blue-500/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="description" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Summarize map</span>







                              </button>















                              <button







                                onClick={() => handleSendChat("Identify gaps and missing concepts")}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#ECFDF5] dark:bg-emerald-950/20 border border-[#D1FAE5] dark:border-emerald-900/30 hover:border-emerald-500/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="lightbulb" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Find gaps & suggestions</span>







                              </button>















                              <button







                                onClick={() => handleSendChat("Analyze this map for coverage, duplication, structure, missing concepts, and complexity")}







                                className="group flex flex-col items-start p-3 rounded-2xl bg-[#FAF5FF] dark:bg-fuchsia-950/20 border border-[#F3E8FF] dark:border-fuchsia-900/30 hover:border-fuchsia-500/50 hover:shadow-xs transition-all text-left"







                              >







                                <div className="w-7 h-7 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">







                                  <Icon name="bar_chart" className="text-[16px]" />







                                </div>







                                <span className="text-label-sm font-semibold text-on-surface leading-snug">Analyze map</span>







                              </button>







                            </>







                          )}







                        </div>















                        {/* Optional More Actions Dropdown */}







                        <div className="flex justify-end">







                          <DropdownMenu>







                            <DropdownMenuTrigger asChild>







                              <button className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-surface-container transition-colors font-medium">







                                <span>More actions</span>







                                <Icon name="expand_more" className="text-[14px]" />







                              </button>







                            </DropdownMenuTrigger>







                            <DropdownMenuContent align="end" className="w-52">







                              <DropdownMenuItem onClick={() => handleSendChat("Convert this map into a comprehensive exam study guide")}>







                                <Icon name="school" className="mr-2 text-[16px]" /> Create study guide







                              </DropdownMenuItem>







                              <DropdownMenuItem onClick={() => handleSendChat("Convert this map into an actionable project plan with milestones")}>







                                <Icon name="task_alt" className="mr-2 text-[16px]" /> Create project plan







                              </DropdownMenuItem>







                              <DropdownMenuItem onClick={() => handleSendChat("Conduct a SWOT analysis based on this mind map")}>







                                <Icon name="grid_view" className="mr-2 text-[16px]" /> Generate SWOT analysis







                              </DropdownMenuItem>







                            </DropdownMenuContent>







                          </DropdownMenu>







                        </div>















                        {/* 3. Divider */}







                        <div className="flex items-center gap-3 my-0.5">







                          <div className="flex-1 h-px bg-outline-variant/30" />







                          <span className="text-xs font-medium text-outline uppercase tracking-wider">or</span>







                          <div className="flex-1 h-px bg-outline-variant/30" />







                        </div>







                      </div>







                    ) : (







                      /* Chat Messages View */







                      <>







                        {chatMessages.map((msg) => (







                          <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-1.5`}>







                            {msg.role === "ai" && (







                              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pl-1">







                                <Icon name="auto_awesome" className="text-[14px]" />







                                <span>MindVault AI</span>







                              </div>







                            )}















                            <div







                              className={`text-body-sm leading-relaxed break-words ${







                                msg.role === "user"







                                  ? "px-3.5 py-2 rounded-2xl rounded-tr-xs bg-primary text-on-primary max-w-[85%] shadow-xs"







                                  : "px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-surface-container-low text-on-surface border border-outline-variant/30 max-w-[92%]"







                              }`}







                            >







                              {msg.content}







                            </div>















                            {/* RAG Grounding Sources */}







                            {msg.sources && msg.sources.length > 0 && (







                              <details className="w-full max-w-[92%] bg-surface border border-primary/20 rounded-xl p-2 text-label-xs group">







                                <summary className="cursor-pointer font-medium text-primary flex items-center justify-between list-none">







                                  <span className="flex items-center gap-1.5">







                                    <Icon name="verified" className="text-[14px] text-primary" />







                                    Grounded in {msg.sources.length} document source{msg.sources.length > 1 ? 's' : ''}







                                  </span>







                                  <Icon name="expand_more" className="text-[14px] transition-transform group-open:rotate-180 text-outline" />







                                </summary>







                                <div className="mt-2 space-y-1.5 pt-1.5 border-t border-outline-variant/20">







                                  {msg.sources.map((s, idx) => (







                                    <div key={idx} className="bg-surface-container-low p-2 rounded-lg text-body-xs font-mono text-on-surface-variant">







                                      <div className="flex items-center justify-between font-semibold text-primary mb-1">







                                        <span className="truncate max-w-[180px]">{s.filename} {s.page_number ? `(p. ${s.page_number})` : ''}</span>







                                        <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded">{(s.score * 100).toFixed(0)}% match</span>







                                      </div>







                                      <p className="line-clamp-2 text-xs font-sans text-on-surface">{s.snippet}</p>







                                    </div>







                                  ))}







                                </div>







                              </details>







                            )}















                            {/* Map Change Summary Card */}







                            {msg.mapChanges && !msg.mapChanges.isUndone && (







                              <div className="bg-surface border border-outline-variant/40 rounded-xl p-2.5 flex items-center justify-between w-full max-w-[92%] shadow-xs text-label-xs">







                                <div className="flex items-center gap-2">







                                  <span className="font-semibold text-on-surface">Map updated</span>







                                  {msg.mapChanges.nodesAdded > 0 && (







                                    <span className="text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">







                                      +{msg.mapChanges.nodesAdded} nodes







                                    </span>







                                  )}







                                  {msg.mapChanges.nodesDeleted > 0 && (







                                    <span className="text-error bg-error/10 px-2 py-0.5 rounded font-medium">







                                      -{msg.mapChanges.nodesDeleted} nodes







                                    </span>







                                  )}







                                </div>







                                {msg.mapChanges.snapshotId && (







                                  <button







                                    onClick={() => handleUndoAIChat(msg.id, msg.mapChanges!.snapshotId!)}







                                    className="text-primary hover:bg-primary/10 px-2.5 py-1 rounded font-bold transition-colors flex items-center gap-1"







                                  >







                                    <Icon name="undo" className="text-[14px]" /> Undo







                                  </button>







                                )}







                              </div>







                            )}















                            {msg.mapChanges?.isUndone && (







                              <div className="text-label-xs text-on-surface-variant flex items-center gap-1 pl-1">







                                <Icon name="undo" className="text-[12px]" /> AI changes reverted







                              </div>







                            )}















                            {msg.isError && msg.failedPrompt && (







                              <button







                                onClick={() => handleSendChat(msg.failedPrompt)}







                                className="text-primary hover:bg-primary/10 px-2.5 py-1 rounded text-label-xs font-semibold flex items-center gap-1 border border-primary/20 transition-colors ml-1"







                              >







                                <Icon name="refresh" className="text-[14px]" /> Try again







                              </button>







                            )}







                          </div>







                        ))}















                        {/* Real Loading Indicator */}







                        {isChatting && (







                          <div className="flex flex-col items-start gap-1.5 animate-in fade-in duration-200">







                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pl-1">







                              <Icon name="auto_awesome" className="text-[14px]" />







                              <span>MindVault AI</span>







                            </div>







                            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-surface-container-low text-on-surface-variant border border-outline-variant/30 text-body-sm flex items-center gap-2">







                              <Icon name="sync" className="animate-spin text-primary text-[16px]" />







                              <span>AI is updating your map…</span>







                            </div>







                          </div>







                        )}















                        <div ref={messagesEndRef} />







                      </>







                    )}







                  </div>















                  {/* Contextual Action Chips in Chat Mode (Max 3, wraps naturally, NO overflow-x) */}







                  {chatMessages.length > 0 && !chatInput && !isChatting && (







                    <div className="px-4 py-2 border-t border-outline-variant/15 bg-surface/50 flex flex-wrap items-center gap-1.5">







                      {selectedNode ? (







                        <>







                          <button







                            onClick={() => handleSendChat(`Expand node "${selectedNode.data.label}" with child concepts`)}







                            className="text-xs font-medium border border-outline-variant/40 hover:bg-surface-container rounded-full px-2.5 py-1 text-on-surface transition-colors"







                          >







                            Expand node







                          </button>







                          <button







                            onClick={() => handleSendChat(`Explain "${selectedNode.data.label}" clearly`)}







                            className="text-xs font-medium border border-outline-variant/40 hover:bg-surface-container rounded-full px-2.5 py-1 text-on-surface transition-colors"







                          >







                            Explain







                          </button>







                          <button







                            onClick={() => handleSendChat(`Rewrite and simplify "${selectedNode.data.label}"`)}







                            className="text-xs font-medium border border-outline-variant/40 hover:bg-surface-container rounded-full px-2.5 py-1 text-on-surface transition-colors"







                          >







                            Rewrite







                          </button>







                        </>







                      ) : (







                        <>







                          <button







                            onClick={() => handleSendChat("Improve map structure")}







                            className="text-xs font-medium border border-outline-variant/40 hover:bg-surface-container rounded-full px-2.5 py-1 text-on-surface transition-colors"







                          >







                            Improve structure







                          </button>







                          <button







                            onClick={() => handleSendChat("Summarize entire map")}







                            className="text-xs font-medium border border-outline-variant/40 hover:bg-surface-container rounded-full px-2.5 py-1 text-on-surface transition-colors"







                          >







                            Summarize map







                          </button>







                          <button







                            onClick={() => handleSendChat("Identify gaps and missing concepts")}







                            className="text-xs font-medium border border-outline-variant/40 hover:bg-surface-container rounded-full px-2.5 py-1 text-on-surface transition-colors"







                          >







                            Find gaps







                          </button>







                        </>







                      )}







                      







                      <DropdownMenu>







                        <DropdownMenuTrigger asChild>







                          <button className="text-xs font-medium text-on-surface-variant hover:text-on-surface px-2 py-1 rounded-full hover:bg-surface-container flex items-center gap-0.5 transition-colors">







                            More <Icon name="expand_more" className="text-[14px]" />







                          </button>







                        </DropdownMenuTrigger>







                        <DropdownMenuContent align="end" className="w-52">







                          <DropdownMenuItem onClick={() => handleSendChat("Highlight the most important nodes and prioritize critical topics")}>







                            <Icon name="star" className="mr-2 text-[16px] text-amber-500" /> Prioritize key nodes







                          </DropdownMenuItem>







                          <DropdownMenuItem onClick={() => handleSendChat("Analyze this map for coverage, duplication, structure, missing concepts, and complexity")}>







                            <Icon name="bar_chart" className="mr-2 text-[16px]" /> Analyze map







                          </DropdownMenuItem>







                          <DropdownMenuItem onClick={() => handleSendChat("Convert this map into an exam study guide")}>







                            <Icon name="school" className="mr-2 text-[16px]" /> Create study guide







                          </DropdownMenuItem>







                          <DropdownMenuItem onClick={() => handleSendChat("Convert this map into an actionable project plan")}>







                            <Icon name="task_alt" className="mr-2 text-[16px]" /> Create project plan







                          </DropdownMenuItem>







                        </DropdownMenuContent>







                      </DropdownMenu>







                    </div>







                  )}















                  {/* 3. Clean Composer (Single rounded container sticky at bottom) */}







                  <div className="p-3 border-t border-outline-variant/20 bg-surface shrink-0">







                    <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-2.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-xs">







                      







                      {/* Compact Context Target */}







                      <div className="flex items-center justify-between mb-1.5 px-1">







                        <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">







                          <Icon name={selectedNode ? "adjust" : "public"} className="text-[14px] text-primary" />







                          <span className="truncate max-w-[220px]">







                            {selectedNode ? (selectedNode.data.label as string) : "Entire Map"}







                          </span>







                        </div>







                        {selectedNode && (







                          <button







                            onClick={() => setSelectedNodeId(null)}







                            className="text-xs text-outline hover:text-on-surface px-1.5 py-0.5 rounded hover:bg-surface-container flex items-center gap-0.5 transition-colors"







                            title="Clear selection to target entire map"







                          >







                            Clear <Icon name="close" className="text-[14px]" />







                          </button>







                        )}







                      </div>















                      {/* Textarea */}







                      <textarea







                        ref={composerTextareaRef}







                        value={chatInput}







                        onChange={(e) => {







                          setChatInput(e.target.value);







                          e.target.style.height = "auto";







                          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;







                        }}







                        onKeyDown={(e) => {







                          if (e.key === "Enter" && !e.shiftKey) {







                            e.preventDefault();







                            if (chatInput.trim() && !isChatting) {







                              handleSendChat();







                            }







                          }







                        }}







                        placeholder={selectedNode ? `Ask about "${selectedNode.data.label}"...` : "Ask anything about your map..."}







                        rows={1}







                        className="w-full bg-transparent resize-none text-body-sm outline-none px-1 text-on-surface placeholder:text-outline-variant max-h-[120px] leading-relaxed"







                        disabled={isChatting}







                      />















                      {/* Composer Actions */}







                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-outline-variant/15">







                        <div className="flex items-center gap-1 text-outline">







                          <button







                            type="button"







                            onClick={() => setIsKnowledgeModalOpen(true)}







                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${







                              projectDocuments.length > 0







                                ? "text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400"







                                : "text-on-surface-variant hover:text-primary hover:bg-surface-container"







                            }`}







                            title={







                              projectDocuments.length > 0







                                ? `Manage Knowledge Base (${projectDocuments.length} document${projectDocuments.length > 1 ? 's' : ''} grounding AI)`







                                : "Attach Knowledge Base Documents (RAG)"







                            }







                          >







                            <Icon name="attach_file" className="text-[16px]" />







                            {projectDocuments.length > 0 && (







                              <span className="text-xs font-bold px-1">{projectDocuments.length}</span>







                            )}







                          </button>







                        </div>







                        <button







                          onClick={() => handleSendChat()}







                          disabled={!chatInput.trim() || isChatting}







                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-30 disabled:bg-surface-container-high disabled:text-outline disabled:cursor-not-allowed shadow-xs"







                          aria-label="Send message"







                          title="Send message (Enter)"







                        >







                          <Icon name="arrow_upward" className="text-[16px]" />







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







                      <Icon name="refresh" className="text-[16px]" />







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







                                      <span className="text-xs font-medium text-outline shrink-0 mt-0.5">







                                         {new Date(snap.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}







                                      </span>







                                   </div>







                                   <p className="text-xs text-on-surface-variant mb-3">







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



                <div className="p-4 flex flex-col gap-6 overflow-y-auto">



                  {!selectedNode ? (
                    <div className="space-y-6">
                      {/* Map Overview Header */}
                      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon name="account_tree" className="text-[22px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Mind Map Overview</span>
                            <input
                              type="text"
                              value={mindMapTitle}
                              onChange={(e) => setMindMapTitle(e.target.value)}
                              onBlur={() => {
                                if (mindMapId && mindMapTitle.trim()) {
                                  updateMindMap(mindMapId, { title: mindMapTitle.trim() });
                                }
                              }}
                              className="font-bold text-body-lg text-on-surface bg-transparent border-none outline-none w-full truncate focus:bg-surface focus:px-1.5 focus:py-0.5 rounded transition-all"
                              title="Click to rename mind map"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-on-surface-variant/80 pt-1 border-t border-outline-variant/20">
                          <span>Theme: <strong className="capitalize text-on-surface">{currentTheme}</strong></span>
                          <span>Layout: <strong className="capitalize text-on-surface">{currentLayout}</strong></span>
                        </div>
                      </div>

                      {/* Map Metrics Grid */}
                      <div className="space-y-2">
                        <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">Canvas Metrics</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Icon name="circle" className="text-[16px]" />
                            </div>
                            <div>
                              <span className="text-[11px] text-outline block">Total Nodes</span>
                              <span className="text-title-md font-bold text-on-surface">{flowNodes.length}</span>
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Icon name="fork_right" className="text-[16px]" />
                            </div>
                            <div>
                              <span className="text-[11px] text-outline block">Branches</span>
                              <span className="text-title-md font-bold text-on-surface">
                                {flowNodes.filter(n => n.data?.depth === 1 || (!flowEdges.some(e => e.target === n.id) && flowNodes.length > 1)).length || 1}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <Icon name="layers" className="text-[16px]" />
                            </div>
                            <div>
                              <span className="text-[11px] text-outline block">Max Depth</span>
                              <span className="text-title-md font-bold text-on-surface">
                                {Math.max(0, ...flowNodes.map(n => Number(n.data?.depth || 0)))}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <Icon name="timeline" className="text-[16px]" />
                            </div>
                            <div>
                              <span className="text-[11px] text-outline block">Connections</span>
                              <span className="text-title-md font-bold text-on-surface">{flowEdges.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-outline-variant/30" />

                      {/* Global Structure & Layout */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">Global Layout</span>
                          <span className="text-xs text-primary font-medium capitalize">{currentLayout}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "radial" as const, label: "Radial", icon: "radio_button_checked" },
                            { key: "horizontal" as const, label: "Horizontal", icon: "swap_horiz" },
                            { key: "vertical" as const, label: "Vertical", icon: "swap_vert" },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleApplyLayout(item.key)}
                              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                currentLayout === item.key
                                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                                  : "border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              <Icon name={item.icon} className="text-[18px]" />
                              <span className="text-xs font-semibold">{item.label}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyLayout(currentLayout)}
                          className="w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 text-on-surface text-label-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Icon name="auto_fix_high" className="text-[16px] text-primary" />
                          <span>Re-organize Canvas Layout</span>
                        </button>
                      </div>

                      <div className="h-px bg-outline-variant/30" />

                      {/* Global Visual Theme */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">Visual Theme</span>
                          <span className="text-xs text-primary font-medium capitalize">{currentTheme}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "modern" as const, label: "Modern", color: "bg-blue-600", desc: "Balanced AI" },
                            { key: "minimal" as const, label: "Minimal", color: "bg-zinc-600", desc: "Clean & calm" },
                            { key: "colorful" as const, label: "Colorful", color: "bg-gradient-to-r from-pink-500 to-amber-500", desc: "Vibrant" },
                          ].map((thm) => (
                            <button
                              key={thm.key}
                              type="button"
                              onClick={() => handleSelectTheme(thm.key)}
                              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                currentTheme === thm.key
                                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                                  : "border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full ${thm.color} shadow-xs`} />
                              <span className="text-xs font-semibold">{thm.label}</span>
                              <span className="text-[10px] text-outline opacity-80">{thm.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-outline-variant/30" />

                      {/* Canvas View Settings & Quick Actions */}
                      <div className="space-y-3">
                        <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">Display & Quick Actions</span>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
                            <div className="flex items-center gap-2 text-xs font-medium text-on-surface">
                              <Icon name="grid_view" className="text-[16px] text-on-surface-variant" />
                              <span>Canvas Grid</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowGrid(!showGrid)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                showGrid ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {showGrid ? "On" : "Off"}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
                            <div className="flex items-center gap-2 text-xs font-medium text-on-surface">
                              <Icon name="map" className="text-[16px] text-on-surface-variant" />
                              <span>MiniMap Radar</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowMiniMap(!showMiniMap)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                showMiniMap ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {showMiniMap ? "On" : "Off"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => rfInstance?.fitView({ duration: 500, padding: 0.2 })}
                            className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Icon name="crop_free" className="text-[16px]" />
                            <span>Fit to Screen</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddRootNode}
                            className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Icon name="add" className="text-[16px]" />
                            <span>Add Central Node</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (() => {



                    const currentOverride: NodeStyleOverride = (selectedNode.data?.styleOverride as NodeStyleOverride) || {};



                    const hasOverrides = !!(currentOverride.shape || currentOverride.color || currentOverride.icon || currentOverride.style);



                    const nodeType = (selectedNode.data?.semanticType as SemanticNodeType) || (selectedNode.data?.depth === 0 ? "root" : "concept");



                    const depth = selectedNode.data?.depth ?? 0;







                    const typeMeta: Record<string, { label: string; icon: string; badgeClass: string }> = {



                      root: { label: "Root Topic", icon: "account_tree", badgeClass: "bg-primary/10 text-primary border-primary/20" },



                      topic: { label: "Main Topic", icon: "folder", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },



                      concept: { label: "Concept", icon: "description", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },



                      task: { label: "Action Task", icon: "check_circle", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },



                      insight: { label: "Key Insight", icon: "lightbulb", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },



                      ai_suggestion: { label: "AI Suggestion", icon: "auto_awesome", badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },



                    };



                    const meta = typeMeta[nodeType] || typeMeta.concept;







                    return (



                      <>



                        {/* Section 1: Semantic Identity & Content */}



                        <div className="space-y-3">



                          <div className="flex items-center justify-between">



                            <span className="text-label-xs font-bold text-outline uppercase tracking-wider">Node Details</span>



                            <div className="flex items-center gap-1.5">



                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeClass}`}>



                                <Icon name={meta.icon} className="text-[12px]" />



                                <span>{meta.label}</span>



                              </span>



                              <span className="text-[11px] font-medium text-on-surface-variant/70 bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30">



                                Depth {depth}



                              </span>



                            </div>



                          </div>







                          <div>



                            <label className="text-xs font-medium text-on-surface-variant mb-1.5 block">Title / Content</label>



                            <textarea 



                              value={selectedNode.data.label as string}



                              onChange={(e) => {



                                const newLabel = e.target.value;



                                setFlowNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n));



                              }}



                              onBlur={() => updateNode(selectedNode.id, { label: selectedNode.data.label as string })}



                              placeholder="Enter node title..."



                              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none resize-none min-h-[76px] transition-all"



                            />



                          </div>



                        </div>

                        {/* Parent Relationship */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-on-surface-variant block">Parent Relationship</label>
                          {(() => {
                            const parentEdge = flowEdges.find(e => e.target === selectedNode.id);
                            const parentNode = parentEdge ? flowNodes.find(n => n.id === parentEdge.source) : null;
                            if (parentNode) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedNodeId(parentNode.id);
                                    if (rfInstance) {
                                      rfInstance.setCenter(parentNode.position.x, parentNode.position.y, { zoom: 1.2, duration: 500 });
                                    }
                                  }}
                                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 transition-colors text-left group cursor-pointer"
                                  title="Jump to parent node"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Icon name="arrow_upward" className="text-primary text-[16px] shrink-0" />
                                    <span className="text-body-sm font-medium truncate text-on-surface">
                                      {(parentNode.data?.label as string) || "Untitled Node"}
                                    </span>
                                  </div>
                                  <span className="text-xs text-primary group-hover:underline shrink-0 font-medium">Jump</span>
                                </button>
                              );
                            }
                            return (
                              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant text-xs">
                                <Icon name="hub" className="text-[16px] text-primary" />
                                <span>Root Topic (Top Level — No Parent)</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Branch & Hierarchy Info */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
                            <span className="text-outline block text-[10px] uppercase font-bold tracking-wider">Branch ID</span>
                            <span className="font-semibold text-on-surface truncate block mt-0.5">
                              {String(selectedNode.data?.branchId || "Central")}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
                            <span className="text-outline block text-[10px] uppercase font-bold tracking-wider">Subnodes</span>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="font-semibold text-on-surface">
                                {flowEdges.filter(e => e.source === selectedNode.id).length} direct
                              </span>
                              {flowEdges.some(e => e.source === selectedNode.id) && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCollapse(selectedNode.id)}
                                  className="text-[11px] text-primary hover:underline cursor-pointer"
                                >
                                  {collapsedNodeIds.has(selectedNode.id) ? "Expand" : "Collapse"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>







                        <div className="h-px bg-outline-variant/30" />







                        {/* Section 2: Appearance & Hybrid Node Styling */}



                        <div className="space-y-4">



                          <div className="flex items-center justify-between">



                            <div className="flex items-center gap-1.5">



                              <Icon name="palette" className="text-primary text-[16px]" />



                              <span className="text-label-xs font-bold text-outline uppercase tracking-wider">Appearance</span>



                            </div>



                            {hasOverrides && (



                              <button



                                onClick={() => handleResetNodeOverride(selectedNode.id)}



                                className="text-xs text-primary hover:text-primary/80 font-medium hover:underline flex items-center gap-1"



                                title="Reset all overrides to theme defaults"



                              >



                                <Icon name="restart_alt" className="text-[13px]" />



                                Reset to Auto



                              </button>



                            )}



                          </div>







                          {/* Shape Override */}



                          <div>



                            <div className="flex items-center justify-between mb-1.5">



                              <label className="text-xs font-medium text-on-surface-variant">Container Shape</label>



                              <span className="text-[11px] text-outline capitalize">{currentOverride.shape || "Auto (Theme)"}</span>



                            </div>



                            <div className="grid grid-cols-4 gap-1.5 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">



                              {[



                                { key: "auto", label: "Auto", icon: "auto_mode" },



                                { key: "rounded", label: "Rounded", icon: "crop_portrait" },



                                { key: "pill", label: "Pill", icon: "radio_button_checked" },



                                { key: "minimal", label: "Minimal", icon: "horizontal_rule" },



                              ].map((shapeOption) => {



                                const isActive = (currentOverride.shape || "auto") === shapeOption.key;



                                return (



                                  <button



                                    key={shapeOption.key}



                                    onClick={() => handleUpdateNodeOverride(selectedNode.id, { shape: shapeOption.key as any })}



                                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all ${



                                      isActive



                                        ? "bg-surface text-primary shadow-xs font-semibold border border-primary/20"



                                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50"



                                    }`}



                                  >



                                    <Icon name={shapeOption.icon} className="text-[16px] mb-1" />



                                    <span>{shapeOption.label}</span>



                                  </button>



                                );



                              })}



                            </div>



                          </div>







                          {/* Color Mode Override */}



                          <div>



                            <div className="flex items-center justify-between mb-1.5">



                              <label className="text-xs font-medium text-on-surface-variant">Color Accent</label>



                              <span className="text-[11px] text-outline capitalize">{currentOverride.color || "Branch (Theme)"}</span>



                            </div>



                            <div className="grid grid-cols-3 gap-2">



                              {[



                                { key: "auto", label: "Branch", desc: "Dynamic branch palette", colorDot: "bg-indigo-500" },



                                { key: "neutral", label: "Neutral", desc: "Subtle calm slate", colorDot: "bg-slate-400" },



                                { key: "accent", label: "Accent", desc: "Vibrant emphasis", colorDot: "bg-amber-500" },



                              ].map((colorOption) => {



                                const isActive = (currentOverride.color || "auto") === colorOption.key;



                                return (



                                  <button



                                    key={colorOption.key}



                                    onClick={() => handleUpdateNodeOverride(selectedNode.id, { color: colorOption.key as any })}



                                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${



                                      isActive



                                        ? "bg-primary/5 border-primary text-on-surface shadow-xs"



                                        : "bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60"



                                    }`}



                                  >



                                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${colorOption.colorDot}`} />



                                    <div className="truncate">



                                      <div className="text-xs font-semibold">{colorOption.label}</div>



                                    </div>



                                  </button>



                                );



                              })}



                            </div>



                          </div>







                          {/* Optional Icon Override */}



                          <div>



                            <div className="flex items-center justify-between mb-1.5">



                              <label className="text-xs font-medium text-on-surface-variant">Node Icon</label>



                              {currentOverride.icon && currentOverride.icon !== "none" && (



                                <button



                                  onClick={() => handleUpdateNodeOverride(selectedNode.id, { icon: "none" })}



                                  className="text-[11px] text-error hover:underline"



                                >



                                  Remove icon



                                </button>



                              )}



                            </div>



                            <div className="grid grid-cols-5 gap-1.5 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">



                              {[



                                { key: "none", label: "None", icon: "block" },



                                { key: "lightbulb", label: "Idea", icon: "lightbulb" },



                                { key: "check_circle", label: "Done", icon: "check_circle" },



                                { key: "star", label: "Star", icon: "star" },



                                { key: "flag", label: "Goal", icon: "flag" },



                                { key: "bookmark", label: "Note", icon: "bookmark" },



                                { key: "help", label: "Help", icon: "help" },



                                { key: "bolt", label: "Fast", icon: "bolt" },



                                { key: "warning", label: "Alert", icon: "warning" },



                                { key: "info", label: "Info", icon: "info" },



                              ].map((iconItem) => {



                                const isActive = iconItem.key === "none"



                                  ? (!currentOverride.icon || currentOverride.icon === "none")



                                  : currentOverride.icon === iconItem.key;



                                return (



                                  <button



                                    key={iconItem.key}



                                    onClick={() => handleUpdateNodeOverride(selectedNode.id, { icon: iconItem.key })}



                                    title={iconItem.label}



                                    className={`h-9 flex items-center justify-center rounded-lg transition-all ${



                                      isActive



                                        ? "bg-surface text-primary shadow-xs border border-primary/30"



                                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50"



                                    }`}



                                  >



                                    <Icon name={iconItem.icon} className="text-[16px]" />



                                  </button>



                                );



                              })}



                            </div>



                          </div>



                        </div>







                        <div className="h-px bg-outline-variant/30" />







                        {/* Section 3: AI Actions */}



                        <div>



                          <div className="flex items-center gap-1.5 mb-3">



                            <Icon name="auto_awesome" className="text-primary text-[16px]" />



                            <span className="text-label-xs font-bold text-outline uppercase tracking-wider">AI Actions</span>



                          </div>







                          <div className="grid grid-cols-2 gap-2 mb-4">



                            <button



                              onClick={() => handleExpandNode(selectedNode.id)}



                              className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors"



                            >



                              <Icon name="account_tree" className="text-primary text-[16px]" />



                              <span className="font-semibold text-on-surface text-label-sm mt-1">Expand</span>



                              <span className="text-[11px] text-on-surface-variant">Generate sub-branches</span>



                            </button>







                            <button



                              onClick={() => handleSummarizeNode(selectedNode.id)}



                              className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors"



                            >



                              <Icon name="short_text" className="text-primary text-[16px]" />



                              <span className="font-semibold text-on-surface text-label-sm mt-1">Summarize</span>



                              <span className="text-[11px] text-on-surface-variant">Condense branch details</span>



                            </button>







                            <button



                              onClick={() => handleFindConnections(selectedNode.id)}



                              className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors"



                            >



                              <Icon name="hub" className="text-primary text-[16px]" />



                              <span className="font-semibold text-on-surface text-label-sm mt-1">Connections</span>



                              <span className="text-[11px] text-on-surface-variant">Find cross-links</span>



                            </button>







                            <button



                              onClick={() => setConfirmAction({ type: 'regenerate', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })}



                              className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors"



                            >



                              <Icon name="auto_awesome" className="text-primary text-[16px]" />



                              <span className="font-semibold text-on-surface text-label-sm mt-1">Regenerate</span>



                              <span className="text-[11px] text-on-surface-variant">Re-create branch ideas</span>



                            </button>







                            <button



                              onClick={() => {



                                setFocusedNodeId(selectedNode.id);



                                if (rfInstance) {



                                  const targetNode = flowNodes.find((n) => n.id === selectedNode.id);



                                  if (targetNode) {



                                    rfInstance.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 600 });



                                  }



                                }



                              }}



                              className="col-span-2 flex items-center justify-between p-3 hover:bg-primary/5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-left transition-colors"



                            >



                              <div className="flex items-center gap-2.5">



                                <Icon name="center_focus_strong" className="text-primary text-[16px]" />



                                <div>



                                  <div className="font-semibold text-on-surface text-label-sm">Focus Branch</div>



                                  <div className="text-[11px] text-on-surface-variant">Dim outer canvas and center view</div>



                                </div>



                              </div>



                              <Icon name="chevron_right" className="text-on-surface-variant text-[16px]" />



                            </button>



                          </div>







                          <div className="h-px bg-outline-variant/30 mb-4" />







                          {/* Section 4: Danger Zone */}



                          <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-2 block">Danger Zone</label>



                          <button



                            onClick={() => setConfirmAction({ type: 'delete', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })}



                            className="flex items-center gap-3 w-full p-2.5 hover:bg-error-container/30 border border-error/20 rounded-xl text-left text-body-sm text-error transition-colors"



                          >



                            <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error">



                              <Icon name="delete" className="text-[16px]" />



                            </div>



                            <div>



                              <div className="font-semibold text-xs">Delete Node</div>



                              <div className="opacity-70 text-[11px]">Remove node and associated children</div>



                            </div>



                          </button>



                        </div>



                      </>



                    );



                  })()}



                </div>







              )}







            </div>







        </ResizablePanel>







      <ShareModal







        isOpen={isShareModalOpen}







        onClose={() => setIsShareModalOpen(false)}







        mindMapId={mindMapId}







        mindMapTitle={mindMapTitle}







        remoteUsers={remoteUsers}







      />















      <KnowledgeBaseModal







        isOpen={isKnowledgeModalOpen}







        onClose={() => setIsKnowledgeModalOpen(false)}







        projectId={projectId}







        documents={projectDocuments}







        onDocumentsChange={() => fetchProjectDocuments()}







      />















      <MindMeisterModal







        isOpen={isMindMeisterModalOpen}







        onClose={() => setIsMindMeisterModalOpen(false)}







        mindMapId={mindMapId}







        mindMapTitle={mindMapTitle}







        onImportComplete={() => loadGraph()}







      />















      <CoggleModal







        isOpen={isCoggleModalOpen}







        onClose={() => setIsCoggleModalOpen(false)}







        mindMapId={mindMapId}







        mindMapTitle={mindMapTitle}







        onImportComplete={() => loadGraph()}







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







              <Icon name="warning" className="text-[24px]" />







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







