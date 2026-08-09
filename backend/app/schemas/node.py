from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NodeCreate(BaseModel):
    """
    Schema for creating a new node.
    """

    label: str
    type: str = "default"
    position_x: float = 0.0
    position_y: float = 0.0


class NodeUpdate(BaseModel):
    """
    Schema for updating a node.
    """

    label: str | None = None
    type: str | None = None
    position_x: float | None = None
    position_y: float | None = None


class NodeResponse(BaseModel):
    """
    Schema for returning node information.
    """

    id: UUID
    mind_map_id: UUID
    label: str
    type: str
    position_x: float
    position_y: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)