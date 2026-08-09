from uuid import UUID

from sqlalchemy.orm import Session

from app.models.node import Node
from app.schemas.node import NodeCreate, NodeUpdate


class NodeRepository:
    """
    Repository for Node database operations.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        mind_map_id: UUID,
        node_data: NodeCreate,
    ) -> Node:
        """
        Create a new node.
        """

        node = Node(
            mind_map_id=mind_map_id,
            label=node_data.label,
            type=node_data.type,
            position_x=node_data.position_x,
            position_y=node_data.position_y,
        )

        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)

        return node

    def get_all_by_mind_map(
        self,
        mind_map_id: UUID,
    ) -> list[Node]:
        """
        Get all nodes belonging to a mind map.
        """

        return (
            self.db.query(Node)
            .filter(Node.mind_map_id == mind_map_id)
            .all()
        )

    def get_by_id(
        self,
        node_id: UUID,
    ) -> Node | None:
        """
        Get a node by ID.
        """

        return (
            self.db.query(Node)
            .filter(Node.id == node_id)
            .first()
        )

    def update(
        self,
        node: Node,
        node_data: NodeUpdate,
    ) -> Node:
        """
        Update an existing node.
        """

        if node_data.label is not None:
            node.label = node_data.label

        if node_data.type is not None:
            node.type = node_data.type

        if node_data.position_x is not None:
            node.position_x = node_data.position_x

        if node_data.position_y is not None:
            node.position_y = node_data.position_y

        self.db.commit()
        self.db.refresh(node)

        return node

    def delete(
        self,
        node: Node,
    ) -> None:
        """
        Delete a node.
        """

        self.db.delete(node)
        self.db.commit()