import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.edge import Edge
from app.models.mind_map import MindMap
from app.models.node import Node
from app.models.project import Project
from app.models.user import User
from app.models.user_integration import UserIntegration
from app.services.coggle_service import (
    COGGLE_API_URL,
    COGGLE_AUTH_URL,
    COGGLE_TOKEN_URL,
    CoggleAPIError,
    CoggleAuthError,
    CoggleConfigError,
    CoggleService,
)


class TestCoggleIntegration(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

        # Create test user
        self.test_user = User(
            id=uuid4(),
            email=f"coggle_test_{uuid4().hex[:8]}@example.com",
            password_hash="hashed_test_password",
            full_name="Coggle Test User",
            is_active=True,
        )
        self.db.add(self.test_user)
        self.db.flush()

        # Create test project
        self.test_project = Project(
            id=uuid4(),
            title="Coggle Integration Project",
            description="Testing Coggle cloud integration",
            user_id=self.test_user.id,
        )
        self.db.add(self.test_project)
        self.db.flush()

        # Create test mind map
        self.test_map = MindMap(
            id=uuid4(),
            title="AI Strategic Initiatives",
            project_id=self.test_project.id,
        )
        self.db.add(self.test_map)
        self.db.flush()

        # Create root and child nodes
        self.root_node = Node(
            id=uuid4(),
            mind_map_id=self.test_map.id,
            label="Strategic Initiatives 2026",
            type="central_idea",
            position_x=0.0,
            position_y=0.0,
            importance_score=1.0,
        )
        self.child_node = Node(
            id=uuid4(),
            mind_map_id=self.test_map.id,
            label="Cloud Knowledge Graphs",
            type="main_branch",
            position_x=200.0,
            position_y=100.0,
            importance_score=0.9,
        )
        self.db.add(self.root_node)
        self.db.add(self.child_node)
        self.db.flush()

        self.test_edge = Edge(
            id=uuid4(),
            mind_map_id=self.test_map.id,
            source=self.root_node.id,
            target=self.child_node.id,
            label="relates_to",
        )
        self.db.add(self.test_edge)
        self.db.commit()

        self.service = CoggleService(self.db)

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
        with patch.object(settings, "COGGLE_CLIENT_ID", ""):
            self.assertFalse(self.service.is_configured())
            with self.assertRaises(CoggleConfigError):
                self.service.get_authorization_url("state_abc")

    def test_get_authorization_url(self):
        """Verify official Coggle OAuth 2.0 authorization URL format and parameters."""
        with patch.object(settings, "COGGLE_CLIENT_ID", "cog_client_123"):
            with patch.object(settings, "COGGLE_CLIENT_SECRET", "cog_secret_456"):
                with patch.object(settings, "COGGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/v1/integrations/coggle/callback"):
                    url = self.service.get_authorization_url("state_xyz")
                    self.assertTrue(url.startswith(COGGLE_AUTH_URL))
                    self.assertIn("client_id=cog_client_123", url)
                    self.assertIn("response_type=code", url)
                    self.assertIn("state=state_xyz", url)
                    self.assertIn("scope=read+write", url)

    @patch("requests.post")
    def test_exchange_code_and_persistence(self, mock_post):
        """Verify token exchange and UserIntegration database storage."""
        mock_token_resp = MagicMock()
        mock_token_resp.status_code = 200
        mock_token_resp.json.return_value = {
            "access_token": "coggle_token_secret_999",
            "token_type": "Bearer",
            "scope": "read write",
            "username": "Coggle Power User",
            "email": "coggle_user@example.com",
            "expires_in": 86400,
        }
        mock_post.return_value = mock_token_resp

        with patch.object(settings, "COGGLE_CLIENT_ID", "cog_client_123"):
            with patch.object(settings, "COGGLE_CLIENT_SECRET", "cog_secret_456"):
                integration = self.service.exchange_code("mock_coggle_code", self.test_user.id)

        self.assertIsNotNone(integration)
        self.assertEqual(integration.provider, "coggle")
        self.assertEqual(integration.access_token, "coggle_token_secret_999")
        self.assertEqual(integration.account_name, "Coggle Power User")
        self.assertEqual(integration.account_email, "coggle_user@example.com")
        self.assertIsNotNone(integration.expires_at)

        # Verify status
        status = self.service.get_integration_status(self.test_user.id)
        self.assertTrue(status["connected"])
        self.assertEqual(status["provider"], "coggle")
        self.assertEqual(status["account_name"], "Coggle Power User")

    @patch("requests.get")
    def test_list_diagrams(self, mock_get):
        """Verify listing Coggle diagrams via GET /api/1/diagrams."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="coggle",
            access_token="valid_coggle_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        self.db.add(integration)
        self.db.commit()

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {
                "_id": "60d5ec49e29a3e2130e980ef",
                "title": "Quarterly OKRs",
                "updated": "2026-10-18T10:00:00.000Z",
            },
            {
                "_id": "60d5ec49e29a3e2130e980f0",
                "title": "Engineering Roadmap",
                "updated": "2026-10-19T14:30:00.000Z",
            },
        ]
        mock_get.return_value = mock_resp

        diagrams = self.service.list_diagrams(self.test_user.id)
        self.assertEqual(len(diagrams), 2)
        self.assertEqual(diagrams[0]["id"], "60d5ec49e29a3e2130e980ef")
        self.assertEqual(diagrams[0]["title"], "Quarterly OKRs")
        self.assertEqual(diagrams[0]["web_url"], "https://coggle.it/diagram/60d5ec49e29a3e2130e980ef")

    @patch("requests.get")
    def test_list_diagrams_unauthorized(self, mock_get):
        """Verify list_diagrams handles 401 Unauthorized properly."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="coggle",
            access_token="invalid_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        self.db.add(integration)
        self.db.commit()

        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized"
        mock_get.return_value = mock_resp

        with self.assertRaises(CoggleAuthError):
            self.service.list_diagrams(self.test_user.id)

    @patch("requests.get")
    def test_import_diagram(self, mock_get):
        """Verify importing a Coggle diagram into MindVault nodes and edges."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="coggle",
            access_token="valid_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        self.db.add(integration)
        self.db.commit()

        # Metadata response
        meta_resp = MagicMock()
        meta_resp.status_code = 200
        meta_resp.json.return_value = {"_id": "coggle_111", "title": "Coggle Product Map"}

        # Node tree response
        nodes_resp = MagicMock()
        nodes_resp.status_code = 200
        nodes_resp.json.return_value = [
            {
                "_id": "root_1",
                "text": "Product Launch",
                "children": [
                    {
                        "_id": "child_1",
                        "text": "Market Analysis",
                        "children": [
                            {"_id": "sub_1", "text": "Competitor Breakdown", "children": []}
                        ],
                    },
                    {
                        "_id": "child_2",
                        "text": "Technical Delivery",
                        "children": [],
                    },
                ],
            }
        ]

        mock_get.side_effect = [meta_resp, nodes_resp]

        empty_map = MindMap(
            id=uuid4(),
            title="New Import Map",
            project_id=self.test_project.id,
        )
        self.db.add(empty_map)
        self.db.commit()

        result = self.service.import_diagram(self.test_user, empty_map.id, "coggle_111")
        self.assertEqual(result["status"], "success")

        # Verify created nodes in MindVault database
        nodes = self.db.query(Node).filter(Node.mind_map_id == empty_map.id).all()
        labels = [n.label for n in nodes]
        self.assertIn("Product Launch", labels)
        self.assertIn("Market Analysis", labels)
        self.assertIn("Competitor Breakdown", labels)
        self.assertIn("Technical Delivery", labels)

        # Cleanup
        self.db.query(Edge).filter(Edge.mind_map_id == empty_map.id).delete()
        self.db.query(Node).filter(Node.mind_map_id == empty_map.id).delete()
        self.db.query(MindMap).filter(MindMap.id == empty_map.id).delete()
        self.db.commit()

    @patch("requests.post")
    @patch("requests.get")
    def test_export_diagram(self, mock_get, mock_post):
        """Verify exporting a MindVault map to Coggle."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="coggle",
            access_token="valid_token",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        self.db.add(integration)
        self.db.commit()

        # Mock diagram creation response: POST /api/1/diagrams
        create_resp = MagicMock()
        create_resp.status_code = 201
        create_resp.json.return_value = {
            "_id": "coggle_created_999",
            "title": "AI Strategic Initiatives",
        }

        # Mock child node creation response: POST /api/1/diagrams/:diagram/nodes
        child_resp = MagicMock()
        child_resp.status_code = 201
        child_resp.json.return_value = {
            "_id": "child_coggle_node_1",
            "text": "Cloud Knowledge Graphs",
        }

        mock_post.side_effect = [create_resp, child_resp]

        # Mock node tree response: GET /api/1/diagrams/:diagram/nodes
        nodes_resp = MagicMock()
        nodes_resp.status_code = 200
        nodes_resp.json.return_value = [
            {"_id": "root_coggle_node_0", "text": "Strategic Initiatives 2026"}
        ]
        mock_get.return_value = nodes_resp

        result = self.service.export_diagram(self.test_user, self.test_map.id)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["coggle_diagram_id"], "coggle_created_999")
        self.assertEqual(result["web_url"], "https://coggle.it/diagram/coggle_created_999")

    def test_disconnect(self):
        """Verify disconnect deletes Coggle integration record."""
        integration = UserIntegration(
            id=uuid4(),
            user_id=self.test_user.id,
            provider="coggle",
            access_token="token_to_remove",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        )
        self.db.add(integration)
        self.db.commit()

        success = self.service.disconnect(self.test_user.id)
        self.assertTrue(success)

        status = self.service.get_integration_status(self.test_user.id)
        self.assertFalse(status["connected"])


