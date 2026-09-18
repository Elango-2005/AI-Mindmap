import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";

export type LayoutDirection = "horizontal" | "vertical" | "balanced";

interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number;
  height: number;
}

/**
 * Computes an automated tree layout for a graph of nodes and edges.
 * Supports:
 * - 'horizontal': Left-to-Right layout
 * - 'vertical': Top-to-Bottom org-chart layout
 * - 'balanced': Classic 2-sided Mind Map (Root in center, branches fan left & right)
 */
export function applyLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: LayoutDirection = "horizontal"
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // 1. Build adjacency list and find root(s)
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, inDegree.get(e.target)! + 1);
    }
  });

  // Root is node with in-degree 0 (or fallback to first node)
  const rootNodes = nodes.filter((n) => inDegree.get(n.id) === 0);
  const primaryRoot = rootNodes.length > 0 ? rootNodes[0] : nodes[0];

  const positions = new Map<string, { x: number; y: number }>();

  if (direction === "balanced") {
    // -------------------------------------------------------------
    // BALANCED / 2-SIDED MIND MAP
    // -------------------------------------------------------------
    positions.set(primaryRoot.id, { x: 0, y: 0 });

    const rootChildren = adj.get(primaryRoot.id) || [];
    const mid = Math.ceil(rootChildren.length / 2);
    const rightBranches = rootChildren.slice(0, mid);
    const leftBranches = rootChildren.slice(mid);

    // Layout Right Subtree (+X)
    layoutOneSidedTree(
      rightBranches,
      adj,
      positions,
      { startX: 280, dirX: 1, spacingX: 260, spacingY: 85 }
    );

    // Layout Left Subtree (-X)
    layoutOneSidedTree(
      leftBranches,
      adj,
      positions,
      { startX: -280, dirX: -1, spacingX: 260, spacingY: 85 }
    );
  } else if (direction === "vertical") {
    // -------------------------------------------------------------
    // VERTICAL / TOP-TO-BOTTOM (ORG CHART)
    // -------------------------------------------------------------
    layoutVerticalTree(primaryRoot.id, adj, positions);
  } else {
    // -------------------------------------------------------------
    // HORIZONTAL / LEFT-TO-RIGHT
    // -------------------------------------------------------------
    positions.set(primaryRoot.id, { x: 0, y: 0 });
    const rootChildren = adj.get(primaryRoot.id) || [];
    layoutOneSidedTree(
      rootChildren,
      adj,
      positions,
      { startX: 280, dirX: 1, spacingX: 260, spacingY: 85 }
    );
  }

  // Fallback for any disconnected / unvisited nodes
  let disconnectedOffset = 100;
  nodes.forEach((n) => {
    if (!positions.has(n.id)) {
      positions.set(n.id, { x: 0, y: disconnectedOffset });
      disconnectedOffset += 100;
    }
  });

  // Apply new positions to nodes
  const updatedNodes = nodes.map((node) => {
    const pos = positions.get(node.id) || node.position;
    return {
      ...node,
      position: { x: Math.round(pos.x), y: Math.round(pos.y) },
    };
  });

  return { nodes: updatedNodes, edges };
}

/**
 * Calculates positions for a 1-sided horizontal branch (either right or left)
 */
function layoutOneSidedTree(
  branchRoots: string[],
  adj: Map<string, string[]>,
  positions: Map<string, { x: number; y: number }>,
  config: { startX: number; dirX: number; spacingX: number; spacingY: number }
) {
  if (branchRoots.length === 0) return;

  // Calculate subtree height for each node (number of leaves)
  function getSubtreeLeafCount(nodeId: string): number {
    const children = adj.get(nodeId) || [];
    if (children.length === 0) return 1;
    return children.reduce((sum, child) => sum + getSubtreeLeafCount(child), 0);
  }

  // Total height needed for all branches
  const totalLeaves = branchRoots.reduce(
    (sum, r) => sum + getSubtreeLeafCount(r),
    0
  );
  let currentY = -((totalLeaves - 1) * config.spacingY) / 2;

  function placeNode(nodeId: string, depth: number): number {
    const children = adj.get(nodeId) || [];
    const posX = config.startX + (depth - 1) * config.spacingX * config.dirX;

    if (children.length === 0) {
      const posY = currentY;
      positions.set(nodeId, { x: posX, y: posY });
      currentY += config.spacingY;
      return posY;
    }

    const childYs: number[] = [];
    for (const child of children) {
      childYs.push(placeNode(child, depth + 1));
    }

    // Parent is centered vertically amongst its children
    const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;
    positions.set(nodeId, { x: posX, y: avgY });
    return avgY;
  }

  for (const branchId of branchRoots) {
    placeNode(branchId, 1);
  }
}

/**
 * Vertical top-to-bottom layout (hierarchical tree / org chart)
 */
function layoutVerticalTree(
  rootId: string,
  adj: Map<string, string[]>,
  positions: Map<string, { x: number; y: number }>
) {
  const SPACING_X = 220;
  const SPACING_Y = 140;

  function getSubtreeLeafCount(nodeId: string): number {
    const children = adj.get(nodeId) || [];
    if (children.length === 0) return 1;
    return children.reduce((sum, child) => sum + getSubtreeLeafCount(child), 0);
  }

  let currentX = 0;

  function placeNode(nodeId: string, depth: number): number {
    const children = adj.get(nodeId) || [];
    const posY = depth * SPACING_Y;

    if (children.length === 0) {
      const posX = currentX;
      positions.set(nodeId, { x: posX, y: posY });
      currentX += SPACING_X;
      return posX;
    }

    const childXs: number[] = [];
    for (const child of children) {
      childXs.push(placeNode(child, depth + 1));
    }

    const avgX = (childXs[0] + childXs[childXs.length - 1]) / 2;
    positions.set(nodeId, { x: avgX, y: posY });
    return avgX;
  }

  const rootX = placeNode(rootId, 0);

  // Center the whole tree around x = 0
  positions.forEach((pos, id) => {
    positions.set(id, { x: pos.x - rootX, y: pos.y });
  });
}

