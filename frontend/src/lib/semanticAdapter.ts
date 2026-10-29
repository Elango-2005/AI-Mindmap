import { determineOptimalHandles } from "./layoutAlgorithms.ts";
import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

import {
  SEMANTIC_NODE_TYPES,
  SEMANTIC_EDGE_TYPES,
  type SemanticNodeType,
  type SemanticEdgeType,
  type SemanticNode,
  type SemanticEdge,
  type SemanticGraph,
  type MapTheme,
  type NodeVisualConfig,
  type NodeStyleOverride,
  type ThemeKey,
} from "../types/semanticGraph.ts";

import {

  DEFAULT_THEME,

  THEME_PALETTES,

  normalizeThemeKey,

  type BranchTheme,

} from "./graphColoring.ts";



/**

 * Normalizes an arbitrary string type or infers it based on depth and content.

 * Guarantees backward compatibility for legacy nodes where type is "default" or missing.

 */

export function normalizeSemanticType(
  rawType?: string,
  depth: number = 0,
  label: string = ""
): SemanticNodeType {
  if (rawType) {
    const clean = rawType.toLowerCase().trim();
    if (clean === "root") return SEMANTIC_NODE_TYPES.ROOT;
    if (clean === "topic" || clean === "main" || clean === "pillar") return SEMANTIC_NODE_TYPES.TOPIC;
    if (clean === "concept" || clean === "subtopic") return SEMANTIC_NODE_TYPES.CONCEPT;
    if (clean === "detail" || clean === "subconcept" || clean === "leaf" || clean === "item") return SEMANTIC_NODE_TYPES.DETAIL;
    if (clean === "task" || clean === "action" || clean === "todo" || clean === "deliverable") return SEMANTIC_NODE_TYPES.TASK;
    if (clean === "insight" || clean === "finding" || clean === "observation" || clean === "takeaway") return SEMANTIC_NODE_TYPES.INSIGHT;
    if (clean === "ai_suggestion" || clean === "suggestion" || clean === "proposal" || clean === "recommendation" || clean === "ai") {
      return SEMANTIC_NODE_TYPES.AI_SUGGESTION;
    }
  }

  // Content-based heuristics for quick inline tagging
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();

  if (
    trimmed.startsWith("[ ]") ||
    trimmed.startsWith("[x]") ||
    trimmed.startsWith("[X]") ||
    lower.startsWith("todo:") ||
    lower.startsWith("task:") ||
    lower.startsWith("action:") ||
    lower.startsWith("deliverable:")
  ) {
    return SEMANTIC_NODE_TYPES.TASK;
  }

  if (
    trimmed.startsWith("💡") ||
    trimmed.startsWith("🔍") ||
    lower.startsWith("insight:") ||
    lower.startsWith("key:") ||
    lower.startsWith("finding:") ||
    lower.startsWith("observation:") ||
    lower.startsWith("takeaway:")
  ) {
    return SEMANTIC_NODE_TYPES.INSIGHT;
  }

  if (
    trimmed.startsWith("✨") ||
    lower.startsWith("ai:") ||
    lower.startsWith("suggestion:") ||
    lower.startsWith("proposal:") ||
    lower.startsWith("recommendation:")
  ) {
    return SEMANTIC_NODE_TYPES.AI_SUGGESTION;
  }

  // Action verbs for deeper subnodes
  if (depth >= 2) {
    const actionVerbs = ["implement ", "deploy ", "test ", "review ", "build ", "setup ", "create ", "configure ", "design ", "verify ", "audit "];
    if (actionVerbs.some((verb) => lower.startsWith(verb))) {
      return SEMANTIC_NODE_TYPES.TASK;
    }
  }

  // Safe fallback based strictly on hierarchy depth
  if (depth === 0) return SEMANTIC_NODE_TYPES.ROOT;
  if (depth === 1) return SEMANTIC_NODE_TYPES.TOPIC;
  if (depth === 2) return SEMANTIC_NODE_TYPES.CONCEPT;
  return SEMANTIC_NODE_TYPES.DETAIL;
}

/**
 * Contextual icon inference for nodes.
 * Adheres strictly to MindVault iconography rules:
 * - Root: central brain/psychology icon
 * - Topic: contextual semantic icon based on topic keywords (storage, cube, sparkle, chart, settings, cloud, etc.)
 * - Concept: bullet dot (no separate icon)
 * - Detail: bullet dot (no separate icon)
 * - Task: checkbox (no separate icon)
 * - Insight: lightbulb
 * - Suggestion: sparkle
 */
