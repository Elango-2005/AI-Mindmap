import { Node as FlowNode, Edge as FlowEdge, Position } from "@xyflow/react";
import { SemanticGraph, SemanticNode, SemanticEdge, LayoutMode } from "@/types/semanticGraph";

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
 * Computes deterministic 2D canvas coordinates for graph nodes.
 * Pure layout calculation with zero AI logic, perfectly reproducible given identical inputs.
 *
 * Supported modes:
 * - 'radial': 360-degree organic radial mind map with proportional angular wedges
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
  // Cross-branch edges and AI suggestions must not distort tree structure
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

  // Track parent-child tree links using BFS from candidate roots to guarantee DAG (no cycles)
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
    // Sort children deterministically by id/importance for repeatable output
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
 * 360-Degree Radial Layout Engine
 * Places root at center (0, 0), allocates angular sectors based on subtree leaf weight,
 * and expands outward organically with collision avoidance.
 */
function layoutRadialEngine(
  rootId: string,
  treeAdj: Map<string, string[]>,
  leafWeights: Map<string, number>,
  positions: Map<string, NodePosition>
) {
  const R_BASE = 280; // Distance from root to topic nodes
  const R_STEP = 230; // Distance per child depth
  const MIN_ARC_SEPARATION = 75; // Minimum linear distance along the arc to prevent node collisions

  // Root at origin
  positions.set(rootId, {
    x: 0,
    y: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  const topics = treeAdj.get(rootId) || [];
  if (topics.length === 0) return;

  const totalTopicWeight = topics.reduce(
    (sum, tId) => sum + (leafWeights.get(tId) || 1),
    0
  );

  let currentAngle = -Math.PI / 2; // Start from top for visually balanced distribution

  topics.forEach((topicId) => {
    const weight = leafWeights.get(topicId) || 1;
    const sectorAngle = (weight / totalTopicWeight) * (2 * Math.PI);
    const centerAngle = currentAngle + sectorAngle / 2;

    const topicX = Math.round(R_BASE * Math.cos(centerAngle));
    const topicY = Math.round(R_BASE * Math.sin(centerAngle));

    const isRightHemisphere = Math.cos(centerAngle) >= 0;
    positions.set(topicId, {
      x: topicX,
      y: topicY,
      sourcePosition: isRightHemisphere ? Position.Right : Position.Left,
      targetPosition: isRightHemisphere ? Position.Left : Position.Right,
    });

    // Recursively layout topic children within its allocated angular sector
    layoutRadialChildren(
      topicId,
      2,
      currentAngle,
      currentAngle + sectorAngle,
      R_BASE + R_STEP,
      treeAdj,
      leafWeights,
      positions,
      R_STEP,
      MIN_ARC_SEPARATION
    );

    currentAngle += sectorAngle;
  });
}

function layoutRadialChildren(
  parentId: string,
  depth: number,
  sectorMin: number,
  sectorMax: number,
  baseRadius: number,
  treeAdj: Map<string, string[]>,
  leafWeights: Map<string, number>,
  positions: Map<string, NodePosition>,
  rStep: number,
  minArcSeparation: number
) {
  const children = treeAdj.get(parentId) || [];
  if (children.length === 0) return;

  const sectorSpan = sectorMax - sectorMin;
  const totalWeight = children.reduce(
    (sum, cId) => sum + (leafWeights.get(cId) || 1),
    0
  );

  let curAngle = sectorMin;

  children.forEach((childId, idx) => {
    const weight = leafWeights.get(childId) || 1;
    const childSpan = (weight / totalWeight) * sectorSpan;
    const childAngle = curAngle + childSpan / 2;

    // Check arc length at current radius: Arc = Radius * Angle
    let effectiveRadius = baseRadius;
    const arcLength = baseRadius * childSpan;
    if (arcLength < minArcSeparation) {
      // Scale radius outward or alternate rings to guarantee ample clearance
      const requiredR = minArcSeparation / Math.max(0.06, childSpan);
      effectiveRadius = Math.max(baseRadius, Math.min(requiredR, baseRadius * 1.6));
      // Stagger alternating children on dense branches
      if (idx % 2 === 1) effectiveRadius += 45;
    }

    const x = Math.round(effectiveRadius * Math.cos(childAngle));
    const y = Math.round(effectiveRadius * Math.sin(childAngle));

    const isRightHemisphere = Math.cos(childAngle) >= 0;
    positions.set(childId, {
      x,
      y,
      sourcePosition: isRightHemisphere ? Position.Right : Position.Left,
      targetPosition: isRightHemisphere ? Position.Left : Position.Right,
    });

    layoutRadialChildren(
      childId,
      depth + 1,
      curAngle,
      curAngle + childSpan,
      effectiveRadius + rStep,
      treeAdj,
      leafWeights,
      positions,
      rStep,
      minArcSeparation
    );

    curAngle += childSpan;
  });
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
  const SPACING_X = 280; // Distance between hierarchy levels
  const SLOT_HEIGHT = 90; // Vertical height allocated per leaf node

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
    const posX = depth * SPACING_X;

    if (children.length === 0) {
      const posY = currentY;
      positions.set(nodeId, {
        x: posX,
        y: Math.round(posY),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      currentY += SLOT_HEIGHT;
      return posY;
    }

    const childYs: number[] = [];
    for (const child of children) {
      childYs.push(placeHorizontalNode(child, depth + 1));
    }

    const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;
    positions.set(nodeId, {
      x: posX,
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
  const SPACING_Y = 160; // Distance between hierarchy levels
  const SLOT_WIDTH = 230; // Horizontal width allocated per leaf node

  const totalLeaves = leafWeights.get(rootId) || 1;
  let currentX = -((totalLeaves - 1) * SLOT_WIDTH) / 2;

  function placeVerticalNode(nodeId: string, depth: number): number {
    const children = treeAdj.get(nodeId) || [];
    const posY = depth * SPACING_Y;

    if (children.length === 0) {
      const posX = currentX;
      positions.set(nodeId, {
        x: Math.round(posX),
        y: posY,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      currentX += SLOT_WIDTH;
      return posX;
    }

    const childXs: number[] = [];
    for (const child of children) {
      childXs.push(placeVerticalNode(child, depth + 1));
    }

    const avgX = (childXs[0] + childXs[childXs.length - 1]) / 2;
    positions.set(nodeId, {
      x: Math.round(avgX),
      y: posY,
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
 * Updates node positions, handles, and preserves edge objects.
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

  return { nodes: updatedNodes, edges };
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

  return {
    nodes: updatedNodes,
    edges: graph.edges,
  };
}
