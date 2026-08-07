from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.project_service import ProjectService

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new project.
    """

    service = ProjectService(ProjectRepository(db))

    return service.create_project(
        current_user,
        project,
    )


@router.get(
    "",
    response_model=list[ProjectResponse],
)
def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all projects for the current user.
    """

    service = ProjectService(ProjectRepository(db))

    return service.get_user_projects(
        current_user,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
)
def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a project by ID.
    """

    service = ProjectService(ProjectRepository(db))

    try:
        return service.get_project(
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


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
)
def update_project(
    project_id: UUID,
    project: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a project.
    """

    service = ProjectService(ProjectRepository(db))

    try:
        return service.update_project(
            project_id,
            current_user,
            project,
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


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete a project.
    """

    service = ProjectService(ProjectRepository(db))

    try:
        service.delete_project(
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