import { Edge, Node } from "@xyflow/react";

export const THEMES = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-500", text: "text-blue-900 dark:text-blue-100", stroke: "#3b82f6" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-500", text: "text-emerald-900 dark:text-emerald-100", stroke: "#10b981" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-500", text: "text-purple-900 dark:text-purple-100", stroke: "#a855f7" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-500", text: "text-amber-900 dark:text-amber-100", stroke: "#f59e0b" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-500", text: "text-pink-900 dark:text-pink-100", stroke: "#ec4899" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-500", text: "text-cyan-900 dark:text-cyan-100", stroke: "#06b6d4" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-500", text: "text-rose-900 dark:text-rose-100", stroke: "#f43f5e" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-500", text: "text-indigo-900 dark:text-indigo-100", stroke: "#6366f1" },
];

export const ROOT_THEME = {
  bg: "bg-primary dark:bg-primary",
  border: "border-primary",
  text: "text-on-primary dark:text-on-primary",
  stroke: "#6750a4" // Default primary color
};

export const DEFAULT_THEME = {
  bg: "bg-surface dark:bg-surface",
  border: "border-outline-variant",
  text: "text-on-surface dark:text-on-surface",
  stroke: "#79747e"
};

export function applyColorsToGraph(nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } {
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
  const nodeStyles = new Map<string, { depth: number, theme: any }>();

  // 3. Perform a Breadth-First Search (BFS) to traverse the tree hierarchy
  for (const root of roots) {
    nodeStyles.set(root.id, { depth: 0, theme: ROOT_THEME });
    
    // Assign a distinct theme from the palette to each direct primary branch
    let themeIndex = 0;
    const children = adj.get(root.id) || [];
    
    for (const childId of children) {
      const childTheme = THEMES[themeIndex % THEMES.length];
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
        theme: styleInfo.theme
      }
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
      animated: true // Let's make all AI paths animated and lively!
    };
  });

  return { nodes: coloredNodes, edges: coloredEdges };
}
