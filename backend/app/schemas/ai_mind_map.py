from pydantic import BaseModel, ConfigDict, Field

from app.schemas.edge import EdgeResponse
from app.schemas.node import NodeResponse


class AIMindMapGenerateRequest(BaseModel):
    """
    Request schema for AI mind map generation.
    """

    topic: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Topic for generating the mind map.",
    )
    
    depth: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Depth of the generated mind map hierarchy.",
    )


class AIMindMapGenerateResponse(BaseModel):
    """
    Response schema for an AI-generated mind map.
    """

    nodes: list[NodeResponse]
    edges: list[EdgeResponse]

    model_config = ConfigDict(
        from_attributes=True,
    )