export function inferSemanticIcon(title: string, type?: SemanticNodeType): string | undefined {
  if (type === "root") return "psychology";
  if (type === "task") return undefined;
  if (type === "insight") return "lightbulb";
  if (type === "ai_suggestion") return "auto_awesome";
  if (type === "concept" || type === "detail") return undefined;

  const t = (title || "").toLowerCase();
  if (t.includes("data") || t.includes("database") || t.includes("store") || t.includes("sql") || t.includes("storage") || t.includes("dataset") || t.includes("warehouse")) {
    return "storage";
  }
  if (t.includes("generative") || t.includes("llm") || t.includes("gpt") || t.includes("prompt") || t.includes("nlp") || t.includes("language") || t.includes("chat")) {
    return "view_in_ar";
  }
  if (t.includes("deep learning") || t.includes("neural") || t.includes("vision") || t.includes("cnn") || t.includes("transformer") || t.includes("network") || t.includes("architecture")) {
    return "auto_awesome";
  }
  if (t.includes("machine learning") || t.includes("stat") || t.includes("analytics") || t.includes("metric") || t.includes("chart") || t.includes("algorithm") || t.includes("supervised") || t.includes("unsupervised")) {
    return "bar_chart";
  }
  if (t.includes("ops") || t.includes("serving") || t.includes("production") || t.includes("pipeline") || t.includes("system") || t.includes("deploy") || t.includes("scale") || t.includes("mlops")) {
    return "settings";
  }
  if (t.includes("tool") || t.includes("cloud") || t.includes("framework") || t.includes("infra") || t.includes("docker") || t.includes("k8s") || t.includes("kubernetes")) {
    return "cloud";
  }
  if (t.includes("security") || t.includes("auth") || t.includes("privacy") || t.includes("guardrail") || t.includes("safe")) {
    return "shield";
  }
  if (t.includes("research") || t.includes("study") || t.includes("analysis") || t.includes("find") || t.includes("explore")) {
    return "search";
  }
  if (t.includes("learn") || t.includes("doc") || t.includes("book") || t.includes("guide") || t.includes("course") || t.includes("read")) {
    return "menu_book";
  }
  if (t.includes("project") || t.includes("plan") || t.includes("roadmap") || t.includes("strategy") || t.includes("milestone")) {
    return "folder";
  }
  if (t.includes("team") || t.includes("user") || t.includes("people") || t.includes("customer") || t.includes("community")) {
    return "group";
  }
  if (t.includes("code") || t.includes("api") || t.includes("dev") || t.includes("software") || t.includes("backend") || t.includes("frontend")) {
    return "code";
  }
  if (t.includes("money") || t.includes("cost") || t.includes("finance") || t.includes("budget") || t.includes("pricing") || t.includes("roi")) {
    return "payments";
  }

  return "category";
}

/**
 * Normalization & Validation Layer for AI-generated graphs.
 * Validates raw AI output before rendering or storing:
 * - Empty response fallback
 * - Missing/empty labels (defaults to 'Untitled Concept')
 * - Extremely long labels (truncates gracefully at 255 chars)
 * - Duplicate node IDs (deduplicates and remaps edges)
 * - Dangling edges (removes edges referencing non-existent nodes)
 * - Self-referencing edges (removes self-loops)
 * - Graph cycles (detects and breaks cycles to ensure hierarchy DAG)
 * - Clamps importance scores (0.0 to 1.0)
 * - Derives depth, branch IDs, and normalized semantic types
 */
export function validateAndNormalizeAiGraph(
  rawGraph: { nodes?: any[]; edges?: any[] } | null | undefined,
  fallbackRootTitle: string = "Central Topic"
): {
  nodes: any[];
  edges: any[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const rawNodes = Array.isArray(rawGraph?.nodes) ? rawGraph!.nodes : [];
  const rawEdges = Array.isArray(rawGraph?.edges) ? rawGraph!.edges : [];

  // 1. Handle empty response
  if (rawNodes.length === 0) {
    warnings.push("Empty nodes list received from AI; created default root node.");
    return {
      nodes: [
        {
          id: "root-concept",
          label: fallbackRootTitle || "Central Topic",
          type: SEMANTIC_NODE_TYPES.ROOT,
          importance_score: 1.0,
          position_x: 0,
          position_y: 0,
        },
      ],
      edges: [],
      warnings,
    };
  }

  // 2. Sanitize and deduplicate nodes
  const nodeIds = new Set<string>();
  const idRemap = new Map<string, string>();
  const sanitizedNodes: any[] = [];

  for (let i = 0; i < rawNodes.length; i++) {
    const node = rawNodes[i];
    if (!node || typeof node !== "object") continue;

    const rawId = String(node.id || `node_${i}`).trim() || `node_${i}`;
    let cleanId = rawId;
    let suffix = 1;
    while (nodeIds.has(cleanId)) {
      cleanId = `${rawId}_${suffix++}`;
      warnings.push(`Duplicate node ID '${rawId}' deduplicated to '${cleanId}'.`);
    }
    idRemap.set(rawId, cleanId);
    nodeIds.add(cleanId);

    // Sanitize label
    let label = String(node.label || node.title || "").trim();
    if (!label) {
      label = "Untitled Concept";
      warnings.push(`Node '${cleanId}' had missing label; assigned default.`);
    }
    if (label.length > 255) {
      label = label.slice(0, 250) + "...";
      warnings.push(`Node '${cleanId}' label exceeded 255 chars; truncated.`);
    }

    // Clamp importance score
    const score = node.importance_score ?? node.importanceScore;
    let cleanScore = 0.8;
    if (typeof score === "number" && !isNaN(score)) {
      cleanScore = Math.max(0.0, Math.min(1.0, score));
    } else {
      cleanScore = i === 0 ? 1.0 : 0.8;
    }

    sanitizedNodes.push({
      ...node,
      id: cleanId,
      label,
      rawType: node.type,
      importance_score: cleanScore,
      position_x: typeof node.position_x === "number" ? node.position_x : (node.position?.x ?? 0),
      position_y: typeof node.position_y === "number" ? node.position_y : (node.position?.y ?? 0),
    });
  }

  // 3. Sanitize edges & detect/break cycles
  const sanitizedEdges: any[] = [];
  const seenPairs = new Set<string>();
  const adj = new Map<string, string[]>();
  const inDegrees = new Map<string, number>();

  sanitizedNodes.forEach((n) => {
    adj.set(n.id, []);
    inDegrees.set(n.id, 0);
  });

  for (const edge of rawEdges) {
    if (!edge || typeof edge !== "object") continue;

    const rawSource = String(edge.source || "").trim();
    const rawTarget = String(edge.target || "").trim();

    const source = idRemap.get(rawSource) || rawSource;
    const target = idRemap.get(rawTarget) || rawTarget;

    // Drop dangling edges and self-loops
    if (!source || !target || source === target) {
      warnings.push(`Dropped invalid edge '${source}' -> '${target}'.`);
      continue;
    }
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      warnings.push(`Dropped dangling edge referencing missing node: '${source}' -> '${target}'.`);
      continue;
    }

    const pairKey = `${source}->${target}`;
    if (seenPairs.has(pairKey)) continue;

    // Cycle detection via DFS reachability
    function createsCycle(curr: string, dest: string, visited: Set<string> = new Set()): boolean {
      if (curr === dest) return true;
      visited.add(curr);
      const neighbors = adj.get(curr) || [];
      for (const nbr of neighbors) {
        if (!visited.has(nbr)) {
          if (createsCycle(nbr, dest, visited)) return true;
        }
      }
      return false;
    }

    if (createsCycle(target, source)) {
      warnings.push(`Cycle detected and broken: dropped back-edge '${source}' -> '${target}'.`);
      continue;
    }

    seenPairs.add(pairKey);
    adj.get(source)!.push(target);
    inDegrees.set(target, (inDegrees.get(target) || 0) + 1);

    let edgeLabel = edge.label ? String(edge.label).trim() : null;
    if (edgeLabel && edgeLabel.length > 255) {
      edgeLabel = edgeLabel.slice(0, 250) + "...";
    }

    sanitizedEdges.push({
      ...edge,
      id: edge.id || `edge_${source}_${target}`,
      source,
      target,
      label: edgeLabel,
      type: edge.type || "hierarchy",
    });
  }

  // 4. Calculate depth from roots and assign normalized semantic types
  const roots = sanitizedNodes.filter((n) => (inDegrees.get(n.id) || 0) === 0);
  const primaryRoots = roots.length > 0 ? roots : [sanitizedNodes[0]];
  const depthMap = new Map<string, number>();

  primaryRoots.forEach((r) => {
    const queue: Array<{ id: string; depth: number }> = [{ id: r.id, depth: 0 }];
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (!depthMap.has(id) || depth < depthMap.get(id)!) {
        depthMap.set(id, depth);
        const children = adj.get(id) || [];
        for (const child of children) {
          queue.push({ id: child, depth: depth + 1 });
        }
      }
    }
  });

  const finalNodes = sanitizedNodes.map((n) => {
    const depth = depthMap.get(n.id) ?? (n.id === primaryRoots[0].id ? 0 : 1);
    const semanticType = normalizeSemanticType(n.rawType, depth, n.label);
    return {
      ...n,
      depth,
      type: semanticType,
    };
  });

  return {
    nodes: finalNodes,
    edges: sanitizedEdges,
    warnings,
  };
}