class TestCoggleEndpoints(unittest.TestCase):
    def setUp(self):
        from fastapi.testclient import TestClient
        from app.main import app
        from app.dependencies.auth import get_current_user

        self.db = SessionLocal()
        self.test_user = User(
            id=uuid4(),
            email=f"cog_endpoint_{uuid4().hex[:8]}@example.com",
            password_hash="hashed_test_password",
            full_name="Coggle Endpoint Tester",
            is_active=True,
        )
        self.db.add(self.test_user)
        self.db.flush()

        self.test_project = Project(
            id=uuid4(),
            title="Coggle Endpoint Project",
            description="Testing Coggle Endpoints",
            user_id=self.test_user.id,
        )
        self.db.add(self.test_project)
        self.db.flush()

        self.test_map = MindMap(
            id=uuid4(),
            title="Coggle Test Map",
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
        res = self.client.get("/api/v1/integrations/coggle/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["provider"], "coggle")
        self.assertFalse(data["connected"])

    def test_auth_url_endpoint_unconfigured(self):
        with patch.object(settings, "COGGLE_CLIENT_ID", ""):
            res = self.client.get("/api/v1/integrations/coggle/auth-url")
            self.assertEqual(res.status_code, 400)
            self.assertIn("not configured", res.json()["detail"])

    def test_auth_url_endpoint_configured(self):
        with patch.object(settings, "COGGLE_CLIENT_ID", "dummy_cog_client"):
            with patch.object(settings, "COGGLE_CLIENT_SECRET", "dummy_cog_secret"):
                res = self.client.get("/api/v1/integrations/coggle/auth-url")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertTrue(data["configured"])
                self.assertIn("dialog/authorize", data["auth_url"])

    def test_callback_endpoint_error(self):
        res = self.client.get("/api/v1/integrations/coggle/callback?error=access_denied&error_description=User+cancelled")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Connection Failed", res.text)
        self.assertIn("User cancelled", res.text)

    def test_callback_endpoint_missing_params(self):
        res = self.client.get("/api/v1/integrations/coggle/callback")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Missing Code or State", res.text)

    @patch("app.services.coggle_service.CoggleService.exchange_code")
    def test_callback_endpoint_success(self, mock_exchange):
        mock_integration = MagicMock()
        mock_integration.account_name = "Coggle Tester"
        mock_exchange.return_value = mock_integration

        res = self.client.get(f"/api/v1/integrations/coggle/callback?code=mock_code&state={self.test_user.id}:random_nonce")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Coggle Connected!", res.text)
        self.assertIn("COGGLE_CONNECTED", res.text)

    def test_disconnect_endpoint(self):
        res = self.client.post("/api/v1/integrations/coggle/disconnect")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "not_connected")


if __name__ == "__main__":
    unittest.main()
