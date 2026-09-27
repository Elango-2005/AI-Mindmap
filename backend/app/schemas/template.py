from pydantic import BaseModel
from typing import List, Dict, Any

class TemplateSummary(BaseModel):
    id: str
    title: str
    description: str
    category: str
    icon: str
    badge: str
    color: str
    node_count: int
    topics_preview: List[str]

class TemplateDetail(TemplateSummary):
    roots: List[Dict[str, Any]]

class InstantiateTemplateResponse(BaseModel):
    project_id: str
    mind_map_id: str
    title: str
    node_count: int
    edge_count: int
