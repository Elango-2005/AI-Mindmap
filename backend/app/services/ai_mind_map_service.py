from uuid import UUID

from app.models import mind_map
from sqlalchemy.orm import Session
from app.core.exceptions import (
    MindMapAccessDeniedError,
    MindMapNotFoundError,
)
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

        return self.replace_mind_map_graph(
            mind_map_id,
            mind_map_data,
        )

    def chat_and_modify_mind_map(
        self,
        mind_map_id: UUID,
        current_user: User,
        instruction: str,
        selected_node_id: str | None = None,
    ) -> dict:
        """
        Send current graph + instruction to AI, get new graph + text response, save new graph.
        """
        self._verify_mind_map_access(mind_map_id, current_user)

        # Get current nodes and edges
        nodes = self.db.query(Node).filter(Node.mind_map_id == mind_map_id).all()
        edges = self.db.query(Edge).filter(Edge.mind_map_id == mind_map_id).all()

        current_graph = {
            "nodes": [{"id": str(n.id), "label": n.label} for n in nodes],
            "edges": [{"source": str(e.source), "target": str(e.target)} for e in edges]
        }
        
        existing_positions = {str(n.id): {"x": n.position_x, "y": n.position_y} for n in nodes}
        
        selected_node_label = None
        if selected_node_id:
            for n in nodes:
                if str(n.id) == selected_node_id:
                    selected_node_label = n.label
                    break

        # Send to AI
        response = self.ai_service.chat_modify_mind_map(instruction, current_graph, selected_node_id, selected_node_label)

        # Update the graph
        mind_map_data = {
            "nodes": response["nodes"],
            "edges": response["edges"]
        }

        result = self.replace_mind_map_graph(
            mind_map_id,
            mind_map_data,
            existing_positions=existing_positions,
        )

        return {
            "response_text": response["response_text"],
            "nodes": result["nodes"],
            "edges": result["edges"]
        }

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
            raise MindMapNotFoundError(
                "Mind map not found."
        )

        if mind_map.project.user_id != current_user.id:
            raise MindMapAccessDeniedError(
                "Access denied."
        )

    def _delete_existing_graph(
        self,
        mind_map_id: UUID,
        ) -> None:
            """
            Delete all existing nodes and edges belonging
            to a mind map.
            """

            self.db.query(Edge).filter(
                Edge.mind_map_id == mind_map_id
            ).delete(
                synchronize_session=False
            )

            self.db.query(Node).filter(
                Node.mind_map_id == mind_map_id
            ).delete(
                synchronize_session=False
            )
            
    def replace_mind_map_graph(
        self,
        mind_map_id: UUID,
        mind_map_data: dict,
        existing_positions: dict = None,
    ) -> dict:
        """
        Replace the existing graph of a mind map with
        a validated new graph in a single transaction.

        If anything fails, the entire operation is rolled back.
        """

        nodes = mind_map_data["nodes"]
        edges = mind_map_data["edges"]

        node_id_mapping: dict[str, UUID] = {}
        created_nodes: list[Node] = []
        created_edges: list[Edge] = []

        try:
            # --------------------------------------------------
            # Step 1: Delete existing graph
            # --------------------------------------------------

            self._delete_existing_graph(
                mind_map_id
            )

            # --------------------------------------------------
            # Step 2: Create new nodes
            # --------------------------------------------------

            for node_data in nodes:
                pos_x = 0.0
                pos_y = 0.0
                
                if existing_positions and node_data["id"] in existing_positions:
                    pos_x = existing_positions[node_data["id"]]["x"]
                    pos_y = existing_positions[node_data["id"]]["y"]
                
                node = Node(
                    mind_map_id=mind_map_id,
                    label=node_data["label"],
                    type="default",
                    position_x=pos_x,
                    position_y=pos_y,
                )

                self.db.add(node)
                self.db.flush()

                node_id_mapping[node_data["id"]] = node.id
                created_nodes.append(node)

            # --------------------------------------------------
            # Step 3: Create new edges
            # --------------------------------------------------

            for edge_data in edges:
                source_uuid = node_id_mapping[
                    edge_data["source"]
                ]

                target_uuid = node_id_mapping[
                    edge_data["target"]
                ]

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
            # Step 4: Commit replacement
            # --------------------------------------------------

            self.db.commit()

            return {
                "nodes": created_nodes,
                "edges": created_edges,
            }

        except Exception:
            # --------------------------------------------------
            # Rollback deletion + insertion together
            # --------------------------------------------------

            self.db.rollback()
            raise

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