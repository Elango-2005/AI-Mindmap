from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.template import (
    TemplateSummary,
    TemplateDetail,
    InstantiateTemplateResponse,
)
from app.services.template_service import TemplateService

router = APIRouter(
    prefix="/templates",
    tags=["Templates"],
)


@router.get(
    "",
    response_model=List[TemplateSummary],
)
def list_templates() -> List[TemplateSummary]:
    """
    List all available smart mind map templates.
    """
    return TemplateService.get_all_templates()


@router.get(
    "/{template_id}",
    response_model=TemplateDetail,
)
def get_template(template_id: str) -> TemplateDetail:
    """
    Get template details and preview tree by ID.
    """
    try:
        return TemplateService.get_template_by_id(template_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/{template_id}/instantiate",
    response_model=InstantiateTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
def instantiate_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InstantiateTemplateResponse:
    """
    Instantiate a template into a new Project and populated Mind Map.
    """
    try:
        project, mind_map, node_count, edge_count = TemplateService.instantiate_template(
            template_id,
            current_user,
            db,
        )
        return InstantiateTemplateResponse(
            project_id=project.id,
            mind_map_id=mind_map.id,
            title=mind_map.title,
            node_count=node_count,
            edge_count=edge_count,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to instantiate template: {str(e)}",
        )
