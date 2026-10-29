import type { Edge, Node } from "@xyflow/react";
import type { ThemeKey } from "../types/semanticGraph.ts";

export type { ThemeKey };

export interface BranchTheme {
  bg: string;
  border: string;
  text: string;
  stroke: string;
  accent?: string;
  tintBg?: string;
  tintBorder?: string;
  dotColor?: string;
}

export interface ThemeConfig {
  id: ThemeKey;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  previewColors: string[];
  canvasBg: string;
  root: BranchTheme & { shape?: "pill" | "rounded-rect" };
  branches: BranchTheme[];
}

/**
 * Normalizes an arbitrary string or legacy theme key to one of the 3 canonical themes:
 * 'modern' | 'minimal' | 'colorful'
 */
export function normalizeThemeKey(rawKey?: string): ThemeKey {
  if (!rawKey) return "modern";
  const clean = rawKey.toLowerCase().trim();
  if (clean === "minimal" || clean === "monochrome") return "minimal";
  if (
    clean === "colorful" ||
    clean === "vibrant" ||
    clean === "sunset" ||
    clean === "cyberpunk" ||
    clean === "ocean" ||
    clean === "forest"
  ) {
    return "colorful";
  }
  return "modern";
}

export const THEME_PALETTES: Record<ThemeKey, ThemeConfig> = {
  modern: {
    id: "modern",
    name: "Modern SaaS",
    description: "Professional productivity styling with restrained colors, clear hierarchy, and subtle shadows.",
    primary: "#4338ca", // Indigo
    secondary: "#059669", // Emerald
    accent: "#2563eb", // Blue
    previewColors: ["#2563eb", "#ec4899", "#8b5cf6", "#10b981", "#f59e0b", "#f97316"],
    canvasBg: "bg-surface-container-lowest",
    root: {
      bg: "bg-gradient-to-r from-[#4338ca] via-[#3730a3] to-[#312e81]",
      border: "border border-indigo-400/30",
      text: "text-white dark:text-white",
      stroke: "#4338ca",
      shape: "pill",
      dotColor: "#ffffff",
    },
    branches: [
      {
        bg: "bg-white dark:bg-surface-container-lowest",
        border: "border-[#3b82f6]",
        text: "text-gray-900 dark:text-on-surface",
        stroke: "#2563eb",
        accent: "#3b82f6",
        tintBg: "bg-[#f0f7ff] dark:bg-blue-950/30",
        tintBorder: "border-[#bfdbfe] dark:border-blue-800/40",
        dotColor: "#2563eb",
      },
      {
        bg: "bg-white dark:bg-surface-container-lowest",
        border: "border-[#ec4899]",
        text: "text-gray-900 dark:text-on-surface",
        stroke: "#db2777",
        accent: "#ec4899",
        tintBg: "bg-[#fdf2f8] dark:bg-pink-950/30",
        tintBorder: "border-[#fbcfe8] dark:border-pink-800/40",
        dotColor: "#db2777",
      },
      {
        bg: "bg-white dark:bg-surface-container-lowest",
        border: "border-[#8b5cf6]",
        text: "text-gray-900 dark:text-on-surface",
        stroke: "#7c3aed",
        accent: "#8b5cf6",
        tintBg: "bg-[#faf5ff] dark:bg-purple-950/30",
        tintBorder: "border-[#e9d5ff] dark:border-purple-800/40",
        dotColor: "#7c3aed",
      },
      {
        bg: "bg-white dark:bg-surface-container-lowest",
        border: "border-[#10b981]",
        text: "text-gray-900 dark:text-on-surface",
        stroke: "#059669",
        accent: "#10b981",
        tintBg: "bg-[#f0fdf4] dark:bg-emerald-950/30",
        tintBorder: "border-[#bbf7d0] dark:border-emerald-800/40",
        dotColor: "#059669",
      },
      {
        bg: "bg-white dark:bg-surface-container-lowest",
        border: "border-[#f59e0b]",
        text: "text-gray-900 dark:text-on-surface",
        stroke: "#d97706",
        accent: "#f59e0b",
        tintBg: "bg-[#fffbeb] dark:bg-amber-950/30",
        tintBorder: "border-[#fde68a] dark:border-amber-800/40",
        dotColor: "#d97706",
      },
      {
        bg: "bg-white dark:bg-surface-container-lowest",
        border: "border-[#f97316]",
        text: "text-gray-900 dark:text-on-surface",
        stroke: "#ea580c",
        accent: "#f97316",
        tintBg: "bg-[#fff7ed] dark:bg-orange-950/30",
        tintBorder: "border-[#fed7aa] dark:border-orange-800/40",
        dotColor: "#ea580c",
      },
    ],
  },
  minimal: {
    id: "minimal",
    name: "Minimal Slate",
    description: "Low visual noise, calm neutral surfaces, subtle borders, and strong typographic focus.",
    primary: "#334155", // Slate-700
    secondary: "#64748b", // Slate-500
    accent: "#94a3b8", // Slate-400
    previewColors: ["#334155", "#64748b", "#94a3b8", "#cbd5e1"],
    canvasBg: "bg-surface",
    root: {
      bg: "bg-slate-900 dark:bg-slate-100",
      border: "border-slate-900 dark:border-white",
      text: "text-white dark:text-slate-900",
      stroke: "#334155",
      shape: "pill",
      dotColor: "#ffffff",
    },
    branches: [
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-slate-400 dark:border-slate-500",
        text: "text-slate-900 dark:text-slate-100",
        stroke: "#475569",
        accent: "#64748b",
        tintBg: "bg-slate-100/70 dark:bg-slate-900/40",
        tintBorder: "border-slate-200 dark:border-slate-800",
        dotColor: "#475569",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-zinc-400 dark:border-zinc-500",
        text: "text-zinc-900 dark:text-zinc-100",
        stroke: "#52525b",
        accent: "#71717a",
        tintBg: "bg-zinc-100/70 dark:bg-zinc-900/40",
        tintBorder: "border-zinc-200 dark:border-zinc-800",
        dotColor: "#52525b",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-stone-400 dark:border-stone-500",
        text: "text-stone-900 dark:text-stone-100",
        stroke: "#57534e",
        accent: "#78716c",
        tintBg: "bg-stone-100/70 dark:bg-stone-900/40",
        tintBorder: "border-stone-200 dark:border-stone-800",
        dotColor: "#57534e",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-neutral-400 dark:border-neutral-500",
        text: "text-neutral-900 dark:text-neutral-100",
        stroke: "#525252",
        accent: "#737373",
        tintBg: "bg-neutral-100/70 dark:bg-neutral-900/40",
        tintBorder: "border-neutral-200 dark:border-neutral-800",
        dotColor: "#525252",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-slate-500 dark:border-slate-400",
        text: "text-slate-900 dark:text-slate-100",
        stroke: "#3b82f6",
        accent: "#60a5fa",
        tintBg: "bg-slate-100/70 dark:bg-slate-900/40",
        tintBorder: "border-slate-200 dark:border-slate-800",
        dotColor: "#3b82f6",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-gray-400 dark:border-gray-500",
        text: "text-gray-900 dark:text-gray-100",
        stroke: "#4b5563",
        accent: "#6b7280",
        tintBg: "bg-gray-100/70 dark:bg-gray-900/40",
        tintBorder: "border-gray-200 dark:border-gray-800",
        dotColor: "#4b5563",
      },
    ],
  },

  colorful: {
    id: "colorful",
    name: "Colorful Spectrum",
    description: "Vivid, high-contrast branch colors with tinted surfaces for rich visual distinction.",
    primary: "#2563eb", // Royal Blue
    secondary: "#059669", // Emerald
    accent: "#7c3aed", // Royal Purple
    previewColors: ["#2563eb", "#059669", "#7c3aed", "#ea580c"],
    canvasBg: "bg-surface-container-lowest",
    root: {
      bg: "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700",
      border: "border-blue-700 dark:border-blue-400",
      text: "text-white dark:text-white",
      stroke: "#2563eb",
      shape: "pill",
      dotColor: "#ffffff",
    },
    branches: [
      {
        bg: "bg-white dark:bg-slate-900/90",
        border: "border-blue-500",
        text: "text-blue-950 dark:text-blue-100",
        stroke: "#2563eb",
        accent: "#60a5fa",
        tintBg: "bg-blue-50 dark:bg-blue-950/40",
        tintBorder: "border-blue-200 dark:border-blue-800",
        dotColor: "#2563eb",
      },
      {
        bg: "bg-white dark:bg-slate-900/90",
        border: "border-emerald-500",
        text: "text-emerald-950 dark:text-emerald-100",
        stroke: "#059669",
        accent: "#34d399",
        tintBg: "bg-emerald-50 dark:bg-emerald-950/40",
        tintBorder: "border-emerald-200 dark:border-emerald-800",
        dotColor: "#059669",
      },
      {
        bg: "bg-white dark:bg-slate-900/90",
        border: "border-purple-500",
        text: "text-purple-950 dark:text-purple-100",
        stroke: "#7c3aed",
        accent: "#a855f7",
        tintBg: "bg-purple-50 dark:bg-purple-950/40",
        tintBorder: "border-purple-200 dark:border-purple-800",
        dotColor: "#7c3aed",
      },
      {
        bg: "bg-white dark:bg-slate-900/90",
        border: "border-orange-500",
        text: "text-orange-950 dark:text-orange-100",
        stroke: "#ea580c",
        accent: "#fb923c",
        tintBg: "bg-orange-50 dark:bg-orange-950/40",
        tintBorder: "border-orange-200 dark:border-orange-800",
        dotColor: "#ea580c",
      },
      {
        bg: "bg-white dark:bg-slate-900/90",
        border: "border-teal-500",
        text: "text-teal-950 dark:text-teal-100",
        stroke: "#0d9488",
        accent: "#2dd4bf",
        tintBg: "bg-teal-50 dark:bg-teal-950/40",
        tintBorder: "border-teal-200 dark:border-teal-800",
        dotColor: "#0d9488",
      },
      {
        bg: "bg-white dark:bg-slate-900/90",
        border: "border-rose-500",
        text: "text-rose-950 dark:text-rose-100",
        stroke: "#e11d48",
        accent: "#f43f5e",
        tintBg: "bg-rose-50 dark:bg-rose-950/40",
        tintBorder: "border-rose-200 dark:border-rose-800",
        dotColor: "#e11d48",
      },
      {
        bg: "bg-white dark:bg-slate-900/90",
        border: "border-amber-500",
        text: "text-amber-950 dark:text-amber-100",
        stroke: "#d97706",
        accent: "#f59e0b",
        tintBg: "bg-amber-50 dark:bg-amber-950/40",
        tintBorder: "border-amber-200 dark:border-amber-800",
        dotColor: "#d97706",
      },
    ],
  },
};

