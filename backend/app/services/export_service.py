import io
import json
import uuid
import zipfile
import xml.etree.ElementTree as ET
from uuid import UUID
from typing import List, Dict, Any

from app.models.user import User
from app.services.node_service import NodeService
from app.services.edge_service import EdgeService
from app.services.mind_map_service import MindMapService

class ExportService:
    def __init__(
        self,
        node_service: NodeService,
        edge_service: EdgeService,
        mind_map_service: MindMapService
    ):
        self.node_service = node_service
        self.edge_service = edge_service
        self.mind_map_service = mind_map_service

    def _build_tree(self, current_user: User, mind_map_id: UUID) -> Dict[str, Any]:
        mind_map = self.mind_map_service.get_mind_map(mind_map_id, current_user)
        if not mind_map:
            raise ValueError("Mind map not found")
        
        nodes = self.node_service.get_mind_map_nodes(mind_map_id, current_user)
        edges = self.edge_service.get_mind_map_edges(mind_map_id, current_user)

        adj = {}
        in_degree = {n.id: 0 for n in nodes}
        
        for e in edges:
            adj.setdefault(e.source, []).append(e.target)
            if e.target in in_degree:
                in_degree[e.target] += 1
                
        node_dict = {n.id: n for n in nodes}
        
        roots = [n_id for n_id, deg in in_degree.items() if deg == 0]
        if not roots and nodes:
            roots = [nodes[0].id]
            
        def build_node_tree(node_id):
            if node_id not in node_dict:
                return None
            node = node_dict[node_id]
            children = []
            for child_id in adj.get(node_id, []):
                child_node = build_node_tree(child_id)
                if child_node:
                    children.append(child_node)
            return {
                "id": str(node.id),
                "label": node.label,
                "children": children
            }
            
        tree_roots = []
        for r in roots:
            rn = build_node_tree(r)
            if rn:
                tree_roots.append(rn)
        
        return {
            "title": mind_map.title,
            "roots": tree_roots
        }

    def generate_markdown(self, current_user: User, mind_map_id: UUID) -> str:
        tree = self._build_tree(current_user, mind_map_id)
        
        lines = [f"# {tree['title']}"]
        
        def traverse(node, depth=0):
            indent = "  " * depth
            lines.append(f"{indent}- {node['label']}")
            for child in node['children']:
                traverse(child, depth + 1)
                
        for root in tree['roots']:
            traverse(root, 0)
            
        return "\n".join(lines)

    def generate_opml(self, current_user: User, mind_map_id: UUID) -> str:
        tree = self._build_tree(current_user, mind_map_id)
        
        opml = ET.Element("opml", version="2.0")
        head = ET.SubElement(opml, "head")
        ET.SubElement(head, "title").text = tree['title']
        
        body = ET.SubElement(opml, "body")
        
        def traverse(parent_el, node):
            outline = ET.SubElement(parent_el, "outline", text=node['label'])
            for child in node['children']:
                traverse(outline, child)
                
        for root in tree['roots']:
            traverse(body, root)
            
        from xml.dom import minidom
        rough_string = ET.tostring(opml, 'utf-8')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")

    def generate_freemind(self, current_user: User, mind_map_id: UUID) -> str:
        tree = self._build_tree(current_user, mind_map_id)
        if len(tree["roots"]) == 1:
            root_node = tree["roots"][0]
        else:
            root_node = {
                "id": str(uuid.uuid4()),
                "label": tree["title"],
                "children": tree["roots"]
            }

        map_el = ET.Element("map", version="1.0.1")

        def add_node(parent_el, node_data):
            node_id = f"ID_{node_data.get('id', uuid.uuid4())}".replace("-", "_")
            el = ET.SubElement(parent_el, "node", ID=node_id, TEXT=node_data.get("label", ""))
            for child in node_data.get("children", []):
                add_node(el, child)

        add_node(map_el, root_node)

        from xml.dom import minidom
        rough_string = ET.tostring(map_el, "utf-8")
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")

    def generate_xmind(self, current_user: User, mind_map_id: UUID) -> bytes:
        tree = self._build_tree(current_user, mind_map_id)
        if len(tree["roots"]) == 1:
            root_data = tree["roots"][0]
        else:
            root_data = {
                "id": str(uuid.uuid4()),
                "label": tree["title"],
                "children": tree["roots"]
            }

        def build_xmind_topic(node_data):
            topic = {
                "id": str(node_data.get("id", uuid.uuid4())),
                "title": node_data.get("label", ""),
            }
            children = node_data.get("children", [])
            if children:
                topic["children"] = {
                    "attached": [build_xmind_topic(child) for child in children]
                }
            return topic

        content = [
            {
                "id": str(uuid.uuid4()),
                "class": "sheet",
                "title": tree["title"],
                "rootTopic": build_xmind_topic(root_data)
            }
        ]

        manifest = {
            "file-entries": {
                "content.json": {},
                "metadata.json": {}
            }
        }

        metadata = {
            "creator": {"name": "MindVault AI", "version": "1.0.0"}
        }

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("manifest.json", json.dumps(manifest, indent=2))
            zf.writestr("metadata.json", json.dumps(metadata, indent=2))
            zf.writestr("content.json", json.dumps(content, ensure_ascii=False, indent=2))

        buf.seek(0)
        return buf.getvalue()

    def generate_html(self, current_user: User, mind_map_id: UUID) -> str:
        mind_map = self.mind_map_service.get_mind_map(mind_map_id, current_user)
        if not mind_map:
            raise ValueError("Mind map not found")
        
        nodes = self.node_service.get_mind_map_nodes(mind_map_id, current_user)
        edges = self.edge_service.get_mind_map_edges(mind_map_id, current_user)

        import json
        clean_title = mind_map.title or "Untitled Mind Map"
        serialized_nodes = json.dumps([
            {
                "id": str(n.id),
                "label": n.label,
                "color": "#6366f1",
                "isRoot": getattr(n, "type", "") == "root",
                "x": n.position_x,
                "y": n.position_y,
                "type": getattr(n, "type", "default")
            }
            for n in nodes
        ])
        serialized_edges = json.dumps([
            {
                "id": str(e.id),
                "source": str(e.source),
                "target": str(e.target),
                "label": e.label or ""
            }
            for e in edges
        ])

        return f"""<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{clean_title} — MindVault AI Interactive Map</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #0f1117; --bg-grid: #1a1e29; --surface: #181b24; --surface-hover: #212634;
      --surface-card: #1c202c; --border: #2b3144; --border-subtle: #242938; --text: #f1f5f9;
      --text-muted: #8b95a5; --primary: #6366f1; --primary-light: rgba(99, 102, 241, 0.15);
      --accent: #38bdf8; --edge-stroke: #475569; --edge-highlight: #818cf8;
      --card-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }}
    html.light {{
      --bg: #f8fafc; --bg-grid: #e2e8f0; --surface: #ffffff; --surface-hover: #f1f5f9;
      --surface-card: #ffffff; --border: #cbd5e1; --border-subtle: #e2e8f0; --text: #0f172a;
      --text-muted: #64748b; --primary: #4f46e5; --primary-light: rgba(79, 70, 229, 0.1);
      --accent: #0284c7; --edge-stroke: #94a3b8; --edge-highlight: #4f46e5;
      --card-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; user-select: none; }}
    body {{ font-family: var(--font); background-color: var(--bg); color: var(--text); overflow: hidden; width: 100vw; height: 100vh; display: flex; flex-direction: column; }}
    header {{ height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 50; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
    .brand-section {{ display: flex; align-items: center; gap: 12px; }}
    .logo-badge {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 5px 10px; border-radius: 8px; font-weight: 700; font-size: 13px; }}
    .map-title {{ font-weight: 600; font-size: 15px; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
    .nodes-count-badge {{ font-size: 11px; background: var(--surface-hover); border: 1px solid var(--border); color: var(--text-muted); padding: 2px 8px; border-radius: 999px; }}
    .search-wrapper {{ position: relative; display: flex; align-items: center; width: 260px; }}
    .search-input {{ width: 100%; background: var(--surface-hover); border: 1px solid var(--border); color: var(--text); padding: 7px 12px 7px 32px; border-radius: 8px; font-size: 13px; outline: none; font-family: inherit; }}
    .search-input:focus {{ border-color: var(--primary); }}
    .search-icon {{ position: absolute; left: 10px; font-size: 14px; color: var(--text-muted); }}
    .actions {{ display: flex; align-items: center; gap: 6px; }}
    .btn {{ background: var(--surface-hover); border: 1px solid var(--border); color: var(--text); height: 34px; padding: 0 10px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; }}
    .btn:hover {{ background: var(--border); }}
    #viewport-container {{ flex: 1; position: relative; overflow: hidden; cursor: grab; background-color: var(--bg); background-image: radial-gradient(var(--bg-grid) 1.5px, transparent 1.5px); background-size: 24px 24px; }}
    #viewport-container.panning {{ cursor: grabbing; }}
    #world-layer {{ position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }}
    #edges-svg {{ position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; z-index: 1; }}
    .edge-path {{ fill: none; stroke: var(--edge-stroke); stroke-width: 2; stroke-linecap: round; transition: stroke 0.2s ease; }}
    .edge-path.highlighted {{ stroke: var(--edge-highlight); stroke-width: 3.5; }}
    #nodes-container {{ position: absolute; top: 0; left: 0; z-index: 2; pointer-events: auto; }}
    .mindmap-node {{ position: absolute; background: var(--surface-card); border: 1.5px solid var(--border); border-radius: 12px; padding: 10px 14px; min-width: 140px; max-width: 280px; box-shadow: var(--card-shadow); cursor: pointer; transition: transform 0.15s ease, border-color 0.15s ease; display: flex; align-items: center; gap: 10px; transform: translate(-50%, -50%); }}
    .mindmap-node:hover {{ transform: translate(-50%, -50%) scale(1.03); border-color: var(--node-color, var(--primary)); z-index: 10; }}
    .mindmap-node.selected {{ border-color: var(--node-color, var(--primary)); box-shadow: 0 0 0 3px var(--primary-light); z-index: 20; }}
    .mindmap-node.root-node {{ background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.2)); border: 2px solid var(--primary); border-radius: 999px; padding: 12px 24px; font-weight: 700; }}
    .node-color-indicator {{ width: 10px; height: 10px; border-radius: 50%; background-color: var(--node-color, var(--primary)); flex-shrink: 0; }}
    .node-label {{ font-size: 13px; font-weight: 500; color: var(--text); word-break: break-word; }}
    .mindmap-node.search-match {{ box-shadow: 0 0 0 3px var(--accent); border-color: var(--accent); z-index: 15; }}
    .mindmap-node.search-dimmed {{ opacity: 0.25; filter: grayscale(0.6); }}
    .floating-controls {{ position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 6px; z-index: 40; }}
    .floating-btn {{ width: 38px; height: 38px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border); color: var(--text); display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; }}
    #inspector-drawer {{ position: fixed; top: 72px; right: 20px; width: 320px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: none; flex-direction: column; gap: 14px; z-index: 60; box-shadow: 0 12px 36px rgba(0,0,0,0.35); }}
    .drawer-header {{ display: flex; align-items: center; justify-content: space-between; }}
    .drawer-title {{ font-size: 16px; font-weight: 700; }}
    .close-btn {{ width: 24px; height: 24px; border-radius: 50%; background: var(--surface-hover); border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }}
    .watermark {{ position: absolute; bottom: 12px; left: 16px; font-size: 11px; color: var(--text-muted); background: var(--surface); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-subtle); }}
  </style>
</head>
<body>
  <header>
    <div class="brand-section">
      <div class="logo-badge">MindVault</div>
      <span class="map-title">{clean_title}</span>
      <span class="nodes-count-badge">{len(nodes)} nodes</span>
    </div>
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input type="text" id="search-input" class="search-input" placeholder="Search topics & nodes..." />
    </div>
    <div class="actions">
      <button class="btn" id="theme-btn">🌙 Theme</button>
      <button class="btn" id="fit-btn">⛶ Fit View</button>
    </div>
  </header>
  <div id="viewport-container">
    <div id="world-layer">
      <svg id="edges-svg"></svg>
      <div id="nodes-container"></div>
    </div>
    <div class="floating-controls">
      <button class="floating-btn" id="zoom-in-btn">+</button>
      <button class="floating-btn" id="zoom-out-btn">−</button>
      <button class="floating-btn" id="recenter-btn">🎯</button>
    </div>
    <div class="watermark">Exported from MindVault AI • Interactive HTML</div>
  </div>
  <div id="inspector-drawer">
    <div class="drawer-header">
      <div class="drawer-title" id="drawer-node-title">Node Title</div>
      <button class="close-btn" id="drawer-close-btn">✕</button>
    </div>
    <button class="btn" id="drawer-focus-btn" style="width: 100%; justify-content: center; background: var(--primary); color: #fff;">Focus on this node</button>
  </div>
  <script>
    (function () {{
      const nodesData = {serialized_nodes};
      const edgesData = {serialized_edges};
      let zoom = 1, panX = 0, panY = 0, isPanning = false, startX = 0, startY = 0, selectedNodeId = null;
      const viewport = document.getElementById("viewport-container");
      const world = document.getElementById("world-layer");
      const edgesSvg = document.getElementById("edges-svg");
      const nodesContainer = document.getElementById("nodes-container");
      const searchInput = document.getElementById("search-input");
      const themeBtn = document.getElementById("theme-btn");
      const fitBtn = document.getElementById("fit-btn");
      const drawer = document.getElementById("inspector-drawer");
      const drawerTitle = document.getElementById("drawer-node-title");
      const drawerCloseBtn = document.getElementById("drawer-close-btn");
      const drawerFocusBtn = document.getElementById("drawer-focus-btn");

      function renderGraph() {{
        nodesContainer.innerHTML = "";
        edgesSvg.innerHTML = "";
        edgesData.forEach(e => {{
          const sn = nodesData.find(n => n.id === e.source);
          const tn = nodesData.find(n => n.id === e.target);
          if (!sn || !tn) return;
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.classList.add("edge-path");
          const dx = (tn.x - sn.x) * 0.5;
          path.setAttribute("d", `M ${{sn.x}} ${{sn.y}} C ${{sn.x + dx}} ${{sn.y}}, ${{tn.x - dx}} ${{tn.y}}, ${{tn.x}} ${{tn.y}}`);
          if (selectedNodeId === e.source || selectedNodeId === e.target) path.classList.add("highlighted");
          edgesSvg.appendChild(path);
        }});
        nodesData.forEach(n => {{
          const el = document.createElement("div");
          el.className = "mindmap-node" + (n.isRoot ? " root-node" : "");
          el.id = "node-" + n.id;
          el.style.left = n.x + "px"; el.style.top = n.y + "px";
          el.style.setProperty("--node-color", n.color);
          if (selectedNodeId === n.id) el.classList.add("selected");
          const dot = document.createElement("span");
          dot.className = "node-color-indicator";
          el.appendChild(dot);
          const lbl = document.createElement("span");
          lbl.className = "node-label";
          lbl.textContent = n.label;
          el.appendChild(lbl);
          el.onclick = (ev) => {{ ev.stopPropagation(); selectNode(n.id); }};
          nodesContainer.appendChild(el);
        }});
      }}
      function updateTransform() {{ world.style.transform = `translate(${{panX}}px, ${{panY}}px) scale(${{zoom}})`; }}
      function fitView() {{
        if (nodesData.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodesData.forEach(n => {{ minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y); }});
        const bw = Math.max(maxX - minX + 200, 300);
        const bh = Math.max(maxY - minY + 200, 300);
        const vw = viewport.clientWidth, vh = viewport.clientHeight;
        zoom = Math.min(Math.max(Math.min((vw - 80) / bw, (vh - 80) / bh), 0.2), 1.5);
        panX = (vw - bw * zoom) / 2 - minX * zoom;
        panY = (vh - bh * zoom) / 2 - minY * zoom;
        updateTransform();
      }}
      function selectNode(id) {{
        selectedNodeId = id;
        const n = nodesData.find(node => node.id === id);
        if (!n) {{ drawer.style.display = "none"; renderGraph(); return; }}
        renderGraph();
        drawerTitle.textContent = n.label;
        drawer.style.display = "flex";
      }}
      function focusOnNode(id) {{
        const n = nodesData.find(node => node.id === id);
        if (!n) return;
        panX = viewport.clientWidth / 2 - n.x * zoom;
        panY = viewport.clientHeight / 2 - n.y * zoom;
        updateTransform();
      }}
      viewport.addEventListener("mousedown", (e) => {{ if (e.button !== 0) return; isPanning = true; startX = e.clientX - panX; startY = e.clientY - panY; viewport.classList.add("panning"); }});
      window.addEventListener("mousemove", (e) => {{ if (!isPanning) return; panX = e.clientX - startX; panY = e.clientY - startY; updateTransform(); }});
      window.addEventListener("mouseup", () => {{ if (isPanning) {{ isPanning = false; viewport.classList.remove("panning"); }} }});
      viewport.addEventListener("wheel", (e) => {{ e.preventDefault(); const factor = e.deltaY < 0 ? 1.15 : 0.87; const r = viewport.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const nz = Math.min(Math.max(zoom * factor, 0.1), 3.0); panX = mx - (mx - panX) * (nz / zoom); panY = my - (my - panY) * (nz / zoom); zoom = nz; updateTransform(); }}, {{ passive: false }});
      searchInput.addEventListener("input", (e) => {{ const q = e.target.value.trim().toLowerCase(); nodesData.forEach(n => {{ const el = document.getElementById("node-" + n.id); if (!el) return; if (!q) {{ el.classList.remove("search-match", "search-dimmed"); }} else if (n.label.toLowerCase().includes(q)) {{ el.classList.add("search-match"); el.classList.remove("search-dimmed"); }} else {{ el.classList.remove("search-match"); el.classList.add("search-dimmed"); }} }}); }});
      document.getElementById("zoom-in-btn").onclick = () => {{ zoom = Math.min(zoom * 1.25, 3.0); updateTransform(); }};
      document.getElementById("zoom-out-btn").onclick = () => {{ zoom = Math.max(zoom * 0.8, 0.1); updateTransform(); }};
      document.getElementById("recenter-btn").onclick = fitView;
      fitBtn.onclick = fitView;
      themeBtn.onclick = () => {{ const d = document.documentElement.classList.toggle("dark"); document.documentElement.classList.toggle("light", !d); themeBtn.textContent = d ? "🌙 Theme" : "☀️ Theme"; }};
      drawerCloseBtn.onclick = () => {{ selectedNodeId = null; drawer.style.display = "none"; renderGraph(); }};
      drawerFocusBtn.onclick = () => {{ if (selectedNodeId) focusOnNode(selectedNodeId); }};
      renderGraph(); fitView();
    }})();
  </script>
</body>
</html>"""
