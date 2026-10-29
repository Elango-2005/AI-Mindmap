import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";







import { useEffect, useState, useMemo, useRef, useCallback } from "react";







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
import { Inspector } from "@/components/Inspector";
import { AiAssistantPanel, type AIChatMessage, type SuggestedChangesData } from "@/components/AiAssistantPanel";







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







import { applyLayout, determineOptimalHandles, type LayoutDirection } from "@/lib/layoutAlgorithms";







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
  const navigate = useNavigate();







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







  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [aiScope, setAiScope] = useState<"entire_map" | "node" | "branch">("entire_map");







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
      setIsAiPanelCollapsed(false);
      setRightPanelMode("inspector");
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







    setTimeout(() => rfInstance?.fitView({ duration: 500, padding: 0.2, minZoom: 0.2, maxZoom: 1.05 }), 50);







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
          handleToggleAiPanel(true);
          setRightPanelMode("inspector");
        },
        onStartConnect: (id: string) => {
          setActiveTool("connect");
          setConnectSourceNodeId(id);
          setSelectedNodeId(id);
          toast.info("Source selected. Click target node to connect.");
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
            handleToggleAiPanel(true);
            setRightPanelMode("inspector");
          },
          onStartConnect: (id: string) => {
            setActiveTool("connect");
            setConnectSourceNodeId(id);
            setSelectedNodeId(id);
            toast.info("Source selected. Click target node to connect.");
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

      const nodesAtOrigin = nodes.filter((n) => n.position_x === 0 && n.position_y === 0);
      const hasCollapsedNodes = nodesAtOrigin.length > 1;
      const needsInitialLayout =
        nodes.length > 0 &&
        (isForceLayout ||
          nodesWithStoredPositions.length === 0 ||
          hasCollapsedNodes ||
          (nodesWithoutPositions.length > 0 && nodes.length > 1));



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















// Legacy nodesToPersist persistence removed in favor of layout engine















      // Smooth bounded Fit-View after load







      setTimeout(() => {







        rfInstance?.fitView({ duration: 500, padding: 0.2, minZoom: 0.2, maxZoom: 1.05 });







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
    if (selectedNodeId) {
      setAiScope("node");
    } else {
      setAiScope("entire_map");
    }
  }, [selectedNodeId]);















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















  
  const handlePreviewChanges = (messageId: string) => {
    const msg = chatMessages.find(m => m.id === messageId);
    if (!msg || !msg.suggestedChanges) return;

    const suggestions = msg.suggestedChanges;

    // 1. Update message status to previewing and append confirmation
    setChatMessages(prev => {
      const updated = prev.map(m => m.id === messageId ? {
        ...m,
        suggestedChanges: { ...m.suggestedChanges!, status: "previewing" as const }
      } : m);
      return [
        ...updated,
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content: "Show me the preview first",
        },
        {
          id: crypto.randomUUID(),
          role: "ai" as const,
          content: "Here's the updated map with the suggested changes. You can review the new nodes and connections before applying them.",
          suggestedChanges: { ...suggestions, status: "previewing" as const },
        }
      ];
    });

    // 2. Inject preview nodes into flowNodes
    if (suggestions.suggestedNodes && suggestions.suggestedNodes.length > 0) {
      const previewFlowNodes: FlowNode[] = suggestions.suggestedNodes.map((sn, idx) => {
        let x = 350;
        let y = (idx - 1) * 90;
        if (sn.parentId) {
          const pNode = flowNodes.find(n => n.id === sn.parentId);
          if (pNode) {
            x = pNode.position.x + (pNode.position.x >= 0 ? 280 : -280);
            y = pNode.position.y + (idx - 1) * 85;
          }
        }

        return {
          id: sn.id,
          type: "editableNode",
          position: { x, y },
          data: {
            label: sn.label,
            description: "AI Suggested Concept",
            semanticType: sn.semanticType || "concept",
            color: "#8B5CF6",
            depth: 2,
            isAiSuggestion: true,
            onLabelChange: (newLabel: string) => handleNodeLabelChange(sn.id, newLabel),
            onDelete: () => handleNodeDelete(sn.id),
            onAddChild: () => handleAddChildNode(sn.id),
            onStartConnect: () => handleStartConnect(sn.id),
            onOpenInspector: () => {
              setSelectedNodeId(sn.id);
              setRightPanelMode("inspector");
            },
          },
        };
      });

      setFlowNodes(prev => [...prev.filter(n => !n.data?.isAiSuggestion), ...previewFlowNodes]);
    }

    // 3. Inject preview edges into flowEdges
    if (suggestions.suggestedEdges && suggestions.suggestedEdges.length > 0) {
      const previewFlowEdges: FlowEdge[] = suggestions.suggestedEdges.map(se => {
        const sPos = flowNodes.find(n => n.id === se.source)?.position || { x: 0, y: 0 };
        const tPos = flowNodes.find(n => n.id === se.target)?.position || { x: 300, y: 0 };
        const handles = determineOptimalHandles(sPos, tPos, currentLayout);
        return {
          id: se.id,
          source: se.source,
          target: se.target,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: "editable",
          animated: true,
          style: { stroke: "#8B5CF6", strokeDasharray: "5,5", strokeWidth: 2 },
          data: {
            label: se.label || "Related to",
            relationshipType: "cross_link",
            isAiSuggestion: true,
          },
        };
      });

      setFlowEdges(prev => [...prev.filter(e => !e.data?.isAiSuggestion), ...previewFlowEdges]);
    }

    toast.info("Showing canvas preview of AI suggestions");
  };

  const handleApplyChanges = async (messageId: string) => {
    if (!mindMapId) return;
    const msg = chatMessages.find(m => m.id === messageId || m.suggestedChanges?.status === "previewing");
    if (!msg || !msg.suggestedChanges) return;

    const suggestions = msg.suggestedChanges;
    toast.info("Applying AI changes to mind map...");

    let snapshotId: string | undefined = undefined;
    try {
      const snap = await createSnapshot(mindMapId, `Pre-AI suggestions: ${suggestions.summary.slice(0, 20)}`);
      snapshotId = snap.id;
    } catch (err) {
      console.warn("Failed to create snapshot", err);
    }

    try {
      const createdNodeMap = new Map<string, string>();
      let addedCount = 0;

      if (suggestions.suggestedNodes && suggestions.suggestedNodes.length > 0) {
        for (const sn of suggestions.suggestedNodes) {
          const parentRealId = sn.parentId ? (createdNodeMap.get(sn.parentId) || sn.parentId) : undefined;
          try {
            const created = await createNode(mindMapId, {
              label: sn.label,
              parent_id: parentRealId,
              semantic_type: sn.semanticType || "concept",
              description: "AI Suggested Concept",
            });
            createdNodeMap.set(sn.id, created.id);
            addedCount++;
          } catch (e) {
            console.warn("Failed to create backend node for suggestion", e);
          }
        }
      }

      if (suggestions.suggestedEdges && suggestions.suggestedEdges.length > 0) {
        for (const se of suggestions.suggestedEdges) {
          const realSource = createdNodeMap.get(se.source) || se.source;
          const realTarget = createdNodeMap.get(se.target) || se.target;
          try {
            await createEdge(mindMapId, {
              source_id: realSource,
              target_id: realTarget,
              relationship_type: "cross_link",
              label: se.label || "Related to",
            });
          } catch (e) {
            console.warn("Failed to create backend edge for suggestion", e);
          }
        }
      }

      // Reload unified graph from backend
      await loadGraph();

      // Recalculate layout and register undo history
      const layoutResult = applyLayout(flowNodes, flowEdges, currentLayout);
      setFlowNodes(layoutResult.nodes);
      setFlowEdges(layoutResult.edges);
      pushToHistory(layoutResult.nodes, layoutResult.edges);

      setChatMessages(prev => prev.map(m => {
        if (m.id === messageId || m.suggestedChanges?.summary === suggestions.summary) {
          return {
            ...m,
            suggestedChanges: { ...m.suggestedChanges!, status: "applied" as const },
            mapChanges: {
              nodesAdded: addedCount || suggestions.suggestedNodes?.length || 3,
              nodesDeleted: 0,
              snapshotId,
              isUndone: false,
            },
          };
        }
        return m;
      }));

      toast.success("Applied AI suggestions to your map!");
    } catch (err) {
      console.error("Failed to apply suggestions", err);
      toast.error("Failed to apply AI suggestions");
    }
  };

  const handleDismissChanges = (messageId: string) => {
    setFlowNodes(prev => prev.filter(n => !n.data?.isAiSuggestion));
    setFlowEdges(prev => prev.filter(e => !e.data?.isAiSuggestion));

    setChatMessages(prev => prev.map(m => {
      if (m.id === messageId || m.suggestedChanges?.status === "previewing") {
        return {
          ...m,
          suggestedChanges: { ...m.suggestedChanges!, status: "dismissed" as const },
        };
      }
      return m;
    }));

    toast.info("Dismissed AI suggestions");
  };

  async function handleSendChat(overrideMessage?: string) {
    const userMessage = (typeof overrideMessage === "string" ? overrideMessage : chatInput).trim();
    if (!userMessage || !mindMapId) return;

    setChatInput("");
    setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: userMessage }]);
    setIsChatting(true);

    const lower = userMessage.toLowerCase();
    const isStructuralSuggestion =
      lower.includes("improve") ||
      lower.includes("gap") ||
      lower.includes("suggest") ||
      lower.includes("expand") ||
      lower.includes("structure") ||
      lower.includes("reorganize") ||
      lower.includes("connect") ||
      lower.includes("missing") ||
      lower.includes("coverage");

    if (isStructuralSuggestion) {
      setTimeout(() => {
        const targetParent = selectedNode || flowNodes.find(n => (n.data?.depth === 1)) || flowNodes[0];
        const targetParentId = targetParent?.id || "root";
        const targetParentLabel = (targetParent?.data?.label as string) || "Central Concept";

        const otherTopics = flowNodes.filter(n => n.id !== targetParentId && (n.data?.depth === 1 || n.data?.depth === 2));
        const crossTarget = otherTopics.length > 0 ? otherTopics[otherTopics.length - 1] : targetParent;

        let suggestedLabels = [
          "Feature Pipelines & Caching",
          "Continuous Evaluation & Metrics",
          "Safety Guardrails & Compliance"
        ];

        if (targetParentLabel.toLowerCase().includes("data")) {
          suggestedLabels = [
            "Data Lineage & Governance",
            "Automated ETL Pipelines",
            "Feature Registry & Sharing"
          ];
        } else if (targetParentLabel.toLowerCase().includes("model") || targetParentLabel.toLowerCase().includes("machine") || targetParentLabel.toLowerCase().includes("learning")) {
          suggestedLabels = [
            "Model Observability & Drift",
            "Automated Hyperparameter Tuning",
            "Distributed Training"
          ];
        } else if (targetParentLabel.toLowerCase().includes("generative") || targetParentLabel.toLowerCase().includes("ai")) {
          suggestedLabels = [
            "Vector Databases & Indexing",
            "Retrieval Evaluation & Benchmarking",
            "RLHF & Preference Tuning"
          ];
        } else if (selectedNode) {
          suggestedLabels = [
            `${targetParentLabel}: Advanced Deep Dive`,
            `${targetParentLabel}: Integration Patterns`,
            `${targetParentLabel}: Best Practices & Metrics`
          ];
        }

        const sugNode1Id = `ai-sug-${crypto.randomUUID().slice(0, 8)}`;
        const sugNode2Id = `ai-sug-${crypto.randomUUID().slice(0, 8)}`;
        const sugNode3Id = `ai-sug-${crypto.randomUUID().slice(0, 8)}`;
        const sugEdgeId = `ai-edge-${crypto.randomUUID().slice(0, 8)}`;

        const suggestedNodes = [
          { id: sugNode1Id, label: suggestedLabels[0], semanticType: "concept" as SemanticNodeType, parentId: targetParentId },
          { id: sugNode2Id, label: suggestedLabels[1], semanticType: "concept" as SemanticNodeType, parentId: targetParentId },
          { id: sugNode3Id, label: suggestedLabels[2], semanticType: "concept" as SemanticNodeType, parentId: targetParentId },
        ];

        const suggestedEdges = crossTarget && crossTarget.id !== targetParentId ? [
          { id: sugEdgeId, source: targetParentId, target: crossTarget.id, label: "Related to" }
        ] : [];

        const suggestedChanges: SuggestedChangesData = {
          summary: `I found ${suggestedNodes.length} new related concepts and ${suggestedEdges.length > 0 ? "1 connection" : "structural enhancements"} between branches.`,
          items: [
            { icon: "add", label: `Add ${suggestedNodes.length} new nodes` },
            { icon: "link", label: `Connect ${suggestedEdges.length > 0 ? "2 related topics" : "related concepts"}` },
            { icon: "schema", label: "Reorganize the structure" }
          ],
          suggestedNodes,
          suggestedEdges,
          status: "pending"
        };

        setChatMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ai",
            content: "I've analyzed your mind map. Here are some suggestions to improve the structure and add missing connections.",
            suggestedChanges
          }
        ]);
        setIsChatting(false);
      }, 500);
      return;
    }

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
      if (added > 0 || deleted > 0) {
        await loadGraph();
      }
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: "I've reviewed your request. Could you please specify which topic or node you'd like me to focus on?",
          isError: false,
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







      setFlowEdges(currentEdges => {
        const nodePosMap = new Map<string, { x: number; y: number }>();
        flowNodes.forEach(n => nodePosMap.set(n.id, n.id === node.id ? node.position : n.position));
        return currentEdges.map(e => {
          if (e.source === node.id || e.target === node.id) {
            const sPos = nodePosMap.get(e.source);
            const tPos = nodePosMap.get(e.target);
            if (sPos && tPos) {
              const handles = determineOptimalHandles(sPos, tPos, currentLayout);
              return { ...e, sourceHandle: handles.sourceHandle, targetHandle: handles.targetHandle };
            }
          }
          return e;
        });
      });

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

  const handleExportJSON = () => {
    const data = {
      title: mindMapTitle,
      nodes: flowNodes,
      edges: flowEdges,
      layout: layoutDirection,
      theme: currentTheme,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mindMapTitle || "mindmap"}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exported as JSON");
  };















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
            <Link to="/projects" className="hover:text-on-surface transition-colors font-medium">Projects</Link>
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
                className="bg-surface-container border border-primary rounded px-2 py-0.5 text-label-md font-semibold focus:outline-none w-56"
              />
            </form>
          ) : (
            <div
              className="text-on-surface font-semibold text-title-sm hover:bg-surface-container-low px-2 py-0.5 rounded cursor-pointer flex items-center gap-1.5 group"
              onClick={() => { setTitleEditValue(mindMapTitle); setIsRenamingTitle(true); }}
              title="Click to rename"
            >
              <span>{mindMapTitle}</span>
              <Icon name="edit" className="text-[15px] text-on-surface-variant/70 group-hover:text-on-surface transition-colors" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-label-xs text-on-surface-variant/80 flex items-center gap-1.5 mr-1 font-medium">
            {isSaving || isLoadingGraph ? (
              <><Icon name="sync" className="animate-spin text-[14px]" /> Saving...</>
            ) : (
              <><Icon name="cloud_done" className="text-[16px] text-outline" /> Saved</>
            )}
          </div>
          <div className="w-px h-4 bg-outline-variant/40 hidden sm:block mx-0.5" />
          <button onClick={() => setIsKeyboardHelpOpen(true)} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Keyboard Shortcuts">
            <Icon name="keyboard" className="text-[18px]" />
          </button>
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg disabled:opacity-30 transition-colors" title="Undo (Ctrl+Z)">
            <Icon name="undo" className="text-[18px]" />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg disabled:opacity-30 transition-colors" title="Redo (Ctrl+Y)">
            <Icon name="redo" className="text-[18px]" />
          </button>
          <div className="w-px h-4 bg-outline-variant/40 hidden sm:block mx-0.5" />
          <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#eeedfd] hover:bg-[#e2e0fb] dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-[#5b50e6] dark:text-purple-300 text-label-sm font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs">
            <Icon name="share" className="text-[16px]" /> Share
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant/60 bg-surface hover:bg-surface-container text-on-surface text-label-sm font-medium rounded-lg transition-colors cursor-pointer shadow-2xs">
                <Icon name="ios_share" className="text-[16px]" />
                <span>Export</span>
                <Icon name="arrow_drop_down" className="text-[16px] text-on-surface-variant -mr-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border border-outline-variant/60 bg-surface">
              <DropdownMenuItem onClick={handleExportPDF} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="picture_as_pdf" className="text-[17px] text-red-500" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportImage} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="image" className="text-[17px] text-blue-500" />
                <span>Export as Image (PNG)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("markdown")} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="description" className="text-[17px] text-indigo-500" />
                <span>Export as Markdown</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xmind")} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="account_tree" className="text-[17px] text-purple-500" />
                <span>Export as XMind</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="data_object" className="text-[17px] text-slate-600 dark:text-slate-300" />
                <span>Export as JSON</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-outline-variant/40" />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] font-semibold text-outline px-3 py-1 uppercase tracking-wider">More Formats & Cloud</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("html")} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container">
                  <Icon name="code" className="text-[15px] text-teal-500" />
                  <span>Export as HTML</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("freemind")} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container">
                  <Icon name="device_hub" className="text-[15px] text-orange-500" />
                  <span>Export as FreeMind</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("opml")} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container">
                  <Icon name="list" className="text-[15px] text-amber-500" />
                  <span>Export as OPML</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMindMeisterModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container text-primary font-medium">
                  <Icon name="cloud_sync" className="text-[15px]" />
                  <span>MindMeister Cloud...</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCoggleModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container text-emerald-600 dark:text-emerald-400 font-medium">
                  <Icon name="share" className="text-[15px]" />
                  <span>Coggle Cloud...</span>
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
          <div className="w-px h-4 bg-outline-variant/40 hidden sm:block mx-0.5" />
          <NotificationBell />
          <div
            className="w-8 h-8 rounded-full bg-[#5b50e6] text-white flex items-center justify-center font-semibold text-sm select-none shadow-xs ml-1 cursor-default"
            title="User Account"
          >
            A
          </div>
        </div>
      </header>















      {/* WORKSPACE BODY */}







      <div className="flex-1 flex flex-row overflow-hidden relative">







        







        {/* 2. LEFT CANVAS TOOLBAR (7 stacked tools matching reference image) */}
        <div className="w-[70px] bg-surface border-r border-outline-variant/30 flex flex-col items-center py-3.5 gap-2 shrink-0 select-none z-20">
          {/* 1. Select */}
          <button
            onClick={() => {
              setActiveTool("select");
              setConnectSourceNodeId(null);
            }}
            className={`w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none cursor-pointer ${
              activeTool === "select"
                ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/50 dark:text-purple-300 font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
            title="Select (Pan & Select)"
          >
            <Icon name="near_me" className="text-[20px]" />
            <span className="text-[11px] font-medium leading-none">Select</span>
          </button>

          {/* 2. Add */}
          <button
            onClick={() => {
              if (!isLeftPanelCollapsed && activeLeftView === "add_node") {
                handleToggleLeftPanel(false);
              } else {
                handleSelectLeftTool("add_node");
              }
            }}
            className={`w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none cursor-pointer ${
              !isLeftPanelCollapsed && activeLeftView === "add_node"
                ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/50 dark:text-purple-300 font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
            title="Add Nodes & Topics"
          >
            <Icon name="add_box" className="text-[20px]" />
            <span className="text-[11px] font-medium leading-none">Add</span>
          </button>

          {/* 3. Layout */}
          <button
            onClick={() => {
              if (!isLeftPanelCollapsed && activeLeftView === "layout") {
                handleToggleLeftPanel(false);
              } else {
                handleSelectLeftTool("layout");
              }
            }}
            className={`w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none cursor-pointer ${
              !isLeftPanelCollapsed && activeLeftView === "layout"
                ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/50 dark:text-purple-300 font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
            title="Layout & Alignment"
          >
            <Icon name="schema" className="text-[20px]" />
            <span className="text-[11px] font-medium leading-none">Layout</span>
          </button>

          {/* 4. Theme */}
          <button
            onClick={() => {
              if (!isLeftPanelCollapsed && activeLeftView === "view") {
                handleToggleLeftPanel(false);
              } else {
                handleSelectLeftTool("view");
              }
            }}
            className={`w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none cursor-pointer ${
              !isLeftPanelCollapsed && activeLeftView === "view"
                ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/50 dark:text-purple-300 font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
            title="Canvas Theme & Appearance"
          >
            <Icon name="palette" className="text-[20px]" />
            <span className="text-[11px] font-medium leading-none">Theme</span>
          </button>

          {/* 5. Elements */}
          <button
            onClick={() => {
              if (!isLeftPanelCollapsed && activeLeftView === "outline") {
                handleToggleLeftPanel(false);
              } else {
                handleSelectLeftTool("outline");
              }
            }}
            className={`w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none cursor-pointer ${
              !isLeftPanelCollapsed && activeLeftView === "outline"
                ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/50 dark:text-purple-300 font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
            title="Outline & Structure Explorer"
          >
            <Icon name="grid_view" className="text-[20px]" />
            <span className="text-[11px] font-medium leading-none">Elements</span>
          </button>

          {/* 6. Notes */}
          <button
            onClick={() => setIsKnowledgeModalOpen(true)}
            className="w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none cursor-pointer relative text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            title={`Notes & Knowledge Base (${projectDocuments.length} docs)`}
          >
            <Icon name="description" className="text-[20px]" />
            <span className="text-[11px] font-medium leading-none">Notes</span>
            {projectDocuments.length > 0 && (
              <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-surface" />
            )}
          </button>

          {/* 7. Comments */}
          <button
            onClick={() => {
              handleToggleAiPanel(true);
              setRightPanelMode("versions");
            }}
            className={`w-[56px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all select-none cursor-pointer ${
              !isAiPanelCollapsed && rightPanelMode === "versions"
                ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/50 dark:text-purple-300 font-semibold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
            title="History & Comments"
          >
            <Icon name="chat_bubble_outline" className="text-[20px]" />
            <span className="text-[11px] font-medium leading-none">Comments</span>
          </button>
        </div>















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







                  instance.fitView({ duration: 500, padding: 0.2, minZoom: 0.2, maxZoom: 1.05 });







                }, 80);







              }}







              fitView







              fitViewOptions={{ padding: 0.2, minZoom: 0.2, maxZoom: 1.05 }}







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
                <div className="absolute bottom-6 left-6 z-10 w-[204px] h-[132px] bg-white/95 dark:bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-md overflow-hidden flex flex-col pointer-events-auto">
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <span className="text-[11px] font-semibold text-on-surface">Minimap</span>
                    <button
                      onClick={() => setShowMiniMap(false)}
                      className="p-0.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 rounded transition-colors"
                      title="Close minimap"
                    >
                      <Icon name="open_in_full" className="text-[13px]" />
                    </button>
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    <MiniMap
                      className="!relative !inset-0 !m-0 !w-full !h-full !border-0 !bg-transparent"
                      maskColor="rgba(0, 0, 0, 0.08)"
                    />
                  </div>
                </div>
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-surface/95 backdrop-blur-md border border-outline-variant/30 rounded-full shadow-md flex items-center p-1 gap-1.5 z-20 transition-all">
              {/* Select Mode */}
              <button
                onClick={() => {
                  setActiveTool("select");
                  setConnectSourceNodeId(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-semibold transition-colors cursor-pointer ${
                  activeTool === "select"
                    ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/60 dark:text-purple-300"
                    : "text-on-surface hover:bg-surface-container"
                }`}
                title="Select Tool"
              >
                <Icon name="near_me" className="text-[16px]" />
                <span>Select</span>
              </button>

              {/* Add Node Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-label-sm font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
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

              {/* Auto Layout Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title="Auto Layout"
                  >
                    <Icon name="schema" className="text-[16px] text-primary" />
                    <span>Layout</span>
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

              {/* Map Theme Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title="Map Theme"
                  >
                    <Icon name="palette" className="text-[16px]" />
                    <span>Theme</span>
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

              {/* AI Assistant Quick Toggle */}
              <button
                onClick={() => {
                  handleToggleAiPanel(true);
                  setRightPanelMode("ai");
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-semibold bg-[#eeedfd] text-[#5b50e6] hover:bg-[#e2e0fb] dark:bg-purple-950/60 dark:text-purple-300 transition-colors cursor-pointer"
                title="Open AI Assistant"
              >
                <Icon name="auto_awesome" className="text-[16px]" />
                <span>AI</span>
              </button>
            </div>
          )}
          {/* 4. FLOATING CANVAS CONTROLS */}
          {flowNodes.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-surface/95 backdrop-blur-md border border-outline-variant/30 rounded-full shadow-md flex items-center p-1.5 gap-1.5 z-10">
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
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showMiniMap
                    ? "bg-[#eeedfd] text-[#5b50e6] dark:bg-purple-950/50 dark:text-purple-300"
                    : "text-on-surface hover:bg-surface-container"
                }`}
                title="Toggle MiniMap"
              >
                <Icon name="map" className="text-[16px]" />
              </button>
              <button
                onClick={() => rfInstance?.fitView({ duration: 500, padding: 0.2 })}
                className="p-2 text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                title="Fit View"
              >
                <Icon name="crop_free" className="text-[16px]" />
              </button>
              <button
                onClick={() => rfInstance?.zoomOut({ duration: 250 })}
                className="p-2 text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <Icon name="remove" className="text-[16px]" />
              </button>
              <button
                onClick={() => rfInstance?.zoomTo(1, { duration: 250 })}
                className="px-2.5 py-1 text-label-sm font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors min-w-[52px] text-center cursor-pointer"
                title="Click to reset zoom to 100%"
              >
                {zoomLevel}%
              </button>
              <button
                onClick={() => rfInstance?.zoomIn({ duration: 250 })}
                className="p-2 text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                title="Zoom In"
              >
                <Icon name="add" className="text-[16px]" />
              </button>
            </div>
          )}

          {/* Floating Canvas Action Pills (Presentation + AI Assistant) */}
          {flowNodes.length > 0 && (
            <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
              <button
                onClick={() => navigate({ to: "/present/$mindMapId", params: { mindMapId: mindMapId || "" } })}
                className="bg-white/95 dark:bg-surface/95 backdrop-blur-md shadow-md hover:shadow-lg text-on-surface px-4 py-2 rounded-full flex items-center gap-2 border border-outline-variant/40 transition-all select-none cursor-pointer group hover:bg-surface-container"
                title="Start Presentation Mode"
                aria-label="Presentation Mode"
              >
                <Icon name="play_arrow" className="text-[17px] text-[#5b50e6] group-hover:scale-110 transition-transform" />
                <span className="text-label-sm font-semibold">Presentation</span>
              </button>
              {isAiPanelCollapsed && (
                <button
                  onClick={() => {
                    handleToggleAiPanel(true);
                    setRightPanelMode("ai");
                  }}
                  className="bg-white/95 dark:bg-surface/95 backdrop-blur-md shadow-md hover:shadow-lg text-on-surface px-4 py-2 rounded-full flex items-center gap-2 border border-outline-variant/40 transition-all select-none cursor-pointer group hover:bg-surface-container"
                  title="Open AI Assistant (Ctrl+Shift+A)"
                  aria-label="Open AI Assistant"
                >
                  <Icon name="auto_awesome" className="text-[16px] text-[#5b50e6] group-hover:rotate-12 transition-transform" />
                  <span className="text-label-sm font-semibold">AI Assistant</span>
                </button>
              )}
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







          {/* Panel Header Matching Reference Mockup */}
          <div className="flex items-center justify-between px-4 h-[44px] border-b border-outline-variant/30 bg-white dark:bg-surface select-none shrink-0">
            <div className="flex items-center gap-6 h-full">
              <button
                type="button"
                onClick={() => setRightPanelMode("ai")}
                className={`relative h-full flex items-center gap-1.5 text-[13px] font-semibold transition-all cursor-pointer ${
                  rightPanelMode === "ai"
                    ? "text-[#5b50e6] dark:text-purple-400 font-bold"
                    : "text-gray-500 hover:text-gray-900 dark:text-on-surface-variant dark:hover:text-on-surface"
                }`}
                title="AI Assistant"
                aria-label="AI Assistant view"
              >
                <Icon name="auto_awesome" className="text-[16px]" />
                <span>AI Assistant</span>
                {rightPanelMode === "ai" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5b50e6] rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setRightPanelMode("inspector")}
                className={`relative h-full flex items-center gap-1.5 text-[13px] font-semibold transition-all cursor-pointer ${
                  rightPanelMode === "inspector"
                    ? "text-[#5b50e6] dark:text-purple-400 font-bold"
                    : "text-gray-500 hover:text-gray-900 dark:text-on-surface-variant dark:hover:text-on-surface"
                }`}
                title="Inspector"
                aria-label="Inspector view"
              >
                <Icon name="tune" className="text-[16px]" />
                <span>Inspector</span>
                {rightPanelMode === "inspector" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5b50e6] rounded-full" />
                )}
              </button>
            </div>
            {/* Header Action: Close */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => handleToggleAiPanel(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-on-surface-variant dark:hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                title="Close panel"
                aria-label="Close panel"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
          </div>
          {/* Panel Body */}







          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-container-lowest">







            {rightPanelMode === "ai" ? (
              <AiAssistantPanel
                messages={chatMessages}
                isChatting={isChatting}
                chatInput={chatInput}
                onChatInputChange={setChatInput}
                onSendChat={handleSendChat}
                selectedNode={selectedNode}
                aiScope={aiScope}
                onChangeScope={setAiScope}
                onPreviewChanges={handlePreviewChanges}
                onApplyChanges={handleApplyChanges}
                onDismissChanges={handleDismissChanges}
                onUndoAIChat={handleUndoAIChat}
                projectDocuments={projectDocuments}
                onOpenKnowledgeBase={() => setIsKnowledgeModalOpen(true)}
                onClearSelection={() => setSelectedNodeId(null)}
                allNodes={flowNodes}
                onClose={() => handleToggleAiPanel(false)}
              />
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



                <Inspector
                  selectedNode={selectedNode}
                  allNodes={flowNodes}
                  allEdges={flowEdges}
                  currentTheme={currentTheme}
                  currentLayout={currentLayout}
                  mindMapTitle={mindMapTitle}
                  onClose={() => handleToggleAiPanel(false)}
                  onUpdateTitle={(title) => {
                    setMindMapTitle(title);
                    if (mindMapId && title.trim()) {
                      updateMindMap(mindMapId, { title: title.trim() });
                    }
                  }}
                  onUpdateNodeData={(nodeId, updates) => {
                    setFlowNodes((nds) => {
                      const nextNodes = nds.map((n) => {
                        if (n.id === nodeId) {
                          const nextData = { ...n.data, ...updates };
                          return { ...n, data: nextData };
                        }
                        return n;
                      });
                      pushToHistory(nextNodes, flowEdges);
                      return nextNodes;
                    });
                    if (updates.label !== undefined || updates.semanticType !== undefined) {
                      updateNode(nodeId, {
                        label: updates.label as string,
                        type: updates.semanticType as string,
                      }).catch((e) => console.error("Failed to update node on backend", e));
                    }
                    try {
                      const rawMeta = localStorage.getItem(`mindmap_node_metadata_${mindMapId}`) || "{}";
                      const parsedMeta = JSON.parse(rawMeta);
                      parsedMeta[nodeId] = { ...(parsedMeta[nodeId] || {}), ...updates };
                      localStorage.setItem(`mindmap_node_metadata_${mindMapId}`, JSON.stringify(parsedMeta));
                    } catch (e) {
                      console.error("Failed to save local metadata", e);
                    }
                  }}
                  onUpdateNodeOverride={handleUpdateNodeOverride}
                  onResetNodeOverride={handleResetNodeOverride}
                  onAddChild={(parentId) => {
                    setSelectedNodeId(parentId);
                    handleAddChildNode();
                  }}
                  onAddSibling={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    handleAddSiblingNode();
                  }}
                  onDeleteNode={(nodeId) => {
                    const targetNode = flowNodes.find((n) => n.id === nodeId);
                    if (targetNode) {
                      setConfirmAction({
                        type: "delete",
                        nodeId: targetNode.id,
                        nodeLabel: (targetNode.data.label as string) || "Selected Node",
                      });
                    }
                  }}
                  onStartConnect={(sourceNodeId) => {
                    setActiveTool("connect");
                    setConnectSourceNodeId(sourceNodeId);
                    setSelectedNodeId(sourceNodeId);
                    toast.info("Source selected. Click target node to connect.");
                  }}
                  onSelectNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    const target = flowNodes.find((n) => n.id === nodeId);
                    if (target && rfInstance) {
                      rfInstance.setCenter(target.position.x, target.position.y, { zoom: 1.1, duration: 400 });
                    }
                  }}
                  onApplyLayout={handleApplyLayout}
                  onSelectTheme={handleSelectTheme}
                  onAIExpand={handleExpandNode}
                  onAISummarize={handleSummarizeNode}
                  onAIFindConnections={handleFindConnections}
                  onAIRegenerate={(nodeId, label) => setConfirmAction({ type: "regenerate", nodeId, nodeLabel: label })}
                  onFocusNode={(nodeId) => {
                    setFocusedNodeId(nodeId);
                    const target = flowNodes.find((n) => n.id === nodeId);
                    if (target && rfInstance) {
                      rfInstance.setCenter(target.position.x, target.position.y, { zoom: 1.2, duration: 600 });
                    }
                  }}
                  showGrid={showGrid}
                  onToggleGrid={() => setShowGrid(!showGrid)}
                  showMiniMap={showMiniMap}
                  onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}
                  onFitView={() => rfInstance?.fitView({ duration: 500, padding: 0.25, maxZoom: 1.05 })}
                  onAddCentralNode={handleAddRootNode}
                />







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







