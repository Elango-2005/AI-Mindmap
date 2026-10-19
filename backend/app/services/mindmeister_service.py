import io
import json
import logging
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.mind_map import MindMap
from app.models.user import User
from app.models.user_integration import UserIntegration
from app.repositories.user_integration_repository import UserIntegrationRepository
from app.services.export_service import ExportService
from app.services.import_service import ImportService
from app.services.mind_map_service import MindMapService
from app.services.node_service import NodeService
from app.services.edge_service import EdgeService
from app.repositories.node_repository import NodeRepository
from app.repositories.edge_repository import EdgeRepository
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.project_repository import ProjectRepository

logger = logging.getLogger(__name__)

MINDMEISTER_BASE_URL = "https://www.mindmeister.com"
MINDMEISTER_API_V2_URL = "https://www.mindmeister.com/api/v2"
MINDMEISTER_REST_URL = "https://www.mindmeister.com/services/rest/oauth2"
MINDMEISTER_AUTH_URL = "https://www.mindmeister.com/oauth2/authorize"
MINDMEISTER_TOKEN_URL = "https://www.mindmeister.com/oauth2/token"
MINDMEISTER_TOKEN_INFO_URL = "https://www.mindmeister.com/oauth2/token/info"
MINDMEISTER_REVOKE_URL = "https://www.mindmeister.com/oauth2/revoke"

REQUIRED_SCOPES = "userinfo.profile userinfo.email mindmeister"


class MindMeisterConfigError(Exception):
    """Raised when MindMeister OAuth credentials are not configured."""
    pass


class MindMeisterAuthError(Exception):
    """Raised on authentication or token failure."""
    pass


class MindMeisterAPIError(Exception):
    """Raised when a MindMeister API call fails."""
    pass


