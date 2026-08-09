from uuid import UUID

from sqlalchemy.orm import Session

from app.models.edge import Edge
from app.schemas.edge import EdgeCreate, EdgeUpdate


class EdgeRepository:
    """
    Repository for Edge database operations.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        mind_map_id: UUID,
        edge_data: EdgeCreate,
    ) -> Edge:
        """
        Create a new edge.
        """

        edge = Edge(
            mind_map_id=mind_map_id,
            source=edge_data.source,
            target=edge_data.target,
            label=edge_data.label,
            type=edge_data.type,
            animated=edge_data.animated,
        )

        self.db.add(edge)
        self.db.commit()
        self.db.refresh(edge)

        return edge

    def get_all_by_mind_map(
        self,
        mind_map_id: UUID,
    ) -> list[Edge]:
        """
        Get all edges belonging to a mind map.
        """

        return (
            self.db.query(Edge)
            .filter(Edge.mind_map_id == mind_map_id)
            .all()
        )

    def get_by_id(
        self,
        edge_id: UUID,
    ) -> Edge | None:
        """
        Get an edge by ID.
        """

        return (
            self.db.query(Edge)
            .filter(Edge.id == edge_id)
            .first()
        )

    def update(
        self,
        edge: Edge,
        edge_data: EdgeUpdate,
    ) -> Edge:
        """
        Update an existing edge.
        """

        if edge_data.source is not None:
            edge.source = edge_data.source

        if edge_data.target is not None:
            edge.target = edge_data.target

        if edge_data.label is not None:
            edge.label = edge_data.label

        if edge_data.type is not None:
            edge.type = edge_data.type

        if edge_data.animated is not None:
            edge.animated = edge_data.animated

        self.db.commit()
        self.db.refresh(edge)

        return edge

    def delete(
        self,
        edge: Edge,
    ) -> None:
        """
        Delete an edge.
        """

        self.db.delete(edge)
        self.db.commit()