from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.mind_map import (
    MindMapCreate,
    MindMapResponse,
    MindMapUpdate,
)
from app.services.mind_map_service import MindMapService


router = APIRouter(
    prefix="/mind-maps",
    tags=["Mind Maps"],
)

@router.post(
    "/projects/{project_id}/mind-maps",
    response_model=MindMapResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_mind_map(
    project_id: UUID,
    mind_map: MindMapCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new mind map inside a project.
    """

    service = MindMapService(
        MindMapRepository(db),
        ProjectRepository(db),
    )

    try:
        return service.create_mind_map(
            project_id,
            current_user,
            mind_map,
        )

    except ValueError as e:
        if str(e) == "Project not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
        
@router.get(
    "/projects/{project_id}/mind-maps",
    response_model=list[MindMapResponse],
)
def get_project_mind_maps(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all mind maps belonging to a project.
    """

    service = MindMapService(
        MindMapRepository(db),
        ProjectRepository(db),
    )

    try:
        return service.get_project_mind_maps(
            project_id,
            current_user,
        )

    except ValueError as e:
        if str(e) == "Project not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
        
        
@router.get(
    "/{mind_map_id}",
    response_model=MindMapResponse,
)
def get_mind_map(
    mind_map_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a mind map by ID.
    """

    service = MindMapService(
        MindMapRepository(db),
        ProjectRepository(db),
    )

    try:
        return service.get_mind_map(
            mind_map_id,
            current_user,
        )

    except ValueError as e:
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        if str(e) == "Project not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
        
    
@router.put(
    "/{mind_map_id}",
    response_model=MindMapResponse,
)
def update_mind_map(
    mind_map_id: UUID,
    mind_map: MindMapUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a mind map.
    """

    service = MindMapService(
        MindMapRepository(db),
        ProjectRepository(db),
    )

    try:
        return service.update_mind_map(
            mind_map_id,
            current_user,
            mind_map,
        )

    except ValueError as e:
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        if str(e) == "Project not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
        

@router.delete(
    "/{mind_map_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_mind_map(
    mind_map_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a mind map.
    """

    service = MindMapService(
        MindMapRepository(db),
        ProjectRepository(db),
    )

    try:
        service.delete_mind_map(
            mind_map_id,
            current_user,
        )

    except ValueError as e:
        if str(e) == "Mind map not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        if str(e) == "Project not found.":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )