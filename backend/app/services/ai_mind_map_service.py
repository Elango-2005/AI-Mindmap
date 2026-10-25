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
from app.services.rag_service import RAGService
from app.services.collaboration_service import collaboration_service

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
        depth: int = 3,
    ) -> dict:
        """
        Generate a mind map using Gemini, validate it,
        and save it to the database.
        """

        mind_map = self._verify_mind_map_access(
            mind_map_id,
            current_user,
        )

        rag_service = RAGService(self.db)
        retrieved_context = None
        sources = []
        if rag_service.has_documents(mind_map.project_id):
            chunks = rag_service.retrieve_relevant_chunks(mind_map.project_id, topic, top_k=5)
            if chunks:
                retrieved_context = rag_service.format_context_for_prompt(chunks)
                sources = [
                    {
                        "document_id": str(c["document_id"]),
                        "filename": c["filename"],
                        "page_number": c["page_number"],
                        "score": round(c["score"], 4),
                        "snippet": c["text"][:150] + "..." if len(c["text"]) > 150 else c["text"]
                    }
                    for c in chunks
                ]

        mind_map_data = self.ai_service.create_mind_map(
            topic,
            depth,
            retrieved_context=retrieved_context,
        )

        result = self.replace_mind_map_graph(
            mind_map_id,
            mind_map_data,
        )
        collaboration_service.reload_room(self.db, mind_map_id)
        sync_state = collaboration_service.get_full_sync_state(self.db, mind_map_id)
        import asyncio
        from app.services.websocket_manager import manager
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(mind_map_id, sync_state))
        except Exception:
            pass

        result["sources"] = sources
        return result

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
        mind_map = self._verify_mind_map_access(mind_map_id, current_user)
        base_clock = collaboration_service.get_clock(mind_map_id)

        # Optional RAG retrieval grounded by instruction
        rag_service = RAGService(self.db)
        retrieved_context = None
        sources = []
        if rag_service.has_documents(mind_map.project_id):
            chunks = rag_service.retrieve_relevant_chunks(mind_map.project_id, instruction, top_k=4)
            if chunks:
                retrieved_context = rag_service.format_context_for_prompt(chunks)
                sources = [
                    {
                        "document_id": str(c["document_id"]),
                        "filename": c["filename"],
                        "page_number": c["page_number"],
                        "score": round(c["score"], 4),
                        "snippet": c["text"][:150] + "..." if len(c["text"]) > 150 else c["text"]
                    }
                    for c in chunks
                ]

        # Get current nodes and edges
        nodes = self.db.query(Node).filter(Node.mind_map_id == mind_map_id).all()
        edges = self.db.query(Edge).filter(Edge.mind_map_id == mind_map_id).all()

        current_graph = {
            "nodes": [
                {
                    "id": str(n.id),
                    "label": n.label,
                    "importance_score": getattr(n, "importance_score", 1.0)
                }
                for n in nodes
            ],
            "edges": [{"source": str(e.source), "target": str(e.target)} for e in edges]
        }
        
        selected_node_label = None
        if selected_node_id:
            for n in nodes:
                if str(n.id) == selected_node_id:
                    selected_node_label = n.label
                    break

        # Send to AI
        response = self.ai_service.chat_modify_mind_map(
            instruction,
            current_graph,
            selected_node_id,
            selected_node_label,
            retrieved_context=retrieved_context,
        )

        # Update the graph using 3-way semantic CRDT merge
        merge_result = collaboration_service.merge_ai_graph(
            self.db,
            mind_map_id,
            response["nodes"],
            response["edges"],
            base_clock=base_clock,
        )

        import asyncio
        from app.services.websocket_manager import manager
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(mind_map_id, merge_result))
        except Exception:
            pass

        fresh_nodes = self.db.query(Node).filter(Node.mind_map_id == mind_map_id).all()
        fresh_edges = self.db.query(Edge).filter(Edge.mind_map_id == mind_map_id).all()

        return {
            "response_text": response["response_text"],
            "nodes": fresh_nodes,
            "edges": fresh_edges,
            "sources": sources,
        }

    def _verify_mind_map_access(
        self,
        mind_map_id: UUID,
        current_user: User,
    ):
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

        return mind_map

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
        Replace the existing graph of a mind map by upserting nodes
        to preserve stable UUIDs.
        """
        import uuid

        nodes_data = mind_map_data["nodes"]
        edges_data = mind_map_data["edges"]

        node_id_mapping: dict[str, UUID] = {}
        created_nodes: list[Node] = []
        created_edges: list[Edge] = []

        try:
            # 1. Fetch existing nodes
            existing_nodes = self.db.query(Node).filter(Node.mind_map_id == mind_map_id).all()
            existing_node_dict = {str(n.id): n for n in existing_nodes}
            
            # Track which existing nodes are still present in AI response
            kept_node_ids = set()

            # 2. Upsert nodes
            for node_data in nodes_data:
                node_ai_id = node_data["id"]
                
                # Determine position
                pos_x = 0.0
                pos_y = 0.0
                if existing_positions and node_ai_id in existing_positions:
                    pos_x = existing_positions[node_ai_id]["x"]
                    pos_y = existing_positions[node_ai_id]["y"]

                raw_score = node_data.get("importance_score")
                if raw_score is not None:
                    try:
                        clean_score = round(max(0.0, min(1.0, float(raw_score))), 2)
                    except (ValueError, TypeError):
                        clean_score = 1.0
                else:
                    clean_score = 1.0

                node_type = str(node_data.get("type") or "default").lower().strip()
                if node_ai_id in existing_node_dict:
                    # UPDATE existing node
                    node = existing_node_dict[node_ai_id]
                    node.label = node_data["label"]
                    if node_type != "default":
                        node.type = node_type
                    if raw_score is not None:
                        node.importance_score = clean_score
                    kept_node_ids.add(node_ai_id)
                    node_id_mapping[node_ai_id] = node.id
                    created_nodes.append(node)
                else:
                    # CREATE new node
                    node = Node(
                        mind_map_id=mind_map_id,
                        label=node_data["label"],
                        type=node_type,
                        position_x=pos_x,
                        position_y=pos_y,
                        importance_score=clean_score,
                    )
                    self.db.add(node)
                    self.db.flush()
                    node_id_mapping[node_ai_id] = node.id
                    created_nodes.append(node)
            
            # 3. Delete removed nodes
            for n_id, n_obj in existing_node_dict.items():
                if n_id not in kept_node_ids:
                    self.db.delete(n_obj)

            # 4. Recreate all edges
            self.db.query(Edge).filter(Edge.mind_map_id == mind_map_id).delete(synchronize_session=False)

            for edge_data in edges_data:
                source_uuid = node_id_mapping[edge_data["source"]]
                target_uuid = node_id_mapping[edge_data["target"]]

                edge_label = edge_data.get("label")
                if edge_label is not None:
                    edge_label = str(edge_label).strip()
                    if len(edge_label) > 255:
                        edge_label = edge_label[:250] + "..."
                    if not edge_label:
                        edge_label = None
                edge_type = str(edge_data.get("type") or "default").lower().strip()

                edge = Edge(
                    mind_map_id=mind_map_id,
                    source=source_uuid,
                    target=target_uuid,
                    label=edge_label,
                    type=edge_type,
                    animated=(edge_type == "ai_suggestion"),
                )
                self.db.add(edge)
                self.db.flush()
                created_edges.append(edge)

            self.db.commit()

            return {
                "nodes": created_nodes,
                "edges": created_edges,
            }

        except Exception:
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
                raw_score = node_data.get("importance_score")
                if raw_score is not None:
                    try:
                        clean_score = round(max(0.0, min(1.0, float(raw_score))), 2)
                    except (ValueError, TypeError):
                        clean_score = 1.0
                else:
                    clean_score = 1.0

                node_type = str(node_data.get("type") or "default").lower().strip()
                node = Node(
                    mind_map_id=mind_map_id,
                    label=node_data["label"],
                    type=node_type,
                    position_x=0.0,
                    position_y=0.0,
                    importance_score=clean_score,
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

                edge_label = edge_data.get("label")
                if edge_label is not None:
                    edge_label = str(edge_label).strip()
                    if len(edge_label) > 255:
                        edge_label = edge_label[:250] + "..."
                    if not edge_label:
                        edge_label = None
                edge_type = str(edge_data.get("type") or "default").lower().strip()

                edge = Edge(
                    mind_map_id=mind_map_id,
                    source=source_uuid,
                    target=target_uuid,
                    label=edge_label,
                    type=edge_type,
                    animated=(edge_type == "ai_suggestion"),
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