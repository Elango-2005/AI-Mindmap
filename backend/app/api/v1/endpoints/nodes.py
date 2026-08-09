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


def get_node_service(db: Session) -> NodeService:
    """
    Create and return NodeService.
    """

    return NodeService(
        node_repository=NodeRepository(db),
        mind_map_repository=MindMapRepository(db),
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