from uuid import UUID

from app.models.node import Node
from app.models.user import User
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.node_repository import NodeRepository
from app.schemas.node import NodeCreate, NodeUpdate


from app.repositories.edge_repository import EdgeRepository
from app.services.ai_service import AIService
from app.schemas.edge import EdgeCreate

class NodeService:
    """
    Node business logic.
    """

    def __init__(
        self,
        node_repository: NodeRepository,
        mind_map_repository: MindMapRepository,
        ai_service: AIService = None,
        edge_repository: EdgeRepository = None,
    ):
        self.node_repository = node_repository
        self.mind_map_repository = mind_map_repository
        self.ai_service = ai_service
        self.edge_repository = edge_repository

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

    def summarize_node(
        self,
        node_id: UUID,
        current_user: User,
    ) -> str:
        """
        Summarize a node's content using AI.
        """

        node = self.get_node(node_id, current_user)

        if not self.ai_service:
            raise ValueError("AI Service is not configured.")

        prompt = f"Provide a concise, 1-2 sentence technical summary of the concept: '{node.label}'."
        
        try:
            return self.ai_service.generate_text(prompt)
        except Exception as e:
            raise ValueError("Failed to summarize node via AI.") from e

    def expand_node(
        self,
        node_id: UUID,
        current_user: User,
    ) -> dict:
        """
        Expand a node by generating related sub-concepts and connecting them.
        """

        node = self.get_node(node_id, current_user)

        if not self.ai_service or not self.edge_repository:
            raise ValueError("AI Service or Edge Repository is not configured.")

        try:
            sub_concepts = self.ai_service.generate_sub_concepts(node.label)
        except Exception as e:
            raise ValueError("Failed to expand node via AI.") from e

        created_nodes = []
        created_edges = []

        # Position them randomly or in a circle around the parent?
        # For simplicity, we just put them slightly offset from the parent.
        # The frontend uses automatic layout or we can just give them a fixed offset.
        offset_x = 200
        offset_y = 100

        for i, concept in enumerate(sub_concepts):
            # Create Node
            new_node_data = NodeCreate(
                label=concept,
                type="default",
                position_x=node.position_x + offset_x,
                position_y=node.position_y + (i * offset_y),
            )
            new_node = self.node_repository.create(
                mind_map_id=node.mind_map_id,
                node_data=new_node_data,
            )
            created_nodes.append(new_node)

            # Create Edge linking parent to new node
            new_edge_data = EdgeCreate(
                source=str(node.id),
                target=str(new_node.id),
                type="default",
                animated=True,
            )
            new_edge = self.edge_repository.create(
                mind_map_id=node.mind_map_id,
                edge_data=new_edge_data,
            )
            created_edges.append(new_edge)

        return {
            "nodes": created_nodes,
            "edges": created_edges,
        }

    def find_node_connections(
        self,
        node_id: UUID,
        current_user: User,
    ) -> list[dict]:
        """
        Use AI to find connections to other nodes in the same mind map and create edges.
        """
        node = self.get_node(node_id, current_user)

        if not self.ai_service or not self.edge_repository:
            raise ValueError("AI Service or Edge Repository is not configured.")

        # Get all nodes in the map except the current one
        all_nodes = self.get_mind_map_nodes(node.mind_map_id, current_user)
        other_nodes = [n for n in all_nodes if n.id != node.id]

        if not other_nodes:
            return []

        # Get existing edges for this node so we don't duplicate
        existing_edges = self.edge_repository.get_all_by_mind_map(node.mind_map_id)
        existing_targets = {str(e.target) for e in existing_edges if e.source == node.id}
        existing_sources = {str(e.source) for e in existing_edges if e.target == node.id}
        connected_ids = existing_targets.union(existing_sources)

        # Filter other_nodes to only those not already connected
        unconnected_nodes = [n for n in other_nodes if str(n.id) not in connected_ids]

        if not unconnected_nodes:
            return []

        # Ask AI which unconnected nodes are logically related
        nodes_context = [{"id": str(n.id), "label": n.label} for n in unconnected_nodes]
        
        try:
            related_ids = self.ai_service.find_connections(node.label, nodes_context)
        except Exception as e:
            raise ValueError("Failed to find connections via AI.") from e

        created_edges = []
        for target_id_str in related_ids:
            # Verify the ID is valid and in our unconnected list
            if any(str(n.id) == target_id_str for n in unconnected_nodes):
                new_edge_data = EdgeCreate(
                    source=str(node.id),
                    target=target_id_str,
                    type="default",
                    animated=True,
                )
                new_edge = self.edge_repository.create(
                    mind_map_id=node.mind_map_id,
                    edge_data=new_edge_data,
                )
                created_edges.append(new_edge)

        return created_edges

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