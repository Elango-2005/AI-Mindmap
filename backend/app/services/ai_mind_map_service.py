from uuid import UUID

from sqlalchemy.orm import Session

from app.models.edge import Edge
from app.models.node import Node
from app.models.user import User
from app.repositories.mind_map_repository import MindMapRepository
from app.services.ai_service import AIService

class AIMindMapService:
    """
    Service responsible for converting AI-generated mind maps
    into persistent database Nodes and Edges.
    """

    def __init__(
        self,
        db: Session,
        mind_map_repository: MindMapRepository,
        ai_service: AIService,
    ):
        self.db = db
        self.mind_map_repository = mind_map_repository
        self.ai_service = ai_service

    def generate_and_save_mind_map(
        self,
        mind_map_id: UUID,
        current_user: User,
        topic: str,
    ) -> dict:
        """
        Generate a mind map using Gemini, validate it,
        and save it to the database.
        """

        self._verify_mind_map_access(
            mind_map_id,
            current_user,
        )

        mind_map_data = self.ai_service.create_mind_map(
            topic
        )

        return self.save_mind_map(
            mind_map_id,
            mind_map_data,
        )

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

    def save_mind_map(
        self,
        mind_map_id: UUID,
        mind_map_data: dict,
    ) -> dict:
        """
        Save a validated AI-generated mind map in a single
        database transaction.

        If any node or edge fails, the entire operation is
        rolled back.
        """

        nodes = mind_map_data["nodes"]
        edges = mind_map_data["edges"]

        node_id_mapping: dict[str, UUID] = {}
        created_nodes: list[Node] = []
        created_edges: list[Edge] = []

        try:
            # --------------------------------------------------
            # Step 1: Create Nodes
            # --------------------------------------------------

            for node_data in nodes:
                node = Node(
                    mind_map_id=mind_map_id,
                    label=node_data["label"],
                    type="default",
                    position_x=0.0,
                    position_y=0.0,
                )

                self.db.add(node)
                self.db.flush()

                node_id_mapping[node_data["id"]] = node.id
                created_nodes.append(node)

            # --------------------------------------------------
            # Step 2: Create Edges
            # --------------------------------------------------

            for edge_data in edges:
                source_uuid = node_id_mapping[edge_data["source"]]
                target_uuid = node_id_mapping[edge_data["target"]]

                edge = Edge(
                    mind_map_id=mind_map_id,
                    source=source_uuid,
                    target=target_uuid,
                    label=None,
                    type="default",
                    animated=False,
                )

                self.db.add(edge)
                self.db.flush()

                created_edges.append(edge)

            # --------------------------------------------------
            # Step 3: Commit entire graph
            # --------------------------------------------------

            self.db.commit()

            return {
                "nodes": created_nodes,
                "edges": created_edges,
            }

        except Exception:
            # --------------------------------------------------
            # Rollback entire graph if anything fails
            # --------------------------------------------------

            self.db.rollback()
            raise