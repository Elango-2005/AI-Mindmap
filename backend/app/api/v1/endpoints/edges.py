from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.edge_repository import EdgeRepository
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.node_repository import NodeRepository
from app.schemas.edge import (
    EdgeCreate,
    EdgeResponse,
    EdgeUpdate,
)
from app.services.edge_service import EdgeService


router = APIRouter(
    prefix="/edges",
    tags=["Edges"],
)


def get_edge_service(db: Session) -> EdgeService:
    """
    Create and return EdgeService.
    """

    return EdgeService(
        edge_repository=EdgeRepository(db),
        mind_map_repository=MindMapRepository(db),
        node_repository=NodeRepository(db),
    )


@router.post(
    "/mind-maps/{mind_map_id}",
    response_model=EdgeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_edge(
    mind_map_id: UUID,
    edge: EdgeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new edge inside a mind map.
    """

    service = get_edge_service(db)

    try:
        return service.create_edge(
            mind_map_id,
            current_user,
            edge,
        )

    except ValueError as e:
        detail = str(e)

        if detail in (
            "Mind map not found.",
            "Source node not found.",
            "Target node not found.",
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail,
            )

        if detail in (
            "Access denied.",
            "Source node does not belong to this mind map.",
            "Target node does not belong to this mind map.",
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail,
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


@router.get(
    "/mind-maps/{mind_map_id}",
    response_model=list[EdgeResponse],
)
def get_mind_map_edges(
    mind_map_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all edges belonging to a mind map.
    """

    service = get_edge_service(db)

    try:
        return service.get_mind_map_edges(
            mind_map_id,
            current_user,
        )

    except ValueError as e:
        detail = str(e)

        if detail == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail,
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


@router.get(
    "/{edge_id}",
    response_model=EdgeResponse,
)
def get_edge(
    edge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get an edge by ID.
    """

    service = get_edge_service(db)

    try:
        return service.get_edge(
            edge_id,
            current_user,
        )

    except ValueError as e:
        detail = str(e)

        if detail in (
            "Edge not found.",
            "Mind map not found.",
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail,
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


@router.put(
    "/{edge_id}",
    response_model=EdgeResponse,
)
def update_edge(
    edge_id: UUID,
    edge: EdgeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update an edge.
    """

    service = get_edge_service(db)

    try:
        return service.update_edge(
            edge_id,
            current_user,
            edge,
        )

    except ValueError as e:
        detail = str(e)

        if detail in (
            "Edge not found.",
            "Mind map not found.",
            "Source node not found.",
            "Target node not found.",
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail,
            )

        if detail in (
            "Access denied.",
            "Source node does not belong to this mind map.",
            "Target node does not belong to this mind map.",
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail,
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


@router.delete(
    "/{edge_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_edge(
    edge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete an edge.
    """

    service = get_edge_service(db)

    try:
        service.delete_edge(
            edge_id,
            current_user,
        )

    except ValueError as e:
        detail = str(e)

        if detail in (
            "Edge not found.",
            "Mind map not found.",
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail,
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )