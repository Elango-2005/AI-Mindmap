import { Edge, Node } from "@xyflow/react";

export interface BranchTheme {
  bg: string;
  border: string;
  text: string;
  stroke: string;
}

export type ThemeKey = "vibrant" | "ocean" | "forest" | "cyberpunk" | "monochrome" | "sunset";

export interface ThemeConfig {
  id: ThemeKey;
  name: string;
  description: string;
  previewColors: string[];
  root: BranchTheme;
  branches: BranchTheme[];
}

export const THEME_PALETTES: Record<ThemeKey, ThemeConfig> = {
  vibrant: {
    id: "vibrant",
    name: "Vibrant Spectrum",
    description: "Dynamic rainbow branches with distinct high-contrast colors",
    previewColors: ["#3b82f6", "#10b981", "#a855f7", "#f59e0b"],
    root: {
      bg: "bg-primary dark:bg-primary",
      border: "border-primary",
      text: "text-on-primary dark:text-on-primary",
      stroke: "#6750a4",
    },
    branches: [
      { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-500", text: "text-blue-900 dark:text-blue-100", stroke: "#3b82f6" },
      { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-500", text: "text-emerald-900 dark:text-emerald-100", stroke: "#10b981" },
      { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-500", text: "text-purple-900 dark:text-purple-100", stroke: "#a855f7" },
      { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-500", text: "text-amber-900 dark:text-amber-100", stroke: "#f59e0b" },
      { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-500", text: "text-pink-900 dark:text-pink-100", stroke: "#ec4899" },
      { bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-500", text: "text-cyan-900 dark:text-cyan-100", stroke: "#06b6d4" },
      { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-500", text: "text-rose-900 dark:text-rose-100", stroke: "#f43f5e" },
      { bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-500", text: "text-indigo-900 dark:text-indigo-100", stroke: "#6366f1" },
    ],
  },
  ocean: {
    id: "ocean",
    name: "Ocean Breeze",
    description: "Deep sea teals, blues, aquas, and cool slate tones",
    previewColors: ["#0284c7", "#0d9488", "#2563eb", "#06b6d4"],
    root: {
      bg: "bg-sky-600 dark:bg-sky-700",
      border: "border-sky-700",
      text: "text-white",
      stroke: "#0284c7",
    },
    branches: [
      { bg: "bg-sky-100 dark:bg-sky-900/30", border: "border-sky-500", text: "text-sky-900 dark:text-sky-100", stroke: "#0284c7" },
      { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-500", text: "text-teal-900 dark:text-teal-100", stroke: "#0d9488" },
      { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-600", text: "text-blue-900 dark:text-blue-100", stroke: "#2563eb" },
      { bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-600", text: "text-cyan-900 dark:text-cyan-100", stroke: "#06b6d4" },
      { bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-500", text: "text-indigo-900 dark:text-indigo-100", stroke: "#4f46e5" },
    ],
  },
  forest: {
    id: "forest",
    name: "Forest Emerald",
    description: "Lush botanical greens, mints, sage, and earthy moss",
    previewColors: ["#059669", "#16a34a", "#84cc16", "#14b8a6"],
    root: {
      bg: "bg-emerald-700 dark:bg-emerald-800",
      border: "border-emerald-800",
      text: "text-white",
      stroke: "#059669",
    },
    branches: [
      { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-500", text: "text-emerald-900 dark:text-emerald-100", stroke: "#059669" },
      { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-500", text: "text-green-900 dark:text-green-100", stroke: "#16a34a" },
      { bg: "bg-lime-100 dark:bg-lime-900/30", border: "border-lime-500", text: "text-lime-900 dark:text-lime-100", stroke: "#84cc16" },
      { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-600", text: "text-teal-900 dark:text-teal-100", stroke: "#14b8a6" },
    ],
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Midnight Cyber",
    description: "Electric neon violet, radiant magenta, and futuristic pink",
    previewColors: ["#9333ea", "#db2777", "#c026d3", "#7c3aed"],
    root: {
      bg: "bg-purple-700 dark:bg-purple-800",
      border: "border-purple-800",
      text: "text-white",
      stroke: "#9333ea",
    },
    branches: [
      { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-500", text: "text-purple-900 dark:text-purple-100", stroke: "#9333ea" },
      { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-500", text: "text-pink-900 dark:text-pink-100", stroke: "#db2777" },
      { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30", border: "border-fuchsia-500", text: "text-fuchsia-900 dark:text-fuchsia-100", stroke: "#c026d3" },
      { bg: "bg-violet-100 dark:bg-violet-900/30", border: "border-violet-500", text: "text-violet-900 dark:text-violet-100", stroke: "#7c3aed" },
    ],
  },
  sunset: {
    id: "sunset",
    name: "Warm Sunset",
    description: "Warm desert sunset with coral, rose, terracotta, and amber",
    previewColors: ["#e11d48", "#ea580c", "#d97706", "#f43f5e"],
    root: {
      bg: "bg-rose-600 dark:bg-rose-700",
      border: "border-rose-700",
      text: "text-white",
      stroke: "#e11d48",
    },
    branches: [
      { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-500", text: "text-rose-900 dark:text-rose-100", stroke: "#e11d48" },
      { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-500", text: "text-orange-900 dark:text-orange-100", stroke: "#ea580c" },
      { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-500", text: "text-amber-900 dark:text-amber-100", stroke: "#d97706" },
      { bg: "bg-red-100 dark:bg-red-900/30", border: "border-red-500", text: "text-red-900 dark:text-red-100", stroke: "#dc2626" },
    ],
  },
  monochrome: {
    id: "monochrome",
    name: "Minimal Monochrome",
    description: "Clean technical slate and neutral contrast for executive clarity",
    previewColors: ["#475569", "#64748b", "#334155", "#1e293b"],
    root: {
      bg: "bg-slate-800 dark:bg-slate-200",
      border: "border-slate-900 dark:border-white",
      text: "text-white dark:text-slate-900",
      stroke: "#334155",
    },
    branches: [
      { bg: "bg-slate-100 dark:bg-slate-800/60", border: "border-slate-500", text: "text-slate-900 dark:text-slate-100", stroke: "#475569" },
      { bg: "bg-zinc-100 dark:bg-zinc-800/60", border: "border-zinc-500", text: "text-zinc-900 dark:text-zinc-100", stroke: "#52525b" },
      { bg: "bg-stone-100 dark:bg-stone-800/60", border: "border-stone-500", text: "text-stone-900 dark:text-stone-100", stroke: "#57534e" },
      { bg: "bg-gray-100 dark:bg-gray-800/60", border: "border-gray-500", text: "text-gray-900 dark:text-gray-100", stroke: "#4b5563" },
    ],
  },
};

export const THEMES = THEME_PALETTES.vibrant.branches;
export const ROOT_THEME = THEME_PALETTES.vibrant.root;

export const DEFAULT_THEME = {
  bg: "bg-surface dark:bg-surface",
  border: "border-outline-variant",
  text: "text-on-surface dark:text-on-surface",
  stroke: "#79747e",
};

export function applyColorsToGraph(
  nodes: Node[],
  edges: Edge[],
  themeKey: ThemeKey = "vibrant"
): { nodes: Node[]; edges: Edge[] } {
  const palette = THEME_PALETTES[themeKey] || THEME_PALETTES.vibrant;
  const rootTheme = palette.root;
  const branchThemes = palette.branches;

  // 1. Build an adjacency list (source -> targets) and in-degree map to identify root nodes
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (adj.has(edge.source) && inDegree.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target)! + 1);
    }
  }

  // 2. Identify the root nodes (nodes with no incoming edges)
  const roots = nodes.filter((n) => inDegree.get(n.id) === 0);
  const nodeStyles = new Map<string, { depth: number; theme: BranchTheme }>();

  // 3. Perform a Breadth-First Search (BFS) to traverse the tree hierarchy
  for (const root of roots) {
    nodeStyles.set(root.id, { depth: 0, theme: rootTheme });

    // Assign a distinct theme from the palette to each direct primary branch
    let themeIndex = 0;
    const children = adj.get(root.id) || [];

    for (const childId of children) {
      const childTheme = branchThemes[themeIndex % branchThemes.length];
      themeIndex++;

      // 4. Perform a Depth-First Search (DFS) down the branch, cascading the parent's color theme
      const stack = [{ id: childId, depth: 1, theme: childTheme }];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (!nodeStyles.has(current.id)) {
          nodeStyles.set(current.id, { depth: current.depth, theme: current.theme });

          const neighbors = adj.get(current.id) || [];
          for (const neighborId of neighbors) {
            stack.push({ id: neighborId, depth: current.depth + 1, theme: current.theme });
          }
        }
      }
    }
  }

  for (const node of nodes) {
    if (!nodeStyles.has(node.id)) {
      nodeStyles.set(node.id, { depth: 1, theme: DEFAULT_THEME });
    }
  }

  const coloredNodes = nodes.map((node) => {
    const styleInfo = nodeStyles.get(node.id)!;
    return {
      ...node,
      data: {
        ...node.data,
        depth: styleInfo.depth,
        theme: styleInfo.theme,
      },
    };
  });

  const coloredEdges = edges.map((edge) => {
    const sourceStyle = nodeStyles.get(edge.source);
    const stroke = sourceStyle ? sourceStyle.theme.stroke : DEFAULT_THEME.stroke;

    return {
      ...edge,
      style: {
        ...edge.style,
        stroke: stroke,
        strokeWidth: sourceStyle && sourceStyle.depth === 0 ? 3 : 2,
      },
      animated: true,
    };
  });

  return { nodes: coloredNodes, edges: coloredEdges };
}
