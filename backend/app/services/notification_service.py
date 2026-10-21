import asyncio
import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.repositories.notification_repository import (
    NotificationPreferenceRepository,
    NotificationRepository,
)
from app.schemas.notification import (
    NotificationCategory,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationResponse,
    NotificationType,
)
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Centralized Notification Service for MindVault.
    Handles preference filtering, persistence, and real-time delivery channels.
    """

    def __init__(self, repo: NotificationRepository, pref_repo: NotificationPreferenceRepository):
        self.repo = repo
        self.pref_repo = pref_repo

    def is_email_provider_configured(self) -> bool:
        """
        Check if an official email provider (SMTP/SendGrid/SES) is configured.
        Current backend has no provider configured.
        """
        return False

    def create_notification(
        self,
        user_id: UUID,
        type: str,
        category: str,
        title: str,
        message: str,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        project_id: UUID | None = None,
        mind_map_id: UUID | None = None,
        extra_metadata: dict[str, Any] | None = None,
    ) -> Notification | None:
        """
        Create and persist a notification after evaluating user preferences.
        Broadcasts via real-time WebSocket if user has active sessions.
        """
        # 1. Fetch or initialize user preferences
        prefs = self.pref_repo.get_or_create(user_id)

        # 2. Check if in-app notifications are enabled
        # Critical security alerts always bypass general in-app disablement
        is_critical_security = (type == NotificationType.SECURITY_ALERT)

        if not prefs.in_app_enabled and not is_critical_security:
            logger.info(f"Notification suppressed for user {user_id}: in-app notifications disabled.")
            return None

        # 3. Check category preferences
        if category == NotificationCategory.COLLABORATION and not prefs.collaboration_enabled:
            logger.info(f"Collaboration notification suppressed for user {user_id} by preference.")
            return None
        elif category == NotificationCategory.AI and not prefs.ai_enabled:
            logger.info(f"AI notification suppressed for user {user_id} by preference.")
            return None
        elif category == NotificationCategory.PROJECT and not prefs.project_enabled:
            logger.info(f"Project notification suppressed for user {user_id} by preference.")
            return None
        elif category == NotificationCategory.EXPORT and not prefs.export_enabled:
            logger.info(f"Export notification suppressed for user {user_id} by preference.")
            return None
        elif category == NotificationCategory.ACCOUNT and not prefs.account_enabled and not is_critical_security:
            logger.info(f"Account notification suppressed for user {user_id} by preference.")
            return None

        # 4. Persist notification
        notification = Notification(
            user_id=user_id,
            type=type,
            category=category,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            project_id=project_id,
            mind_map_id=mind_map_id,
            extra_metadata=extra_metadata,
            is_read=False,
        )
        saved = self.repo.create(notification)

        # 5. Broadcast in real time via WebSocket
        self._push_realtime(saved)

        # 6. Check Email Channel (No provider configured currently)
        if prefs.email_enabled and not self.is_email_provider_configured():
            logger.debug(
                f"Email notification for user {user_id} queued but skipped: no email provider configured."
            )

        return saved

    def _push_realtime(self, notification: Notification) -> None:
        """
        Broadcasts notification payload to user's active WebSocket sessions.
        """
        payload = {
            "type": "new_notification",
            "notification": {
                "id": str(notification.id),
                "user_id": str(notification.user_id),
                "type": notification.type,
                "category": notification.category,
                "title": notification.title,
                "message": notification.message,
                "entity_type": notification.entity_type,
                "entity_id": str(notification.entity_id) if notification.entity_id else None,
                "project_id": str(notification.project_id) if notification.project_id else None,
                "mind_map_id": str(notification.mind_map_id) if notification.mind_map_id else None,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
                "extra_metadata": notification.extra_metadata,
                "link": f"/workspace/{notification.mind_map_id}" if notification.mind_map_id else (
                    "/projects" if notification.project_id else None
                ),
            },
        }

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast_to_user(notification.user_id, payload))
        except RuntimeError:
            # No running event loop in thread; run in ad-hoc loop or pass
            try:
                asyncio.run(manager.broadcast_to_user(notification.user_id, payload))
            except Exception as e:
                logger.warning(f"Failed to push realtime notification: {e}")
        except Exception as e:
            logger.warning(f"Error scheduling realtime notification: {e}")

    def get_user_notifications(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False,
        category: str | None = None,
    ) -> tuple[list[Notification], int]:
        return self.repo.get_user_notifications(
            user_id=user_id,
            limit=limit,
            offset=offset,
            unread_only=unread_only,
            category=category,
        )

    def get_unread_count(self, user_id: UUID) -> int:
        return self.repo.get_unread_count(user_id)

    def mark_as_read(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        return self.repo.mark_as_read(notification_id, user_id)

    def mark_all_as_read(self, user_id: UUID) -> int:
        return self.repo.mark_all_as_read(user_id)

    def delete_notification(self, notification_id: UUID, user_id: UUID) -> bool:
        return self.repo.delete(notification_id, user_id)

    def get_preferences(self, user_id: UUID) -> NotificationPreferenceResponse:
        prefs = self.pref_repo.get_or_create(user_id)
        resp = NotificationPreferenceResponse.model_validate(prefs)
        resp.email_provider_configured = self.is_email_provider_configured()
        return resp

    def update_preferences(
        self, user_id: UUID, updates: NotificationPreferenceUpdate
    ) -> NotificationPreferenceResponse:
        data = updates.model_dump(exclude_unset=True)
        # Security rule: account_enabled critical alerts should not be turned off completely
        # but if user sets account_enabled=False, we store it and service layer still allows critical security
        updated = self.pref_repo.update(user_id, data)
        resp = NotificationPreferenceResponse.model_validate(updated)
        resp.email_provider_configured = self.is_email_provider_configured()
        return resp
