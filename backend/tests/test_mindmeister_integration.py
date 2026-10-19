import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.mind_map import MindMap
from app.models.node import Node
from app.models.edge import Edge
from app.models.user_integration import UserIntegration
from app.core.config import settings
from app.services.mindmeister_service import (
    MindMeisterService,
    MindMeisterConfigError,
    MindMeisterAuthError,
    MindMeisterAPIError,
    MINDMEISTER_AUTH_URL,
    MINDMEISTER_REST_URL,
    MINDMEISTER_API_V2_URL,
    MINDMEISTER_TOKEN_URL,
    MINDMEISTER_REVOKE_URL,
)


class TestMindMeisterIntegration(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

        # Create test user
        self.test_user = User(
            id=uuid4(),
            email=f"mm_test_{uuid4().hex[:8]}@example.com",
            password_hash="hashed_test_password",
            full_name="MindMeister Test User",
            is_active=True,
        )
        self.db.add(self.test_user)
        self.db.flush()

        # Create test project
        self.test_project = Project(
            id=uuid4(),
            title="MM Integration Project",
            description="Testing MindMeister sync",
            user_id=self.test_user.id,
        )
        self.db.add(self.test_project)
        self.db.flush()

        # Create test mind map
        self.test_map = MindMap(
            id=uuid4(),
            title="Q4 Product Strategy",
            project_id=self.test_project.id,
        )
        self.db.add(self.test_map)
        self.db.flush()

        # Create root and child nodes
        self.root_node = Node(
            id=uuid4(),
            mind_map_id=self.test_map.id,
            label="Product Strategy 2026",
            type="central_idea",
            position_x=0.0,
            position_y=0.0,
            importance_score=1.0,
        )
        self.child_node = Node(
            id=uuid4(),
            mind_map_id=self.test_map.id,
            label="AI Integration Feature",
            type="main_branch",
            position_x=200.0,
            position_y=100.0,
            importance_score=0.85,
        )
        self.db.add(self.root_node)
        self.db.add(self.child_node)
        self.db.flush()

        self.test_edge = Edge(
            id=uuid4(),
            mind_map_id=self.test_map.id,
            source=self.root_node.id,
            target=self.child_node.id,
            label="includes",
        )
        self.db.add(self.test_edge)
        self.db.commit()

        self.service = MindMeisterService(self.db)

    def tearDown(self):
        try:
            self.db.query(UserIntegration).filter(UserIntegration.user_id == self.test_user.id).delete()
            self.db.query(Edge).filter(Edge.mind_map_id == self.test_map.id).delete()
            self.db.query(Node).filter(Node.mind_map_id == self.test_map.id).delete()
            self.db.query(MindMap).filter(MindMap.id == self.test_map.id).delete()
            self.db.query(Project).filter(Project.id == self.test_project.id).delete()
            self.db.query(User).filter(User.id == self.test_user.id).delete()
            self.db.commit()
        except Exception:
            self.db.rollback()
        finally:
            self.db.close()

    def test_configuration_guard(self):
        """Verify is_configured check and exception when credentials missing."""
        with patch.object(settings, "MINDMEISTER_CLIENT_ID", ""):
            self.assertFalse(self.service.is_configured())
            with self.assertRaises(MindMeisterConfigError):
                self.service.get_authorization_url("state123")

    def test_get_authorization_url(self):
        """Verify OAuth 2.0 authorization URL format and parameters."""
        with patch.object(settings, "MINDMEISTER_CLIENT_ID", "test_client_id_999"):
            with patch.object(settings, "MINDMEISTER_CLIENT_SECRET", "test_secret_999"):
                with patch.object(settings, "MINDMEISTER_REDIRECT_URI", "http://127.0.0.1:8000/api/v1/integrations/mindmeister/callback"):
                    url = self.service.get_authorization_url("my_test_state")
                    self.assertTrue(url.startswith(MINDMEISTER_AUTH_URL))
                    self.assertIn("client_id=test_client_id_999", url)
                    self.assertIn("response_type=code", url)
                    self.assertIn("state=my_test_state", url)
                    self.assertIn("scope=userinfo.profile", url)

    @patch("requests.get")
    @patch("requests.post")
    def test_exchange_code_and_persistence(self, mock_post, mock_get):
        """Verify token exchange, profile query, and UserIntegration database storage."""
        # Mock token exchange response
        mock_token_resp = MagicMock()
        mock_token_resp.status_code = 200
        mock_token_resp.json.return_value = {
            "access_token": "mm_token_abc123",
            "refresh_token": "mm_refresh_xyz789",
            "token_type": "Bearer",
            "expires_in": 7200,
            "scope": "userinfo.profile userinfo.email mindmeister",
        }
        mock_post.return_value = mock_token_resp

        # Mock user profile response
        mock_user_resp = MagicMock()
        mock_user_resp.status_code = 200
        mock_user_resp.json.return_value = {
            "id": 1234567,
            "name": "Mind Meister Specialist",
            "email": "specialist@example.com",
        }
        mock_get.return_value = mock_user_resp

        with patch.object(settings, "MINDMEISTER_CLIENT_ID", "client_123"):
            with patch.object(settings, "MINDMEISTER_CLIENT_SECRET", "secret_456"):
                integration = self.service.exchange_code("sample_auth_code", self.test_user.id)

        self.assertIsNotNone(integration)
        self.assertEqual(integration.provider, "mindmeister")
        self.assertEqual(integration.access_token, "mm_token_abc123")
        self.assertEqual(integration.refresh_token, "mm_refresh_xyz789")
        self.assertEqual(integration.account_id, "1234567")
        self.assertEqual(integration.account_name, "Mind Meister Specialist")
        self.assertEqual(integration.account_email, "specialist@example.com")
        self.assertIsNotNone(integration.expires_at)

        # Check status helper
        status = self.service.get_integration_status(self.test_user.id)
        self.assertTrue(status["connected"])
        self.assertEqual(status["account_name"], "Mind Meister Specialist")
        self.assertEqual(status["account_email"], "specialist@example.com")

    @patch("requests.get")
    def test_list_maps_json(self, mock_get):
        """Verify list_maps parses MindMeister REST maps payload."""
        # Pre-seed integration
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="mindmeister",
            access_token="valid_access_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        self.db.add(integration)
        self.db.commit()

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "rsp": {
                "stat": "ok",
                "maps": {
                    "map": [
                        {
                            "id": "987654",
                            "title": "Cloud Architecture MindMap",
                            "modified": "2026-10-15 14:00:00",
                            "created": "2026-10-01 10:00:00",
                        },
                        {
                            "id": "987655",
                            "title": "Team Roadmap",
                            "modified": "2026-10-18 16:30:00",
                            "created": "2026-10-05 11:20:00",
                        },
                    ]
                },
            }
        }
        mock_get.return_value = mock_resp

        maps = self.service.list_maps(self.test_user.id)
        self.assertEqual(len(maps), 2)
        self.assertEqual(maps[0]["id"], "987654")
        self.assertEqual(maps[0]["title"], "Cloud Architecture MindMap")
        self.assertEqual(maps[0]["web_url"], "https://www.mindmeister.com/maps/show/987654")
        self.assertEqual(maps[1]["id"], "987655")

    @patch("requests.get")
    def test_list_maps_unauthorized(self, mock_get):
        """Verify list_maps handles 401 Unauthorized properly."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="mindmeister",
            access_token="expired_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        self.db.add(integration)
        self.db.commit()

        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Invalid or expired token"
        mock_get.return_value = mock_resp

        with self.assertRaises(MindMeisterAuthError):
            self.service.list_maps(self.test_user.id)

    @patch("requests.get")
    def test_import_map_freemind_format(self, mock_get):
        """Verify import_map parses MindMeister FreeMind export format and populates mind map."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="mindmeister",
            access_token="valid_access_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        self.db.add(integration)
        self.db.commit()

        # Metadata response
        meta_resp = MagicMock()
        meta_resp.status_code = 200
        meta_resp.json.return_value = {"title": "Sprint Planning Map"}

        # FreeMind XML file response
        freemind_xml = """<map version="1.0.1">
            <node TEXT="Sprint 42 Goals">
                <node TEXT="Deliver MindMeister Sync"/>
                <node TEXT="Run Integration Tests"/>
            </node>
        </map>"""
        file_resp = MagicMock()
        file_resp.status_code = 200
        file_resp.content = freemind_xml.encode("utf-8")

        mock_get.side_effect = [meta_resp, file_resp]

        # Use an empty mind map for import
        empty_map = MindMap(
            id=uuid4(),
            title="Import Target Map",
            project_id=self.test_project.id,
        )
        self.db.add(empty_map)
        self.db.commit()

        result = self.service.import_map(self.test_user, empty_map.id, "987654")
        self.assertEqual(result["status"], "success")

        # Verify imported nodes exist in DB
        nodes = self.db.query(Node).filter(Node.mind_map_id == empty_map.id).all()
        node_labels = [n.label for n in nodes]
        self.assertIn("Sprint 42 Goals", node_labels)
        self.assertIn("Deliver MindMeister Sync", node_labels)
        self.assertIn("Run Integration Tests", node_labels)

        # Clean up
        self.db.query(Edge).filter(Edge.mind_map_id == empty_map.id).delete()
        self.db.query(Node).filter(Node.mind_map_id == empty_map.id).delete()
        self.db.query(MindMap).filter(MindMap.id == empty_map.id).delete()
        self.db.commit()

    @patch("requests.post")
    def test_export_map_to_mindmeister(self, mock_post):
        """Verify export_map converts map to FreeMind XML and uploads via mm.maps.import."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="mindmeister",
            access_token="valid_access_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        self.db.add(integration)
        self.db.commit()

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "rsp": {
                "stat": "ok",
                "map": {
                    "id": "555123",
                    "title": "Q4 Product Strategy",
                },
            }
        }
        mock_post.return_value = mock_resp

        result = self.service.export_map(self.test_user, self.test_map.id)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["mm_map_id"], "555123")
        self.assertEqual(result["web_url"], "https://www.mindmeister.com/maps/show/555123")

        # Verify requests.post was called with files containing FreeMind XML
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        self.assertIn("files", kwargs)
        file_tuple = kwargs["files"]["file"]
        self.assertTrue(file_tuple[0].endswith(".mm"))
        self.assertIn(b"Product Strategy 2026", file_tuple[1])

    @patch("requests.post")
    def test_disconnect_and_revocation(self, mock_post):
        """Verify disconnect revokes token remotely and deletes local DB integration record."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="mindmeister",
            access_token="token_to_revoke",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        self.db.add(integration)
        self.db.commit()

        mock_post.return_value.status_code = 200

        with patch.object(settings, "MINDMEISTER_CLIENT_ID", "client_123"):
            with patch.object(settings, "MINDMEISTER_CLIENT_SECRET", "secret_456"):
                success = self.service.disconnect(self.test_user.id)

        self.assertTrue(success)
        mock_post.assert_called_once()

        # Database record should be gone
        status = self.service.get_integration_status(self.test_user.id)
        self.assertFalse(status["connected"])


