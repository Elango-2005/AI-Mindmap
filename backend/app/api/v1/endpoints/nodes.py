from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.node_repository import NodeRepository
from app.schemas.node import (
    NodeCreate,
    NodeResponse,
    NodeUpdate,
)
from app.services.node_service import NodeService


router = APIRouter(
    prefix="/nodes",
    tags=["Nodes"],
)


from app.repositories.edge_repository import EdgeRepository
from app.services.ai_service import AIService

def get_node_service(db: Session) -> NodeService:
    """
    Create and return NodeService.
    """

    return NodeService(
        node_repository=NodeRepository(db),
        mind_map_repository=MindMapRepository(db),
        ai_service=AIService(),
        edge_repository=EdgeRepository(db),
    )


@router.post(
    "/mind-maps/{mind_map_id}",
    response_model=NodeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_node(
    mind_map_id: UUID,
    node: NodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new node inside a mind map.
    """

    service = get_node_service(db)

    try:
        return service.create_node(
            mind_map_id,
            current_user,
            node,
        )

    except ValueError as e:
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/mind-maps/{mind_map_id}",
    response_model=list[NodeResponse],
)
def get_mind_map_nodes(
    mind_map_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all nodes belonging to a mind map.
    """

    service = get_node_service(db)

    try:
        return service.get_mind_map_nodes(
            mind_map_id,
            current_user,
        )

    except ValueError as e:
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/{node_id}",
    response_model=NodeResponse,
)
def get_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a node by ID.
    """

    service = get_node_service(db)

    try:
        return service.get_node(
            node_id,
            current_user,
        )

    except ValueError as e:
        if str(e) == "Node not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.put(
    "/{node_id}",
    response_model=NodeResponse,
)
def update_node(
    node_id: UUID,
    node: NodeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a node.
    """

    service = get_node_service(db)

    try:
        return service.update_node(
            node_id,
            current_user,
            node,
        )

    except ValueError as e:
        if str(e) == "Node not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.delete(
    "/{node_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a node.
    """

    service = get_node_service(db)

    try:
        service.delete_node(
            node_id,
            current_user,
        )

    except ValueError as e:
        if str(e) == "Node not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

@router.post(
    "/{node_id}/summarize",
    response_model=dict,
)
def summarize_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Summarize a node using AI.
    """
    service = get_node_service(db)

    try:
        summary = service.summarize_node(
            node_id,
            current_user,
        )
        return {"summary": summary}
    except ValueError as e:
        if str(e) == "Node not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        if "AI Service" in str(e) or "Failed to summarize" in str(e):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

@router.post(
    "/{node_id}/expand",
    response_model=dict,
)
def expand_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Expand a node by generating and linking sub-concepts using AI.
    """
    service = get_node_service(db)

    try:
        result = service.expand_node(
            node_id,
            current_user,
        )
        return result
    except ValueError as e:
        if str(e) == "Node not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        if "AI Service" in str(e) or "Failed to expand" in str(e):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

@router.post(
    "/{node_id}/find-connections",
    response_model=list,
)
def find_node_connections(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Find connections between a node and other existing nodes using AI.
    """
    service = get_node_service(db)

    try:
        result = service.find_node_connections(
            node_id,
            current_user,
        )
        return result
    except ValueError as e:
        if str(e) == "Node not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        if "AI Service" in str(e) or "Failed to find connections" in str(e):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )