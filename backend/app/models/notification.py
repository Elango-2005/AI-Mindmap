import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Notification(Base):
    """
    Persistent notification model for MindVault users.
    Optimized for retrieving latest and unread notifications efficiently.
    """

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Specific event type, e.g. collaboration_invite, map_shared, ai_completed, export_completed, security_alert",
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="High-level category: collaboration, ai, project, export, account, system",
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    entity_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="Related entity type: mind_map, project, export, user, etc.",
    )

    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )

    mind_map_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mind_maps.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        doc="Additional contextual metadata such as custom route link, actor details, etc.",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="notifications",
    )

    project = relationship(
        "Project",
        foreign_keys=[project_id],
    )

    mind_map = relationship(
        "MindMap",
        foreign_keys=[mind_map_id],
    )

    __table_args__ = (
        Index("idx_notifications_user_unread", "user_id", "is_read", "created_at"),
        Index("idx_notifications_user_created", "user_id", "created_at"),
    )

    def __repr__(self):
        return f"<Notification(id='{self.id}', user_id='{self.user_id}', type='{self.type}', is_read={self.is_read})>"
