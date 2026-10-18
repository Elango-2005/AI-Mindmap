from datetime import datetime
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    id: UUID
    project_id: UUID
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)


class DocumentSearchResult(BaseModel):
    content: str
    similarity: float
    filename: str
    page_number: Optional[int] = None
    source_ref: str


class DocumentSearchResponse(BaseModel):
    query: str
    results: List[DocumentSearchResult]