class TestMindMeisterEndpoints(unittest.TestCase):
    def setUp(self):
        from fastapi.testclient import TestClient
        from app.main import app
        from app.dependencies.auth import get_current_user

        self.db = SessionLocal()
        self.test_user = User(
            id=uuid4(),
            email=f"mm_api_{uuid4().hex[:8]}@example.com",
            password_hash="hashed_test_password",
            full_name="Endpoint Tester",
            is_active=True,
        )
        self.db.add(self.test_user)
        self.db.flush()

        self.test_project = Project(
            id=uuid4(),
            title="Endpoint Project",
            description="Testing Endpoints",
            user_id=self.test_user.id,
        )
        self.db.add(self.test_project)
        self.db.flush()

        self.test_map = MindMap(
            id=uuid4(),
            title="Endpoint Map",
            project_id=self.test_project.id,
        )
        self.db.add(self.test_map)
        self.db.flush()

        root = Node(
            id=uuid4(),
            mind_map_id=self.test_map.id,
            label="Root Node",
            type="central_idea",
            position_x=0.0,
            position_y=0.0,
            importance_score=1.0,
        )
        self.db.add(root)
        self.db.commit()

        # Override current_user
        app.dependency_overrides[get_current_user] = lambda: self.test_user
        self.client = TestClient(app)

    def tearDown(self):
        from app.main import app
        from app.dependencies.auth import get_current_user
        app.dependency_overrides.pop(get_current_user, None)

        try:
            self.db.query(UserIntegration).filter(UserIntegration.user_id == self.test_user.id).delete()
            self.db.query(Node).filter(Node.mind_map_id == self.test_map.id).delete()
            self.db.query(MindMap).filter(MindMap.id == self.test_map.id).delete()
            self.db.query(Project).filter(Project.id == self.test_project.id).delete()
            self.db.query(User).filter(User.id == self.test_user.id).delete()
            self.db.commit()
        except Exception:
            self.db.rollback()
        finally:
            self.db.close()

    def test_status_endpoint(self):
        res = self.client.get("/api/v1/integrations/mindmeister/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["provider"], "mindmeister")
        self.assertFalse(data["connected"])

    def test_auth_url_endpoint_unconfigured(self):
        with patch.object(settings, "MINDMEISTER_CLIENT_ID", ""):
            res = self.client.get("/api/v1/integrations/mindmeister/auth-url")
            self.assertEqual(res.status_code, 400)
            self.assertIn("not configured", res.json()["detail"])

    def test_auth_url_endpoint_configured(self):
        with patch.object(settings, "MINDMEISTER_CLIENT_ID", "dummy_client"):
            with patch.object(settings, "MINDMEISTER_CLIENT_SECRET", "dummy_secret"):
                res = self.client.get("/api/v1/integrations/mindmeister/auth-url")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertTrue(data["configured"])
                self.assertIn("oauth2/authorize", data["auth_url"])

    def test_callback_endpoint_error(self):
        res = self.client.get("/api/v1/integrations/mindmeister/callback?error=access_denied&error_description=User+denied+access")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Connection Failed", res.text)
        self.assertIn("User denied access", res.text)

    def test_callback_endpoint_missing_params(self):
        res = self.client.get("/api/v1/integrations/mindmeister/callback")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Missing Code or State", res.text)

    @patch("app.services.mindmeister_service.MindMeisterService.exchange_code")
    def test_callback_endpoint_success(self, mock_exchange):
        mock_integration = MagicMock()
        mock_integration.account_name = "Tested User"
        mock_exchange.return_value = mock_integration

        res = self.client.get(f"/api/v1/integrations/mindmeister/callback?code=mock_code&state={self.test_user.id}:random_nonce")
        self.assertEqual(res.status_code, 200)
        self.assertIn("MindMeister Connected!", res.text)
        self.assertIn("MINDMEISTER_CONNECTED", res.text)

    def test_disconnect_endpoint(self):
        res = self.client.post("/api/v1/integrations/mindmeister/disconnect")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "not_connected")


if __name__ == "__main__":
    unittest.main()

