import html
import logging
import secrets
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import PlainTextResponse, Response, HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.node_service import NodeService
from app.services.edge_service import EdgeService
from app.services.mind_map_service import MindMapService
from app.services.export_service import ExportService
from app.services.import_service import ImportService
from app.services.mindmeister_service import (
    MindMeisterService,
    MindMeisterConfigError,
    MindMeisterAuthError,
    MindMeisterAPIError,
)
from app.repositories.node_repository import NodeRepository
from app.repositories.edge_repository import EdgeRepository
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.project_repository import ProjectRepository

logger = logging.getLogger(__name__)

router = APIRouter()

def get_mindmeister_service(db: Session = Depends(get_db)) -> MindMeisterService:
    return MindMeisterService(db)

class MindMeisterImportRequest(BaseModel):
    mm_map_id: str = Field(..., description="MindMeister Map ID to import")

class MindMeisterCodeExchangeRequest(BaseModel):
    code: str

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

# ==============================================================================
# MindMeister Direct Cloud API Integration Endpoints
# ==============================================================================

@router.get("/mindmeister/status")
def get_mindmeister_status(
    current_user: User = Depends(get_current_user),
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    Get current user's MindMeister connection status and credentials availability.
    """
    return mindmeister_service.get_integration_status(current_user.id)


@router.get("/mindmeister/auth-url")
def get_mindmeister_auth_url(
    current_user: User = Depends(get_current_user),
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    Generate official MindMeister OAuth 2.0 authorization URL.
    """
    if not mindmeister_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MindMeister OAuth is not configured. Missing MINDMEISTER_CLIENT_ID or MINDMEISTER_CLIENT_SECRET in backend environment.",
        )
    state = f"{current_user.id}:{secrets.token_urlsafe(16)}"
    url = mindmeister_service.get_authorization_url(state)
    return {"auth_url": url, "configured": True}


