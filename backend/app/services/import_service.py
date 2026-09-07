import xml.etree.ElementTree as ET
from uuid import UUID
from typing import List, Dict, Any

from fastapi import UploadFile

from app.models.user import User
from app.services.node_service import NodeService
from app.services.edge_service import EdgeService
from app.services.mind_map_service import MindMapService
from app.schemas.node import NodeCreate
from app.schemas.edge import EdgeCreate

class ImportService:
    def __init__(
        self,
        node_service: NodeService,
        edge_service: EdgeService,
        mind_map_service: MindMapService
    ):
        self.node_service = node_service
        self.edge_service = edge_service
        self.mind_map_service = mind_map_service

    def _create_tree(self, tree: Dict[str, Any], current_user: User, mind_map_id: UUID):
        def traverse(node_data, parent_id=None, depth=0, index=0):
            node = self.node_service.create_node(
                mind_map_id=mind_map_id,
                current_user=current_user,
                node_in=NodeCreate(
                    label=node_data["label"],
                    position_x=float(depth * 250),
                    position_y=float(index * 100)
                )
            )
            
            if parent_id:
                self.edge_service.create_edge(
                    mind_map_id=mind_map_id,
                    current_user=current_user,
                    edge_in=EdgeCreate(
                        source=parent_id,
                        target=node.id
                    )
                )
                
            for i, child_data in enumerate(node_data.get("children", [])):
                traverse(child_data, parent_id=node.id, depth=depth+1, index=i)
                
        for i, root in enumerate(tree["roots"]):
            traverse(root, parent_id=None, depth=0, index=i)

    def parse_markdown(self, content: str, current_user: User, mind_map_id: UUID):
        lines = content.splitlines()
        if not lines:
            raise ValueError("Empty markdown")
            
        title = "Imported Mind Map"
        
        roots = []
        stack = [] 
        
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                continue
            if line_stripped.startswith("# "):
                title = line_stripped[2:].strip()
                continue
                
            if "-" in line:
                indent = line.index("-")
                label = line[indent+1:].strip()
                
                node = {"label": label, "children": []}
                
                while stack and stack[-1][0] >= indent:
                    stack.pop()
                    
                if not stack:
                    roots.append(node)
                else:
                    stack[-1][1]["children"].append(node)
                    
                stack.append((indent, node))
                
        tree = {"title": title, "roots": roots}
        
        mind_map = self.mind_map_service.get_mind_map(mind_map_id, current_user)
        if mind_map and mind_map.title == "Untitled Project":
            pass
            
        self._create_tree(tree, current_user, mind_map_id)

    def parse_opml(self, content: str, current_user: User, mind_map_id: UUID):
        root_el = ET.fromstring(content)
        title = "Imported OPML"
        
        head = root_el.find("head")
        if head is not None:
            title_el = head.find("title")
            if title_el is not None and title_el.text:
                title = title_el.text
                
        body = root_el.find("body")
        if body is None:
            raise ValueError("Invalid OPML: no body")
            
        roots = []
        
        def parse_outline(outline_el):
            label = outline_el.get("text", "Untitled")
            node = {"label": label, "children": []}
            for child_el in outline_el.findall("outline"):
                node["children"].append(parse_outline(child_el))
            return node
            
        for outline in body.findall("outline"):
            roots.append(parse_outline(outline))
            
        tree = {"title": title, "roots": roots}
        self._create_tree(tree, current_user, mind_map_id)