export const THEMES = THEME_PALETTES.modern.branches;
export const ROOT_THEME = THEME_PALETTES.modern.root;

export const DEFAULT_THEME = {
  bg: "bg-surface dark:bg-surface",
  border: "border-outline-variant",
  text: "text-on-surface dark:text-on-surface",
  stroke: "#6366f1",
};

/**
 * Applies color styling to Flow nodes and edges based on the selected theme.
 */
export function applyColorsToGraph(
  nodes: Node[],
  edges: Edge[],
  themeKey: ThemeKey = "modern"
): { nodes: Node[]; edges: Edge[] } {
  const normalizedKey = normalizeThemeKey(themeKey);
  const palette = THEME_PALETTES[normalizedKey] || THEME_PALETTES.modern;
  const rootTheme = palette.root;
  const branchThemes = palette.branches;

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

  const roots = nodes.filter((n) => inDegree.get(n.id) === 0);
  const nodeStyles = new Map<string, { depth: number; theme: BranchTheme }>();

  for (const root of roots) {
    nodeStyles.set(root.id, { depth: 0, theme: rootTheme });

    let themeIndex = 0;
    const children = adj.get(root.id) || [];

    for (const childId of children) {
      const childTheme = branchThemes[themeIndex % branchThemes.length];
      themeIndex++;

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
        strokeWidth: sourceStyle && sourceStyle.depth === 0 ? 2.5 : 2,
      },
      animated: false,
    };
  });

  return { nodes: coloredNodes, edges: coloredEdges };
}
