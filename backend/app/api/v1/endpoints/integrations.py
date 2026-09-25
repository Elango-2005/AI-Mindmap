from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.node_service import NodeService
from app.services.edge_service import EdgeService
from app.services.mind_map_service import MindMapService
from app.services.export_service import ExportService
from app.services.import_service import ImportService
from app.repositories.node_repository import NodeRepository
from app.repositories.edge_repository import EdgeRepository
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.project_repository import ProjectRepository

router = APIRouter()

def get_export_service(db: Session = Depends(get_db)):
    node_repo = NodeRepository(db)
    edge_repo = EdgeRepository(db)
    mind_map_repo = MindMapRepository(db)
    project_repo = ProjectRepository(db)
    return ExportService(
        NodeService(node_repo, mind_map_repo),
        EdgeService(edge_repo, mind_map_repo, node_repo),
        MindMapService(mind_map_repo, project_repo)
    )

def get_import_service(db: Session = Depends(get_db)):
    node_repo = NodeRepository(db)
    edge_repo = EdgeRepository(db)
    mind_map_repo = MindMapRepository(db)
    project_repo = ProjectRepository(db)
    return ImportService(
        NodeService(node_repo, mind_map_repo),
        EdgeService(edge_repo, mind_map_repo, node_repo),
        MindMapService(mind_map_repo, project_repo)
    )

@router.get("/export/{mind_map_id}")
def export_mind_map(
    mind_map_id: UUID,
    format: str = "markdown",
    current_user: User = Depends(get_current_user),
    export_service: ExportService = Depends(get_export_service)
):
    try:
        fmt = format.lower()
        if fmt in ["markdown", "md"]:
            content = export_service.generate_markdown(current_user, mind_map_id)
            return PlainTextResponse(content, media_type="text/markdown")
        elif fmt == "opml":
            content = export_service.generate_opml(current_user, mind_map_id)
            return Response(content, media_type="text/x-opml")
        elif fmt in ["freemind", "mm"]:
            content = export_service.generate_freemind(current_user, mind_map_id)
            return Response(
                content,
                media_type="application/x-freemind",
                headers={"Content-Disposition": 'attachment; filename="mindmap.mm"'}
            )
        elif fmt == "xmind":
            zip_bytes = export_service.generate_xmind(current_user, mind_map_id)
            return Response(
                zip_bytes,
                media_type="application/vnd.xmind.workbook",
                headers={"Content-Disposition": 'attachment; filename="mindmap.xmind"'}
            )
        elif fmt == "html":
            content = export_service.generate_html(current_user, mind_map_id)
            return HTMLResponse(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/import/{mind_map_id}")
def import_mind_map(
    mind_map_id: UUID,
    format: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    import_service: ImportService = Depends(get_import_service)
):
    content_bytes = file.file.read()
    fmt = format.lower()
    
    try:
        if fmt in ["markdown", "md"]:
            import_service.parse_markdown(content_bytes.decode("utf-8", errors="replace"), current_user, mind_map_id)
        elif fmt == "opml":
            import_service.parse_opml(content_bytes.decode("utf-8", errors="replace"), current_user, mind_map_id)
        elif fmt in ["freemind", "mm"]:
            import_service.parse_freemind(content_bytes.decode("utf-8", errors="replace"), current_user, mind_map_id)
        elif fmt == "xmind":
            import_service.parse_xmind(content_bytes, current_user, mind_map_id)
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
            
        return {"status": "success", "message": f"Successfully imported {format} file"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
