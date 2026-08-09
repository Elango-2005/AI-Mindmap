from uuid import UUID

from app.models.node import Node
from app.models.user import User
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.node_repository import NodeRepository
from app.schemas.node import NodeCreate, NodeUpdate


class NodeService:
    """
    Node business logic.
    """

    def __init__(
        self,
        node_repository: NodeRepository,
        mind_map_repository: MindMapRepository,
    ):
        self.node_repository = node_repository
        self.mind_map_repository = mind_map_repository

    def create_node(
        self,
        mind_map_id: UUID,
        current_user: User,
        node_data: NodeCreate,
    ) -> Node:
        """
        Create a node inside a mind map owned by the current user.
        """

        self._verify_mind_map_access(
            mind_map_id,
            current_user,
        )

        return self.node_repository.create(
            mind_map_id=mind_map_id,
            node_data=node_data,
        )

    def get_mind_map_nodes(
        self,
        mind_map_id: UUID,
        current_user: User,
    ) -> list[Node]:
        """
        Get all nodes belonging to a mind map.
        """

        self._verify_mind_map_access(
            mind_map_id,
            current_user,
        )

        return self.node_repository.get_all_by_mind_map(
            mind_map_id=mind_map_id,
        )

    def get_node(
        self,
        node_id: UUID,
        current_user: User,
    ) -> Node:
        """
        Get a node and verify ownership.
        """

        node = self.node_repository.get_by_id(node_id)

        if node is None:
            raise ValueError("Node not found.")

        self._verify_mind_map_access(
            node.mind_map_id,
            current_user,
        )

        return node

    def update_node(
        self,
        node_id: UUID,
        current_user: User,
        node_data: NodeUpdate,
    ) -> Node:
        """
        Update a node.
        """

        node = self.get_node(
            node_id,
            current_user,
        )

        return self.node_repository.update(
            node=node,
            node_data=node_data,
        )

    def delete_node(
        self,
        node_id: UUID,
        current_user: User,
    ) -> None:
        """
        Delete a node.
        """

        node = self.get_node(
            node_id,
            current_user,
        )

        self.node_repository.delete(node)

    def _verify_mind_map_access(
        self,
        mind_map_id: UUID,
        current_user: User,
    ) -> None:
        """
        Verify that the current user owns the mind map.
        """

        mind_map = self.mind_map_repository.get_by_id(
            mind_map_id
        )

        if mind_map is None:
            raise ValueError("Mind map not found.")

        if mind_map.project.user_id != current_user.id:
            raise ValueError("Access denied.")