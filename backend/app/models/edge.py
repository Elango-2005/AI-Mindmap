import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Edge(Base):
    """
    Edge model for storing connections between mind map nodes.
    """

    __tablename__ = "edges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    mind_map_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mind_maps.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
    )

    target: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
    )

    label: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        default="default",
        nullable=False,
    )

    animated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
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

    mind_map = relationship(
        "MindMap",
        back_populates="edges",
    )

    source_node = relationship(
        "Node",
        foreign_keys=[source],
        back_populates="outgoing_edges",
    )

    target_node = relationship(
        "Node",
        foreign_keys=[target],
        back_populates="incoming_edges",
    )

    def __repr__(self):
        return f"<Edge(source='{self.source}', target='{self.target}')>"