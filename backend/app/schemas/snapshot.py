from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from typing import Any

class SnapshotCreate(BaseModel):
    name: str

class SnapshotResponse(BaseModel):
    id: UUID
    mind_map_id: UUID
    name: str
    graph_data: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
