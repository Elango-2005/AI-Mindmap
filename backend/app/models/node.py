import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Node(Base):
    """
    Node model for storing a mind map node.
    """

    __tablename__ = "nodes"

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

    label: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        default="default",
        nullable=False,
    )

    position_x: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    position_y: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
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
        back_populates="nodes",
    )

    outgoing_edges = relationship(
        "Edge",
        foreign_keys="Edge.source",
        back_populates="source_node",
        cascade="all, delete-orphan",
    )

    incoming_edges = relationship(
        "Edge",
        foreign_keys="Edge.target",
        back_populates="target_node",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self):
        return f"<Node(label='{self.label}')>"