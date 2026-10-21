import json
import logging
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.mind_map import MindMap
from app.models.user import User
from app.models.user_integration import UserIntegration
from app.repositories.edge_repository import EdgeRepository
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.node_repository import NodeRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_integration_repository import UserIntegrationRepository
from app.services.edge_service import EdgeService
from app.services.export_service import ExportService
from app.services.import_service import ImportService
from app.services.mind_map_service import MindMapService
from app.services.node_service import NodeService

logger = logging.getLogger(__name__)

COGGLE_BASE_URL = "https://coggle.it"
COGGLE_API_URL = "https://coggle.it/api/1"
COGGLE_AUTH_URL = "https://coggle.it/dialog/authorize"
COGGLE_TOKEN_URL = "https://coggle.it/token"

REQUIRED_SCOPES = "read write"


class CoggleConfigError(Exception):
    """Raised when Coggle OAuth application credentials are not configured."""
    pass


class CoggleAuthError(Exception):
    """Raised on authentication or token failure."""
    pass


class CoggleAPIError(Exception):
    """Raised when a Coggle API call fails."""
    pass


class CoggleService:
    """
    Direct cloud integration for Coggle via official OAuth 2.0 and REST API v1.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = UserIntegrationRepository(db)

    @classmethod
    def is_configured(cls) -> bool:
        """Check if Coggle OAuth application credentials are configured."""
        return bool(
            settings.COGGLE_CLIENT_ID and settings.COGGLE_CLIENT_SECRET
        )

    def get_authorization_url(self, state: str) -> str:
        """Generate the official Coggle OAuth 2.0 authorization URL."""
        if not self.is_configured():
            raise CoggleConfigError(
                "Coggle integration is not configured. Missing COGGLE_CLIENT_ID or COGGLE_CLIENT_SECRET in backend configuration."
            )

        params = {
            "response_type": "code",
            "client_id": settings.COGGLE_CLIENT_ID,
            "redirect_uri": settings.COGGLE_REDIRECT_URI,
            "scope": REQUIRED_SCOPES,
            "state": state,
        }
        return f"{COGGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

    def exchange_code(self, code: str, user_id: UUID) -> UserIntegration:
        """
        Exchange OAuth authorization code for a Coggle access token and store it.
        """
        if not self.is_configured():
            raise CoggleConfigError("Coggle integration is not configured.")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.COGGLE_CLIENT_ID,
            "client_secret": settings.COGGLE_CLIENT_SECRET,
            "redirect_uri": settings.COGGLE_REDIRECT_URI,
        }

        try:
            response = requests.post(
                COGGLE_TOKEN_URL,
                data=data,
                auth=(settings.COGGLE_CLIENT_ID, settings.COGGLE_CLIENT_SECRET),
                timeout=15,
            )
        except requests.RequestException as e:
            raise CoggleAPIError(f"Network error connecting to Coggle: {e}")

        if response.status_code != 200:
            logger.error("Coggle token exchange failed: %s %s", response.status_code, response.text)
            raise CoggleAuthError(f"Token exchange failed: {response.text}")

        token_data = response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise CoggleAuthError("No access_token returned by Coggle.")

        refresh_token = token_data.get("refresh_token")
        token_type = token_data.get("token_type", "Bearer")
        scope = token_data.get("scope", REQUIRED_SCOPES)
        expires_in = token_data.get("expires_in")
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            if expires_in
            else None
        )

        account_id = None
        account_name = token_data.get("username") or "Coggle User"
        account_email = token_data.get("email")

        # Upsert in user_integrations table
        integration = self.repo.upsert(
            user_id=user_id,
            provider="coggle",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type,
            scope=scope,
            expires_at=expires_at,
            account_id=account_id,
            account_name=account_name,
            account_email=account_email,
        )
        return integration

    def disconnect(self, user_id: UUID) -> bool:
        """Revoke / remove Coggle integration record from database."""
        return self.repo.delete(user_id, "coggle")

    def get_integration_status(self, user_id: UUID) -> Dict[str, Any]:
        """Check if user has a connected Coggle account."""
        integration = self.repo.get_by_user_and_provider(user_id, "coggle")
        is_conn = integration is not None
        return {
            "configured": self.is_configured(),
            "connected": is_conn,
            "provider": "coggle",
            "account_id": integration.account_id if is_conn else None,
            "account_name": integration.account_name if is_conn else None,
            "account_email": integration.account_email if is_conn else None,
            "expires_at": (
                integration.expires_at.isoformat()
                if (is_conn and integration.expires_at)
                else None
            ),
        }

    def _get_valid_token(self, user_id: UUID) -> str:
        """Retrieve stored access token, verifying expiration."""
        integration = self.repo.get_by_user_and_provider(user_id, "coggle")
        if not integration:
            raise CoggleAuthError("Coggle account is not connected. Please connect first.")

        if integration.expires_at:
            now = (
                datetime.now(timezone.utc)
                if integration.expires_at.tzinfo
                else datetime.utcnow()
            )
            if integration.expires_at < now:
                raise CoggleAuthError("Coggle session expired. Please reconnect your account.")

        return integration.access_token

    def list_diagrams(self, user_id: UUID) -> List[Dict[str, Any]]:
        """
        List diagrams in the user's Coggle account via GET /api/1/diagrams.
        """
        access_token = self._get_valid_token(user_id)
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            resp = requests.get(
                f"{COGGLE_API_URL}/diagrams",
                headers=headers,
                timeout=15,
            )
        except requests.RequestException as e:
            raise CoggleAPIError(f"Network error connecting to Coggle: {e}")

        if resp.status_code == 401:
            raise CoggleAuthError("Coggle token rejected or expired.")
        elif resp.status_code != 200:
            raise CoggleAPIError(f"Coggle API error ({resp.status_code}): {resp.text}")

        diagrams_list: List[Dict[str, Any]] = []
        try:
            raw_data = resp.json()
            if isinstance(raw_data, dict):
                raw_data = [raw_data]
            for d in raw_data:
                d_id = str(d.get("_id") or d.get("id"))
                diagrams_list.append({
                    "id": d_id,
                    "title": d.get("title") or "Untitled Diagram",
                    "updated": d.get("updated"),
                    "web_url": f"https://coggle.it/diagram/{d_id}",
                })
            return diagrams_list
        except Exception as e:
            raise CoggleAPIError(f"Failed to parse Coggle diagrams list: {e}")

    def import_diagram(
        self,
        current_user: User,
        mind_map_id: UUID,
        diagram_id: str,
    ) -> Dict[str, Any]:
        """
        Fetch a diagram from Coggle and convert its hierarchical node tree into MindVault nodes and edges.
        """
        access_token = self._get_valid_token(current_user.id)
        headers = {"Authorization": f"Bearer {access_token}"}

        # 1. Fetch diagram metadata to obtain title
        diag_title = "Imported Coggle Diagram"
        try:
            meta_resp = requests.get(
                f"{COGGLE_API_URL}/diagrams/{diagram_id}",
                headers=headers,
                timeout=10,
            )
            if meta_resp.status_code == 200:
                meta = meta_resp.json()
                diag_title = meta.get("title") or diag_title
        except Exception:
            pass

        # 2. Fetch diagram node tree via GET /api/1/diagrams/:diagram/nodes
        try:
            nodes_resp = requests.get(
                f"{COGGLE_API_URL}/diagrams/{diagram_id}/nodes",
                headers=headers,
                timeout=15,
            )
        except requests.RequestException as e:
            raise CoggleAPIError(f"Network error fetching diagram from Coggle: {e}")

        if nodes_resp.status_code == 401:
            raise CoggleAuthError("Coggle authorization rejected.")
        elif nodes_resp.status_code != 200:
            raise CoggleAPIError(f"Coggle node retrieval failed ({nodes_resp.status_code}): {nodes_resp.text}")

        # Parse Coggle Node Tree
        try:
            raw_tree = nodes_resp.json()
        except Exception as e:
            raise CoggleAPIError(f"Malformed response from Coggle: {e}")

        if not raw_tree:
            raise CoggleAPIError("Coggle diagram has no node content.")

        # Coggle returns an array with the root node tree as its first element
        root_data = raw_tree[0] if isinstance(raw_tree, list) else raw_tree

        def parse_coggle_node(c_node: Dict[str, Any]) -> Dict[str, Any]:
            label = c_node.get("text") or "Topic"
            children = []
            for child in c_node.get("children", []):
                children.append(parse_coggle_node(child))
            return {"label": label.strip(), "children": children}

        parsed_root = parse_coggle_node(root_data)
        tree = {
            "title": diag_title,
            "roots": [parsed_root],
        }

        # Use ImportService to construct graph
        node_repo = NodeRepository(self.db)
        edge_repo = EdgeRepository(self.db)
        mind_map_repo = MindMapRepository(self.db)
        project_repo = ProjectRepository(self.db)

        import_service = ImportService(
            NodeService(node_repo, mind_map_repo),
            EdgeService(edge_repo, mind_map_repo, node_repo),
            MindMapService(mind_map_repo, project_repo),
        )

        import_service._create_tree(tree, current_user, mind_map_id)

        return {
            "status": "success",
            "message": f"Successfully imported Coggle diagram: '{diag_title}'",
            "mind_map_id": str(mind_map_id),
            "coggle_diagram_id": diagram_id,
        }

    def export_diagram(
        self,
        current_user: User,
        mind_map_id: UUID,
    ) -> Dict[str, Any]:
        """
        Export a MindVault mind map directly to the user's Coggle account.
        Creates a diagram via POST /api/1/diagrams and recursively attaches branches via POST /api/1/diagrams/:diagram/nodes.
        """
        access_token = self._get_valid_token(current_user.id)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        node_repo = NodeRepository(self.db)
        edge_repo = EdgeRepository(self.db)
        mind_map_repo = MindMapRepository(self.db)
        project_repo = ProjectRepository(self.db)

        export_service = ExportService(
            NodeService(node_repo, mind_map_repo),
            EdgeService(edge_repo, mind_map_repo, node_repo),
            MindMapService(mind_map_repo, project_repo),
        )

        mind_map = mind_map_repo.get_by_id(mind_map_id)
        if not mind_map:
            raise CoggleAPIError("Mind map not found.")

        # Extract hierarchical tree structure from MindVault
        tree_data = export_service._build_tree(current_user, mind_map_id)
        roots = tree_data.get("roots", [])
        if not roots:
            raise CoggleAPIError("Mind map contains no nodes to export.")

        root_node = roots[0]
        diagram_title = mind_map.title or root_node.get("label") or "MindVault Mind Map"

        # 1. Create diagram in Coggle: POST /api/1/diagrams
        create_payload = {"title": diagram_title}
        try:
            create_resp = requests.post(
                f"{COGGLE_API_URL}/diagrams",
                headers=headers,
                json=create_payload,
                timeout=15,
            )
        except requests.RequestException as e:
            raise CoggleAPIError(f"Network error creating diagram on Coggle: {e}")

        if create_resp.status_code == 401:
            raise CoggleAuthError("Coggle authentication expired. Please reconnect.")
        elif create_resp.status_code not in (200, 201):
            raise CoggleAPIError(f"Coggle rejected diagram creation ({create_resp.status_code}): {create_resp.text}")

        created_diag = create_resp.json()
        diagram_id = str(created_diag.get("_id") or created_diag.get("id"))

        # 2. Obtain root node ID in the newly created Coggle diagram
        root_coggle_id = None
        try:
            nodes_resp = requests.get(
                f"{COGGLE_API_URL}/diagrams/{diagram_id}/nodes",
                headers=headers,
                timeout=10,
            )
            if nodes_resp.status_code == 200:
                nodes_data = nodes_resp.json()
                if nodes_data and isinstance(nodes_data, list):
                    root_coggle_id = nodes_data[0].get("_id")
        except Exception:
            pass

        if not root_coggle_id:
            # Check if root node was directly returned in creation response
            if "nodes" in created_diag and created_diag["nodes"]:
                root_coggle_id = created_diag["nodes"][0].get("_id")

        # 3. Recursively add child branches to Coggle diagram
        if root_coggle_id:
            self._create_coggle_branches(
                diagram_id=diagram_id,
                parent_coggle_id=root_coggle_id,
                children=root_node.get("children", []),
                headers=headers,
            )

        web_url = f"https://coggle.it/diagram/{diagram_id}"

        return {
            "status": "success",
            "message": f"Successfully exported '{mind_map.title}' to Coggle.",
            "coggle_diagram_id": diagram_id,
            "web_url": web_url,
        }

    def _create_coggle_branches(
        self,
        diagram_id: str,
        parent_coggle_id: str,
        children: List[Dict[str, Any]],
        headers: Dict[str, str],
        max_depth: int = 5,
    ) -> None:
        """Recursively attach child nodes to a Coggle diagram."""
        if max_depth <= 0 or not children:
            return

        for child in children:
            label = child.get("label") or "Branch"
            payload = {
                "parent": parent_coggle_id,
                "text": label,
            }
            try:
                resp = requests.post(
                    f"{COGGLE_API_URL}/diagrams/{diagram_id}/nodes",
                    headers=headers,
                    json=payload,
                    timeout=10,
                )
                if resp.status_code in (200, 201):
                    node_data = resp.json()
                    child_id = node_data.get("_id")
                    grand_children = child.get("children", [])
                    if child_id and grand_children:
                        self._create_coggle_branches(
                            diagram_id=diagram_id,
                            parent_coggle_id=child_id,
                            children=grand_children,
                            headers=headers,
                            max_depth=max_depth - 1,
                        )
            except Exception as e:
                logger.warning("Could not add child node '%s' to Coggle diagram: %s", label, e)
