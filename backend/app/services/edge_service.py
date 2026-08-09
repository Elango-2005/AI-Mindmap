from uuid import UUID

from app.models.edge import Edge
from app.models.user import User
from app.repositories.edge_repository import EdgeRepository
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.node_repository import NodeRepository
from app.schemas.edge import EdgeCreate, EdgeUpdate


class EdgeService:
    """
    Edge business logic.
    """

    def __init__(
        self,
        edge_repository: EdgeRepository,
        mind_map_repository: MindMapRepository,
        node_repository: NodeRepository,
    ):
        self.edge_repository = edge_repository
        self.mind_map_repository = mind_map_repository
        self.node_repository = node_repository

    def create_edge(
        self,
        mind_map_id: UUID,
        current_user: User,
        edge_data: EdgeCreate,
    ) -> Edge:
        """
        Create an edge inside a mind map.
        """

        self._verify_mind_map_access(
            mind_map_id,
            current_user,
        )

        self._verify_nodes_belong_to_mind_map(
            mind_map_id,
            edge_data.source,
            edge_data.target,
        )

        return self.edge_repository.create(
            mind_map_id=mind_map_id,
            edge_data=edge_data,
        )

    def get_mind_map_edges(
        self,
        mind_map_id: UUID,
        current_user: User,
    ) -> list[Edge]:
        """
        Get all edges belonging to a mind map.
        """

        self._verify_mind_map_access(
            mind_map_id,
            current_user,
        )

        return self.edge_repository.get_all_by_mind_map(
            mind_map_id=mind_map_id,
        )

    def get_edge(
        self,
        edge_id: UUID,
        current_user: User,
    ) -> Edge:
        """
        Get an edge and verify ownership.
        """

        edge = self.edge_repository.get_by_id(edge_id)

        if edge is None:
            raise ValueError("Edge not found.")

        self._verify_mind_map_access(
            edge.mind_map_id,
            current_user,
        )

        return edge

    def update_edge(
        self,
        edge_id: UUID,
        current_user: User,
        edge_data: EdgeUpdate,
    ) -> Edge:
        """
        Update an edge.
        """

        edge = self.get_edge(
            edge_id,
            current_user,
        )

        source_id = (
            edge_data.source
            if edge_data.source is not None
            else edge.source
        )

        target_id = (
            edge_data.target
            if edge_data.target is not None
            else edge.target
        )

        self._verify_nodes_belong_to_mind_map(
            edge.mind_map_id,
            source_id,
            target_id,
        )

        return self.edge_repository.update(
            edge=edge,
            edge_data=edge_data,
        )

    def delete_edge(
        self,
        edge_id: UUID,
        current_user: User,
    ) -> None:
        """
        Delete an edge.
        """

        edge = self.get_edge(
            edge_id,
            current_user,
        )

        self.edge_repository.delete(edge)

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

    def _verify_nodes_belong_to_mind_map(
        self,
        mind_map_id: UUID,
        source_id: UUID,
        target_id: UUID,
    ) -> None:
        """
        Verify that both nodes belong to the same mind map.
        """

        source_node = self.node_repository.get_by_id(source_id)

        if source_node is None:
            raise ValueError("Source node not found.")

        target_node = self.node_repository.get_by_id(target_id)

        if target_node is None:
            raise ValueError("Target node not found.")

        if source_node.mind_map_id != mind_map_id:
            raise ValueError(
                "Source node does not belong to this mind map."
            )

        if target_node.mind_map_id != mind_map_id:
            raise ValueError(
                "Target node does not belong to this mind map."
            )