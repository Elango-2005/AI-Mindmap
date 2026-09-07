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