class MindMeisterService:
    """
    Direct cloud integration for MindMeister via official OAuth 2.0 and API v2 / REST protocols.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = UserIntegrationRepository(db)

    @classmethod
    def is_configured(cls) -> bool:
        """Check if MindMeister application credentials are configured."""
        return bool(
            settings.MINDMEISTER_CLIENT_ID and settings.MINDMEISTER_CLIENT_SECRET
        )

    def get_authorization_url(self, state: str) -> str:
        """Generate the official MindMeister OAuth 2.0 authorization URL."""
        if not self.is_configured():
            raise MindMeisterConfigError(
                "MindMeister integration is not configured. Missing MINDMEISTER_CLIENT_ID or MINDMEISTER_CLIENT_SECRET in backend configuration."
            )

        params = {
            "response_type": "code",
            "client_id": settings.MINDMEISTER_CLIENT_ID,
            "redirect_uri": settings.MINDMEISTER_REDIRECT_URI,
            "scope": REQUIRED_SCOPES,
            "state": state,
        }
        return f"{MINDMEISTER_AUTH_URL}?{urllib.parse.urlencode(params)}"

    def exchange_code(self, code: str, user_id: UUID) -> UserIntegration:
        """
        Exchange OAuth authorization code for an access token and store it.
        """
        if not self.is_configured():
            raise MindMeisterConfigError("MindMeister integration is not configured.")

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.MINDMEISTER_CLIENT_ID,
            "client_secret": settings.MINDMEISTER_CLIENT_SECRET,
            "redirect_uri": settings.MINDMEISTER_REDIRECT_URI,
        }

        try:
            response = requests.post(MINDMEISTER_TOKEN_URL, data=data, timeout=15)
        except requests.RequestException as e:
            raise MindMeisterAPIError(f"Network error connecting to MindMeister: {e}")

        if response.status_code != 200:
            logger.error("MindMeister token exchange failed: %s %s", response.status_code, response.text)
            raise MindMeisterAuthError(f"Token exchange failed: {response.text}")

        token_data = response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise MindMeisterAuthError("No access_token returned by MindMeister.")

        refresh_token = token_data.get("refresh_token")
        token_type = token_data.get("token_type", "Bearer")
        scope = token_data.get("scope", REQUIRED_SCOPES)
        expires_in = token_data.get("expires_in")
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None

        # Fetch user profile from MindMeister /api/v2/users/me
        account_id = None
        account_name = None
        account_email = None
        try:
            profile = self.get_user_profile(access_token)
            account_id = str(profile.get("id")) if profile.get("id") else None
            account_name = profile.get("name") or profile.get("firstname", "")
            account_email = profile.get("email")
        except Exception as e:
            logger.warning("Could not fetch MindMeister profile: %s", e)

        # Store in user_integrations table
        integration = self.repo.upsert(
            user_id=user_id,
            provider="mindmeister",
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

    def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Fetch user profile via /api/v2/users/me."""
        headers = {"Authorization": f"Bearer {access_token}"}
        resp = requests.get(f"{MINDMEISTER_API_V2_URL}/users/me", headers=headers, timeout=10)
        if resp.status_code != 200:
            raise MindMeisterAPIError(f"Failed to fetch profile: {resp.text}")
        return resp.json()

    def get_token_info(self, access_token: str) -> Dict[str, Any]:
        """Verify token validity via /oauth2/token/info."""
        headers = {"Authorization": f"Bearer {access_token}"}
        resp = requests.get(MINDMEISTER_TOKEN_INFO_URL, headers=headers, timeout=10)
        if resp.status_code != 200:
            raise MindMeisterAuthError("Token is expired or invalid.")
        return resp.json()

    def disconnect(self, user_id: UUID) -> bool:
        """Revoke token and remove integration record from database."""
        integration = self.repo.get_by_user_and_provider(user_id, "mindmeister")
        if not integration:
            return False

        # Attempt remote revocation
        if self.is_configured() and integration.access_token:
            try:
                data = {
                    "client_id": settings.MINDMEISTER_CLIENT_ID,
                    "client_secret": settings.MINDMEISTER_CLIENT_SECRET,
                    "token": integration.access_token,
                }
                requests.post(MINDMEISTER_REVOKE_URL, data=data, timeout=5)
            except Exception as e:
                logger.warning("Failed to revoke token remotely: %s", e)

        return self.repo.delete(user_id, "mindmeister")

    def get_integration_status(self, user_id: UUID) -> Dict[str, Any]:
        """Check if user has a connected MindMeister account."""
        integration = self.repo.get_by_user_and_provider(user_id, "mindmeister")
        is_conn = integration is not None
        return {
            "configured": self.is_configured(),
            "connected": is_conn,
            "provider": "mindmeister",
            "account_id": integration.account_id if is_conn else None,
            "account_name": integration.account_name if is_conn else None,
            "account_email": integration.account_email if is_conn else None,
            "expires_at": integration.expires_at.isoformat() if (is_conn and integration.expires_at) else None,
        }

    def _get_valid_token(self, user_id: UUID) -> str:
        """Retrieve stored access token, verifying expiration."""
        integration = self.repo.get_by_user_and_provider(user_id, "mindmeister")
        if not integration:
            raise MindMeisterAuthError("MindMeister account is not connected. Please connect first.")

        if integration.expires_at:
            now = datetime.now(timezone.utc) if integration.expires_at.tzinfo else datetime.utcnow()
            if integration.expires_at < now:
                raise MindMeisterAuthError("MindMeister session expired. Please reconnect your account.")

        return integration.access_token

    def list_maps(self, user_id: UUID) -> List[Dict[str, Any]]:
        """
        List all mind maps in user's MindMeister account.
        Calls mm.maps.getList with response_format=json.
        """
        access_token = self._get_valid_token(user_id)
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "method": "mm.maps.getList",
            "response_format": "json",
        }

        try:
            resp = requests.get(MINDMEISTER_REST_URL, headers=headers, params=params, timeout=15)
        except requests.RequestException as e:
            raise MindMeisterAPIError(f"Network error: {e}")

        if resp.status_code == 401:
            raise MindMeisterAuthError("MindMeister token rejected or revoked.")
        elif resp.status_code != 200:
            raise MindMeisterAPIError(f"MindMeister API error ({resp.status_code}): {resp.text}")

        maps_list: List[Dict[str, Any]] = []

        # Try parsing JSON
        try:
            data = resp.json()
            rsp = data.get("rsp", {})
            maps_container = rsp.get("maps", {})
            raw_maps = maps_container.get("map", [])
            if isinstance(raw_maps, dict):
                raw_maps = [raw_maps]
            for m in raw_maps:
                maps_list.append({
                    "id": str(m.get("id")),
                    "title": m.get("title") or "Untitled Map",
                    "modified": m.get("modified"),
                    "created": m.get("created"),
                    "web_url": f"https://www.mindmeister.com/maps/show/{m.get('id')}",
                })
            return maps_list
        except (ValueError, KeyError):
            pass

        # Fallback to XML parsing
        try:
            root = ET.fromstring(resp.text)
            for map_elem in root.findall(".//map"):
                maps_list.append({
                    "id": map_elem.get("id"),
                    "title": map_elem.get("title", "Untitled Map"),
                    "modified": map_elem.get("modified"),
                    "created": map_elem.get("created"),
                    "web_url": f"https://www.mindmeister.com/maps/show/{map_elem.get('id')}",
                })
            return maps_list
        except ET.ParseError:
            raise MindMeisterAPIError("Failed to parse response from MindMeister.")

    def import_map(
        self,
        current_user: User,
        mind_map_id: UUID,
        mm_map_id: str
    ) -> Dict[str, Any]:
        """
        Fetch a map from MindMeister and convert it into MindVault nodes and edges.
        """
        access_token = self._get_valid_token(current_user.id)
        headers = {"Authorization": f"Bearer {access_token}"}

        # 1. Fetch map metadata via API v2 /maps/{id}
        map_title = "Imported MindMeister Map"
        try:
            meta_resp = requests.get(f"{MINDMEISTER_API_V2_URL}/maps/{mm_map_id}", headers=headers, timeout=10)
            if meta_resp.status_code == 200:
                meta = meta_resp.json()
                map_title = meta.get("title") or meta.get("root_title") or map_title
        except Exception:
            pass

        # 2. Try fetching map in native .mind JSON or FreeMind .mm format
        file_resp = requests.get(f"{MINDMEISTER_API_V2_URL}/maps/{mm_map_id}.mm", headers=headers, timeout=15)
        
        node_repo = NodeRepository(self.db)
        edge_repo = EdgeRepository(self.db)
        mind_map_repo = MindMapRepository(self.db)
        project_repo = ProjectRepository(self.db)

        import_service = ImportService(
            NodeService(node_repo, mind_map_repo),
            EdgeService(edge_repo, mind_map_repo, node_repo),
            MindMapService(mind_map_repo, project_repo)
        )

        if file_resp.status_code == 200 and file_resp.content:
            # Parse FreeMind XML content
            xml_text = file_resp.content.decode("utf-8", errors="replace")
            import_service.parse_freemind(xml_text, current_user, mind_map_id)
            return {
                "status": "success",
                "message": f"Successfully imported MindMeister map: '{map_title}'",
                "mind_map_id": str(mind_map_id),
                "mm_map_id": mm_map_id,
            }

        # 3. Fallback: mm.maps.getMap REST call
        params = {
            "method": "mm.maps.getMap",
            "map_id": mm_map_id,
            "response_format": "json"
        }
        rest_resp = requests.get(MINDMEISTER_REST_URL, headers=headers, params=params, timeout=15)
        if rest_resp.status_code != 200:
            raise MindMeisterAPIError(f"Could not retrieve map from MindMeister: {rest_resp.text}")

        # Parse map tree structure
        tree = self._parse_map_response_to_tree(rest_resp.text, default_title=map_title)
        import_service._create_tree(tree, current_user, mind_map_id)

        return {
            "status": "success",
            "message": f"Successfully imported MindMeister map: '{map_title}'",
            "mind_map_id": str(mind_map_id),
            "mm_map_id": mm_map_id,
        }

    def _parse_map_response_to_tree(self, raw_content: str, default_title: str) -> Dict[str, Any]:
        """Convert MindMeister JSON or XML map payload into a standard tree dict."""
        # Try JSON
        try:
            data = json.loads(raw_content)
            rsp = data.get("rsp", {})
            map_data = rsp.get("map", {})
            title = map_data.get("title", default_title)

            def parse_idea(idea_dict):
                label = idea_dict.get("title", "Topic")
                children = []
                raw_children = idea_dict.get("children", {}).get("idea", [])
                if isinstance(raw_children, dict):
                    raw_children = [raw_children]
                for child in raw_children:
                    children.append(parse_idea(child))
                return {"label": label, "children": children}

            root_idea = map_data.get("root") or map_data.get("ideas", {}).get("idea", {})
            if isinstance(root_idea, list) and root_idea:
                root_idea = root_idea[0]

            if root_idea:
                parsed_root = parse_idea(root_idea)
                return {"title": title, "label": parsed_root["label"], "children": parsed_root["children"]}
        except Exception:
            pass

        # Try XML
        try:
            root_elem = ET.fromstring(raw_content)
            map_elem = root_elem.find(".//map")
            title = map_elem.get("title", default_title) if map_elem is not None else default_title

            def parse_xml_idea(elem):
                label = elem.get("title", "Topic")
                children = []
                for child in elem.findall("./children/idea"):
                    children.append(parse_xml_idea(child))
                return {"label": label, "children": children}

            root_idea_elem = root_elem.find(".//ideas/idea")
            if root_idea_elem is not None:
                parsed_root = parse_xml_idea(root_idea_elem)
                return {"title": title, "label": parsed_root["label"], "children": parsed_root["children"]}
        except Exception:
            pass

        return {"title": default_title, "label": default_title, "children": []}

    def export_map(
        self,
        current_user: User,
        mind_map_id: UUID
    ) -> Dict[str, Any]:
        """
        Export a MindVault mind map directly to the user's MindMeister account.
        Uses mm.maps.import with FreeMind (.mm) payload for full hierarchical fidelity.
        """
        access_token = self._get_valid_token(current_user.id)

        node_repo = NodeRepository(self.db)
        edge_repo = EdgeRepository(self.db)
        mind_map_repo = MindMapRepository(self.db)
        project_repo = ProjectRepository(self.db)

        export_service = ExportService(
            NodeService(node_repo, mind_map_repo),
            EdgeService(edge_repo, mind_map_repo, node_repo),
            MindMapService(mind_map_repo, project_repo)
        )

        mind_map = mind_map_repo.get_by_id(mind_map_id)
        if not mind_map:
            raise MindMeisterAPIError("Mind map not found.")

        # Generate FreeMind XML representation of the map
        freemind_xml = export_service.generate_freemind(current_user, mind_map_id)
        file_bytes = freemind_xml.encode("utf-8")

        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "method": "mm.maps.import",
            "response_format": "json",
        }
        files = {
            "file": (f"{mind_map.title}.mm", file_bytes, "application/x-freemind")
        }

        try:
            resp = requests.post(
                MINDMEISTER_REST_URL,
                headers=headers,
                params=params,
                files=files,
                timeout=25
            )
        except requests.RequestException as e:
            raise MindMeisterAPIError(f"Network error while exporting to MindMeister: {e}")

        if resp.status_code == 401:
            raise MindMeisterAuthError("MindMeister authentication expired. Please reconnect.")
        elif resp.status_code != 200:
            raise MindMeisterAPIError(f"MindMeister export rejected ({resp.status_code}): {resp.text}")

        # Parse newly created map ID
        mm_map_id = None
        try:
            data = resp.json()
            mm_map_id = str(data.get("rsp", {}).get("map", {}).get("id"))
        except Exception:
            try:
                xml_root = ET.fromstring(resp.text)
                map_elem = xml_root.find(".//map")
                if map_elem is not None:
                    mm_map_id = map_elem.get("id")
            except Exception:
                pass

        web_url = f"https://www.mindmeister.com/maps/show/{mm_map_id}" if mm_map_id else "https://www.mindmeister.com"

        return {
            "status": "success",
            "message": f"Successfully exported '{mind_map.title}' to MindMeister.",
            "mm_map_id": mm_map_id,
            "web_url": web_url,
        }
