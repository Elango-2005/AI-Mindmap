from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field


class NotificationCategory:
    COLLABORATION = "collaboration"
    AI = "ai"
    PROJECT = "project"
    EXPORT = "export"
    ACCOUNT = "account"
    SYSTEM = "system"


class NotificationType:
    COLLABORATION_INVITE = "collaboration_invite"
    MAP_SHARED = "map_shared"
    PROJECT_INVITATION = "project_invitation"
    AI_COMPLETED = "ai_completed"
    AI_SUGGESTION = "ai_suggestion"
    PROJECT_ACTIVITY = "project_activity"
    EXPORT_COMPLETED = "export_completed"
    EXPORT_FAILED = "export_failed"
    SECURITY_ALERT = "security_alert"
    SYSTEM_NOTICE = "system_notice"


class NotificationBase(BaseModel):
    type: str
    category: str
    title: str
    message: str
    entity_type: str | None = None
    entity_id: UUID | None = None
    project_id: UUID | None = None
    mind_map_id: UUID | None = None
    extra_metadata: dict[str, Any] | None = None


class NotificationCreate(NotificationBase):
    user_id: UUID


class NotificationResponse(NotificationBase):
    id: UUID
    user_id: UUID
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime

    @computed_field
    @property
    def link(self) -> str | None:
        """
        Computes the target route link for contextual navigation in the UI.
        """
        # Custom link provided in extra_metadata overrides defaults
        if self.extra_metadata and "link" in self.extra_metadata:
            return self.extra_metadata["link"]
        if self.mind_map_id:
            return f"/workspace/{self.mind_map_id}"
        if self.project_id:
            return f"/projects"
        if self.category == NotificationCategory.ACCOUNT:
            return "/settings"
        return None

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPreferenceResponse(BaseModel):
    in_app_enabled: bool
    email_enabled: bool
    collaboration_enabled: bool
    ai_enabled: bool
    project_enabled: bool
    export_enabled: bool
    account_enabled: bool
    email_frequency: str
    email_provider_configured: bool = False

    model_config = ConfigDict(from_attributes=True)


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: bool | None = None
    email_enabled: bool | None = None
    collaboration_enabled: bool | None = None
    ai_enabled: bool | None = None
    project_enabled: bool | None = None
    export_enabled: bool | None = None
    account_enabled: bool | None = None
    email_frequency: str | None = Field(default=None, pattern="^(important|all|digest)$")