export function buildSemanticGraph(rawNodes: any[], rawEdges: any[]): SemanticGraph {
  const normalized = validateAndNormalizeAiGraph({ nodes: rawNodes, edges: rawEdges });
  rawNodes = normalized.nodes;
  rawEdges = normalized.edges;

  const adj = new Map<string, string[]>();

  const inDegree = new Map<string, number>();

  const parentMap = new Map<string, string>();

  const rawNodeMap = new Map<string, any>();



  rawNodes.forEach((n) => {

    adj.set(n.id, []);

    inDegree.set(n.id, 0);

    rawNodeMap.set(n.id, n);

  });



  rawEdges.forEach((e) => {

    const sourceId = String(e.source);

    const targetId = String(e.target);

    if (adj.has(sourceId) && inDegree.has(targetId)) {

      adj.get(sourceId)!.push(targetId);

      inDegree.set(targetId, inDegree.get(targetId)! + 1);

      parentMap.set(targetId, sourceId);

    }

  });



  // Identify root nodes (nodes with 0 incoming edges)

  const roots = rawNodes.filter((n) => (inDegree.get(n.id) || 0) === 0);

  const primaryRoots = roots.length > 0 ? roots : rawNodes.slice(0, 1);



  const depthMap = new Map<string, number>();

  const branchMap = new Map<string, string>();



  // BFS / DFS traversal to calculate depth and primary branch membership

  primaryRoots.forEach((root) => {

    depthMap.set(root.id, 0);

    branchMap.set(root.id, root.id);



    const children = adj.get(root.id) || [];

    children.forEach((childId) => {

      // Each direct child of root starts a primary branch

      branchMap.set(childId, childId);

      const stack = [{ id: childId, depth: 1 }];



      while (stack.length > 0) {

        const current = stack.pop()!;

        if (!depthMap.has(current.id)) {

          depthMap.set(current.id, current.depth);

          branchMap.set(current.id, childId);



          const neighbors = adj.get(current.id) || [];

          neighbors.forEach((nbrId) => {

            stack.push({ id: nbrId, depth: current.depth + 1 });

          });

        }

      }

    });

  });



  // Fallback for any disconnected / orphaned nodes

  rawNodes.forEach((n) => {

    if (!depthMap.has(n.id)) {

      depthMap.set(n.id, 1);

      branchMap.set(n.id, n.id);

    }

  });



  const semanticNodes: SemanticNode[] = rawNodes.map((n) => {

    const depth = depthMap.get(n.id) || 0;

    const parentId = parentMap.get(n.id) || null;

    const branchId = branchMap.get(n.id) || null;

    const label = n.label || "";

    const type = normalizeSemanticType(n.type, depth, label);



    const posX = typeof n.position_x === "number" ? n.position_x : (n.position?.x ?? 0);

    const posY = typeof n.position_y === "number" ? n.position_y : (n.position?.y ?? 0);



    const importanceScore =

      typeof n.importance_score === "number"

        ? Math.max(0.0, Math.min(1.0, n.importance_score))

        : (typeof n.data?.importance_score === "number" ? n.data.importance_score : 1.0);



    let taskStatus: "todo" | "done" | undefined = undefined;

    if (type === "task") {

      taskStatus = label.includes("[x]") || label.includes("[X]") ? "done" : "todo";

    }



    return {

      id: String(n.id),

      mindMapId: n.mind_map_id || n.data?.mindMapId,

      title: label,

      type,

      depth,

      parentId,

      branchId,

      importanceScore,

      position: { x: posX, y: posY },

      version: n.version,

      metadata: {

        ...(n.metadata || {}),

        status: taskStatus,

      },

      styleOverride: n.styleOverride || n.data?.styleOverride,

      createdAt: n.created_at,

      updatedAt: n.updated_at,

    };

  });



  const semanticEdges: SemanticEdge[] = rawEdges.map((e) => {

    const rawType = (e.type || "").toLowerCase().trim();

    let edgeType: SemanticEdgeType = SEMANTIC_EDGE_TYPES.HIERARCHY;

    if (rawType === "relationship" || rawType === "relation") {

      edgeType = SEMANTIC_EDGE_TYPES.RELATIONSHIP;

    } else if (rawType === "ai_suggestion" || rawType === "suggestion" || e.metadata?.isSuggested) {

      edgeType = SEMANTIC_EDGE_TYPES.AI_SUGGESTION;

    } else if (parentMap.get(String(e.target)) !== String(e.source)) {

      // Cross-branch link

      edgeType = SEMANTIC_EDGE_TYPES.RELATIONSHIP;

    }



    return {

      id: String(e.id),

      mindMapId: e.mind_map_id,

      source: String(e.source),

      target: String(e.target),

      label: e.label ?? null,

      type: edgeType,

      animated: edgeType === SEMANTIC_EDGE_TYPES.AI_SUGGESTION ? true : (e.animated ?? false),

      version: e.version,

      metadata: e.metadata,

      createdAt: e.created_at,

      updatedAt: e.updated_at,

    };

  });



  return { nodes: semanticNodes, edges: semanticEdges };

}



