from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.exceptions import (
    AIGenerationError,
    InvalidAITopicError,
    MindMapAccessDeniedError,
    MindMapNotFoundError,
)
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
from app.schemas.ai_mind_map import (
    AIMindMapGenerateRequest,
    AIMindMapGenerateResponse,
)
from pydantic import BaseModel
from app.services.ai_mind_map_service import AIMindMapService
from app.services.ai_service import AIService

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
        

@router.post(
    "/{mind_map_id}/generate",
    response_model=AIMindMapGenerateResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_ai_mind_map(
    mind_map_id: UUID,
    request: AIMindMapGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate an AI-powered mind map and save it to the database.
    """

    service = AIMindMapService(
        db=db,
        mind_map_repository=MindMapRepository(db),
        ai_service=AIService(),
    )

    try:
        return service.generate_and_save_mind_map(
            mind_map_id=mind_map_id,
            current_user=current_user,
            topic=request.topic,
            depth=request.depth,
        )

    except MindMapNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    except MindMapAccessDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

    except InvalidAITopicError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    except AIGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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

from typing import Optional

class ChatRequest(BaseModel):
    instruction: str
    selected_node_id: Optional[str] = None

@router.post(
    "/{mind_map_id}/chat",
    response_model=dict,
)
def chat_modify_mind_map(
    mind_map_id: UUID,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process an AI chat instruction to modify the mind map.
    """
    ai_service = AIMindMapService(
        db,
        MindMapRepository(db),
        AIService(),
    )

    try:
        result = ai_service.chat_and_modify_mind_map(
            mind_map_id,
            current_user,
            request.instruction,
            request.selected_node_id,
        )
        # Serialize the models
        from app.schemas.node import NodeResponse
        from app.schemas.edge import EdgeResponse
        
        return {
            "response_text": result["response_text"],
            "nodes": [NodeResponse.model_validate(n).model_dump(mode='json') for n in result["nodes"]],
            "edges": [EdgeResponse.model_validate(e).model_dump(mode='json') for e in result["edges"]]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

from app.models.mind_map_snapshot import MindMapSnapshot
from app.schemas.snapshot import SnapshotResponse, SnapshotCreate

@router.get(
    "/{mind_map_id}/snapshots",
    response_model=list[SnapshotResponse],
)
def get_mind_map_snapshots(
    mind_map_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = get_mind_map_service(db)
    # verify access
    try:
        service.get_mind_map(mind_map_id, current_user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Mind map not found")
        
    snapshots = db.query(MindMapSnapshot).filter(
        MindMapSnapshot.mind_map_id == mind_map_id
    ).order_by(MindMapSnapshot.created_at.desc()).all()
    return snapshots

@router.post(
    "/{mind_map_id}/snapshots",
    response_model=SnapshotResponse,
)
def create_mind_map_snapshot(
    mind_map_id: UUID,
    snapshot: SnapshotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = get_mind_map_service(db)
    try:
        service.get_mind_map(mind_map_id, current_user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Mind map not found")

    from app.models.node import Node
    from app.models.edge import Edge
    from app.schemas.node import NodeResponse
    from app.schemas.edge import EdgeResponse
    
    nodes = db.query(Node).filter(Node.mind_map_id == mind_map_id).all()
    edges = db.query(Edge).filter(Edge.mind_map_id == mind_map_id).all()
    
    graph_data = {
        "nodes": [NodeResponse.model_validate(n).model_dump(mode='json') for n in nodes],
        "edges": [EdgeResponse.model_validate(e).model_dump(mode='json') for e in edges]
    }
    
    new_snapshot = MindMapSnapshot(
        mind_map_id=mind_map_id,
        name=snapshot.name,
        graph_data=graph_data
    )
    db.add(new_snapshot)
    db.commit()
    db.refresh(new_snapshot)
    return new_snapshot

@router.post(
    "/{mind_map_id}/snapshots/{snapshot_id}/restore",
    response_model=dict,
)
def restore_mind_map_snapshot(
    mind_map_id: UUID,
    snapshot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = get_mind_map_service(db)
    try:
        service.get_mind_map(mind_map_id, current_user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Mind map not found")
        
    snapshot = db.query(MindMapSnapshot).filter(
        MindMapSnapshot.id == snapshot_id,
        MindMapSnapshot.mind_map_id == mind_map_id
    ).first()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
        
    from app.services.ai_mind_map_service import AIMindMapService
    from app.services.ai_service import AIService
    
    ai_service = AIMindMapService(
        db,
        MindMapRepository(db),
        AIService(),
    )
    
    # We can use the same replace_mind_map_graph logic to overwrite the graph
    # However replace_mind_map_graph expects dict of string ids
    # Our snapshot nodes already have UUIDs as strings in "id"
    # But wait, replace_mind_map_graph upserts based on `node_data["id"]`.
    # And our snapshot graph_data["nodes"] has node_data["id"] equal to the UUIDs from when the snapshot was taken.
    # So if they still exist, they will be upserted. If they were deleted, they will be re-created with new UUIDs.
    
    # Wait, replace_mind_map_graph generates new UUIDs if they don't exist!
    # But if we want to restore exact UUIDs, replace_mind_map_graph doesn't allow overriding the ID.
    # Actually, we should just delete the existing nodes/edges and insert the snapshot ones exactly.
    # Let's do that manually to preserve exact UUIDs:
    from app.models.node import Node
    from app.models.edge import Edge
    
    try:
        # Delete current edges
        db.query(Edge).filter(Edge.mind_map_id == mind_map_id).delete(synchronize_session=False)
        # Delete current nodes
        db.query(Node).filter(Node.mind_map_id == mind_map_id).delete(synchronize_session=False)
        db.flush()
        
        created_nodes = []
        created_edges = []
        
        for n_data in snapshot.graph_data["nodes"]:
            node = Node(
                id=UUID(n_data["id"]),
                mind_map_id=mind_map_id,
                label=n_data["label"],
                type=n_data["type"],
                position_x=n_data["position_x"],
                position_y=n_data["position_y"],
            )
            db.add(node)
            created_nodes.append(node)
            
        for e_data in snapshot.graph_data["edges"]:
            edge = Edge(
                id=UUID(e_data["id"]),
                mind_map_id=mind_map_id,
                source=UUID(e_data["source"]),
                target=UUID(e_data["target"]),
                label=e_data.get("label"),
                type=e_data.get("type", "default"),
                animated=e_data.get("animated", False),
            )
            db.add(edge)
            created_edges.append(edge)
            
        db.commit()
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))