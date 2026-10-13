import React, { useState, useMemo } from "react";
import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { Icon } from "@/components/Icon";
import { THEME_PALETTES, type ThemeKey } from "@/lib/graphColoring";
import { type LayoutDirection } from "@/lib/layoutAlgorithms";

export type LeftToolView = "outline" | "add_node" | "layout" | "view";

interface LeftToolPanelProps {
  activeView: LeftToolView;
  onClose: () => void;
  // Node outline data
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  // Node creation handlers
  onAddRootNode: () => void;
  onAddChildNode: () => void;
  onAddSiblingNode: () => void;
  onAddTemplateNode: (label: string, category?: string) => void;
  // Layout handlers
  currentLayout: LayoutDirection;
  onApplyLayout: (layout: LayoutDirection) => void;
  // View & theme handlers
  currentTheme: ThemeKey;
  onSelectTheme: (theme: ThemeKey) => void;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  focusedNodeId: string | null;
  onToggleFocus: (nodeId: string | null) => void;
  onFitView: () => void;
  onResetZoom: () => void;
}

interface OutlineNode {
  id: string;
  label: string;
  depth: number;
  children: OutlineNode[];
}

export function LeftToolPanel({
  activeView,
  onClose,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onAddRootNode,
  onAddChildNode,
  onAddSiblingNode,
  onAddTemplateNode,
  currentLayout,
  onApplyLayout,
  currentTheme,
  onSelectTheme,
  showMiniMap,
  onToggleMiniMap,
  showGrid,
  onToggleGrid,
  focusedNodeId,
  onToggleFocus,
  onFitView,
  onResetZoom,
}: LeftToolPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedOutlineIds, setCollapsedOutlineIds] = useState<Set<string>>(new Set());

  // Construct hierarchy tree from nodes & edges
  const treeData = useMemo(() => {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, FlowNode>();

    nodes.forEach((n) => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
      nodeMap.set(n.id, n);
    });

    edges.forEach((e) => {
      if (adj.has(e.source) && inDegree.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        inDegree.set(e.target, inDegree.get(e.target)! + 1);
      }
    });

    const roots = nodes.filter((n) => inDegree.get(n.id) === 0);
    const startRoots = roots.length > 0 ? roots : nodes.slice(0, 1);

    function buildTreeNode(nodeId: string, depth: number): OutlineNode | null {
      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const childrenIds = adj.get(nodeId) || [];
      const children: OutlineNode[] = [];

      for (const childId of childrenIds) {
        const childNode = buildTreeNode(childId, depth + 1);
        if (childNode) children.push(childNode);
      }

      return {
        id: node.id,
        label: (node.data.label as string) || "Untitled Node",
        depth,
        children,
      };
    }

    return startRoots
      .map((r) => buildTreeNode(r.id, 0))
      .filter((n): n is OutlineNode => n !== null);
  }, [nodes, edges]);

  const toggleOutlineCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedOutlineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTreeItem = (item: OutlineNode) => {
    const isSelected = selectedNodeId === item.id;
    const hasChildren = item.children.length > 0;
    const isCollapsed = collapsedOutlineIds.has(item.id);
    const matchesSearch =
      !searchQuery ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <div key={item.id} className="flex flex-col select-none">
        <div
          onClick={() => onSelectNode(item.id)}
          className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors text-body-sm ${
            isSelected
              ? "bg-primary/10 text-primary font-medium"
              : matchesSearch
              ? "text-on-surface hover:bg-surface-container"
              : "text-on-surface/40 hover:bg-surface-container/50"
          }`}
          style={{ paddingLeft: `${Math.max(8, item.depth * 14 + 6)}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => toggleOutlineCollapse(item.id, e)}
              className="p-0.5 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface"
              aria-label={isCollapsed ? "Expand branch" : "Collapse branch"}
            >
              <Icon
                name={isCollapsed ? "chevron_right" : "expand_more"}
                className="text-[14px]"
              />
            </button>
          ) : (
            <span className="w-4 h-4 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-outline/50" />
            </span>
          )}

          <span className="truncate flex-1" title={item.label}>
            {item.label}
          </span>
          {hasChildren && (
            <span className="text-[11px] text-outline px-1 rounded-full bg-surface-container-low shrink-0">
              {item.children.length}
            </span>
          )}
        </div>

        {!isCollapsed && hasChildren && (
          <div className="flex flex-col">
            {item.children.map((child) => renderTreeItem(child))}
          </div>
        )}
      </div>
    );
  };

  // Header Title & Icon config
  const viewMeta = {
    outline: { title: "Outline & Structure", icon: "list_alt" },
    add_node: { title: "Add Nodes & Topics", icon: "add_box" },
    layout: { title: "Layout & Alignment", icon: "account_tree" },
    view: { title: "Canvas & View", icon: "visibility" },
  }[activeView];

  return (
    <div className="flex flex-col h-full w-full bg-surface min-w-0 overflow-hidden select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-outline-variant/30 bg-surface shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon name={viewMeta.icon} className="text-[16px]" />
          </div>
          <h3 className="text-title-sm font-semibold text-on-surface truncate">
            {viewMeta.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded transition-colors"
            title="Collapse panel (Ctrl+B)"
            aria-label="Collapse panel"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      </div>

      {/* Panel Body by Active View */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* VIEW 1: OUTLINE */}
        {activeView === "outline" && (
          <div className="space-y-3">
            {/* Search */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/30 focus-within:border-primary">
              <Icon name="search" className="text-[16px] text-outline shrink-0" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-body-sm text-on-surface focus:outline-none placeholder:text-outline"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-outline hover:text-on-surface"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              )}
            </div>

            {/* Tree */}
            <div className="space-y-0.5">
              {treeData.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-outline">
                  <Icon name="account_tree" className="text-[32px] mb-2 opacity-50" />
                  <p className="text-body-sm">No nodes found in this map.</p>
                </div>
              ) : (
                treeData.map((root) => renderTreeItem(root))
              )}
            </div>

            <div className="pt-2 border-t border-outline-variant/20 text-label-xs text-outline flex items-center justify-between">
              <span>{nodes.length} nodes</span>
              <span>{edges.length} connections</span>
            </div>
          </div>
        )}

        {/* VIEW 2: ADD NODES */}
        {activeView === "add_node" && (
          <div className="space-y-4">
            <div>
              <label className="text-label-xs font-semibold text-outline uppercase tracking-wider block mb-2">
                Quick Actions
              </label>
              <div className="space-y-2">
                <button
                  onClick={onAddChildNode}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon name="subdirectory_arrow_right" className="text-[18px]" />
                    </div>
                    <div>
                      <div className="text-label-sm font-semibold text-on-surface">Add Child Node</div>
                      <div className="text-body-xs text-on-surface-variant">Attaches to selected node</div>
                    </div>
                  </div>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-container rounded border border-outline-variant/30 text-outline">
                    Tab
                  </kbd>
                </button>

                <button
                  onClick={onAddSiblingNode}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon name="add" className="text-[18px]" />
                    </div>
                    <div>
                      <div className="text-label-sm font-semibold text-on-surface">Add Sibling Node</div>
                      <div className="text-body-xs text-on-surface-variant">Creates parallel topic</div>
                    </div>
                  </div>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-container rounded border border-outline-variant/30 text-outline">
                    Enter
                  </kbd>
                </button>

                <button
                  onClick={onAddRootNode}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-primary/5 text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon name="center_focus_strong" className="text-[18px]" />
                  </div>
                  <div>
                    <div className="text-label-sm font-semibold text-on-surface">Add Floating Topic</div>
                    <div className="text-body-xs text-on-surface-variant">Creates an independent branch</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-label-xs font-semibold text-outline uppercase tracking-wider block mb-2">
                Node Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Idea", icon: "lightbulb", color: "text-amber-500 bg-amber-500/10" },
                  { label: "Action Item", icon: "task_alt", color: "text-emerald-500 bg-emerald-500/10" },
                  { label: "Question", icon: "help_outline", color: "text-sky-500 bg-sky-500/10" },
                  { label: "Risk / Alert", icon: "warning_amber", color: "text-rose-500 bg-rose-500/10" },
                  { label: "Goal", icon: "flag", color: "text-purple-500 bg-purple-500/10" },
                  { label: "Note", icon: "sticky_note_2", color: "text-indigo-500 bg-indigo-500/10" },
                ].map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => onAddTemplateNode(`New ${tpl.label}`, tpl.label)}
                    className="flex items-center gap-2 p-2 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-lg ${tpl.color} flex items-center justify-center shrink-0`}>
                      <Icon name={tpl.icon} className="text-[16px]" />
                    </div>
                    <span className="text-label-xs font-medium text-on-surface truncate">
                      {tpl.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-body-xs text-on-surface-variant space-y-1">
              <div className="font-semibold text-on-surface flex items-center gap-1.5">
                <Icon name="keyboard" className="text-[16px] text-primary" /> Quick Tip
              </div>
              <p>You can also click on the canvas to place a node or drag connectors between any two node handles.</p>
            </div>
          </div>
        )}

        {/* VIEW 3: LAYOUT */}
        {activeView === "layout" && (
          <div className="space-y-4">
            <div>
              <label className="text-label-xs font-semibold text-outline uppercase tracking-wider block mb-2">
                Automatic Layout
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: "balanced" as LayoutDirection,
                    title: "Balanced Radial",
                    desc: "Expands outwards in all directions with balanced branch spacing.",
                    icon: "bubble_chart",
                  },
                  {
                    id: "horizontal" as LayoutDirection,
                    title: "Horizontal Tree",
                    desc: "Left-to-right hierarchy, ideal for mind maps and structured thinking.",
                    icon: "align_horizontal_left",
                  },
                  {
                    id: "vertical" as LayoutDirection,
                    title: "Vertical Hierarchy",
                    desc: "Top-to-bottom layout, ideal for organizational structures.",
                    icon: "align_vertical_top",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onApplyLayout(item.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      currentLayout === item.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        currentLayout === item.id
                          ? "bg-primary text-white"
                          : "bg-surface-container-high text-on-surface"
                      }`}
                    >
                      <Icon name={item.icon} className="text-[20px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-label-sm font-semibold text-on-surface">
                          {item.title}
                        </span>
                        {currentLayout === item.id && (
                          <span className="text-primary text-[11px] font-medium flex items-center gap-0.5">
                            <Icon name="check" className="text-[14px]" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-body-xs text-on-surface-variant mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-outline-variant/20">
              <button
                onClick={onFitView}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low text-label-sm font-medium text-on-surface transition-colors"
              >
                <Icon name="crop_free" className="text-[18px] text-primary" />
                Fit Map to View
              </button>
            </div>
          </div>
        )}

        {/* VIEW 4: VIEW & CANVAS */}
        {activeView === "view" && (
          <div className="space-y-4">
            <div>
              <label className="text-label-xs font-semibold text-outline uppercase tracking-wider block mb-2">
                Canvas Toggles
              </label>
              <div className="space-y-1.5">
                <button
                  onClick={onToggleMiniMap}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name="map" className="text-[18px] text-primary" />
                    <span className="text-body-sm font-medium text-on-surface">MiniMap</span>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      showMiniMap ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                        showMiniMap ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                <button
                  onClick={onToggleGrid}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name="grid_view" className="text-[18px] text-primary" />
                    <span className="text-body-sm font-medium text-on-surface">Canvas Grid</span>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      showGrid ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                        showGrid ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                {selectedNodeId && (
                  <button
                    onClick={() => onToggleFocus(focusedNodeId ? null : selectedNodeId)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon name="center_focus_strong" className="text-[18px] text-accent-violet" />
                      <span className="text-body-sm font-medium text-on-surface">
                        {focusedNodeId ? "Exit Focus Mode" : "Focus Selected Branch"}
                      </span>
                    </div>
                    <span className="text-label-xs text-primary font-medium">
                      {focusedNodeId ? "Active" : "Enable"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-label-xs font-semibold text-outline uppercase tracking-wider block mb-2">
                Color Themes
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {Object.values(THEME_PALETTES).map((t) => {
                  const isCurrent = currentTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTheme(t.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-4 h-4 rounded-full border border-surface shadow-xs"
                            style={{ backgroundColor: t.primary }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-surface shadow-xs"
                            style={{ backgroundColor: t.secondary }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-surface shadow-xs"
                            style={{ backgroundColor: t.accent }}
                          />
                        </div>
                        <span className="text-label-sm font-medium text-on-surface">
                          {t.name}
                        </span>
                      </div>
                      {isCurrent && (
                        <Icon name="check" className="text-[16px] text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-outline-variant/20 flex gap-2">
              <button
                onClick={onFitView}
                className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low text-label-xs font-medium text-on-surface transition-colors"
              >
                <Icon name="crop_free" className="text-[16px]" /> Fit View
              </button>
              <button
                onClick={onResetZoom}
                className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low text-label-xs font-medium text-on-surface transition-colors"
              >
                <Icon name="search" className="text-[16px]" /> 100% Zoom
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
