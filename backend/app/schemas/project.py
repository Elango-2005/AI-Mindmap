from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    title: str
    description: str | None = None
    thumbnail: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    thumbnail: str | None = None


from app.schemas.mind_map import MindMapResponse

class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    mind_maps: list[MindMapResponse] = []

    model_config = ConfigDict(from_attributes=True)