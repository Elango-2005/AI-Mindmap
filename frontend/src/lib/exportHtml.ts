import { getNodesBounds, type Node, type Edge } from "@xyflow/react";
import { toast } from "sonner";

interface ExportHtmlOptions {
  nodes: Node[];
  edges: Edge[];
  title: string;
}

/**
 * Generates and downloads a self-contained, standalone interactive HTML web page
 * representing the mind map with full pan, zoom, search, collapse/expand, and inspector drawer.
 */
export function exportMindMapToHtml({ nodes, edges, title }: ExportHtmlOptions): void {
  if (!nodes || nodes.length === 0) {
    toast.error("Cannot export an empty mind map.");
    return;
  }

  const toastId = toast.loading("Generating interactive web page...");

  try {
    const cleanTitle = title || "Untitled Mind Map";
    const bounds = getNodesBounds(nodes);

    // Serialize nodes and edges for inlining
    const serializedNodes = JSON.stringify(
      nodes.map((n) => ({
        id: n.id,
        label: (n.data?.label as string) || "Untitled Node",
        color: (n.data?.color as string) || (n.data?.bgColor as string) || "#4f46e5",
        isRoot: !!n.data?.isRoot,
        x: n.position.x,
        y: n.position.y,
        type: n.type || "default",
      }))
    );

    const serializedEdges = JSON.stringify(
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: (e.label as string) || "",
      }))
    );

    const serializedBounds = JSON.stringify(bounds);

    const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanTitle} — MindVault AI Interactive Map</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f1117;
      --bg-grid: #1a1e29;
      --surface: #181b24;
      --surface-hover: #212634;
      --surface-card: #1c202c;
      --border: #2b3144;
      --border-subtle: #242938;
      --text: #f1f5f9;
      --text-muted: #8b95a5;
      --primary: #6366f1;
      --primary-light: rgba(99, 102, 241, 0.15);
      --accent: #38bdf8;
      --edge-stroke: #475569;
      --edge-highlight: #818cf8;
      --card-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    html.light {
      --bg: #f8fafc;
      --bg-grid: #e2e8f0;
      --surface: #ffffff;
      --surface-hover: #f1f5f9;
      --surface-card: #ffffff;
      --border: #cbd5e1;
      --border-subtle: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --primary: #4f46e5;
      --primary-light: rgba(79, 70, 229, 0.1);
      --accent: #0284c7;
      --edge-stroke: #94a3b8;
      --edge-highlight: #4f46e5;
      --card-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--text);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top Navbar */
    header {
      height: 56px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 50;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      backdrop-filter: blur(8px);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .logo-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      padding: 5px 10px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: -0.2px;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
    }

    .title-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .map-title {
      font-weight: 600;
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }

    .nodes-count-badge {
      font-size: 11px;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 500;
    }

    /* Search Input */
    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 260px;
    }

    .search-input {
      width: 100%;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 7px 12px 7px 32px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-light);
    }

    .search-icon {
      position: absolute;
      left: 10px;
      font-size: 14px;
      color: var(--text-muted);
      pointer-events: none;
    }

    /* Action Buttons */
    .actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn {
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--text);
      height: 34px;
      padding: 0 10px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .btn:hover {
      background: var(--border);
      transform: translateY(-1px);
    }

    .btn:active {
      transform: translateY(0);
    }

    /* Canvas Viewport */
    #viewport-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      background-color: var(--bg);
      background-image: radial-gradient(var(--bg-grid) 1.5px, transparent 1.5px);
      background-size: 24px 24px;
    }

    #viewport-container.panning {
      cursor: grabbing;
    }

    #world-layer {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
    }

    #edges-svg {
      position: absolute;
      top: 0;
      left: 0;
      overflow: visible;
      pointer-events: none;
      z-index: 1;
    }

    .edge-path {
      fill: none;
      stroke: var(--edge-stroke);
      stroke-width: 2;
      stroke-linecap: round;
      transition: stroke 0.2s ease, stroke-width 0.2s ease;
    }

    .edge-path.highlighted {
      stroke: var(--edge-highlight);
      stroke-width: 3.5;
      filter: drop-shadow(0 0 6px var(--primary));
    }

    #nodes-container {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      pointer-events: auto;
    }

    /* Node Cards */
    .mindmap-node {
      position: absolute;
      background: var(--surface-card);
      border: 1.5px solid var(--border);
      border-radius: 12px;
      padding: 10px 14px;
      min-width: 140px;
      max-width: 280px;
      box-shadow: var(--card-shadow);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.2s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translate(-50%, -50%);
    }

    .mindmap-node:hover {
      transform: translate(-50%, -50%) scale(1.03);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      border-color: var(--node-color, var(--primary));
      z-index: 10;
    }

    .mindmap-node.selected {
      border-color: var(--node-color, var(--primary));
      box-shadow: 0 0 0 3px var(--primary-light), 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 20;
    }

    .mindmap-node.root-node {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.2));
      border: 2px solid var(--primary);
      border-radius: 999px;
      padding: 12px 24px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.25);
    }

    .node-color-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--node-color, var(--primary));
      flex-shrink: 0;
    }

    .node-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      word-break: break-word;
      line-height: 1.35;
    }

    .node-toggle-btn {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      margin-left: auto;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .node-toggle-btn:hover {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }

    /* Node Search / Filter States */
    .mindmap-node.search-match {
      box-shadow: 0 0 0 3px var(--accent), 0 8px 24px rgba(56, 189, 248, 0.35);
      border-color: var(--accent);
      z-index: 15;
    }

    .mindmap-node.search-dimmed {
      opacity: 0.25;
      filter: grayscale(0.6);
    }

    /* Floating Viewport Controls */
    .floating-controls {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 40;
    }

    .floating-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.15s ease;
    }

    .floating-btn:hover {
      background: var(--surface-hover);
      transform: scale(1.05);
      color: var(--primary);
    }

    /* Side Inspector Drawer */
    #inspector-drawer {
      position: fixed;
      top: 72px;
      right: 20px;
      width: 320px;
      max-height: calc(100vh - 100px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
      padding: 20px;
      display: none;
      flex-direction: column;
      gap: 16px;
      z-index: 60;
      backdrop-filter: blur(12px);
      overflow-y: auto;
      animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .drawer-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .drawer-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
    }

    .close-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: var(--border);
      color: var(--text);
    }

    .drawer-meta-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--surface-hover);
      border-radius: 8px;
      font-size: 12px;
    }

    .drawer-meta-label {
      color: var(--text-muted);
      font-weight: 500;
    }

    .drawer-meta-val {
      font-weight: 600;
      color: var(--text);
    }

    .subtopics-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .subtopic-item {
      padding: 7px 10px;
      background: var(--surface-hover);
      border-radius: 6px;
      font-size: 12px;
      color: var(--text);
      cursor: pointer;
      transition: background 0.15s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .subtopic-item:hover {
      background: var(--primary-light);
      color: var(--primary);
    }

    /* Watermark Footer Badge */
    .watermark {
      position: absolute;
      bottom: 12px;
      left: 16px;
      font-size: 11px;
      color: var(--text-muted);
      pointer-events: none;
      z-index: 10;
      background: var(--surface);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle);
      opacity: 0.85;
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <div class="brand-section">
      <div class="logo-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"></path>
        </svg>
        MindVault
      </div>
      <div class="title-wrapper">
        <span class="map-title">${cleanTitle}</span>
        <span class="nodes-count-badge" id="nodes-count">${nodes.length} nodes</span>
      </div>
    </div>

    <!-- Center Search -->
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input type="text" id="search-input" class="search-input" placeholder="Search topics & nodes..." />
    </div>

    <!-- Right Controls -->
    <div class="actions">
      <button class="btn" id="theme-btn" title="Toggle Light / Dark Theme">🌙 Theme</button>
      <button class="btn" id="fit-btn" title="Center & Fit Mind Map">⛶ Fit View</button>
    </div>
  </header>

  <!-- Canvas Viewport -->
  <div id="viewport-container">
    <div id="world-layer">
      <svg id="edges-svg"></svg>
      <div id="nodes-container"></div>
    </div>

    <!-- Floating Zoom Controls -->
    <div class="floating-controls">
      <button class="floating-btn" id="zoom-in-btn" title="Zoom In">+</button>
      <button class="floating-btn" id="zoom-out-btn" title="Zoom Out">−</button>
      <button class="floating-btn" id="recenter-btn" title="Recenter View">🎯</button>
    </div>

    <!-- Watermark -->
    <div class="watermark">
      Exported from MindVault AI • Interactive HTML
    </div>
  </div>

  <!-- Node Inspector Drawer -->
  <div id="inspector-drawer">
    <div class="drawer-header">
      <div class="drawer-title" id="drawer-node-title">Node Title</div>
      <button class="close-btn" id="drawer-close-btn">✕</button>
    </div>

    <div class="drawer-meta-item">
      <span class="drawer-meta-label">Node Type</span>
      <span class="drawer-meta-val" id="drawer-node-type">Standard</span>
    </div>

    <div class="drawer-meta-item">
      <span class="drawer-meta-label">Direct Subtopics</span>
      <span class="drawer-meta-val" id="drawer-node-children-count">0</span>
    </div>

    <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; tracking: 0.05em; margin-top: 4px;">
      Subtopics / Branches
    </div>
    <div class="subtopics-list" id="drawer-subtopics-list"></div>

    <button class="btn" id="drawer-focus-btn" style="width: 100%; margin-top: 8px; justify-content: center; background: var(--primary); color: #fff; border-color: var(--primary);">
      Focus on this node
    </button>
  </div>

  <!-- Runtime Script -->
  <script>
    (function () {
      const nodesData = ${serializedNodes};
      const edgesData = ${serializedEdges};
      const initialBounds = ${serializedBounds};

      // State
      let zoom = 1;
      let panX = 0;
      let panY = 0;
      let isPanning = false;
      let startX = 0;
      let startY = 0;
      let selectedNodeId = null;
      const collapsedNodes = new Set();

      // DOM Elements
      const viewport = document.getElementById("viewport-container");
      const world = document.getElementById("world-layer");
      const edgesSvg = document.getElementById("edges-svg");
      const nodesContainer = document.getElementById("nodes-container");
      const searchInput = document.getElementById("search-input");
      const themeBtn = document.getElementById("theme-btn");
      const fitBtn = document.getElementById("fit-btn");
      const zoomInBtn = document.getElementById("zoom-in-btn");
      const zoomOutBtn = document.getElementById("zoom-out-btn");
      const recenterBtn = document.getElementById("recenter-btn");
      const drawer = document.getElementById("inspector-drawer");
      const drawerTitle = document.getElementById("drawer-node-title");
      const drawerType = document.getElementById("drawer-node-type");
      const drawerChildrenCount = document.getElementById("drawer-node-children-count");
      const drawerSubtopicsList = document.getElementById("drawer-subtopics-list");
      const drawerCloseBtn = document.getElementById("drawer-close-btn");
      const drawerFocusBtn = document.getElementById("drawer-focus-btn");

      // Adjacency tree mappings
      const childrenMap = new Map();
      const parentMap = new Map();
      nodesData.forEach(n => childrenMap.set(n.id, []));
      edgesData.forEach(e => {
        if (childrenMap.has(e.source)) childrenMap.get(e.source).push(e.target);
        parentMap.set(e.target, e.source);
      });

      // Render Nodes & Edges
      function renderGraph() {
        nodesContainer.innerHTML = "";
        edgesSvg.innerHTML = "";

        // Determine hidden nodes based on collapsed state
        const hiddenNodes = new Set();
        function markDescendantsHidden(parentId) {
          const children = childrenMap.get(parentId) || [];
          children.forEach(cid => {
            hiddenNodes.add(cid);
            markDescendantsHidden(cid);
          });
        }
        collapsedNodes.forEach(cid => markDescendantsHidden(cid));

        // Render Edges
        edgesData.forEach(e => {
          if (hiddenNodes.has(e.source) || hiddenNodes.has(e.target)) return;

          const sourceNode = nodesData.find(n => n.id === e.source);
          const targetNode = nodesData.find(n => n.id === e.target);
          if (!sourceNode || !targetNode) return;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("id", "edge-" + e.id);
          path.classList.add("edge-path");

          // Cubic Bezier curve
          const sx = sourceNode.x;
          const sy = sourceNode.y;
          const tx = targetNode.x;
          const ty = targetNode.y;
          const dx = (tx - sx) * 0.5;
          const d = \`M \${sx} \${sy} C \${sx + dx} \${sy}, \${tx - dx} \${ty}, \${tx} \${ty}\`;
          path.setAttribute("d", d);

          if (selectedNodeId === e.source || selectedNodeId === e.target) {
            path.classList.add("highlighted");
          }

          edgesSvg.appendChild(path);
        });

        // Render Nodes
        nodesData.forEach(n => {
          if (hiddenNodes.has(n.id)) return;

          const nodeEl = document.createElement("div");
          nodeEl.className = "mindmap-node" + (n.isRoot ? " root-node" : "");
          nodeEl.id = "node-" + n.id;
          nodeEl.style.left = n.x + "px";
          nodeEl.style.top = n.y + "px";
          nodeEl.style.setProperty("--node-color", n.color);

          if (selectedNodeId === n.id) {
            nodeEl.classList.add("selected");
          }

          // Indicator
          const dot = document.createElement("span");
          dot.className = "node-color-indicator";
          nodeEl.appendChild(dot);

          // Label
          const label = document.createElement("span");
          label.className = "node-label";
          label.textContent = n.label;
          nodeEl.appendChild(label);

          // Children toggle button
          const children = childrenMap.get(n.id) || [];
          if (children.length > 0) {
            const toggle = document.createElement("button");
            toggle.className = "node-toggle-btn";
            toggle.textContent = collapsedNodes.has(n.id) ? "+" : "−";
            toggle.title = collapsedNodes.has(n.id) ? "Expand subtopics" : "Collapse subtopics";
            toggle.onclick = (ev) => {
              ev.stopPropagation();
              if (collapsedNodes.has(n.id)) {
                collapsedNodes.delete(n.id);
              } else {
                collapsedNodes.add(n.id);
              }
              renderGraph();
            };
            nodeEl.appendChild(toggle);
          }

          // Node click -> select & inspect
          nodeEl.onclick = (ev) => {
            ev.stopPropagation();
            selectNode(n.id);
          };

          nodesContainer.appendChild(nodeEl);
        });
      }

      function updateTransform() {
        world.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${zoom})\`;
      }

      function fitView() {
        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        const padding = 80;

        const bw = initialBounds.width || 1000;
        const bh = initialBounds.height || 600;
        const bx = initialBounds.x || 0;
        const by = initialBounds.y || 0;

        const scaleX = (vw - padding * 2) / bw;
        const scaleY = (vh - padding * 2) / bh;
        zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.5);

        panX = (vw - bw * zoom) / 2 - bx * zoom;
        panY = (vh - bh * zoom) / 2 - by * zoom;

        updateTransform();
      }

      function selectNode(id) {
        selectedNodeId = id;
        const node = nodesData.find(n => n.id === id);
        if (!node) {
          drawer.style.display = "none";
          renderGraph();
          return;
        }

        renderGraph();

        // Populate drawer
        drawerTitle.textContent = node.label;
        drawerType.textContent = node.isRoot ? "Root Topic" : (node.type || "Subtopic");
        const children = childrenMap.get(id) || [];
        drawerChildrenCount.textContent = children.length.toString();

        drawerSubtopicsList.innerHTML = "";
        if (children.length === 0) {
          const empty = document.createElement("div");
          empty.style.color = "var(--text-muted)";
          empty.style.fontSize = "12px";
          empty.textContent = "No subtopics attached.";
          drawerSubtopicsList.appendChild(empty);
        } else {
          children.forEach(cid => {
            const childNode = nodesData.find(n => n.id === cid);
            if (!childNode) return;
            const item = document.createElement("div");
            item.className = "subtopic-item";
            item.innerHTML = \`<span style="width:6px;height:6px;border-radius:50%;background:\${childNode.color};"></span><span>\${childNode.label}</span>\`;
            item.onclick = () => {
              focusOnNode(childNode.id);
              selectNode(childNode.id);
            };
            drawerSubtopicsList.appendChild(item);
          });
        }

        drawer.style.display = "flex";
      }

      function focusOnNode(id) {
        const node = nodesData.find(n => n.id === id);
        if (!node) return;
        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;
        panX = vw / 2 - node.x * zoom;
        panY = vh / 2 - node.y * zoom;
        updateTransform();
      }

      // Pan & Zoom Events
      viewport.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        viewport.classList.add("panning");
      });

      window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
      });

      window.addEventListener("mouseup", () => {
        if (isPanning) {
          isPanning = false;
          viewport.classList.remove("panning");
        }
      });

      viewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newZoom = Math.min(Math.max(zoom * factor, 0.1), 3.0);
        panX = mouseX - (mouseX - panX) * (newZoom / zoom);
        panY = mouseY - (mouseY - panY) * (newZoom / zoom);
        zoom = newZoom;
        updateTransform();
      }, { passive: false });

      // Search Filtering
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        const nodeEls = document.querySelectorAll(".mindmap-node");

        if (!query) {
          nodeEls.forEach(el => el.classList.remove("search-match", "search-dimmed"));
          return;
        }

        let firstMatch = null;
        nodesData.forEach(n => {
          const el = document.getElementById("node-" + n.id);
          if (!el) return;
          const match = n.label.toLowerCase().includes(query);
          if (match) {
            el.classList.add("search-match");
            el.classList.remove("search-dimmed");
            if (!firstMatch) firstMatch = n;
          } else {
            el.classList.remove("search-match");
            el.classList.add("search-dimmed");
          }
        });

        if (firstMatch && query.length >= 3) {
          focusOnNode(firstMatch.id);
        }
      });

      // Controls buttons
      zoomInBtn.onclick = () => {
        const vw = viewport.clientWidth / 2;
        const vh = viewport.clientHeight / 2;
        const newZoom = Math.min(zoom * 1.25, 3.0);
        panX = vw - (vw - panX) * (newZoom / zoom);
        panY = vh - (vh - panY) * (newZoom / zoom);
        zoom = newZoom;
        updateTransform();
      };

      zoomOutBtn.onclick = () => {
        const vw = viewport.clientWidth / 2;
        const vh = viewport.clientHeight / 2;
        const newZoom = Math.max(zoom * 0.8, 0.1);
        panX = vw - (vw - panX) * (newZoom / zoom);
        panY = vh - (vh - panY) * (newZoom / zoom);
        zoom = newZoom;
        updateTransform();
      };

      recenterBtn.onclick = fitView;
      fitBtn.onclick = fitView;

      // Theme toggle
      themeBtn.onclick = () => {
        const isDark = document.documentElement.classList.toggle("dark");
        document.documentElement.classList.toggle("light", !isDark);
        themeBtn.textContent = isDark ? "🌙 Theme" : "☀️ Theme";
      };

      // Drawer buttons
      drawerCloseBtn.onclick = () => {
        selectedNodeId = null;
        drawer.style.display = "none";
        renderGraph();
      };

      drawerFocusBtn.onclick = () => {
        if (selectedNodeId) focusOnNode(selectedNodeId);
      };

      viewport.onclick = (e) => {
        if (e.target === viewport || e.target === world || e.target === edgesSvg) {
          selectedNodeId = null;
          drawer.style.display = "none";
          renderGraph();
        }
      };

      // Initial layout
      renderGraph();
      fitView();
    })();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanTitle.replace(/\s+/g, "_")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Interactive web page exported successfully!", { id: toastId });
  } catch (err) {
    console.error("Failed to export interactive HTML:", err);
    toast.error("Failed to generate interactive web page.", { id: toastId });
  }
}
