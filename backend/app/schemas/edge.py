from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EdgeCreate(BaseModel):
    """
    Schema for creating a new edge.
    """

    source: UUID
    target: UUID
    label: str | None = None
    type: str = "default"
    animated: bool = False


class EdgeUpdate(BaseModel):
    """
    Schema for updating an edge.
    """

    source: UUID | None = None
    target: UUID | None = None
    label: str | None = None
    type: str | None = None
    animated: bool | None = None


class EdgeResponse(BaseModel):
    """
    Schema for returning edge information.
    """

    id: UUID
    mind_map_id: UUID
    source: UUID
    target: UUID
    label: str | None
    type: str
    animated: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)