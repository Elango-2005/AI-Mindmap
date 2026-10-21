import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NotificationPreference(Base):
    """
    User notification preferences model.
    Decoupled from notifications to allow per-user customization
    across delivery channels and event categories.
    """

    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Delivery Channels
    in_app_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Toggle in-app notification popover and badge",
    )

    email_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Toggle email notifications (enabled when provider configured)",
    )

    # Event Categories
    collaboration_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Invitations, sharing, and collaboration updates",
    )

    ai_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="AI generation, expansion, and suggestion completions",
    )

    project_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Important project and map activity",
    )

    export_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Export completion and failures",
    )

    account_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Account and security notices (critical alerts remain non-disableable in service layer)",
    )

    # Email delivery cadence
    email_frequency: Mapped[str] = mapped_column(
        String(50),
        default="important",
        nullable=False,
        doc="'important', 'all', or 'digest'",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="notification_preferences",
    )

    def __repr__(self):
        return f"<NotificationPreference(user_id='{self.user_id}', in_app={self.in_app_enabled}, email={self.email_enabled})>"
