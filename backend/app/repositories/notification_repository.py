from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference


class NotificationRepository:
    """
    Repository for Notification database access.
    Optimized for indexed user queries, unread filtering, and batch updates.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_by_id(self, notification_id: UUID) -> Notification | None:
        return (
            self.db.query(Notification)
            .filter(Notification.id == notification_id)
            .first()
        )

    def get_user_notifications(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
        category: str | None = None,
    ) -> tuple[list[Notification], int]:
        query = self.db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read.is_(False))

        if category:
            query = query.filter(Notification.category == category)

        total = query.count()
        items = (
            query.order_by(desc(Notification.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    def get_unread_count(self, user_id: UUID) -> int:
        return (
            self.db.query(func.count(Notification.id))
            .filter(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .scalar()
            or 0
        )

    def mark_as_read(
        self, notification_id: UUID, user_id: UUID
    ) -> Notification | None:
        notification = (
            self.db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id: UUID) -> int:
        updated_count = (
            self.db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .update(
                {
                    Notification.is_read: True,
                    Notification.read_at: datetime.utcnow(),
                },
                synchronize_session="fetch",
            )
        )
        self.db.commit()
        return updated_count

    def delete(self, notification_id: UUID, user_id: UUID) -> bool:
        notification = (
            self.db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        return False


class NotificationPreferenceRepository:
    """
    Repository for User Notification Preferences.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: UUID) -> NotificationPreference | None:
        return (
            self.db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == user_id)
            .first()
        )

    def create_default(self, user_id: UUID) -> NotificationPreference:
        pref = NotificationPreference(
            user_id=user_id,
            in_app_enabled=True,
            email_enabled=True,
            collaboration_enabled=True,
            ai_enabled=True,
            project_enabled=True,
            export_enabled=True,
            account_enabled=True,
            email_frequency="important",
        )
        self.db.add(pref)
        self.db.commit()
        self.db.refresh(pref)
        return pref

    def get_or_create(self, user_id: UUID) -> NotificationPreference:
        pref = self.get_by_user_id(user_id)
        if not pref:
            pref = self.create_default(user_id)
        return pref

    def update(
        self, user_id: UUID, update_data: dict
    ) -> NotificationPreference:
        pref = self.get_or_create(user_id)
        for key, value in update_data.items():
            if value is not None and hasattr(pref, key):
                setattr(pref, key, value)
        pref.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(pref)
        return pref
