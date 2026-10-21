import uuid
import unittest
from datetime import datetime

from app.db.session import SessionLocal
from app.models.user import User
from app.models.mind_map import MindMap
from app.models.project import Project
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.repositories.notification_repository import (
    NotificationRepository,
    NotificationPreferenceRepository,
)
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationCategory,
    NotificationType,
    NotificationPreferenceUpdate,
)


class TestNotificationSystem(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.repo = NotificationRepository(self.db)
        self.pref_repo = NotificationPreferenceRepository(self.db)
        self.service = NotificationService(self.repo, self.pref_repo)

        # Create two test users
        self.user_a = User(
            id=uuid.uuid4(),
            full_name="User Alpha",
            email=f"alpha_{uuid.uuid4().hex[:8]}@example.com",
            password_hash="fakehash",
        )
        self.user_b = User(
            id=uuid.uuid4(),
            full_name="User Beta",
            email=f"beta_{uuid.uuid4().hex[:8]}@example.com",
            password_hash="fakehash",
        )
        self.db.add_all([self.user_a, self.user_b])
        self.db.commit()

        # Create test project and mind map for User A
        self.project_a = Project(
            id=uuid.uuid4(),
            user_id=self.user_a.id,
            title="Alpha Project",
        )
        self.db.add(self.project_a)
        self.db.commit()

        self.mind_map_a = MindMap(
            id=uuid.uuid4(),
            project_id=self.project_a.id,
            title="Alpha Architecture Map",
        )
        self.db.add(self.mind_map_a)
        self.db.commit()

    def tearDown(self):
        # Clean up test records
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

    def test_default_preferences_creation(self):
        """Verify default preferences are properly initialized with sensible defaults."""
        prefs = self.service.get_preferences(self.user_a.id)
        self.assertTrue(prefs.in_app_enabled)
        self.assertTrue(prefs.email_enabled)
        self.assertTrue(prefs.collaboration_enabled)
        self.assertTrue(prefs.ai_enabled)
        self.assertTrue(prefs.project_enabled)
        self.assertTrue(prefs.export_enabled)
        self.assertTrue(prefs.account_enabled)
        self.assertEqual(prefs.email_frequency, "important")
        self.assertFalse(prefs.email_provider_configured)

    def test_create_and_fetch_notifications(self):
        """Verify creating notifications persists to database with correct relationships and link."""
        notif = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.AI_COMPLETED,
            category=NotificationCategory.AI,
            title="AI Expansion Finished",
            message="Expanded 5 nodes on 'Microservices'",
            mind_map_id=self.mind_map_a.id,
            project_id=self.project_a.id,
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.user_id, self.user_a.id)
        self.assertFalse(notif.is_read)

        # Fetch notifications
        items, total = self.service.get_user_notifications(self.user_a.id)
        self.assertEqual(total, 1)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].title, "AI Expansion Finished")

        # Check unread count
        count = self.service.get_unread_count(self.user_a.id)
        self.assertEqual(count, 1)

    def test_mark_as_read_and_mark_all_read(self):
        """Verify marking single notification and batch mark all read."""
        n1 = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.EXPORT_COMPLETED,
            category=NotificationCategory.EXPORT,
            title="Export 1",
            message="Exported PDF",
        )
        n2 = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.EXPORT_COMPLETED,
            category=NotificationCategory.EXPORT,
            title="Export 2",
            message="Exported XMind",
        )

        self.assertEqual(self.service.get_unread_count(self.user_a.id), 2)

        # Mark n1 as read
        updated_n1 = self.service.mark_as_read(n1.id, self.user_a.id)
        self.assertTrue(updated_n1.is_read)
        self.assertIsNotNone(updated_n1.read_at)
        self.assertEqual(self.service.get_unread_count(self.user_a.id), 1)

        # Mark all as read
        count_marked = self.service.mark_all_as_read(self.user_a.id)
        self.assertEqual(count_marked, 1)
        self.assertEqual(self.service.get_unread_count(self.user_a.id), 0)

    def test_user_isolation(self):
        """Ensure User B cannot see or manipulate User A's notifications."""
        notif_a = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.SECURITY_ALERT,
            category=NotificationCategory.ACCOUNT,
            title="Private Alert",
            message="Confidential alert for User A",
        )

        # User B should see 0 notifications
        items_b, total_b = self.service.get_user_notifications(self.user_b.id)
        self.assertEqual(total_b, 0)
        self.assertEqual(len(items_b), 0)
        self.assertEqual(self.service.get_unread_count(self.user_b.id), 0)

        # User B cannot mark User A's notification as read
        result = self.service.mark_as_read(notif_a.id, self.user_b.id)
        self.assertIsNone(result)

        # User B cannot delete User A's notification
        deleted = self.service.delete_notification(notif_a.id, self.user_b.id)
        self.assertFalse(deleted)

    def test_preference_filtering_collaboration(self):
        """When collaboration notifications are disabled, collaboration events are suppressed."""
        self.service.update_preferences(
            self.user_a.id,
            NotificationPreferenceUpdate(collaboration_enabled=False),
        )

        notif = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.MAP_SHARED,
            category=NotificationCategory.COLLABORATION,
            title="Collaboration Invitation",
            message="User B invited you",
        )
        self.assertIsNone(notif)
        self.assertEqual(self.service.get_unread_count(self.user_a.id), 0)

    def test_preference_filtering_export(self):
        """When export notifications are disabled, export events are suppressed."""
        self.service.update_preferences(
            self.user_a.id,
            NotificationPreferenceUpdate(export_enabled=False),
        )

        notif = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.EXPORT_COMPLETED,
            category=NotificationCategory.EXPORT,
            title="Export Done",
            message="File exported",
        )
        self.assertIsNone(notif)
        self.assertEqual(self.service.get_unread_count(self.user_a.id), 0)

    def test_preference_in_app_disabled_allows_critical_security(self):
        """When in-app notifications are toggled off, general notices are suppressed, but critical security alerts bypass and deliver."""
        self.service.update_preferences(
            self.user_a.id,
            NotificationPreferenceUpdate(in_app_enabled=False),
        )

        # General AI notification should be suppressed
        ai_notif = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.AI_COMPLETED,
            category=NotificationCategory.AI,
            title="AI Done",
            message="AI operation finished",
        )
        self.assertIsNone(ai_notif)

        # Critical security alert MUST deliver
        security_notif = self.service.create_notification(
            user_id=self.user_a.id,
            type=NotificationType.SECURITY_ALERT,
            category=NotificationCategory.ACCOUNT,
            title="New Sign-in Detected",
            message="Sign-in from unfamiliar IP",
        )
        self.assertIsNotNone(security_notif)
        self.assertEqual(self.service.get_unread_count(self.user_a.id), 1)

    def test_pagination_and_unread_filter(self):
        """Verify limit, offset, and unread_only filtering."""
        for i in range(5):
            self.service.create_notification(
                user_id=self.user_a.id,
                type=NotificationType.PROJECT_ACTIVITY,
                category=NotificationCategory.PROJECT,
                title=f"Activity {i}",
                message=f"Message {i}",
            )

        # Page 1: limit 2
        p1, total = self.service.get_user_notifications(self.user_a.id, limit=2, offset=0)
        self.assertEqual(total, 5)
        self.assertEqual(len(p1), 2)

        # Mark first notification as read
        self.service.mark_as_read(p1[0].id, self.user_a.id)

        # Unread only query
        unread_items, unread_total = self.service.get_user_notifications(
            self.user_a.id, unread_only=True
        )
        self.assertEqual(unread_total, 4)
        self.assertEqual(len(unread_items), 4)


if __name__ == "__main__":
    unittest.main()
