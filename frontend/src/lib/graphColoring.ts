import { Edge, Node } from "@xyflow/react";
import { ThemeKey } from "@/types/semanticGraph";

export type { ThemeKey };

export interface BranchTheme {
  bg: string;
  border: string;
  text: string;
  stroke: string;
  accent?: string;
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
    primary: "#6366f1", // Indigo
    secondary: "#059669", // Emerald
    accent: "#0284c7", // Sky
    previewColors: ["#6366f1", "#059669", "#0284c7", "#f59e0b"],
    canvasBg: "bg-surface-container-lowest",
    root: {
      bg: "bg-indigo-600 dark:bg-indigo-500",
      border: "border-indigo-700 dark:border-indigo-400",
      text: "text-white dark:text-white",
      stroke: "#6366f1",
      shape: "pill",
    },
    branches: [
      {
        bg: "bg-indigo-50/80 dark:bg-indigo-950/40",
        border: "border-indigo-500",
        text: "text-indigo-950 dark:text-indigo-100",
        stroke: "#6366f1",
        accent: "#818cf8",
      },
      {
        bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
        border: "border-emerald-500",
        text: "text-emerald-950 dark:text-emerald-100",
        stroke: "#059669",
        accent: "#34d399",
      },
      {
        bg: "bg-sky-50/80 dark:bg-sky-950/40",
        border: "border-sky-500",
        text: "text-sky-950 dark:text-sky-100",
        stroke: "#0284c7",
        accent: "#38bdf8",
      },
      {
        bg: "bg-amber-50/80 dark:bg-amber-950/40",
        border: "border-amber-500",
        text: "text-amber-950 dark:text-amber-100",
        stroke: "#d97706",
        accent: "#fbbf24",
      },
      {
        bg: "bg-violet-50/80 dark:bg-violet-950/40",
        border: "border-violet-500",
        text: "text-violet-950 dark:text-violet-100",
        stroke: "#7c3aed",
        accent: "#a78bfa",
      },
      {
        bg: "bg-rose-50/80 dark:bg-rose-950/40",
        border: "border-rose-500",
        text: "text-rose-950 dark:text-rose-100",
        stroke: "#e11d48",
        accent: "#fb7185",
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
    },
    branches: [
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-slate-400 dark:border-slate-500",
        text: "text-slate-900 dark:text-slate-100",
        stroke: "#475569",
        accent: "#64748b",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-zinc-400 dark:border-zinc-500",
        text: "text-zinc-900 dark:text-zinc-100",
        stroke: "#52525b",
        accent: "#71717a",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-stone-400 dark:border-stone-500",
        text: "text-stone-900 dark:text-stone-100",
        stroke: "#57534e",
        accent: "#78716c",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-neutral-400 dark:border-neutral-500",
        text: "text-neutral-900 dark:text-neutral-100",
        stroke: "#525252",
        accent: "#737373",
      },
      {
        bg: "bg-surface-container-lowest/90 dark:bg-surface-container-low",
        border: "border-slate-500 dark:border-slate-400",
        text: "text-slate-900 dark:text-slate-100",
        stroke: "#3b82f6",
        accent: "#60a5fa",
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
      bg: "bg-blue-600 dark:bg-blue-500",
      border: "border-blue-700 dark:border-blue-400",
      text: "text-white dark:text-white",
      stroke: "#2563eb",
      shape: "pill",
    },
    branches: [
      {
        bg: "bg-blue-100/75 dark:bg-blue-900/35",
        border: "border-blue-500",
        text: "text-blue-950 dark:text-blue-100",
        stroke: "#2563eb",
        accent: "#60a5fa",
      },
      {
        bg: "bg-emerald-100/75 dark:bg-emerald-900/35",
        border: "border-emerald-500",
        text: "text-emerald-950 dark:text-emerald-100",
        stroke: "#059669",
        accent: "#34d399",
      },
      {
        bg: "bg-purple-100/75 dark:bg-purple-900/35",
        border: "border-purple-500",
        text: "text-purple-950 dark:text-purple-100",
        stroke: "#7c3aed",
        accent: "#a855f7",
      },
      {
        bg: "bg-orange-100/75 dark:bg-orange-900/35",
        border: "border-orange-500",
        text: "text-orange-950 dark:text-orange-100",
        stroke: "#ea580c",
        accent: "#fb923c",
      },
      {
        bg: "bg-teal-100/75 dark:bg-teal-900/35",
        border: "border-teal-500",
        text: "text-teal-950 dark:text-teal-100",
        stroke: "#0d9488",
        accent: "#2dd4bf",
      },
      {
        bg: "bg-rose-100/75 dark:bg-rose-900/35",
        border: "border-rose-500",
        text: "text-rose-950 dark:text-rose-100",
        stroke: "#e11d48",
        accent: "#f43f5e",
      },
      {
        bg: "bg-amber-100/75 dark:bg-amber-900/35",
        border: "border-amber-500",
        text: "text-amber-950 dark:text-amber-100",
        stroke: "#d97706",
        accent: "#f59e0b",
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