@router.get("/mindmeister/callback", response_class=HTMLResponse)
def mindmeister_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    MindMeister OAuth 2.0 redirect landing endpoint.
    Handles browser redirects from MindMeister authorization screen.
    """
    if error:
        err_msg = html.escape(error_description or error)
        return HTMLResponse(
            f"""<!DOCTYPE html>
            <html>
            <head><title>MindMeister Authentication Error</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc; margin: 0;">
                <div style="text-align: center; padding: 2.5rem; border-radius: 16px; background: #1e293b; max-width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155;">
                    <div style="font-size: 44px; margin-bottom: 12px;">⚠️</div>
                    <h2 style="margin: 0 0 10px 0; color: #f87171;">Connection Failed</h2>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">MindMeister authorization was not completed:<br><strong style="color: #e2e8f0;">{err_msg}</strong></p>
                    <button onclick="window.close();" style="margin-top: 20px; padding: 10px 24px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Close Window
                    </button>
                </div>
            </body>
            </html>""",
            status_code=400,
        )

    if not code or not state:
        return HTMLResponse(
            """<!DOCTYPE html>
            <html>
            <head><title>MindMeister Authentication Error</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc; margin: 0;">
                <div style="text-align: center; padding: 2.5rem; border-radius: 16px; background: #1e293b; max-width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155;">
                    <div style="font-size: 44px; margin-bottom: 12px;">⚠️</div>
                    <h2 style="margin: 0 0 10px 0; color: #f87171;">Missing Code or State</h2>
                    <p style="color: #94a3b8; font-size: 14px;">Invalid callback parameters received from MindMeister.</p>
                    <button onclick="window.close();" style="margin-top: 20px; padding: 10px 24px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Close Window
                    </button>
                </div>
            </body>
            </html>""",
            status_code=400,
        )

    try:
        user_id_str = state.split(":")[0]
        user_id = UUID(user_id_str)
        mindmeister_service.exchange_code(code, user_id)

        return HTMLResponse(
            """<!DOCTYPE html>
            <html>
            <head><title>MindMeister Connected</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc; margin: 0;">
                <div style="text-align: center; padding: 2.5rem; border-radius: 16px; background: #1e293b; max-width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155;">
                    <div style="font-size: 44px; margin-bottom: 12px;">🎉</div>
                    <h2 style="margin: 0 0 10px 0; color: #38bdf8;">MindMeister Connected!</h2>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Your MindMeister account is successfully connected to MindVault.<br>This window will close automatically.</p>
                    <button onclick="if(window.opener){window.opener.postMessage({type:'MINDMEISTER_CONNECTED'},'*');window.close();}else{window.location.href='/';}"
                        style="margin-top: 20px; padding: 10px 24px; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Return to MindVault
                    </button>
                </div>
                <script>
                    try {
                        if (window.opener) {
                            window.opener.postMessage({ type: 'MINDMEISTER_CONNECTED' }, '*');
                            setTimeout(() => { window.close(); }, 1200);
                        }
                    } catch (e) {}
                </script>
            </body>
            </html>"""
        )
    except Exception as e:
        logger.exception("MindMeister OAuth exchange failed in callback")
        err_msg = html.escape(str(e))
        return HTMLResponse(
            f"""<!DOCTYPE html>
            <html>
            <head><title>MindMeister Error</title></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc; margin: 0;">
                <div style="text-align: center; padding: 2.5rem; border-radius: 16px; background: #1e293b; max-width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155;">
                    <div style="font-size: 44px; margin-bottom: 12px;">❌</div>
                    <h2 style="margin: 0 0 10px 0; color: #f87171;">Authorization Failed</h2>
                    <p style="color: #94a3b8; font-size: 14px;">{err_msg}</p>
                    <button onclick="window.close();" style="margin-top: 20px; padding: 10px 24px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Close Window
                    </button>
                </div>
            </body>
            </html>""",
            status_code=400,
        )


@router.post("/mindmeister/callback")
def mindmeister_oauth_code_exchange(
    body: MindMeisterCodeExchangeRequest,
    current_user: User = Depends(get_current_user),
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    Exchange authorization code programmatically from the frontend.
    """
    try:
        integration = mindmeister_service.exchange_code(body.code, current_user.id)
        return {
            "status": "success",
            "message": "MindMeister account connected successfully.",
            "account_name": integration.account_name,
            "account_email": integration.account_email,
        }
    except (MindMeisterConfigError, MindMeisterAuthError, MindMeisterAPIError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/mindmeister/disconnect")
def disconnect_mindmeister(
    current_user: User = Depends(get_current_user),
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    Revoke MindMeister access token and disconnect account.
    """
    success = mindmeister_service.disconnect(current_user.id)
    return {
        "status": "success" if success else "not_connected",
        "message": "MindMeister integration disconnected." if success else "No active MindMeister integration found.",
    }


@router.get("/mindmeister/maps")
def list_mindmeister_maps(
    current_user: User = Depends(get_current_user),
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    List user's mind maps from MindMeister.
    """
    try:
        maps = mindmeister_service.list_maps(current_user.id)
        return {"maps": maps}
    except MindMeisterAuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except (MindMeisterConfigError, MindMeisterAPIError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/mindmeister/import/{mind_map_id}")
def import_mindmeister_map(
    mind_map_id: UUID,
    body: MindMeisterImportRequest,
    current_user: User = Depends(get_current_user),
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    Import a MindMeister map into the specified MindVault mind map.
    """
    try:
        result = mindmeister_service.import_map(current_user, mind_map_id, body.mm_map_id)
        return result
    except MindMeisterAuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except (MindMeisterConfigError, MindMeisterAPIError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/mindmeister/export/{mind_map_id}")
def export_to_mindmeister(
    mind_map_id: UUID,
    current_user: User = Depends(get_current_user),
    mindmeister_service: MindMeisterService = Depends(get_mindmeister_service),
):
    """
    Export the specified MindVault mind map directly into the user's MindMeister account.
    """
    try:
        result = mindmeister_service.export_map(current_user, mind_map_id)
        return result
    except MindMeisterAuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except (MindMeisterConfigError, MindMeisterAPIError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
