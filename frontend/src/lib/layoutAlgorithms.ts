import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { Position } from "@xyflow/react";
import type { SemanticGraph, SemanticNode, SemanticEdge, LayoutMode } from "../types/semanticGraph.ts";

export type { LayoutMode };
export type LayoutDirection = LayoutMode | "balanced";

export interface NodePosition {
  x: number;
  y: number;
  sourcePosition?: Position;
  targetPosition?: Position;
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
 * Intelligently resolves the optimal source and target handles between two nodes
 * based on layout mode and relative spatial geometry.
 *
 * Rules:
 * - Horizontal: Parent RIGHT -> Child LEFT
 * - Vertical: Parent BOTTOM -> Child TOP
 * - Radial:
 *   - Child to right (dx >= 0): Parent RIGHT -> Child LEFT
 *   - Child to left (dx < 0): Parent LEFT -> Child RIGHT
 *   - Child below (dominant dy > 0): Parent BOTTOM -> Child TOP
 *   - Child above (dominant dy < 0): Parent TOP -> Child BOTTOM
 */
export function determineOptimalHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  mode?: LayoutMode | "horizontal" | "vertical" | "radial" | "balanced"
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

  // In mind maps, nodes are wide horizontal cards (160-260px wide, ~40px high).
  // Left/Right connections provide smooth, organic bezier curves unless the child
  // is placed directly above or below.
  if (Math.abs(dx) >= Math.abs(dy) * 0.55) {
    if (dx >= 0) {
      // Child is to the right
      return {
        sourceHandle: "source-right",
        targetHandle: "target-left",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    } else {
      // Child is to the left
      return {
        sourceHandle: "source-left",
        targetHandle: "target-right",
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
      };
    }
  } else {
    if (dy >= 0) {
      // Child is below
      return {
        sourceHandle: "source-bottom",
        targetHandle: "target-top",
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    } else {
      // Child is above
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
 * Pure layout calculation with zero AI logic, perfectly reproducible given identical inputs.
 *
 * Supported modes:
 * - 'radial': Balanced 2-sided mind map matching the visual reference design
 * - 'horizontal': Left-to-right tree with collision-free vertical subtree allocation
 * - 'vertical': Top-to-bottom hierarchy with collision-free horizontal subtree allocation
 */
export function computeLayoutPositions(
  nodes: Array<{ id: string; data?: any; position?: { x: number; y: number } }>,
  edges: Array<{ source: string; target: string; type?: string; data?: any }>,
  mode: LayoutDirection = "radial"
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  if (nodes.length === 0) return positions;

  const normalizedMode: LayoutMode = mode === "balanced" ? "radial" : mode;

  // 1. Separate hierarchy edges (parent -> child) from cross-branch relationship edges
  const nodeMap = new Map<string, (typeof nodes)[0]>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  // Filter out explicit cross-branch relationships or AI suggestions
  const hierarchyEdges = edges.filter((e) => {
    const edgeType = e.data?.edgeType || e.type;
    return edgeType !== "relationship" && edgeType !== "ai_suggestion";
  });

  const candidateRoots = nodes.filter((n) => {
    const isExplicitRoot = n.data?.semanticType === "root" || n.data?.type === "root";
    return isExplicitRoot;
  });

  hierarchyEdges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // Primary root: in-degree 0, prioritized by explicit "root" type
  const zeroInDegreeNodes = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0);
  let primaryRoot = candidateRoots.length > 0 ? candidateRoots[0] : null;
  if (!primaryRoot && zeroInDegreeNodes.length > 0) {
    primaryRoot = zeroInDegreeNodes[0];
  }
  if (!primaryRoot) {
    primaryRoot = nodes[0];
  }

  // 2. Build acyclic spanning tree from primary root to prevent circular reference cycles
  const treeAdj = new Map<string, string[]>();
  const visited = new Set<string>();
  const queue = [primaryRoot.id];
  visited.add(primaryRoot.id);

  nodes.forEach((n) => treeAdj.set(n.id, []));

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const rawChildren = adj.get(currId) || [];
    // Sort children deterministically by importance / id for repeatable output
    const sortedChildren = [...rawChildren].sort((a, b) => {
      const nodeA = nodeMap.get(a);
      const nodeB = nodeMap.get(b);
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

  // 3. Compute subtree leaf weights (proportional weight based on subtree complexity)
  const leafWeights = new Map<string, number>();
  function calculateWeight(nodeId: string): number {
    const children = treeAdj.get(nodeId) || [];
    if (children.length === 0) {
      leafWeights.set(nodeId, 1);
      return 1;
    }
    const weight = children.reduce((sum, c) => sum + calculateWeight(c), 0);
    leafWeights.set(nodeId, Math.max(1, weight));
    return Math.max(1, weight);
  }
  calculateWeight(primaryRoot.id);

  // 4. Dispatch to mode-specific deterministic layout
  if (normalizedMode === "radial") {
    layoutRadialEngine(primaryRoot.id, treeAdj, leafWeights, positions);
  } else if (normalizedMode === "vertical") {
    layoutVerticalEngine(primaryRoot.id, treeAdj, leafWeights, positions);
  } else {
    // horizontal
    layoutHorizontalEngine(primaryRoot.id, treeAdj, leafWeights, positions);
  }

  // 5. Handle disconnected / floating nodes neatly outside the main tree
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
        x: minX + col * 240,
        y: startY + row * 100,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });
  }

  return positions;
}

/**
 * Balanced 2-Sided Radial Mind-Map Engine
 * Matches the approved MindVault visual reference:
 * - Root node at center (0, 0)
 * - Topics partitioned into Right and Left hemispheres (symmetrical progression)
 * - Subtrees expand horizontally (+X for right, -X for left)
 * - Vertical slots allocate exact collision-free space for all leaves
 * - Natural S-curve Bezier connections from Root to Topics and Topics to Children
 */
function layoutRadialEngine(
  rootId: string,
  treeAdj: Map<string, string[]>,
  leafWeights: Map<string, number>,
  positions: Map<string, NodePosition>
) {
  const SPACING_X_TOPIC = 310; // Distance from root to topic
  const SPACING_X_SUB = 260;   // Distance per child depth level
  const SLOT_HEIGHT = 85;       // Vertical slot per leaf node

  // Place root at (0, 0)
  positions.set(rootId, {
    x: 0,
    y: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  const topics = treeAdj.get(rootId) || [];
  if (topics.length === 0) return;

  // Partition topics into right and left groups
  const rightTopics: string[] = [];
  const leftTopics: string[] = [];

  if (topics.length === 1) {
    rightTopics.push(topics[0]);
  } else {
    // Symmetrical split: first half right, second half left
    const half = Math.ceil(topics.length / 2);
    for (let i = 0; i < topics.length; i++) {
      if (i < half) {
        rightTopics.push(topics[i]);
      } else {
        leftTopics.push(topics[i]);
      }
    }
  }

  // 1. Right Hemisphere Layout (+X)
  if (rightTopics.length > 0) {
    const totalRightLeaves = rightTopics.reduce(
      (sum, id) => sum + (leafWeights.get(id) || 1),
      0
    );
    let currentY = -((totalRightLeaves - 1) * SLOT_HEIGHT) / 2;

    function placeRightNode(nodeId: string, depth: number): number {
      const children = treeAdj.get(nodeId) || [];
      const posX = SPACING_X_TOPIC + (depth - 1) * SPACING_X_SUB;

      if (children.length === 0) {
        const posY = currentY;
        positions.set(nodeId, {
          x: Math.round(posX),
          y: Math.round(posY),
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
        currentY += SLOT_HEIGHT;
        return posY;
      }

      const childYs = children.map((c) => placeRightNode(c, depth + 1));
      const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;

      positions.set(nodeId, {
        x: Math.round(posX),
        y: Math.round(avgY),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      return avgY;
    }

    rightTopics.forEach((topicId) => {
      placeRightNode(topicId, 1);
    });
  }

  // 2. Left Hemisphere Layout (-X)
  if (leftTopics.length > 0) {
    const totalLeftLeaves = leftTopics.reduce(
      (sum, id) => sum + (leafWeights.get(id) || 1),
      0
    );
    let currentY = -((totalLeftLeaves - 1) * SLOT_HEIGHT) / 2;

    function placeLeftNode(nodeId: string, depth: number): number {
      const children = treeAdj.get(nodeId) || [];
      const posX = -(SPACING_X_TOPIC + (depth - 1) * SPACING_X_SUB);

      if (children.length === 0) {
        const posY = currentY;
        positions.set(nodeId, {
          x: Math.round(posX),
          y: Math.round(posY),
          sourcePosition: Position.Left,
          targetPosition: Position.Right,
        });
        currentY += SLOT_HEIGHT;
        return posY;
      }

      const childYs = children.map((c) => placeLeftNode(c, depth + 1));
      const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;

      positions.set(nodeId, {
        x: Math.round(posX),
        y: Math.round(avgY),
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
      });
      return avgY;
    }

    leftTopics.forEach((topicId) => {
      placeLeftNode(topicId, 1);
    });
  }
}

/**
 * Left-to-Right Horizontal Tree Layout Engine
 * Places root at left (0, 0), branches progress +X, vertical placement guarantees zero overlap.
 */
function layoutHorizontalEngine(
  rootId: string,
  treeAdj: Map<string, string[]>,
  leafWeights: Map<string, number>,
  positions: Map<string, NodePosition>
) {
  const SPACING_X_TOPIC = 310;
  const SPACING_X_SUB = 260;
  const SLOT_HEIGHT = 85;

  positions.set(rootId, {
    x: 0,
    y: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  const rootChildren = treeAdj.get(rootId) || [];
  if (rootChildren.length === 0) return;

  const totalLeaves = leafWeights.get(rootId) || 1;
  let currentY = -((totalLeaves - 1) * SLOT_HEIGHT) / 2;

  function placeHorizontalNode(nodeId: string, depth: number): number {
    const children = treeAdj.get(nodeId) || [];
    const posX = SPACING_X_TOPIC + (depth - 1) * SPACING_X_SUB;

    if (children.length === 0) {
      const posY = currentY;
      positions.set(nodeId, {
        x: Math.round(posX),
        y: Math.round(posY),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      currentY += SLOT_HEIGHT;
      return posY;
    }

    const childYs = children.map((c) => placeHorizontalNode(c, depth + 1));
    const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;

    positions.set(nodeId, {
      x: Math.round(posX),
      y: Math.round(avgY),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
    return avgY;
  }

  for (const branchId of rootChildren) {
    placeHorizontalNode(branchId, 1);
  }
}

/**
 * Top-to-Bottom Vertical Tree Layout Engine
 * Places root at top (0, 0), branches progress +Y, horizontal placement guarantees zero overlap.
 */
function layoutVerticalEngine(
  rootId: string,
  treeAdj: Map<string, string[]>,
  leafWeights: Map<string, number>,
  positions: Map<string, NodePosition>
) {
  const SPACING_Y_TOPIC = 190;
  const SPACING_Y_SUB = 160;
  const SLOT_WIDTH = 250;

  const totalLeaves = leafWeights.get(rootId) || 1;
  let currentX = -((totalLeaves - 1) * SLOT_WIDTH) / 2;

  function placeVerticalNode(nodeId: string, depth: number): number {
    const children = treeAdj.get(nodeId) || [];
    const posY = depth === 0 ? 0 : SPACING_Y_TOPIC + (depth - 1) * SPACING_Y_SUB;

    if (children.length === 0) {
      const posX = currentX;
      positions.set(nodeId, {
        x: Math.round(posX),
        y: Math.round(posY),
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      currentX += SLOT_WIDTH;
      return posX;
    }

    const childXs = children.map((c) => placeVerticalNode(c, depth + 1));
    const avgX = (childXs[0] + childXs[childXs.length - 1]) / 2;

    positions.set(nodeId, {
      x: Math.round(avgX),
      y: Math.round(posY),
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
    return avgX;
  }

  placeVerticalNode(rootId, 0);
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
 * Pipeline:
 *   Graph -> Layout -> Node Positions -> Handle Direction -> Edges
 */
export function applyLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: LayoutDirection = "radial"
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const positions = computeLayoutPositions(nodes, edges, direction);

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
