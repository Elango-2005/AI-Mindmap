import uuid
import unittest
from fastapi.testclient import TestClient
from jose import jwt

from app.main import app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.mind_map import MindMap
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference


class TestNotificationEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        self.user_a = User(
            id=uuid.uuid4(),
            full_name="User Alpha",
            email=f"alpha_api_{uuid.uuid4().hex[:8]}@example.com",
            password_hash="fakehash",
        )
        self.user_b = User(
            id=uuid.uuid4(),
            full_name="User Beta",
            email=f"beta_api_{uuid.uuid4().hex[:8]}@example.com",
            password_hash="fakehash",
        )
        self.db.add_all([self.user_a, self.user_b])
        self.db.commit()

        self.project_a = Project(
            id=uuid.uuid4(),
            user_id=self.user_a.id,
            title="Project A",
        )
        self.db.add(self.project_a)
        self.db.commit()

        self.mind_map_a = MindMap(
            id=uuid.uuid4(),
            project_id=self.project_a.id,
            title="Shared Architecture",
        )
        self.db.add(self.mind_map_a)
        self.db.commit()

        # Generate JWT tokens
        self.token_a = jwt.encode({"sub": str(self.user_a.id)}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        self.token_b = jwt.encode({"sub": str(self.user_b.id)}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def tearDown(self):
        try:
            self.db.query(Notification).filter(
                Notification.user_id.in_([self.user_a.id, self.user_b.id])
            ).delete(synchronize_session=False)
            self.db.query(NotificationPreference).filter(
                NotificationPreference.user_id.in_([self.user_a.id, self.user_b.id])
            ).delete(synchronize_session=False)
            self.db.query(MindMap).filter(MindMap.id == self.mind_map_a.id).delete(synchronize_session=False)
            self.db.query(Project).filter(Project.id == self.project_a.id).delete(synchronize_session=False)
            self.db.query(User).filter(User.id.in_([self.user_a.id, self.user_b.id])).delete(synchronize_session=False)
            self.db.commit()
        except Exception:
            self.db.rollback()
        finally:
            self.db.close()

    def test_share_mind_map_and_verify_notification_received(self):
        """User A shares a map with User B. User B receives the notification and can read it."""
        # User A shares map with User B
        res = self.client.post(
            f"/api/v1/mind-maps/{self.mind_map_a.id}/share",
            headers={"Authorization": f"Bearer {self.token_a}"},
            json={"email": self.user_b.email, "role": "editor"},
        )
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertTrue(data["success"])

        # User B checks unread count
        res_count = self.client.get(
            "/api/v1/notifications/unread-count",
            headers={"Authorization": f"Bearer {self.token_b}"},
        )
        self.assertEqual(res_count.status_code, 200)
        self.assertEqual(res_count.json()["unread_count"], 1)

        # User B fetches notifications
        res_list = self.client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {self.token_b}"},
        )
        self.assertEqual(res_list.status_code, 200)
        notifs = res_list.json()["items"]
        self.assertEqual(len(notifs), 1)
        self.assertEqual(notifs[0]["category"], "collaboration")
        self.assertIn("User Alpha shared a mind map", notifs[0]["title"])
        self.assertEqual(notifs[0]["link"], f"/workspace/{self.mind_map_a.id}")

        # User B marks notification as read
        notif_id = notifs[0]["id"]
        res_read = self.client.patch(
            f"/api/v1/notifications/{notif_id}/read",
            headers={"Authorization": f"Bearer {self.token_b}"},
        )
        self.assertEqual(res_read.status_code, 200)
        self.assertTrue(res_read.json()["is_read"])

    def test_preferences_api_roundtrip(self):
        """Verify GET and PATCH /api/v1/notifications/preferences."""
        # Get defaults
        res = self.client.get(
            "/api/v1/notifications/preferences",
            headers={"Authorization": f"Bearer {self.token_a}"},
        )
        self.assertEqual(res.status_code, 200)
        prefs = res.json()
        self.assertTrue(prefs["ai_enabled"])
        self.assertFalse(prefs["email_provider_configured"])

        # Update preferences
        res_patch = self.client.patch(
            "/api/v1/notifications/preferences",
            headers={"Authorization": f"Bearer {self.token_a}"},
            json={"ai_enabled": False, "email_frequency": "all"},
        )
        self.assertEqual(res_patch.status_code, 200)
        updated = res_patch.json()
        self.assertFalse(updated["ai_enabled"])
        self.assertEqual(updated["email_frequency"], "all")


if __name__ == "__main__":
    unittest.main()
