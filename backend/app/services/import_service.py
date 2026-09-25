import io
import json
import zipfile
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
from app.schemas.mind_map import MindMapUpdate

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
        mind_map = self.mind_map_service.get_mind_map(mind_map_id, current_user)
        if mind_map and mind_map.title in ["Untitled Project", "New Mind Map", "Untitled"] and tree.get("title"):
            self.mind_map_service.update_mind_map(mind_map_id, current_user, MindMapUpdate(title=tree["title"]))

        current_y = [0.0]

        def traverse(node_data, parent_id=None, depth=0):
            node_y = current_y[0]
            current_y[0] += 90.0

            node = self.node_service.create_node(
                mind_map_id=mind_map_id,
                current_user=current_user,
                node_data=NodeCreate(
                    label=node_data.get("label", "Untitled"),
                    position_x=float(depth * 260.0),
                    position_y=float(node_y)
                )
            )
            
            if parent_id:
                self.edge_service.create_edge(
                    mind_map_id=mind_map_id,
                    current_user=current_user,
                    edge_data=EdgeCreate(
                        source=parent_id,
                        target=node.id
                    )
                )
                
            for child_data in node_data.get("children", []):
                traverse(child_data, parent_id=node.id, depth=depth + 1)
                
        for root in tree.get("roots", []):
            traverse(root, parent_id=None, depth=0)

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

    def parse_freemind(self, content: str, current_user: User, mind_map_id: UUID):
        root_el = ET.fromstring(content)
        if root_el.tag != "map":
            map_child = root_el.find(".//map")
            if map_child is not None:
                root_el = map_child

        def parse_mm_node(el):
            label = el.get("TEXT")
            if not label:
                rich = el.find(".//richcontent")
                if rich is not None:
                    label = "".join(rich.itertext()).strip()
            if not label:
                label = "Untitled"

            children = []
            for child in el.findall("node"):
                children.append(parse_mm_node(child))
            return {"label": label, "children": children}

        roots = []
        for node_el in root_el.findall("node"):
            roots.append(parse_mm_node(node_el))

        if not roots:
            raise ValueError("No valid nodes found in FreeMind map")

        title = roots[0]["label"] if roots else "Imported FreeMind"
        tree = {"title": title, "roots": roots}
        self._create_tree(tree, current_user, mind_map_id)

    def parse_xmind(self, zip_bytes: bytes, current_user: User, mind_map_id: UUID):
        try:
            zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
        except zipfile.BadZipFile:
            raise ValueError("Invalid XMind file: not a valid ZIP archive")

        namelist = zf.namelist()
        if "content.json" in namelist:
            data = json.loads(zf.read("content.json").decode("utf-8"))
            if not isinstance(data, list) or len(data) == 0:
                raise ValueError("Invalid XMind: empty content.json")

            sheet = data[0]
            root_topic = sheet.get("rootTopic")
            if not root_topic:
                raise ValueError("Invalid XMind: missing rootTopic")

            def parse_topic(topic_dict):
                label = topic_dict.get("title", "Untitled")
                children = []
                attached = topic_dict.get("children", {}).get("attached", [])
                for child in attached:
                    children.append(parse_topic(child))
                return {"label": label, "children": children}

            root_node = parse_topic(root_topic)
            title = root_node["label"] or sheet.get("title", "Imported XMind")
            tree = {"title": title, "roots": [root_node]}
            self._create_tree(tree, current_user, mind_map_id)

        elif "content.xml" in namelist:
            xml_content = zf.read("content.xml")
            root_el = ET.fromstring(xml_content)
            sheet = root_el.find(".//{urn:xmind:xmap:xmlns:style:2.0}sheet") or root_el.find(".//sheet")
            if sheet is None:
                sheet = root_el

            def parse_xml_topic(topic_el):
                title_el = topic_el.find("{*}title") or topic_el.find("title")
                label = title_el.text if title_el is not None and title_el.text else "Untitled"
                children = []
                children_el = topic_el.find("{*}children") or topic_el.find("children")
                if children_el is not None:
                    topics_el = children_el.find("{*}topics") or children_el.find("topics")
                    if topics_el is not None:
                        for child_topic in topics_el.findall("{*}topic") or topics_el.findall("topic"):
                            children.append(parse_xml_topic(child_topic))
                return {"label": label, "children": children}

            topic_el = sheet.find(".//{*}topic") or sheet.find(".//topic")
            if topic_el is None:
                raise ValueError("Invalid legacy XMind: no topic found")

            root_node = parse_xml_topic(topic_el)
            tree = {"title": root_node["label"], "roots": [root_node]}
            self._create_tree(tree, current_user, mind_map_id)
        else:
            raise ValueError("Unsupported XMind format: missing content.json or content.xml")
