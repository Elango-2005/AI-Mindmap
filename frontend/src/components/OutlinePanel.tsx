import React, { useState, useMemo } from "react";
import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { Icon } from "@/components/Icon";

interface OutlinePanelProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

interface OutlineNode {
  id: string;
  label: string;
  depth: number;
  children: OutlineNode[];
}

export function OutlinePanel({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onClose,
}: OutlinePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // 1. Construct hierarchy tree from nodes & edges
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
        label: (node.data?.label as string) || "Untitled Node",
        depth,
        children,
      };
    }

    return startRoots
      .map((r) => buildTreeNode(r.id, 0))
      .filter((n): n is OutlineNode => n !== null);
  }, [nodes, edges]);

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Render recursive tree item
  const renderTreeItem = (item: OutlineNode) => {
    const isCollapsed = collapsedIds.has(item.id);
    const hasChildren = item.children.length > 0;
    const isSelected = selectedNodeId === item.id;
    const matchesSearch =
      !searchQuery.trim() ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <div key={item.id} className="flex flex-col">
        <div
          onClick={() => onSelectNode(item.id)}
          style={{ paddingLeft: `${Math.max(item.depth * 16 + 8, 8)}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer text-body-sm transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary font-semibold"
              : matchesSearch
              ? "hover:bg-surface-container text-on-surface hover:text-primary"
              : "opacity-40 text-on-surface-variant hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleCollapse(item.id, e)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container-high text-outline hover:text-on-surface"
              >
                <Icon
                  name={isCollapsed ? "chevron_right" : "expand_more"}
                  className="text-[16px]"
                />
              </button>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/60" />
              </span>
            )}

            <span className="truncate">{item.label}</span>
          </div>

          {hasChildren && (
            <span className="text-[10px] text-outline px-1.5 py-0.5 rounded-full bg-surface-container-high ml-2 shrink-0">
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

  return (
    <div className="w-[300px] h-full bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col z-20 shrink-0 shadow-sm animate-in slide-in-from-left-4 duration-200">
      {/* Header */}
      <div className="p-3 border-b border-outline-variant/20 flex items-center justify-between bg-surface/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="list_alt" className="text-[20px]" />
          <h3 className="text-label-lg font-bold text-on-surface">Outline View</h3>
        </div>
        <button
          onClick={onClose}
          className="text-outline hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container"
          title="Close Outline"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-outline-variant/10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded-lg border border-outline-variant/30 focus-within:border-primary">
          <Icon name="search" className="text-[16px] text-outline" />
          <input
            type="text"
            placeholder="Search outline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-body-sm text-on-surface focus:outline-none placeholder:text-outline"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-outline hover:text-on-surface text-[14px]"
            >
              <Icon name="close" className="text-[14px]" />
            </button>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-outline">
            <Icon name="account_tree" className="text-[32px] mb-2 opacity-50" />
            <p className="text-body-sm">No nodes found in this map.</p>
          </div>
        ) : (
          treeData.map((root) => renderTreeItem(root))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-outline-variant/20 bg-surface/30 text-label-xs text-outline flex items-center justify-between">
        <span>{nodes.length} total nodes</span>
        <span>{edges.length} connections</span>
      </div>
    </div>
  );
}

