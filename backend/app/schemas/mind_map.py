from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MindMapCreate(BaseModel):
    """
    Schema for creating a new mind map.
    """

    title: str


class MindMapUpdate(BaseModel):
    """
    Schema for updating a mind map.
    """

    title: str | None = None


class MindMapResponse(BaseModel):
    """
    Schema for returning mind map information.
    """

    id: UUID
    project_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)