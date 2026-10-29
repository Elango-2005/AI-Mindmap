import React, { useState, useEffect } from "react";
import { Icon } from "@/components/Icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import type { NodeStyleOverride, SemanticNodeType } from "@/types/semanticGraph";
import type { LayoutDirection } from "@/lib/layoutAlgorithms";
export type ThemeMode = "modern" | "minimal" | "colorful" | string;

interface InspectorProps {
  selectedNode: FlowNode | null;
  allNodes: FlowNode[];
  allEdges: FlowEdge[];
  currentTheme: ThemeMode | string;
  currentLayout: LayoutDirection | string;
  mindMapTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateNodeData: (nodeId: string, updates: Partial<FlowNode["data"]>) => void;
  onUpdateNodeOverride: (nodeId: string, override: Partial<NodeStyleOverride>) => void;
  onResetNodeOverride: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onStartConnect: (sourceNodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onApplyLayout: (layout: LayoutDirection) => void;
  onSelectTheme: (theme: ThemeMode) => void;
  onAIExpand?: (nodeId: string) => void;
  onAISummarize?: (nodeId: string) => void;
  onAIFindConnections?: (nodeId: string) => void;
  onAIRegenerate?: (nodeId: string, label: string) => void;
  onFocusNode?: (nodeId: string) => void;
  onClose?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showMiniMap?: boolean;
  onToggleMiniMap?: () => void;
  onFitView?: () => void;
  onAddCentralNode?: () => void;
}

const COMMON_ICONS = [
  { key: "database", label: "Database", icon: "database" },
  { key: "lightbulb", label: "Idea", icon: "lightbulb" },
  { key: "check_circle", label: "Done", icon: "check_circle" },
  { key: "auto_awesome", label: "AI / Sparkle", icon: "auto_awesome" },
  { key: "bar_chart", label: "Analytics", icon: "bar_chart" },
  { key: "dns", label: "Server", icon: "dns" },
  { key: "hub", label: "Network", icon: "hub" },
  { key: "build", label: "Tools", icon: "build" },
  { key: "star", label: "Star", icon: "star" },
  { key: "flag", label: "Goal", icon: "flag" },
  { key: "bookmark", label: "Note", icon: "bookmark" },
  { key: "help", label: "Help", icon: "help" },
  { key: "bolt", label: "Fast", icon: "bolt" },
  { key: "warning", label: "Alert", icon: "warning" },
  { key: "info", label: "Info", icon: "info" },
];

const NODE_TYPES: { key: SemanticNodeType; label: string; icon: string }[] = [
  { key: "root", label: "Root Topic", icon: "account_tree" },
  { key: "topic", label: "Topic", icon: "folder" },
  { key: "concept", label: "Concept", icon: "description" },
  { key: "detail", label: "Detail", icon: "subtitles" },
  { key: "task", label: "Action Task", icon: "check_circle" },
  { key: "insight", label: "Key Insight", icon: "lightbulb" },
  { key: "ai_suggestion", label: "AI Suggestion", icon: "auto_awesome" },
];

const STATUS_OPTIONS = [
  { key: "none", label: "None", color: "bg-slate-400" },
  { key: "todo", label: "To Do", color: "bg-blue-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "review", label: "In Review", color: "bg-purple-500" },
  { key: "done", label: "Done", color: "bg-emerald-500" },
  { key: "blocked", label: "Blocked", color: "bg-rose-500" },
];

export function Inspector({
  selectedNode,
  allNodes,
  allEdges,
  currentTheme,
  currentLayout,
  mindMapTitle,
  onUpdateTitle,
  onUpdateNodeData,
  onUpdateNodeOverride,
  onResetNodeOverride,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  onStartConnect,
  onSelectNode,
  onApplyLayout,
  onSelectTheme,
  onAIExpand,
  onAISummarize,
  onAIFindConnections,
  onAIRegenerate,
  onFocusNode,
  showGrid = false,
  onToggleGrid,
  showMiniMap = true,
  onToggleMiniMap,
  onFitView,
  onAddCentralNode,
  onClose,
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<"content" | "appearance" | "structure" | "ai">("content");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  // Sync title & description local inputs with selected node
  const [labelInput, setLabelInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");

  useEffect(() => {
    if (selectedNode) {
      setLabelInput((selectedNode.data?.label as string) || "");
      setDescriptionInput(
        (selectedNode.data?.description as string) ||
        (selectedNode.data?.notes as string) ||
        ""
      );
    }
  }, [selectedNode?.id, selectedNode?.data?.label, selectedNode?.data?.description, selectedNode?.data?.notes]);

  // If no node selected, display the Mind Map Overview
  if (!selectedNode) {
    return (
      <div className="p-4 flex flex-col gap-6 overflow-y-auto h-full text-on-surface select-none">
        {/* Map Overview Header Card */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon name="account_tree" className="text-[22px]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">
                Mind Map Overview
              </span>
              <input
                type="text"
                value={mindMapTitle}
                onChange={(e) => onUpdateTitle(e.target.value)}
                className="font-bold text-body-lg text-on-surface bg-transparent border-none outline-none w-full truncate focus:bg-surface focus:px-1.5 focus:py-0.5 rounded transition-all"
                title="Click to rename mind map"
                placeholder="Mind Map Title"
              />
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-on-surface-variant dark:hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer self-start shrink-0"
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            )}
            
          </div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant/80 pt-1 border-t border-outline-variant/20">
            <span>Theme: <strong className="capitalize text-on-surface">{currentTheme}</strong></span>
            <span>Layout: <strong className="capitalize text-on-surface">{currentLayout}</strong></span>
          </div>
        </div>

        {/* Canvas Metrics */}
        <div className="space-y-2">
          <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">
            Canvas Metrics
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Icon name="circle" className="text-[16px]" />
              </div>
              <div>
                <span className="text-[11px] text-outline block">Total Nodes</span>
                <span className="text-title-md font-bold text-on-surface">{allNodes.length}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Icon name="fork_right" className="text-[16px]" />
              </div>
              <div>
                <span className="text-[11px] text-outline block">Branches</span>
                <span className="text-title-md font-bold text-on-surface">
                  {allNodes.filter(n => n.data?.depth === 1 || (!allEdges.some(e => e.target === n.id) && allNodes.length > 1)).length || 1}
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
                  {Math.max(0, ...allNodes.map(n => Number(n.data?.depth || 0)))}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Icon name="timeline" className="text-[16px]" />
              </div>
              <div>
                <span className="text-[11px] text-outline block">Connections</span>
                <span className="text-title-md font-bold text-on-surface">{allEdges.length}</span>
              </div>
            </div>
            
          </div>
        </div>

        <div className="h-px bg-outline-variant/30" />

        {/* Global Layout Switcher */}
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
                onClick={() => onApplyLayout(item.key)}
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
                onClick={() => onSelectTheme(thm.key)}
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

        {/* Canvas Display Toggles */}
        <div className="space-y-3">
          <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">Display Options</span>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
              <div className="flex items-center gap-2 text-xs font-medium text-on-surface">
                <Icon name="grid_view" className="text-[16px] text-on-surface-variant" />
                <span>Canvas Grid</span>
              </div>
              {onToggleGrid && (
                <button
                  type="button"
                  onClick={onToggleGrid}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    showGrid ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {showGrid ? "On" : "Off"}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
              <div className="flex items-center gap-2 text-xs font-medium text-on-surface">
                <Icon name="map" className="text-[16px] text-on-surface-variant" />
                <span>MiniMap</span>
              </div>
              {onToggleMiniMap && (
                <button
                  type="button"
                  onClick={onToggleMiniMap}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    showMiniMap ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {showMiniMap ? "On" : "Off"}
                </button>
              )}
            </div>
            
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onFitView && (
              <button
                type="button"
                onClick={onFitView}
                className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Icon name="crop_free" className="text-[16px]" />
                <span>Fit to Screen</span>
              </button>
            )}
            {onAddCentralNode && (
              <button
                type="button"
                onClick={onAddCentralNode}
                className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Icon name="add" className="text-[16px]" />
                <span>Add Central Node</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Node is selected
  const nodeData = selectedNode.data || {};
  const currentOverride: NodeStyleOverride = (nodeData.styleOverride as NodeStyleOverride) || {};
  const hasOverrides = !!(currentOverride.shape || currentOverride.color || currentOverride.icon);
  const nodeType = (nodeData.semanticType as SemanticNodeType) || (nodeData.depth === 0 ? "root" : "concept");
  const depth = (nodeData.depth as number) ?? 0;
  const currentIcon = (currentOverride.icon && currentOverride.icon !== "auto" && currentOverride.icon !== "none")
    ? currentOverride.icon
    : (nodeData.visualConfig?.iconName || (nodeType === "root" ? "psychology" : "folder"));

  const tags = (nodeData.tags as string[]) || (nodeData.metadata?.tags as string[]) || [];
  const status = (nodeData.status as string) || (nodeData.metadata?.status as string) || "none";
  const parentEdge = allEdges.find((e) => e.target === selectedNode.id);
  const parentNode = parentEdge ? allNodes.find((n) => n.id === parentEdge.source) : null;
  const directChildren = allEdges.filter((e) => e.source === selectedNode.id);

  const handleCommitLabel = () => {
    const trimmed = labelInput.trim();
    if (trimmed && trimmed !== nodeData.label) {
      onUpdateNodeData(selectedNode.id, { label: trimmed });
    }
  };

  const handleCommitDescription = () => {
    if (descriptionInput !== (nodeData.description || nodeData.notes || "")) {
      onUpdateNodeData(selectedNode.id, { description: descriptionInput, notes: descriptionInput });
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const nextTags = [...tags, trimmed];
      onUpdateNodeData(selectedNode.id, { tags: nextTags });
      setNewTagInput("");
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    onUpdateNodeData(selectedNode.id, { tags: nextTags });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-container-lowest">
      {/* 1. Header Card Matching Reference Image */}
      <div className="p-4 border-b border-outline-variant/30 bg-surface">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-surface border border-outline-variant/40 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Icon name={currentIcon} className="text-[20px]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[14px] text-gray-900 dark:text-on-surface truncate">
                {(nodeData.label as string) || "Untitled Node"}
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-on-surface-variant capitalize">
                {nodeType} node • Level {depth}
              </p>
            </div>
            
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                  title="Node Options"
                  aria-label="Node options"
                >
                  <Icon name="more_vert" className="text-[18px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onAddChild(selectedNode.id)} className="cursor-pointer">
                  <Icon name="subdirectory_arrow_right" className="mr-2 text-[16px]" /> Add Child
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddSibling(selectedNode.id)} className="cursor-pointer">
                  <Icon name="view_stream" className="mr-2 text-[16px]" /> Add Sibling
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStartConnect(selectedNode.id)} className="cursor-pointer">
                  <Icon name="link" className="mr-2 text-[16px]" /> Connect
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onResetNodeOverride(selectedNode.id)} className="cursor-pointer">
                  <Icon name="restart_alt" className="mr-2 text-[16px]" /> Reset Style
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeleteNode(selectedNode.id)} className="cursor-pointer text-error">
                  <Icon name="delete" className="mr-2 text-[16px]" /> Delete Node
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-on-surface-variant dark:hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Sub-Tabs Bar: Content | Appearance | Structure | AI Actions */}
        <div className="flex items-center border-b border-outline-variant/30 mt-3 -mx-4 px-4 gap-6">
          {[
            { key: "content" as const, label: "Content" },
            { key: "appearance" as const, label: "Appearance" },
            { key: "structure" as const, label: "Structure" },
            { key: "ai" as const, label: "AI Actions" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 text-[13px] font-semibold transition-all relative cursor-pointer ${
                activeTab === tab.key
                  ? "text-[#5b50e6] dark:text-purple-400 font-bold"
                  : "text-gray-500 hover:text-gray-900 dark:text-on-surface-variant dark:hover:text-on-surface"
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5b50e6] dark:bg-purple-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tab Contents Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: CONTENT */}
        {activeTab === "content" && (
          <div className="space-y-4">
            {/* Title Field */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-on-surface-variant mb-1.5 block">
                Title
              </label>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onBlur={handleCommitLabel}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommitLabel();
                }}
                className="w-full bg-white dark:bg-surface border border-outline-variant/50 rounded-xl px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-2xs font-medium"
                placeholder="Node Title..."
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-on-surface-variant mb-1.5 block">
                Description
              </label>
              <textarea
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                onBlur={handleCommitDescription}
                rows={3}
                placeholder="Data preparation, feature engineering, embeddings and version control for ML systems."
                className="w-full bg-white dark:bg-surface border border-outline-variant/50 rounded-xl p-3 text-[13px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none resize-none transition-all shadow-2xs leading-relaxed"
              />
            </div>

            {/* Icon Row */}
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-on-surface-variant">Icon</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <Icon name={currentIcon} className="text-[18px]" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="px-2.5 py-1.5 rounded-lg border border-outline-variant/40 bg-white dark:bg-surface hover:bg-surface-container text-xs font-medium text-on-surface flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Change Icon"
                      aria-label="Change node icon"
                    >
                      <span>Change</span>
                      <Icon name="arrow_drop_down" className="text-[14px] opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 max-h-60 overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => onUpdateNodeOverride(selectedNode.id, { icon: "auto" })}
                      className="cursor-pointer"
                    >
                      <Icon name="auto_mode" className="mr-2 text-[16px]" /> Auto (Theme)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdateNodeOverride(selectedNode.id, { icon: "none" })}
                      className="cursor-pointer text-error"
                    >
                      <Icon name="block" className="mr-2 text-[16px]" /> Remove Icon
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {COMMON_ICONS.map((ic) => (
                      <DropdownMenuItem
                        key={ic.key}
                        onClick={() => onUpdateNodeOverride(selectedNode.id, { icon: ic.key })}
                        className="cursor-pointer"
                      >
                        <Icon name={ic.icon} className="mr-2 text-[16px] text-primary" /> {ic.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Node Type Row */}
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-on-surface-variant">Node Type</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-white dark:bg-surface hover:bg-surface-container text-xs font-medium text-on-surface flex items-center gap-2 cursor-pointer transition-colors shadow-2xs min-w-[120px] justify-between"
                    title="Change Node Semantic Type"
                    aria-label="Change node type"
                  >
                    <div className="flex items-center gap-1.5 capitalize">
                      <Icon name={NODE_TYPES.find((t) => t.key === nodeType)?.icon || "folder"} className="text-[15px] text-primary" />
                      <span>{nodeType}</span>
                    </div>
                    <Icon name="arrow_drop_down" className="text-[14px] opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {NODE_TYPES.map((typeOption) => (
                    <DropdownMenuItem
                      key={typeOption.key}
                      onClick={() => onUpdateNodeData(selectedNode.id, { semanticType: typeOption.key })}
                      className="cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Icon name={typeOption.icon} className="text-[16px]" />
                        <span>{typeOption.label}</span>
                      </div>
                      {nodeType === typeOption.key && <Icon name="check" className="text-primary text-[14px]" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status Row */}
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-on-surface-variant">Status</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-white dark:bg-surface hover:bg-surface-container text-xs font-medium text-on-surface flex items-center gap-2 cursor-pointer transition-colors shadow-2xs min-w-[120px] justify-between"
                    title="Change Task Status"
                    aria-label="Change task status"
                  >
                    <div className="flex items-center gap-2 capitalize">
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_OPTIONS.find((s) => s.key === status)?.color || "bg-slate-400"}`} />
                      <span>{STATUS_OPTIONS.find((s) => s.key === status)?.label || "None"}</span>
                    </div>
                    <Icon name="arrow_drop_down" className="text-[14px] opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {STATUS_OPTIONS.map((st) => (
                    <DropdownMenuItem
                      key={st.key}
                      onClick={() => onUpdateNodeData(selectedNode.id, { status: st.key })}
                      className="cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                        <span>{st.label}</span>
                      </div>
                      {status === st.key && <Icon name="check" className="text-primary text-[14px]" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tags Row */}
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-on-surface-variant">Tags</span>
                {!isAddingTag && (
                  <button
                    onClick={() => setIsAddingTag(true)}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="add" className="text-[14px]" />
                    <span>Add</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container-high border border-outline-variant/30 text-on-surface"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-on-surface-variant hover:text-error transition-colors ml-0.5 cursor-pointer"
                      title={`Remove tag ${tag}`}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <Icon name="close" className="text-[12px]" />
                    </button>
                  </span>
                ))}
                {isAddingTag && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTag();
                        if (e.key === "Escape") setIsAddingTag(false);
                      }}
                      placeholder="Tag name..."
                      className="text-xs px-2 py-1 rounded-lg border border-primary bg-white dark:bg-surface outline-none w-24"
                    />
                    <button
                      onClick={handleAddTag}
                      className="p-1 rounded-md bg-primary text-white hover:bg-primary/90 text-xs cursor-pointer"
                      title="Save tag"
                    >
                      <Icon name="check" className="text-[12px]" />
                    </button>
                    <button
                      onClick={() => setIsAddingTag(false)}
                      className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container text-xs cursor-pointer"
                      title="Cancel"
                    >
                      <Icon name="close" className="text-[12px]" />
                    </button>
                  </div>
                )}
                {tags.length === 0 && !isAddingTag && (
                  <span className="text-xs text-on-surface-variant/60 italic">No tags added yet</span>
                )}
              </div>
            </div>

            <div className="h-px bg-outline-variant/30 pt-2" />

            {/* Bottom Delete Node Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onDeleteNode(selectedNode.id)}
                className="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                title="Delete this node and all connected children"
                aria-label="Delete node"
              >
                <Icon name="delete" className="text-[16px]" />
                <span>Delete Node</span>
              </button>
            </div>
            
          </div>
        )}

        {/* TAB 2: APPEARANCE */}
        {activeTab === "appearance" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-label-xs font-bold text-outline uppercase tracking-wider">Shape & Style</span>
              {hasOverrides && (
                <button
                  onClick={() => onResetNodeOverride(selectedNode.id)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  title="Reset all styling overrides to theme default"
                >
                  <Icon name="restart_alt" className="text-[13px]" />
                  <span>Reset to Auto</span>
                </button>
              )}
            </div>

            {/* Shape Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-on-surface-variant">Container Shape</label>
                <span className="text-[11px] text-outline capitalize">{currentOverride.shape || "Auto (Theme)"}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                {[
                  { key: "auto", label: "Auto", icon: "auto_mode" },
                  { key: "rounded", label: "Rounded", icon: "crop_portrait" },
                  { key: "pill", label: "Pill", icon: "radio_button_checked" },
                  { key: "minimal", label: "Minimal", icon: "horizontal_rule" },
                ].map((s) => {
                  const isActive = (currentOverride.shape || "auto") === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => onUpdateNodeOverride(selectedNode.id, { shape: s.key as any })}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-surface text-primary shadow-xs font-semibold border border-primary/20"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50"
                      }`}
                      title={`Select ${s.label} shape`}
                    >
                      <Icon name={s.icon} className="text-[16px] mb-1" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Accent */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-on-surface-variant">Color Mode</label>
                <span className="text-[11px] text-outline capitalize">{currentOverride.color || "Auto (Branch)"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "auto", label: "Branch", desc: "Theme Palette", colorDot: "bg-indigo-500" },
                  { key: "neutral", label: "Neutral", desc: "Subtle Slate", colorDot: "bg-slate-400" },
                  { key: "accent", label: "Accent", desc: "Bold Accent", colorDot: "bg-amber-500" },
                ].map((c) => {
                  const isActive = (currentOverride.color || "auto") === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => onUpdateNodeOverride(selectedNode.id, { color: c.key as any })}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary/5 border-primary text-on-surface shadow-xs font-semibold"
                          : "bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60"
                      }`}
                      title={c.desc}
                    >
                      <span className={`w-3 h-3 rounded-full shrink-0 ${c.colorDot}`} />
                      <div className="truncate">
                        <div className="text-xs">{c.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icon Picker Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-on-surface-variant">Icon Selection</label>
                {currentOverride.icon && currentOverride.icon !== "auto" && (
                  <button
                    onClick={() => onUpdateNodeOverride(selectedNode.id, { icon: "auto" })}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    Auto
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5 bg-surface-container-low p-2 rounded-xl border border-outline-variant/30">
                {COMMON_ICONS.slice(0, 10).map((ic) => {
                  const isActive = currentOverride.icon === ic.key;
                  return (
                    <button
                      key={ic.key}
                      onClick={() => onUpdateNodeOverride(selectedNode.id, { icon: ic.key })}
                      title={ic.label}
                      className={`h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-surface text-primary shadow-xs border border-primary/30"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50"
                      }`}
                    >
                      <Icon name={ic.icon} className="text-[18px]" />
                    </button>
                  );
                })}
              </div>
            </div>
            
          </div>
        )}

        {/* TAB 3: STRUCTURE */}
        {activeTab === "structure" && (
          <div className="space-y-4">
            <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">
              Node Hierarchy & Graph Actions
            </span>

            {/* Action Buttons: Add Child, Add Sibling, Connect */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAddChild(selectedNode.id)}
                className="p-3 rounded-xl bg-white dark:bg-surface border border-outline-variant/40 hover:border-primary/40 hover:shadow-2xs text-left transition-all flex flex-col gap-1 cursor-pointer group"
                title="Add Child Node (Tab)"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="subdirectory_arrow_right" className="text-[16px]" />
                </div>
                <span className="text-[13px] font-semibold text-on-surface mt-1 group-hover:text-primary">
                  Add Child
                </span>
                <span className="text-[11px] text-on-surface-variant">Shortcut: Tab</span>
              </button>

              <button
                type="button"
                onClick={() => onAddSibling(selectedNode.id)}
                className="p-3 rounded-xl bg-white dark:bg-surface border border-outline-variant/40 hover:border-primary/40 hover:shadow-2xs text-left transition-all flex flex-col gap-1 cursor-pointer group"
                title="Add Sibling Node"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Icon name="view_stream" className="text-[16px]" />
                </div>
                <span className="text-[13px] font-semibold text-on-surface mt-1 group-hover:text-primary">
                  Add Sibling
                </span>
                <span className="text-[11px] text-on-surface-variant">Same Parent</span>
              </button>

              <button
                type="button"
                onClick={() => onStartConnect(selectedNode.id)}
                className="col-span-2 p-3 rounded-xl bg-white dark:bg-surface border border-outline-variant/40 hover:border-primary/40 hover:shadow-2xs text-left transition-all flex items-center justify-between cursor-pointer group"
                title="Connect to another node"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Icon name="link" className="text-[16px]" />
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold text-on-surface block group-hover:text-primary">
                      Connect to Node...
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Creates a cross-branch relationship edge
                    </span>
                  </div>
                </div>
                <Icon name="chevron_right" className="text-on-surface-variant text-[18px]" />
              </button>
            </div>

            <div className="h-px bg-outline-variant/30" />

            {/* Parent Relationship Card */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">
                Parent Relationship
              </label>
              {parentNode ? (
                <button
                  type="button"
                  onClick={() => onSelectNode(parentNode.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-surface border border-outline-variant/40 hover:border-primary/40 transition-all text-left group cursor-pointer shadow-2xs"
                  title="Jump to Parent Node"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="arrow_upward" className="text-primary text-[16px] shrink-0" />
                    <span className="text-[13px] font-medium truncate text-on-surface">
                      {(parentNode.data?.label as string) || "Untitled Node"}
                    </span>
                  </div>
                  <span className="text-xs text-primary group-hover:underline shrink-0 font-semibold">Jump</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant text-xs">
                  <Icon name="hub" className="text-[16px] text-primary" />
                  <span>Central Root Concept (Level 0)</span>
                </div>
              )}
            </div>

            {/* Subnodes Statistics */}
            <div className="p-3 rounded-xl bg-white dark:bg-surface border border-outline-variant/40 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-semibold text-on-surface block">Direct Children</span>
                <span className="text-[11px] text-on-surface-variant">{directChildren.length} sub-branches connected</span>
              </div>
              <span className="font-bold text-title-sm text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                {directChildren.length}
              </span>
            </div>
            
          </div>
        )}

        {/* TAB 4: AI ACTIONS */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <span className="text-label-xs font-bold text-outline uppercase tracking-wider block">
              AI Generation & Assistance
            </span>

            <div className="grid grid-cols-2 gap-2">
              {onAIExpand && (
                <button
                  onClick={() => onAIExpand(selectedNode.id)}
                  className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-white dark:bg-surface border border-outline-variant/40 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                >
                  <Icon name="account_tree" className="text-primary text-[18px]" />
                  <span className="font-semibold text-on-surface text-[13px] mt-1">Expand</span>
                  <span className="text-[11px] text-on-surface-variant">Generate sub-branches</span>
                </button>
              )}

              {onAISummarize && (
                <button
                  onClick={() => onAISummarize(selectedNode.id)}
                  className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-white dark:bg-surface border border-outline-variant/40 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                >
                  <Icon name="short_text" className="text-primary text-[18px]" />
                  <span className="font-semibold text-on-surface text-[13px] mt-1">Summarize</span>
                  <span className="text-[11px] text-on-surface-variant">Condense branch details</span>
                </button>
              )}

              {onAIFindConnections && (
                <button
                  onClick={() => onAIFindConnections(selectedNode.id)}
                  className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-white dark:bg-surface border border-outline-variant/40 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                >
                  <Icon name="hub" className="text-primary text-[18px]" />
                  <span className="font-semibold text-on-surface text-[13px] mt-1">Connections</span>
                  <span className="text-[11px] text-on-surface-variant">Find cross-links</span>
                </button>
              )}

              {onAIRegenerate && (
                <button
                  onClick={() => onAIRegenerate(selectedNode.id, (selectedNode.data?.label as string) || "")}
                  className="flex flex-col items-start gap-1 p-3 hover:bg-primary/5 bg-white dark:bg-surface border border-outline-variant/40 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                >
                  <Icon name="auto_awesome" className="text-primary text-[18px]" />
                  <span className="font-semibold text-on-surface text-[13px] mt-1">Regenerate</span>
                  <span className="text-[11px] text-on-surface-variant">Re-create branch ideas</span>
                </button>
              )}

              {onFocusNode && (
                <button
                  onClick={() => onFocusNode(selectedNode.id)}
                  className="col-span-2 flex items-center justify-between p-3 hover:bg-primary/5 bg-white dark:bg-surface border border-outline-variant/40 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name="center_focus_strong" className="text-primary text-[18px]" />
                    <div>
                      <div className="font-semibold text-on-surface text-[13px]">Focus Branch</div>
                      <div className="text-[11px] text-on-surface-variant">Dim outer canvas and center view</div>
                    </div>
                  </div>
                  <Icon name="chevron_right" className="text-on-surface-variant text-[16px]" />
                </button>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