/**

 * Resolves visual presentation tokens for a given semantic node and theme.

 * Completely decouples the visual styling logic from the node's semantic definition.

 * Supports theme selection (Modern, Minimal, Colorful) and explicit user-level overrides.

 */

export function resolveNodeVisualConfig(
  node: SemanticNode,
  themePalette: MapTheme | ThemeKey,
  isSelected: boolean = false,
  override?: NodeStyleOverride
): NodeVisualConfig {
  const themeKey =
    typeof themePalette === "string"
      ? normalizeThemeKey(themePalette)
      : normalizeThemeKey(themePalette.id);

  const theme = THEME_PALETTES[themeKey] || THEME_PALETTES.modern;

  const branchThemes =
    theme.branches && theme.branches.length > 0
      ? theme.branches
      : THEME_PALETTES.modern.branches;
  const rootTheme = theme.root || THEME_PALETTES.modern.root;

  // Derive branch color assignment using consistent hash from branchId
  let assignedPalette: BranchTheme = DEFAULT_THEME;
  if (node.depth === 0 || node.type === "root") {
    assignedPalette = rootTheme;
  } else if (node.branchId) {
    let hash = 0;
    for (let i = 0; i < node.branchId.length; i++) {
      hash = (hash << 5) - hash + node.branchId.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % branchThemes.length;
    assignedPalette = branchThemes[index];
  } else {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++) {
      hash = (hash << 5) - hash + node.id.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % branchThemes.length;
    assignedPalette = branchThemes[index];
  }

  const isHighImportance = node.importanceScore >= 0.85;
  const isLowImportance = node.importanceScore <= 0.35;
  let ringClasses = "";
  if (isHighImportance && node.depth > 0) {
    ringClasses = "ring-1 ring-amber-400/50 shadow-xs";
  } else if (isLowImportance && node.depth > 0) {
    ringClasses = "opacity-85";
  }

  const selectionRing = isSelected
    ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md border-primary"
    : "";

  let baseConfig: NodeVisualConfig;

  // 1. Theme-Specific Default Configuration
  if (themeKey === "minimal") {
    // MINIMAL THEME: Calm, low visual noise, mostly neutral backgrounds, subtle borders
    switch (node.type) {
      case "root":
        baseConfig = {
          shape: "pill",
          shapeClasses: `rounded-full py-2.5 px-6 min-w-[150px] max-w-[300px] shadow-none border transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[16px] font-semibold tracking-tight text-center",
          borderClasses: rootTheme.border,
          bgClasses: rootTheme.bg,
          textColorClasses: rootTheme.text,
          iconName: "psychology",
          iconClasses: "text-[20px] text-white dark:text-slate-900 shrink-0",
          dotColor: "#ffffff",
          accentStroke: "#ffffff",
        };
        break;

      case "topic":
        baseConfig = {
          shape: "rounded-rect",
          shapeClasses: `rounded-xl py-2 px-3.5 min-w-[120px] max-w-[260px] shadow-none border transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[14px] font-semibold text-left",
          borderClasses: "border-slate-300 dark:border-slate-600",
          bgClasses: "bg-surface-container-lowest dark:bg-surface-container-low",
          textColorClasses: "text-slate-900 dark:text-slate-100",
          iconName: inferSemanticIcon(node.title, "topic"),
          iconClasses: "text-[18px] shrink-0",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;

      case "detail":
        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-md py-1 px-2.5 min-w-[80px] max-w-[220px] border shadow-none transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[12px] font-normal text-left",
          borderClasses: "border-slate-200/70 dark:border-slate-800/60",
          bgClasses: "bg-surface-container-lowest/80 dark:bg-surface-container-lowest/70",
          textColorClasses: "text-slate-600 dark:text-slate-400",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;

      case "task": {
        const trimmed = (node.title || "").trim();
        const isDone =
          node.metadata?.status === "done" ||
          trimmed.startsWith("[x]") ||
          trimmed.startsWith("[X]");

        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-lg py-1.5 px-3 min-w-[110px] max-w-[240px] border shadow-none transition-all duration-150 ${
            isDone ? "opacity-75 " : ""
          }${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left",
          borderClasses: isSelected
            ? "border-primary ring-2 ring-primary"
            : "border-slate-300 dark:border-slate-600 hover:border-primary/50",
          bgClasses: "bg-surface-container-lowest dark:bg-surface-container-low",
          textColorClasses: isDone
            ? "text-slate-400 dark:text-slate-500 line-through"
            : "text-slate-900 dark:text-slate-100",
          showCheckbox: true,
          isCompleted: isDone,
          iconName: isDone ? "check_box" : "check_box_outline_blank",
          iconClasses: "text-[16px] text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer",
          dotColor: assignedPalette.stroke,
        };
        break;
      }

      case "insight":
        baseConfig = {
          shape: "callout",
          shapeClasses: `rounded-lg py-1.5 px-3 min-w-[110px] max-w-[240px] border shadow-none transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium italic text-left",
          borderClasses: isSelected
            ? "border-primary ring-2 ring-primary"
            : "border-amber-400/60 dark:border-amber-500/50",
          bgClasses: "bg-amber-500/5 dark:bg-amber-500/10",
          textColorClasses: "text-amber-950 dark:text-amber-100",
          iconName: "lightbulb",
          iconClasses: "text-[16px] text-amber-600 dark:text-amber-400 shrink-0",
          dotColor: "#f59e0b",
        };
        break;

      case "ai_suggestion":
        baseConfig = {
          shape: "badge",
          shapeClasses: `rounded-lg py-1.5 px-3 min-w-[110px] max-w-[240px] border border-dashed shadow-none transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left",
          borderClasses: isSelected
            ? "border-primary ring-2 ring-primary"
            : "border-violet-400/60 dark:border-violet-500/50",
          bgClasses: "bg-violet-500/5 dark:bg-violet-500/10",
          textColorClasses: "text-violet-950 dark:text-violet-100",
          iconName: "auto_awesome",
          iconClasses: "text-[16px] text-violet-600 dark:text-violet-400 shrink-0",
          showSparkle: true,
          dotColor: "#8b5cf6",
        };
        break;

      case "concept":
      default:
        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-lg py-1.5 px-3 min-w-[95px] max-w-[240px] border shadow-none transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left",
          borderClasses: isSelected
            ? "border-primary ring-2 ring-primary"
            : "border-slate-200 dark:border-slate-700",
          bgClasses: "bg-surface-container-lowest dark:bg-surface-container-low",
          textColorClasses: "text-slate-800 dark:text-slate-200",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;
    }
  } else if (themeKey === "colorful") {
    // COLORFUL THEME: Rich, distinct branch hues with tinted surfaces
    switch (node.type) {
      case "root":
        baseConfig = {
          shape: "pill",
          shapeClasses: `rounded-full py-3 px-6 min-w-[170px] max-w-[340px] shadow-md border-2 transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[16px] md:text-[17px] font-bold tracking-tight text-center",
          borderClasses: rootTheme.border,
          bgClasses: rootTheme.bg,
          textColorClasses: rootTheme.text,
          iconName: "psychology",
          iconClasses: "text-[20px] text-white shrink-0",
          dotColor: "#ffffff",
          accentStroke: "#ffffff",
        };
        break;

      case "topic":
        baseConfig = {
          shape: "rounded-rect",
          shapeClasses: `rounded-2xl py-2.5 px-4 min-w-[130px] max-w-[280px] shadow-xs border-2 transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[14px] font-semibold text-left",
          borderClasses: assignedPalette.border,
          bgClasses: `${assignedPalette.bg} backdrop-blur-xs`,
          textColorClasses: assignedPalette.text,
          iconName: inferSemanticIcon(node.title, "topic"),
          iconClasses: "text-[18px] shrink-0",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;

      case "detail":
        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-lg py-1 px-2.5 min-w-[85px] max-w-[240px] border shadow-2xs transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[12px] font-normal text-left",
          borderClasses: assignedPalette.tintBorder || "border-slate-200",
          bgClasses: "bg-surface-container-lowest/80 dark:bg-surface-container-lowest/70",
          textColorClasses: "text-on-surface-variant dark:text-on-surface-variant",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;

      case "task": {
        const trimmed = (node.title || "").trim();
        const isDone =
          node.metadata?.status === "done" ||
          trimmed.startsWith("[x]") ||
          trimmed.startsWith("[X]");

        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-lg py-1.5 px-3 min-w-[110px] max-w-[240px] border shadow-2xs transition-all duration-150 ${
            isDone ? "opacity-75 " : ""
          }${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left",
          borderClasses: isSelected
            ? "border-primary ring-2 ring-primary"
            : "border-outline-variant/60 dark:border-outline-variant/40 hover:border-primary/50",
          bgClasses: "bg-surface-container-lowest dark:bg-surface-container-low",
          textColorClasses: isDone
            ? "text-on-surface-variant dark:text-on-surface-variant line-through"
            : "text-on-surface dark:text-on-surface",
          showCheckbox: true,
          isCompleted: isDone,
          iconName: isDone ? "check_box" : "check_box_outline_blank",
          iconClasses: "text-[16px] text-primary shrink-0 cursor-pointer",
          dotColor: assignedPalette.stroke,
        };
        break;
      }

      case "insight":
        baseConfig = {
          shape: "callout",
          shapeClasses: `rounded-lg py-1.5 px-3 min-w-[110px] max-w-[240px] border shadow-2xs backdrop-blur-xs transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium italic text-left",
          borderClasses: isSelected
            ? "border-primary ring-2 ring-primary"
            : "border-amber-400/80 dark:border-amber-500/70",
          bgClasses: "bg-amber-500/15 dark:bg-amber-500/20",
          textColorClasses: "text-amber-950 dark:text-amber-100",
          iconName: "lightbulb",
          iconClasses: "text-[16px] text-amber-600 dark:text-amber-400 shrink-0",
          dotColor: "#f59e0b",
        };
        break;

      case "ai_suggestion":
        baseConfig = {
          shape: "badge",
          shapeClasses: `rounded-lg py-1.5 px-3 min-w-[110px] max-w-[240px] border border-dashed shadow-2xs backdrop-blur-xs transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left",
          borderClasses: isSelected
            ? "border-primary ring-2 ring-primary"
            : "border-violet-500/80 dark:border-violet-400/70",
          bgClasses: "bg-violet-500/10 dark:bg-violet-500/15",
          textColorClasses: "text-violet-950 dark:text-violet-100",
          iconName: "auto_awesome",
          iconClasses: "text-[16px] text-violet-600 dark:text-violet-400 shrink-0",
          showSparkle: true,
          dotColor: "#8b5cf6",
        };
        break;

      case "concept":
      default:
        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-xl py-1.5 px-3 min-w-[100px] max-w-[260px] border-2 shadow-2xs backdrop-blur-xs transition-all duration-150 ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left",
          borderClasses: assignedPalette.tintBorder || assignedPalette.border,
          bgClasses: assignedPalette.tintBg || `${assignedPalette.bg} backdrop-blur-xs`,
          textColorClasses: assignedPalette.text,
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;
    }
  } else {
    // MODERN THEME (Default): Approved Reference Design — Restrained SaaS hierarchy
    switch (node.type) {
      case "root":
        baseConfig = {
          shape: "pill",
          shapeClasses: `rounded-full py-3 px-6 min-w-[170px] max-w-[340px] shadow-lg shadow-indigo-950/20 border transition-all duration-200 cursor-pointer ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[16px] md:text-[17px] font-bold tracking-tight text-center",
          borderClasses: rootTheme.border,
          bgClasses: rootTheme.bg,
          textColorClasses: rootTheme.text,
          iconName: "psychology",
          iconClasses: "text-[20px] text-white shrink-0",
          dotColor: "#ffffff",
          accentStroke: "#ffffff",
        };
        break;

      case "topic":
        baseConfig = {
          shape: "rounded-rect",
          shapeClasses: `rounded-2xl py-2.5 px-4 min-w-[130px] max-w-[280px] shadow-xs hover:shadow-sm border-2 transition-all duration-200 cursor-pointer ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[14px] font-semibold text-left leading-snug",
          borderClasses: assignedPalette.border,
          bgClasses: assignedPalette.bg,
          textColorClasses: assignedPalette.text,
          iconName: inferSemanticIcon(node.title, "topic"),
          iconClasses: "text-[18px] shrink-0",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;

      case "concept":
        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-xl py-1.5 px-3 min-w-[100px] max-w-[260px] border shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left leading-snug",
          borderClasses: isSelected
            ? "border-primary shadow-glow ring-2 ring-primary ring-offset-1"
            : (assignedPalette.tintBorder || "border-slate-200 dark:border-slate-800"),
          bgClasses: assignedPalette.tintBg || "bg-[#f8fafc] dark:bg-slate-900/60",
          textColorClasses: "text-slate-800 dark:text-slate-200",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;

      case "detail":
        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-lg py-1 px-2.5 min-w-[85px] max-w-[240px] border shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[12px] font-normal text-left leading-snug",
          borderClasses: isSelected
            ? "border-primary shadow-glow ring-2 ring-primary ring-offset-1"
            : "border-slate-200/80 dark:border-slate-800/80",
          bgClasses: "bg-slate-50/90 dark:bg-slate-900/40",
          textColorClasses: "text-slate-600 dark:text-slate-400",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;

      case "task": {
        const trimmed = (node.title || "").trim();
        const isDone =
          node.metadata?.status === "done" ||
          trimmed.startsWith("[x]") ||
          trimmed.startsWith("[X]");

        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-xl py-1.5 px-3 min-w-[110px] max-w-[260px] border shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer ${
            isDone ? "opacity-75 " : ""
          }${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left leading-snug",
          borderClasses: isSelected
            ? "border-primary shadow-glow ring-2 ring-primary ring-offset-1"
            : isDone
            ? "border-slate-200 dark:border-slate-800"
            : "border-slate-200 dark:border-slate-700 hover:border-primary/50",
          bgClasses: "bg-white dark:bg-slate-900/90",
          textColorClasses: isDone
            ? "text-slate-400 dark:text-slate-500 line-through"
            : "text-slate-800 dark:text-slate-200",
          showCheckbox: true,
          isCompleted: isDone,
          iconName: isDone ? "check_box" : "check_box_outline_blank",
          iconClasses: "text-[16px] text-primary shrink-0 cursor-pointer",
          dotColor: assignedPalette.stroke,
        };
        break;
      }

      case "insight":
        baseConfig = {
          shape: "callout",
          shapeClasses: `rounded-xl py-1.5 px-3.5 min-w-[110px] max-w-[260px] border shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium italic text-left leading-snug",
          borderClasses: isSelected
            ? "border-primary shadow-glow ring-2 ring-primary ring-offset-1"
            : "border-amber-300/80 dark:border-amber-700/60",
          bgClasses: "bg-amber-50/90 dark:bg-amber-950/30",
          textColorClasses: "text-amber-950 dark:text-amber-100",
          iconName: "lightbulb",
          iconClasses: "text-[16px] text-amber-600 dark:text-amber-400 shrink-0",
          dotColor: "#f59e0b",
        };
        break;

      case "ai_suggestion":
        baseConfig = {
          shape: "badge",
          shapeClasses: `rounded-xl py-2 px-3.5 min-w-[130px] max-w-[260px] border-2 border-dashed shadow-2xs transition-all duration-200 cursor-pointer ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left leading-snug",
          borderClasses: isSelected
            ? "border-primary shadow-glow ring-2 ring-primary ring-offset-1"
            : "border-violet-400/80 dark:border-violet-500/60",
          bgClasses: "bg-[#FAF8FF] dark:bg-violet-950/20",
          textColorClasses: "text-violet-950 dark:text-violet-100",
          iconName: "auto_awesome",
          iconClasses: "text-[16px] text-violet-600 dark:text-violet-400 shrink-0",
          showSparkle: true,
          dotColor: "#8b5cf6",
        };
        break;

      default:
        baseConfig = {
          shape: "card",
          shapeClasses: `rounded-xl py-1.5 px-3 min-w-[100px] max-w-[260px] border shadow-2xs transition-all duration-200 cursor-pointer ${ringClasses} ${selectionRing}`,
          typographyClasses: "text-[13px] font-medium text-left leading-snug",
          borderClasses: isSelected
            ? "border-primary shadow-glow ring-2 ring-primary ring-offset-1"
            : (assignedPalette.tintBorder || "border-slate-200 dark:border-slate-800"),
          bgClasses: assignedPalette.tintBg || "bg-[#f8fafc] dark:bg-slate-900/60",
          textColorClasses: "text-slate-800 dark:text-slate-200",
          accentStroke: assignedPalette.stroke,
          dotColor: assignedPalette.dotColor || assignedPalette.stroke,
        };
        break;
    }
  }

  // 2. Apply Explicit User Style Overrides (if any)
  const effectiveOverride = override || node.styleOverride;
  if (effectiveOverride) {
    // Shape Override
    if (effectiveOverride.shape === "pill") {
      baseConfig.shape = "pill";
      baseConfig.shapeClasses = baseConfig.shapeClasses
        .replace(/rounded-(xl|lg|md|2xl)/g, "rounded-full")
        .replace(/py-[\d\.]+/g, "py-2")
        .replace(/px-[\d\.]+/g, "px-5");
      if (!baseConfig.shapeClasses.includes("rounded-full")) {
        baseConfig.shapeClasses = `rounded-full ${baseConfig.shapeClasses}`;
      }
    } else if (effectiveOverride.shape === "rounded") {
      baseConfig.shape = "rounded-rect";
      baseConfig.shapeClasses = baseConfig.shapeClasses
        .replace(/rounded-(full|md|lg)/g, "rounded-xl")
        .replace(/py-[\d\.]+/g, "py-2.5")
        .replace(/px-[\d\.]+/g, "px-4");
      if (!baseConfig.shapeClasses.includes("rounded-xl")) {
        baseConfig.shapeClasses = `rounded-xl ${baseConfig.shapeClasses}`;
      }
    } else if (effectiveOverride.shape === "minimal") {
      baseConfig.shape = "badge";
      baseConfig.shapeClasses = baseConfig.shapeClasses
        .replace(/rounded-(full|xl|2xl)/g, "rounded-md")
        .replace(/shadow-(md|xs|2xs|lg)/g, "shadow-none")
        .replace(/border-2/g, "border");
      if (!baseConfig.shapeClasses.includes("rounded-md")) {
        baseConfig.shapeClasses = `rounded-md shadow-none ${baseConfig.shapeClasses}`;
      }
    }

    // Color Override
    if (effectiveOverride.color === "neutral") {
      baseConfig.bgClasses = "bg-surface-container-lowest dark:bg-surface-container-low";
      baseConfig.borderClasses = "border-outline-variant/60 dark:border-outline-variant/40";
      baseConfig.textColorClasses = "text-on-surface dark:text-on-surface";
    } else if (effectiveOverride.color === "accent") {
      baseConfig.bgClasses = "bg-primary dark:bg-primary";
      baseConfig.borderClasses = "border-primary";
      baseConfig.textColorClasses = "text-on-primary dark:text-on-primary";
    }

    // Icon Override
    if (effectiveOverride.icon === null || effectiveOverride.icon === "none") {
      baseConfig.iconName = undefined;
    } else if (typeof effectiveOverride.icon === "string" && effectiveOverride.icon !== "auto") {
      baseConfig.iconName = effectiveOverride.icon;
      baseConfig.iconClasses = "text-[16px] text-primary shrink-0 opacity-90";
    }
  }

  return baseConfig;
}



/**

 * Transforms Semantic Nodes into React Flow compatible FlowNode objects.

 */

export function toReactFlowNodes(

  semanticNodes: SemanticNode[],

  themePalette: MapTheme | ThemeKey,

  callbacks: Record<string, any> | ((node: SemanticNode) => Record<string, any>) = {},

  overridesMap: Record<string, NodeStyleOverride> = {}

): FlowNode[] {

  const themeKey =

    typeof themePalette === "string"

      ? normalizeThemeKey(themePalette)

      : normalizeThemeKey(themePalette.id);



  const theme = THEME_PALETTES[themeKey] || THEME_PALETTES.modern;



  return semanticNodes.map((node) => {

    const override = overridesMap[node.id] || node.styleOverride;

    const visualConfig = resolveNodeVisualConfig(node, theme, false, override);

    const nodeCallbacks = typeof callbacks === "function" ? callbacks(node) : callbacks;



    // Compute matching legacy theme structure for full backwards compatibility

    const legacyTheme: BranchTheme = {

      bg: visualConfig.bgClasses,

      border: visualConfig.borderClasses,

      text: visualConfig.textColorClasses,

      stroke: theme.root.stroke,

    };



    return {

      id: node.id,

      type: "editable",

      position: node.position,

      data: {

        label: node.title,

        semanticType: node.type,

        semanticNode: node,

        visualConfig,

        styleOverride: override,

        mindMapId: node.mindMapId,

        depth: node.depth,

        parentId: node.parentId,

        branchId: node.branchId,

        importance_score: node.importanceScore,

        theme: legacyTheme,

        ...nodeCallbacks,

      },

    };

  });

}



/**

 * Transforms Semantic Edges into React Flow compatible FlowEdge objects.

 */

export function toReactFlowEdges(
  semanticEdges: SemanticEdge[],
  semanticNodes: SemanticNode[],
  themePalette: MapTheme | ThemeKey,
  layoutMode?: LayoutMode | "horizontal" | "vertical" | "radial" | "balanced"
): FlowEdge[] {

  const themeKey =

    typeof themePalette === "string"

      ? normalizeThemeKey(themePalette)

      : normalizeThemeKey(themePalette.id);



  const theme = THEME_PALETTES[themeKey] || THEME_PALETTES.modern;



  const nodeMap = new Map<string, SemanticNode>();

  semanticNodes.forEach((n) => nodeMap.set(n.id, n));



  return semanticEdges.map((edge) => {

    const sourceNode = nodeMap.get(edge.source);

    const targetNode = nodeMap.get(edge.target);



    // Classify edge type

    const isDirectChild = targetNode && targetNode.parentId === edge.source;

    const isExplicitSuggestion =

      edge.type === SEMANTIC_EDGE_TYPES.AI_SUGGESTION ||

      Boolean(edge.metadata?.isSuggested || edge.metadata?.aiGenerated);

    const isExplicitRelationship =

      edge.type === SEMANTIC_EDGE_TYPES.RELATIONSHIP ||

      (!isDirectChild && !isExplicitSuggestion);



    const edgeType: SemanticEdgeType = isExplicitSuggestion

      ? SEMANTIC_EDGE_TYPES.AI_SUGGESTION

      : isExplicitRelationship

      ? SEMANTIC_EDGE_TYPES.RELATIONSHIP

      : SEMANTIC_EDGE_TYPES.HIERARCHY;



    // Resolve stroke color and style based on theme and edge type

    let strokeColor = theme.root.stroke;

    let strokeDasharray: string | undefined = undefined;

    let strokeWidth = themeKey === "minimal"

      ? (sourceNode && sourceNode.depth === 0 ? 2 : 1.75)

      : (sourceNode && sourceNode.depth === 0 ? 2.5 : 2);

    let isAnimated = false;

    let markerEnd: any = undefined;



    if (edgeType === SEMANTIC_EDGE_TYPES.RELATIONSHIP) {

      strokeColor = "#64748b";

      strokeDasharray = "5, 5";

      strokeWidth = 1.75;

      markerEnd = {

        type: MarkerType.ArrowClosed,

        color: "#64748b",

        width: 12,

        height: 12,

      };

    } else if (edgeType === SEMANTIC_EDGE_TYPES.AI_SUGGESTION) {

      strokeColor = "#8b5cf6";

      strokeDasharray = "4, 4";

      strokeWidth = 2;

      isAnimated = true;

      markerEnd = {

        type: MarkerType.ArrowClosed,

        color: "#8b5cf6",

        width: 12,

        height: 12,

      };

    } else {

      // Hierarchy edge: derives color from source branch

      if (sourceNode) {

        if (sourceNode.depth === 0) {

          strokeColor = theme.root.stroke;

        } else {

          const branchThemes = theme.branches || THEME_PALETTES.modern.branches;

          let hash = 0;

          const bId = sourceNode.branchId || sourceNode.id;

          for (let i = 0; i < bId.length; i++) {

            hash = (hash << 5) - hash + bId.charCodeAt(i);

            hash |= 0;

          }

          const bIdx = Math.abs(hash) % branchThemes.length;

          strokeColor = branchThemes[bIdx]?.stroke || strokeColor;

        }

      }

    }



    const sPos = sourceNode?.position || { x: 0, y: 0 };
    const tPos = targetNode?.position || { x: 0, y: 0 };
    const handles = determineOptimalHandles(sPos, tPos, layoutMode);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,

      label: edge.label ?? undefined,

      type: "editable",

      animated: isAnimated || Boolean(edge.animated),

      markerEnd,

      data: {

        edgeType,

        branchColor: strokeColor,

        isRootBranch: sourceNode?.depth === 0,

        label: edge.label,

      },

      style: {

        stroke: strokeColor,

        strokeWidth,

        strokeDasharray,

      },

    };

  });

}



/**

 * Converts a complete SemanticGraph to React Flow nodes and edges.

 */

export function toReactFlowGraph(
  graph: SemanticGraph,
  themePalette: MapTheme | ThemeKey,
  callbacks: Record<string, any> | ((node: SemanticNode) => Record<string, any>) = {},
  overridesMap: Record<string, NodeStyleOverride> = {},
  layoutMode?: LayoutMode | "horizontal" | "vertical" | "radial" | "balanced"
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes = toReactFlowNodes(graph.nodes, themePalette, callbacks, overridesMap);
  const edges = toReactFlowEdges(graph.edges, graph.nodes, themePalette, layoutMode);

  return { nodes, edges };

}



/**

 * Normalizes raw responses returned by AI services (Gemini generate, chat modify, expand)

 * into a structured SemanticGraph.

 */

export function normalizeAIGraphResponse(rawAI: {

  nodes?: any[];

  edges?: any[];

}): SemanticGraph {

  const rawNodes = Array.isArray(rawAI.nodes) ? rawAI.nodes : [];

  const rawEdges = Array.isArray(rawAI.edges) ? rawAI.edges : [];



  const cleanedNodes = rawNodes.map((n, idx) => {

    const rawScore = n.importance_score;

    let score = 1.0;

    if (typeof rawScore === "number") {

      score = Math.max(0.0, Math.min(1.0, rawScore));

    }

    return {

      id: String(n.id || `ai_node_${idx}`),

      label: String(n.label || "Untitled Concept"),

      type: n.type || "default",

      position_x: typeof n.position_x === "number" ? n.position_x : 0,

      position_y: typeof n.position_y === "number" ? n.position_y : 0,

      importance_score: score,

    };

  });



  const cleanedEdges = rawEdges.map((e, idx) => ({

    id: String(e.id || `ai_edge_${idx}`),

    source: String(e.source),

    target: String(e.target),

    label: e.label || null,

    type: e.type || "default",

    animated: true,

  }));



  return buildSemanticGraph(cleanedNodes, cleanedEdges);

}

