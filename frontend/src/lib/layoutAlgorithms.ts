import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import type { SemanticGraph, SemanticNode, SemanticEdge, LayoutMode } from "../types/semanticGraph.ts";

export type { LayoutMode };
export type LayoutDirection = LayoutMode | "radial" | "horizontal" | "vertical" | "balanced" | "free" | "compact";
export type LayoutDensityMode = "balanced" | "compact" | "free";

export interface NodePosition {
  x: number;
  y: number;
  sourcePosition?: Position;
  targetPosition?: Position;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export interface LayoutBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Centralized, configurable layout spacing constants.
 * Governs hierarchical margins, sibling separation, and collision buffers.
 */
export interface LayoutConfig {
  LEVEL_GAP: number;         // Gap between node borders across hierarchy levels
  SIBLING_GAP: number;       // Vertical/horizontal gap between adjacent siblings
  BRANCH_GAP: number;        // Gap between distinct top-level branches
  ROOT_GAP: number;          // Extra separation from root node to level 1 topics
  MIN_NODE_DISTANCE: number; // Minimum buffer distance between non-connected nodes
  COLLISION_PADDING: number; // Additional safety padding for collision verification
}

export const BALANCED_LAYOUT_CONFIG: LayoutConfig = {
  LEVEL_GAP: 70,
  SIBLING_GAP: 24,
  BRANCH_GAP: 48,
  ROOT_GAP: 90,
  MIN_NODE_DISTANCE: 20,
  COLLISION_PADDING: 10,
};

export const COMPACT_LAYOUT_CONFIG: LayoutConfig = {
  LEVEL_GAP: 50,
  SIBLING_GAP: 16,
  BRANCH_GAP: 32,
  ROOT_GAP: 70,
  MIN_NODE_DISTANCE: 14,
  COLLISION_PADDING: 8,
};

/**
 * Options interface for the unified applyLayout API.
 */
export interface ApplyLayoutOptions {
  nodes: FlowNode[];
  edges: FlowEdge[];
  layout?: LayoutDirection;
  mode?: LayoutDensityMode;
  affectedNodeId?: string; // Optional target for localized branch re-layout
}

/**
 * Measures or estimates dynamic node dimensions based on actual rendered content.
 * Prioritizes React Flow DOM measurements (node.measured), with accurate font metric fallbacks.
 */
export function measureNodeDimensions(node: {
  id?: string;
  data?: any;
  type?: string;
  measured?: { width?: number; height?: number };
}): NodeDimensions {
  // 1. Use real DOM measured dimensions from React Flow 12 when available
  if (node.measured && typeof node.measured.width === "number" && node.measured.width > 0 &&
      typeof node.measured.height === "number" && node.measured.height > 0) {
    return {
      width: Math.round(node.measured.width),
      height: Math.round(node.measured.height),
    };
  }

  // 2. Fallback to precise content-based heuristic metrics
  const label = String(node.data?.label || node.data?.title || "Untitled");
  const semanticType = String(node.data?.semanticType || node.data?.nodeType || node.type || "concept");
  const hasDesc = Boolean(node.data?.description);
  const hasIcon = Boolean(node.data?.icon || node.data?.visualConfig?.iconName);
  const hasTags = Boolean(node.data?.tags && Array.isArray(node.data.tags) && node.data.tags.length > 0);

  if (semanticType === "root") {
    // Root: Pill shape, large bold typography (16px), centered icon
    const baseW = Math.max(200, label.length * 10 + 90);
    return {
      width: Math.min(360, Math.round(baseW)),
      height: 58,
    };
  }

  if (semanticType === "topic") {
    // Topic: Primary branch cards (14px font, left icon, subtle border)
    const baseW = Math.max(180, label.length * 8.5 + (hasIcon ? 75 : 55));
    const baseH = hasDesc ? (hasTags ? 96 : 78) : (hasTags ? 68 : 50);
    return {
      width: Math.min(320, Math.round(baseW)),
      height: baseH,
    };
  }

  // Concept, Task, Insight, AI_Suggestion: Compact pills/cards
  const baseW = Math.max(140, label.length * 8 + (hasIcon ? 65 : 45));
  let baseH = 42;
  if (hasDesc) baseH += 26;
  if (hasTags) baseH += 18;

  return {
    width: Math.min(290, Math.round(baseW)),
    height: baseH,
  };
}

/**
 * Resolves the optimal source and target handles between two nodes
 * based on layout mode and relative spatial geometry.
 */
export function determineOptimalHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  mode?: LayoutDirection
): {
  sourceHandle: string;
  targetHandle: string;
  sourcePosition: Position;
  targetPosition: Position;
} {
  if (mode === "horizontal") {
    return {
      sourceHandle: "source-right",
      targetHandle: "target-left",
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  }

  if (mode === "vertical") {
    return {
      sourceHandle: "source-bottom",
      targetHandle: "target-top",
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  }

  // Radial / Balanced / Relative coordinate analysis
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  // In mind maps, nodes are wide horizontal cards (160-290px wide, ~42-50px high).
  // Left/Right connections provide smooth, organic bezier curves unless the child is directly vertical.
  if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
    if (dx >= 0) {
      return {
        sourceHandle: "source-right",
        targetHandle: "target-left",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    } else {
      return {
        sourceHandle: "source-left",
        targetHandle: "target-right",
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
      };
    }
  } else {
    if (dy >= 0) {
      return {
        sourceHandle: "source-bottom",
        targetHandle: "target-top",
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    } else {
      return {
        sourceHandle: "source-top",
        targetHandle: "target-bottom",
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      };
    }
  }
}

/**
 * Computes deterministic 2D canvas coordinates for graph nodes.
 * Implements the MindVault Production Layout Pipeline:
 * 1. Validate hierarchy and identify primary root
 * 2. Measure actual node dimensions
 * 3. Separate primary hierarchy from secondary relationships
 * 4. Build acyclic spanning tree
 * 5. Calculate subtree bounding spans bottom-up
 * 6. Balance branches across hemispheres via greedy partitioning
 * 7. Allocate non-overlapping spatial intervals
 * 8. AABB collision resolution pass
 * 9. Position assignment and handle selection
 */
export function computeLayoutPositions(
  nodes: Array<{ id: string; data?: any; type?: string; measured?: { width?: number; height?: number }; position?: { x: number; y: number } }>,
  edges: Array<{ source: string; target: string; type?: string; data?: any }>,
  mode: LayoutDirection = "radial",
  density: LayoutDensityMode = "balanced"
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  if (nodes.length === 0) return positions;

  // Free positioning preserves existing coordinates
  if (mode === "free") {
    nodes.forEach((n) => {
      positions.set(n.id, {
        x: n.position?.x ?? 0,
        y: n.position?.y ?? 0,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
    return positions;
  }

  const normalizedMode: "radial" | "horizontal" | "vertical" =
    mode === "vertical" ? "vertical" : mode === "horizontal" ? "horizontal" : "radial";

  const config = density === "compact" ? COMPACT_LAYOUT_CONFIG : BALANCED_LAYOUT_CONFIG;

  // 1. Measure all nodes and build dimension map
  const dimsMap = new Map<string, NodeDimensions>();
  nodes.forEach((n) => {
    dimsMap.set(n.id, measureNodeDimensions(n));
  });

  // 2. Separate Primary Hierarchy from Secondary Relationships
  const isSecondaryEdge = (e: (typeof edges)[0]) => {
    const t = e.data?.edgeType || e.type || e.data?.relationshipType;
    return t === "relationship" || t === "ai_suggestion" || e.data?.isRelationship === true;
  };

  const hierarchyEdges = edges.filter((e) => !isSecondaryEdge(e));

  // 3. Identify Root Node
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  hierarchyEdges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  let rootNode = nodes.find((n) => n.data?.semanticType === "root" || n.type === "root");
  if (!rootNode) {
    rootNode = nodes.find((n) => (inDegree.get(n.id) || 0) === 0) || nodes[0];
  }

  // 4. Build Acyclic Spanning Tree from Root
  const treeAdj = new Map<string, string[]>();
  nodes.forEach((n) => treeAdj.set(n.id, []));
  const visited = new Set<string>([rootNode.id]);
  const queue = [rootNode.id];

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const rawChildren = adj.get(currId) || [];

    // Deterministic sorting by importance score or alphabetical label
    const sortedChildren = [...rawChildren].sort((a, b) => {
      const nodeA = nodes.find((n) => n.id === a);
      const nodeB = nodes.find((n) => n.id === b);
      const scoreA = nodeA?.data?.importance_score ?? 1.0;
      const scoreB = nodeB?.data?.importance_score ?? 1.0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.localeCompare(b);
    });

    for (const childId of sortedChildren) {
      if (!visited.has(childId)) {
        visited.add(childId);
        treeAdj.get(currId)!.push(childId);
        queue.push(childId);
      }
    }
  }

  // -----------------------------------------------------------------
  // 5. RADIAL & HORIZONTAL ENGINE (Horizontal Depth, Vertical Sibling Stack)
  // -----------------------------------------------------------------
  if (normalizedMode === "radial" || normalizedMode === "horizontal") {
    // Compute Subtree Heights Bottom-Up
    const subtreeHeight = new Map<string, number>();
    function computeSubtreeHeight(nodeId: string): number {
      const children = treeAdj.get(nodeId) || [];
      const selfH = dimsMap.get(nodeId)!.height;
      if (children.length === 0) {
        subtreeHeight.set(nodeId, selfH);
        return selfH;
      }
      const childTotalH =
        children.reduce((sum, c) => sum + computeSubtreeHeight(c), 0) +
        (children.length - 1) * config.SIBLING_GAP;
      const finalH = Math.max(selfH, childTotalH);
      subtreeHeight.set(nodeId, finalH);
      return finalH;
    }
    computeSubtreeHeight(rootNode.id);

    // Compute maximum width per depth level to guarantee zero level-on-level collision
    const levelMaxWidth = new Map<number, number>();
    function recordLevelWidth(nodeId: string, depth: number) {
      const w = dimsMap.get(nodeId)!.width;
      levelMaxWidth.set(depth, Math.max(levelMaxWidth.get(depth) || 0, w));
      (treeAdj.get(nodeId) || []).forEach((c) => recordLevelWidth(c, depth + 1));
    }
    recordLevelWidth(rootNode.id, 0);

    function getDepthX(depth: number): number {
      if (depth === 0) return 0;
      let x = (levelMaxWidth.get(0)! / 2) + config.ROOT_GAP + (levelMaxWidth.get(1)! / 2);
      for (let d = 2; d <= depth; d++) {
        x += (levelMaxWidth.get(d - 1)! / 2) + config.LEVEL_GAP + (levelMaxWidth.get(d)! / 2);
      }
      return Math.round(x);
    }

    positions.set(rootNode.id, {
      x: 0,
      y: 0,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    if (normalizedMode === "radial") {
      // Balanced 2-Sided Radial Layout
      const topics = treeAdj.get(rootNode.id) || [];
      if (topics.length > 0) {
        // Greedy balanced partitioning into Right and Left hemispheres
        const sortedTopics = [...topics].sort(
          (a, b) => (subtreeHeight.get(b) || 0) - (subtreeHeight.get(a) || 0)
        );
        const rightTopics: string[] = [];
        const leftTopics: string[] = [];
        let rightH = 0;
        let leftH = 0;

        for (const tid of sortedTopics) {
          if (rightH <= leftH) {
            rightTopics.push(tid);
            rightH += (subtreeHeight.get(tid) || 0) + config.BRANCH_GAP;
          } else {
            leftTopics.push(tid);
            leftH += (subtreeHeight.get(tid) || 0) + config.BRANCH_GAP;
          }
        }

        const layoutHemisphere = (topicList: string[], sideMultiplier: 1 | -1) => {
          const totalSpan =
            topicList.reduce((sum, tid) => sum + (subtreeHeight.get(tid) || 0), 0) +
            (topicList.length - 1) * config.BRANCH_GAP;
          let cursorY = -totalSpan / 2;

          const placeNodeSubtree = (
            nodeId: string,
            depth: number,
            startY: number,
            allocatedSpan: number
          ): number => {
            const children = treeAdj.get(nodeId) || [];
            const selfX = sideMultiplier * getDepthX(depth);

            if (children.length === 0) {
              const selfY = startY + allocatedSpan / 2;
              positions.set(nodeId, {
                x: selfX,
                y: Math.round(selfY),
                sourcePosition: sideMultiplier === 1 ? Position.Right : Position.Left,
                targetPosition: sideMultiplier === 1 ? Position.Left : Position.Right,
              });
              return selfY;
            }

            const childrenTotalH =
              children.reduce((sum, c) => sum + (subtreeHeight.get(c) || 0), 0) +
              (children.length - 1) * config.SIBLING_GAP;
            let childCursorY = startY + (allocatedSpan - childrenTotalH) / 2;

            const childYs: number[] = [];
            for (const c of children) {
              const cH = subtreeHeight.get(c) || 0;
              const cY = placeNodeSubtree(c, depth + 1, childCursorY, cH);
              childYs.push(cY);
              childCursorY += cH + config.SIBLING_GAP;
            }

            const selfY = (childYs[0] + childYs[childYs.length - 1]) / 2;
            positions.set(nodeId, {
              x: selfX,
              y: Math.round(selfY),
              sourcePosition: sideMultiplier === 1 ? Position.Right : Position.Left,
              targetPosition: sideMultiplier === 1 ? Position.Left : Position.Right,
            });
            return selfY;
          };

          topicList.forEach((tid) => {
            const tH = subtreeHeight.get(tid) || 0;
            placeNodeSubtree(tid, 1, cursorY, tH);
            cursorY += tH + config.BRANCH_GAP;
          });
        };

        layoutHemisphere(rightTopics, 1);
        layoutHemisphere(leftTopics, -1);
      }
    } else {
      // Horizontal Left-to-Right Layout
      const branches = treeAdj.get(rootNode.id) || [];
      const totalSpan =
        branches.reduce((sum, tid) => sum + (subtreeHeight.get(tid) || 0), 0) +
        (branches.length - 1) * config.BRANCH_GAP;
      let cursorY = -totalSpan / 2;

      const placeHorizontalSubtree = (
        nodeId: string,
        depth: number,
        startY: number,
        allocatedSpan: number
      ): number => {
        const children = treeAdj.get(nodeId) || [];
        const selfX = getDepthX(depth);

        if (children.length === 0) {
          const selfY = startY + allocatedSpan / 2;
          positions.set(nodeId, {
            x: selfX,
            y: Math.round(selfY),
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });
          return selfY;
        }

        const childrenTotalH =
          children.reduce((sum, c) => sum + (subtreeHeight.get(c) || 0), 0) +
          (children.length - 1) * config.SIBLING_GAP;
        let childCursorY = startY + (allocatedSpan - childrenTotalH) / 2;

        const childYs: number[] = [];
        for (const c of children) {
          const cH = subtreeHeight.get(c) || 0;
          const cY = placeHorizontalSubtree(c, depth + 1, childCursorY, cH);
          childYs.push(cY);
          childCursorY += cH + config.SIBLING_GAP;
        }

        const selfY = (childYs[0] + childYs[childYs.length - 1]) / 2;
        positions.set(nodeId, {
          x: selfX,
          y: Math.round(selfY),
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
        return selfY;
      };

      branches.forEach((b) => {
        const bH = subtreeHeight.get(b) || 0;
        placeHorizontalSubtree(b, 1, cursorY, bH);
        cursorY += bH + config.BRANCH_GAP;
      });
    }
  }

  // -----------------------------------------------------------------
  // 6. VERTICAL ENGINE (Vertical Depth, Horizontal Sibling Stack)
  // -----------------------------------------------------------------
  if (normalizedMode === "vertical") {
    const subtreeWidth = new Map<string, number>();
    function computeSubtreeWidth(nodeId: string): number {
      const children = treeAdj.get(nodeId) || [];
      const selfW = dimsMap.get(nodeId)!.width;
      if (children.length === 0) {
        subtreeWidth.set(nodeId, selfW);
        return selfW;
      }
      const childTotalW =
        children.reduce((sum, c) => sum + computeSubtreeWidth(c), 0) +
        (children.length - 1) * config.SIBLING_GAP;
      const finalW = Math.max(selfW, childTotalW);
      subtreeWidth.set(nodeId, finalW);
      return finalW;
    }
    computeSubtreeWidth(rootNode.id);

    const levelMaxHeight = new Map<number, number>();
    function recordLevelHeight(nodeId: string, depth: number) {
      const h = dimsMap.get(nodeId)!.height;
      levelMaxHeight.set(depth, Math.max(levelMaxHeight.get(depth) || 0, h));
      (treeAdj.get(nodeId) || []).forEach((c) => recordLevelHeight(c, depth + 1));
    }
    recordLevelHeight(rootNode.id, 0);

    function getDepthY(depth: number): number {
      if (depth === 0) return 0;
      let y = (levelMaxHeight.get(0)! / 2) + config.ROOT_GAP + (levelMaxHeight.get(1)! / 2);
      for (let d = 2; d <= depth; d++) {
        y += (levelMaxHeight.get(d - 1)! / 2) + config.LEVEL_GAP + (levelMaxHeight.get(d)! / 2);
      }
      return Math.round(y);
    }

    positions.set(rootNode.id, {
      x: 0,
      y: 0,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    const branches = treeAdj.get(rootNode.id) || [];
    const totalSpan =
      branches.reduce((sum, bid) => sum + (subtreeWidth.get(bid) || 0), 0) +
      (branches.length - 1) * config.BRANCH_GAP;
    let cursorX = -totalSpan / 2;

    const placeVerticalSubtree = (
      nodeId: string,
      depth: number,
      startX: number,
      allocatedSpan: number
    ): number => {
      const children = treeAdj.get(nodeId) || [];
      const selfY = getDepthY(depth);

      if (children.length === 0) {
        const selfX = startX + allocatedSpan / 2;
        positions.set(nodeId, {
          x: Math.round(selfX),
          y: selfY,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
        return selfX;
      }

      const childrenTotalW =
        children.reduce((sum, c) => sum + (subtreeWidth.get(c) || 0), 0) +
        (children.length - 1) * config.SIBLING_GAP;
      let childCursorX = startX + (allocatedSpan - childrenTotalW) / 2;

      const childXs: number[] = [];
      for (const c of children) {
        const cW = subtreeWidth.get(c) || 0;
        const cX = placeVerticalSubtree(c, depth + 1, childCursorX, cW);
        childXs.push(cX);
        childCursorX += cW + config.SIBLING_GAP;
      }

      const selfX = (childXs[0] + childXs[childXs.length - 1]) / 2;
      positions.set(nodeId, {
        x: Math.round(selfX),
        y: selfY,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      return selfX;
    };

    branches.forEach((b) => {
      const bW = subtreeWidth.get(b) || 0;
      placeVerticalSubtree(b, 1, cursorX, bW);
      cursorX += bW + config.BRANCH_GAP;
    });
  }

  // -----------------------------------------------------------------
  // 7. DISCONNECTED / UNATTACHED NODES LAYOUT
  // -----------------------------------------------------------------
  const unpositioned = nodes.filter((n) => !positions.has(n.id));
  if (unpositioned.length > 0) {
    let maxY = 0;
    let minX = 0;
    positions.forEach((pos) => {
      if (pos.y > maxY) maxY = pos.y;
      if (pos.x < minX) minX = pos.x;
    });

    const startY = maxY + 160;
    const itemsPerRow = 4;
    unpositioned.forEach((n, idx) => {
      const row = Math.floor(idx / itemsPerRow);
      const col = idx % itemsPerRow;
      positions.set(n.id, {
        x: minX + col * 260,
        y: startY + row * 90,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  }

  // -----------------------------------------------------------------
  // 8. COLLISION DETECTION & SAFETY SEPARATION PASS
  // -----------------------------------------------------------------
  const positionedList = Array.from(positions.entries()).map(([id, pos]) => ({
    id,
    x: pos.x,
    y: pos.y,
    w: dimsMap.get(id)?.width || 200,
    h: dimsMap.get(id)?.height || 50,
  }));

  const pad = config.COLLISION_PADDING;
  for (let i = 0; i < positionedList.length; i++) {
    for (let j = i + 1; j < positionedList.length; j++) {
      const a = positionedList[i];
      const b = positionedList[j];

      const aLeft = a.x - a.w / 2;
      const aRight = a.x + a.w / 2;
      const aTop = a.y - a.h / 2;
      const aBottom = a.y + a.h / 2;

      const bLeft = b.x - b.w / 2;
      const bRight = b.x + b.w / 2;
      const bTop = b.y - b.h / 2;
      const bBottom = b.y + b.h / 2;

      const overlapX = aLeft < bRight + pad && aRight > bLeft - pad;
      const overlapY = aTop < bBottom + pad && aBottom > bTop - pad;

      if (overlapX && overlapY) {
        if (normalizedMode === "vertical") {
          // Resolve horizontally for vertical tree
          const shiftX = Math.round(((Math.min(aRight, bRight) - Math.max(aLeft, bLeft)) / 2) + config.MIN_NODE_DISTANCE);
          if (a.x <= b.x) {
            positions.get(a.id)!.x -= shiftX;
            positions.get(b.id)!.x += shiftX;
          } else {
            positions.get(a.id)!.x += shiftX;
            positions.get(b.id)!.x -= shiftX;
          }
        } else {
          // Resolve vertically for radial and horizontal
          const shiftY = Math.round(((Math.min(aBottom, bBottom) - Math.max(aTop, bTop)) / 2) + config.MIN_NODE_DISTANCE);
          if (a.y <= b.y) {
            positions.get(a.id)!.y -= shiftY;
            positions.get(b.id)!.y += shiftY;
          } else {
            positions.get(a.id)!.y += shiftY;
            positions.get(b.id)!.y -= shiftY;
          }
        }
      }
    }
  }

  return positions;
}

/**
 * Calculates the bounding box of a collection of positions.
 */
export function getGraphBounds(positions: Map<string, NodePosition>): LayoutBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  positions.forEach((pos) => {
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.y > maxY) maxY = pos.y;
  });

  if (minX === Infinity) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Applies deterministic automatic layout to React Flow nodes and edges.
 * Supports both object-based options API and legacy positional parameters.
 *
 * Full Pipeline:
 *   Graph -> Hierarchy Validation -> Node Measurement -> Tidy Tree Algorithm
 *   -> Branch Balancing -> Collision Check -> Assign Positions -> Route Edges
 */
export function applyLayout(
  nodesOrOptions: FlowNode[] | ApplyLayoutOptions,
  legacyEdges?: FlowEdge[],
  legacyDirection: LayoutDirection = "radial",
  legacyDensity: LayoutDensityMode = "balanced"
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  let nodes: FlowNode[];
  let edges: FlowEdge[];
  let direction: LayoutDirection;
  let mode: LayoutDensityMode;

  if (Array.isArray(nodesOrOptions)) {
    nodes = nodesOrOptions;
    edges = legacyEdges || [];
    direction = legacyDirection;
    mode = legacyDensity;
  } else {
    nodes = nodesOrOptions.nodes;
    edges = nodesOrOptions.edges;
    direction = nodesOrOptions.layout || "radial";
    mode = nodesOrOptions.mode || "balanced";
  }

  if (nodes.length === 0) return { nodes, edges };

  // Free positioning mode preserves node positions as-is
  if (direction === "free" || mode === "free") {
    return { nodes, edges };
  }

  const positions = computeLayoutPositions(nodes, edges, direction, mode);

  const updatedNodes: FlowNode[] = nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return node;

    return {
      ...node,
      position: { x: pos.x, y: pos.y },
      sourcePosition: pos.sourcePosition || node.sourcePosition,
      targetPosition: pos.targetPosition || node.targetPosition,
    };
  });

  // Determine edge handles based on updated node positions and layout direction
  const nodePosMap = new Map<string, { x: number; y: number }>();
  updatedNodes.forEach((n) => nodePosMap.set(n.id, n.position));

  const updatedEdges: FlowEdge[] = edges.map((edge) => {
    const sPos = nodePosMap.get(edge.source);
    const tPos = nodePosMap.get(edge.target);
    if (!sPos || !tPos) return edge;

    const handles = determineOptimalHandles(sPos, tPos, direction);
    return {
      ...edge,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
    };
  });

  return { nodes: updatedNodes, edges: updatedEdges };
}

/**
 * Pure Semantic Graph layout transformer.
 * Takes a SemanticGraph domain model and returns a new SemanticGraph with updated positions.
 */
export function applySemanticLayout(
  graph: SemanticGraph,
  mode: LayoutMode = "radial"
): SemanticGraph {
  const positions = computeLayoutPositions(graph.nodes, graph.edges, mode);

  const updatedNodes: SemanticNode[] = graph.nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
    };
  });

  const nodePosMap = new Map<string, { x: number; y: number }>();
  updatedNodes.forEach((n) => nodePosMap.set(n.id, n.position));

  const updatedEdges: SemanticEdge[] = graph.edges.map((edge) => {
    const sPos = nodePosMap.get(edge.source);
    const tPos = nodePosMap.get(edge.target);
    if (!sPos || !tPos) return edge;

    const handles = determineOptimalHandles(sPos, tPos, mode);
    return {
      ...edge,
      metadata: {
        ...(edge.metadata || {}),
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
      },
    };
  });

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
  };
}
