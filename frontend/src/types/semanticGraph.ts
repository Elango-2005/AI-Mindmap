/**

 * Semantic Graph Domain Types

 * Defines the semantic information of mind maps separate from visual presentation.

 */



export type SemanticNodeType =

  | "root"

  | "topic"

  | "concept"

  | "detail"

  | "task"

  | "insight"

  | "ai_suggestion";



export const SEMANTIC_NODE_TYPES = {

  ROOT: "root",

  TOPIC: "topic",

  CONCEPT: "concept",

  DETAIL: "detail",

  TASK: "task",

  INSIGHT: "insight",

  AI_SUGGESTION: "ai_suggestion",

} as const;



export type TaskStatus = "todo" | "in_progress" | "done";

export type NodePriority = "low" | "medium" | "high";



export interface SemanticNodeMetadata {

  status?: TaskStatus;

  priority?: NodePriority;

  category?: string;

  aiGenerated?: boolean;

  suggestedAction?: string;

  sourceDocumentId?: string;

  notes?: string;

  [key: string]: unknown;

}



/**

 * Explicit user style overrides for a node.

 * Persisted separately from derived visual presentation styles.

 */

export interface NodeStyleOverride {

  shape?: "auto" | "rounded" | "pill" | "minimal";

  color?: "auto" | "branch" | "neutral" | "accent";

  icon?: string | null;

  style?: "auto" | "filled" | "outline" | "subtle";

}



/**

 * Pure semantic representation of a mind map node.

 * Describes WHAT the node represents in the knowledge graph.

 */

export interface SemanticNode {

  id: string;

  mindMapId?: string;

  title: string;

  type: SemanticNodeType;

  depth: number;

  parentId: string | null;

  branchId: string | null;

  importanceScore: number;

  position: { x: number; y: number };

  version?: number;

  metadata?: SemanticNodeMetadata;

  styleOverride?: NodeStyleOverride;

  createdAt?: string;

  updatedAt?: string;

}



export type SemanticEdgeType =

  | "hierarchy"

  | "relationship"

  | "ai_suggestion";



export const SEMANTIC_EDGE_TYPES = {

  HIERARCHY: "hierarchy",

  RELATIONSHIP: "relationship",

  AI_SUGGESTION: "ai_suggestion",

} as const;



export type LayoutMode = "radial" | "horizontal" | "vertical";



/**

 * Pure semantic representation of an edge connecting two nodes.

 */

export interface SemanticEdge {

  id: string;

  mindMapId?: string;

  source: string;

  target: string;

  label?: string | null;

  type?: SemanticEdgeType | string;

  animated?: boolean;

  version?: number;

  metadata?: Record<string, unknown>;

  createdAt?: string;

  updatedAt?: string;

}



/**

 * Edge visual configuration for canvas rendering.

 */

export interface EdgeVisualConfig {

  edgeType: SemanticEdgeType;

  stroke: string;

  strokeWidth: number;

  strokeDasharray?: string;

  animated?: boolean;

  markerEnd?: string;

  showLabel?: boolean;

  label?: string;

}



/**

 * High-level semantic graph containing nodes and edges.

 */

export interface SemanticGraph {

  nodes: SemanticNode[];

  edges: SemanticEdge[];

}



/**

 * Spatial layout topology options.

 */

export type MapStructure = "horizontal" | "vertical" | "radial" | "balanced";



export type ThemeKey = "modern" | "minimal" | "colorful";



/**

 * Branch color palette definition.

 */

export interface BranchPalette {

  bg: string;

  border: string;

  text: string;

  stroke: string;

  accent?: string;

}



/**

 * Complete visual theme specification.

 */

export interface MapTheme {

  id: ThemeKey | string;

  name: string;

  description: string;

  primary?: string;

  secondary?: string;

  accent?: string;

  previewColors?: string[];

  canvasBg?: string;

  root: BranchPalette & { shape?: "pill" | "rounded-rect" };

  branches: BranchPalette[];

}



/**

 * Visual configuration determined by the renderer for a specific node.

 * Describes HOW the node is presented on the canvas.

 */

export interface NodeVisualConfig {

  shape: "pill" | "rounded-rect" | "card" | "callout" | "badge";

  shapeClasses: string;

  typographyClasses: string;

  borderClasses: string;

  bgClasses: string;

  textColorClasses: string;

  iconName?: string;

  iconClasses?: string;

  showCheckbox?: boolean;

  isCompleted?: boolean;

  showSparkle?: boolean;

  ringClasses?: string;

  minWidth?: number;

  minHeight?: number;

  dotColor?: string;

  accentStroke?: string;

}

