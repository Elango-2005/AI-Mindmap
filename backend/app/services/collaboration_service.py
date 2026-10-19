import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from uuid import UUID
import uuid

from sqlalchemy.orm import Session

from app.models.node import Node
from app.models.edge import Edge
from app.models.mind_map import MindMap


class FieldRegister:
    """
    Last-Write-Wins Register for a single entity attribute.
    Tie-breaking uses (lamport_clock, client_id).
    """
    def __init__(self, value: Any, clock: int = 1, client_id: str = "init"):
        self.value = value
        self.clock = clock
        self.client_id = client_id

    def update(self, new_value: Any, incoming_clock: int, incoming_client_id: str) -> bool:
        if (incoming_clock > self.clock) or (incoming_clock == self.clock and incoming_client_id >= self.client_id):
            self.value = new_value
            self.clock = incoming_clock
            self.client_id = incoming_client_id
            return True
        return False


class NodeCRDT:
    def __init__(
        self,
        node_id: str,
        mind_map_id: str,
        label: str,
        position_x: float,
        position_y: float,
        importance_score: float = 1.0,
        node_type: str = "default",
        version: int = 1,
        clock: int = 1,
        client_id: str = "init"
    ):
        self.id = node_id
        self.mind_map_id = mind_map_id
        self.node_type = node_type
        self.version = version

        # Individual field registers
        self.label_reg = FieldRegister(label, clock, client_id)
        self.pos_x_reg = FieldRegister(position_x, clock, client_id)
        self.pos_y_reg = FieldRegister(position_y, clock, client_id)
        self.score_reg = FieldRegister(importance_score, clock, client_id)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "mind_map_id": self.mind_map_id,
            "label": self.label_reg.value,
            "type": self.node_type,
            "position_x": self.pos_x_reg.value,
            "position_y": self.pos_y_reg.value,
            "importance_score": self.score_reg.value,
            "version": self.version,
            "clocks": {
                "label": self.label_reg.clock,
                "position": max(self.pos_x_reg.clock, self.pos_y_reg.clock),
                "importance_score": self.score_reg.clock,
            }
        }


class EdgeCRDT:
    def __init__(
        self,
        edge_id: str,
        mind_map_id: str,
        source: str,
        target: str,
        label: Optional[str] = None,
        edge_type: str = "default",
        animated: bool = False,
        version: int = 1,
        clock: int = 1,
        client_id: str = "init"
    ):
        self.id = edge_id
        self.mind_map_id = mind_map_id
        self.source = source
        self.target = target
        self.edge_type = edge_type
        self.animated = animated
        self.version = version
        self.label_reg = FieldRegister(label, clock, client_id)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "mind_map_id": self.mind_map_id,
            "source": self.source,
            "target": self.target,
            "label": self.label_reg.value,
            "type": self.edge_type,
            "animated": self.animated,
            "version": self.version,
        }


class RoomState:
    def __init__(self, mind_map_id: UUID):
        self.mind_map_id = mind_map_id
        self.lamport_clock: int = 1
        self.nodes: Dict[str, NodeCRDT] = {}
        self.edges: Dict[str, EdgeCRDT] = {}
        # Tombstones: entity_id -> deletion_clock (OR-Set pattern)
        self.tombstones: Dict[str, int] = {}
        self.presences: Dict[str, Dict[str, Any]] = {}
        self.initialized = False

    def next_clock(self, incoming_clock: int = 0) -> int:
        self.lamport_clock = max(self.lamport_clock, incoming_clock) + 1
        return self.lamport_clock


class CollaborationService:
    """
    Manages in-memory CRDT rooms, Lamport clocks, field-level conflict resolution,
    and atomic persistence to PostgreSQL.
    """
    def __init__(self):
        self.rooms: Dict[UUID, RoomState] = {}
        self._lock = asyncio.Lock()

    def get_room(self, mind_map_id: UUID) -> RoomState:
        if mind_map_id not in self.rooms:
            self.rooms[mind_map_id] = RoomState(mind_map_id)
        return self.rooms[mind_map_id]

    def get_clock(self, mind_map_id: UUID) -> int:
        if mind_map_id in self.rooms:
            return self.rooms[mind_map_id].lamport_clock
        return 1

    def reload_room(self, db: Session, mind_map_id: UUID) -> RoomState:
        room = self.get_room(mind_map_id)
        room.initialized = False
        room.nodes.clear()
        room.edges.clear()
        return self.initialize_room(db, mind_map_id)

    def initialize_room(self, db: Session, mind_map_id: UUID) -> RoomState:
        room = self.get_room(mind_map_id)
        if room.initialized:
            return room

        db_nodes = db.query(Node).filter(Node.mind_map_id == mind_map_id).all()
        db_edges = db.query(Edge).filter(Edge.mind_map_id == mind_map_id).all()

        max_version = 1
        for n in db_nodes:
            max_version = max(max_version, getattr(n, "version", 1))
            room.nodes[str(n.id)] = NodeCRDT(
                node_id=str(n.id),
                mind_map_id=str(mind_map_id),
                label=n.label,
                position_x=n.position_x,
                position_y=n.position_y,
                importance_score=getattr(n, "importance_score", 1.0),
                node_type=n.type,
                version=getattr(n, "version", 1),
                clock=getattr(n, "version", 1),
                client_id="server_init"
            )

        for e in db_edges:
            max_version = max(max_version, getattr(e, "version", 1))
            room.edges[str(e.id)] = EdgeCRDT(
                edge_id=str(e.id),
                mind_map_id=str(mind_map_id),
                source=str(e.source),
                target=str(e.target),
                label=e.label,
                edge_type=e.type,
                animated=e.animated,
                version=getattr(e, "version", 1),
                clock=getattr(e, "version", 1),
                client_id="server_init"
            )

        room.lamport_clock = max_version + 1
        room.initialized = True
        return room

    def get_full_sync_state(self, db: Session, mind_map_id: UUID) -> Dict[str, Any]:
        room = self.initialize_room(db, mind_map_id)
        return {
            "type": "sync_state",
            "mind_map_id": str(mind_map_id),
            "clock": room.lamport_clock,
            "nodes": [n.to_dict() for n in room.nodes.values()],
            "edges": [e.to_dict() for e in room.edges.values()],
            "tombstones": room.tombstones,
            "presences": list(room.presences.values()),
        }

    def apply_node_update(
        self,
        db: Session,
        mind_map_id: UUID,
        node_id: str,
        fields: Dict[str, Any],
        clock: int,
        client_id: str
    ) -> Optional[Dict[str, Any]]:
        room = self.initialize_room(db, mind_map_id)

        # Check tombstone (OR-Set: do not resurrect deleted nodes)
        if node_id in room.tombstones and clock <= room.tombstones[node_id]:
            return None

        node_crdt = room.nodes.get(node_id)
        if not node_crdt:
            return None

        server_clock = room.next_clock(clock)
        applied_fields = {}

        if "label" in fields:
            if node_crdt.label_reg.update(str(fields["label"]), clock, client_id):
                applied_fields["label"] = node_crdt.label_reg.value

        if "position_x" in fields or "position_y" in fields:
            px_updated = False
            py_updated = False
            if "position_x" in fields:
                px_updated = node_crdt.pos_x_reg.update(float(fields["position_x"]), clock, client_id)
            if "position_y" in fields:
                py_updated = node_crdt.pos_y_reg.update(float(fields["position_y"]), clock, client_id)
            if px_updated or py_updated:
                applied_fields["position_x"] = node_crdt.pos_x_reg.value
                applied_fields["position_y"] = node_crdt.pos_y_reg.value

        if "importance_score" in fields:
            try:
                score = round(max(0.0, min(1.0, float(fields["importance_score"]))), 2)
                if node_crdt.score_reg.update(score, clock, client_id):
                    applied_fields["importance_score"] = score
            except (ValueError, TypeError):
                pass

        if not applied_fields:
            return None

        node_crdt.version += 1

        # Persist field updates to PostgreSQL
        try:
            db_node = db.query(Node).filter(Node.id == UUID(node_id)).first()
            if db_node:
                if "label" in applied_fields:
                    db_node.label = applied_fields["label"]
                if "position_x" in applied_fields:
                    db_node.position_x = applied_fields["position_x"]
                if "position_y" in applied_fields:
                    db_node.position_y = applied_fields["position_y"]
                if "importance_score" in applied_fields:
                    db_node.importance_score = applied_fields["importance_score"]
                db_node.version = node_crdt.version
                db.commit()
        except Exception:
            db.rollback()

        return {
            "type": "node_updated",
            "node_id": node_id,
            "fields": applied_fields,
            "version": node_crdt.version,
            "clock": server_clock,
            "client_id": client_id,
        }

    def apply_node_create(
        self,
        db: Session,
        mind_map_id: UUID,
        node_data: Dict[str, Any],
        clock: int,
        client_id: str
    ) -> Optional[Dict[str, Any]]:
        room = self.initialize_room(db, mind_map_id)
        node_id = str(node_data.get("id") or uuid.uuid4())

        # Check tombstone
        if node_id in room.tombstones and clock <= room.tombstones[node_id]:
            return None

        server_clock = room.next_clock(clock)

        # Check if node already exists
        if node_id in room.nodes:
            # Merge fields into existing node
            return self.apply_node_update(
                db, mind_map_id, node_id, node_data, clock, client_id
            )

        crdt_node = NodeCRDT(
            node_id=node_id,
            mind_map_id=str(mind_map_id),
            label=node_data.get("label", "New Node"),
            position_x=float(node_data.get("position_x", 0.0)),
            position_y=float(node_data.get("position_y", 0.0)),
            importance_score=float(node_data.get("importance_score", 1.0)),
            node_type=node_data.get("type", "default"),
            version=1,
            clock=clock,
            client_id=client_id,
        )
        room.nodes[node_id] = crdt_node

        # Persist to database
        try:
            db_node = Node(
                id=UUID(node_id),
                mind_map_id=mind_map_id,
                label=crdt_node.label_reg.value,
                position_x=crdt_node.pos_x_reg.value,
                position_y=crdt_node.pos_y_reg.value,
                importance_score=crdt_node.score_reg.value,
                type=crdt_node.node_type,
                version=1,
            )
            db.add(db_node)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "type": "node_created",
            "node": crdt_node.to_dict(),
            "clock": server_clock,
            "client_id": client_id,
        }

    def apply_node_delete(
        self,
        db: Session,
        mind_map_id: UUID,
        node_id: str,
        clock: int,
        client_id: str
    ) -> Dict[str, Any]:
        room = self.initialize_room(db, mind_map_id)
        server_clock = room.next_clock(clock)

        # 1. Add node tombstone
        room.tombstones[node_id] = server_clock

        # 2. Remove node from room state
        room.nodes.pop(node_id, None)

        # 3. Referential integrity: prune incident edges
        pruned_edge_ids: List[str] = []
        for edge_id, edge in list(room.edges.items()):
            if edge.source == node_id or edge.target == node_id:
                room.tombstones[edge_id] = server_clock
                room.edges.pop(edge_id, None)
                pruned_edge_ids.append(edge_id)

        # 4. Persist deletion in DB
        try:
            db.query(Edge).filter(
                (Edge.source == UUID(node_id)) | (Edge.target == UUID(node_id))
            ).delete(synchronize_session=False)

            db.query(Node).filter(Node.id == UUID(node_id)).delete(synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "type": "node_deleted",
            "node_id": node_id,
            "pruned_edge_ids": pruned_edge_ids,
            "clock": server_clock,
            "client_id": client_id,
        }

    def apply_edge_create(
        self,
        db: Session,
        mind_map_id: UUID,
        edge_data: Dict[str, Any],
        clock: int,
        client_id: str
    ) -> Optional[Dict[str, Any]]:
        room = self.initialize_room(db, mind_map_id)
        edge_id = str(edge_data.get("id") or uuid.uuid4())
        source = str(edge_data["source"])
        target = str(edge_data["target"])

        # Referential integrity check: source and target must exist and NOT be tombstoned
        if source in room.tombstones or target in room.tombstones:
            return None
        if source not in room.nodes or target not in room.nodes:
            return None
        if source == target:
            return None

        # Check edge tombstone
        if edge_id in room.tombstones and clock <= room.tombstones[edge_id]:
            return None

        server_clock = room.next_clock(clock)

        crdt_edge = EdgeCRDT(
            edge_id=edge_id,
            mind_map_id=str(mind_map_id),
            source=source,
            target=target,
            label=edge_data.get("label"),
            edge_type=edge_data.get("type", "default"),
            animated=edge_data.get("animated", False),
            version=1,
            clock=clock,
            client_id=client_id,
        )
        room.edges[edge_id] = crdt_edge

        # Persist to database
        try:
            db_edge = Edge(
                id=UUID(edge_id),
                mind_map_id=mind_map_id,
                source=UUID(source),
                target=UUID(target),
                label=crdt_edge.label_reg.value,
                type=crdt_edge.edge_type,
                animated=crdt_edge.animated,
                version=1,
            )
            db.add(db_edge)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "type": "edge_created",
            "edge": crdt_edge.to_dict(),
            "clock": server_clock,
            "client_id": client_id,
        }

    def apply_edge_delete(
        self,
        db: Session,
        mind_map_id: UUID,
        edge_id: str,
        clock: int,
        client_id: str
    ) -> Dict[str, Any]:
        room = self.initialize_room(db, mind_map_id)
        server_clock = room.next_clock(clock)

        room.tombstones[edge_id] = server_clock
        room.edges.pop(edge_id, None)

        try:
            db.query(Edge).filter(Edge.id == UUID(edge_id)).delete(synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()

        return {
            "type": "edge_deleted",
            "edge_id": edge_id,
            "clock": server_clock,
            "client_id": client_id,
        }

    def merge_ai_graph(
        self,
        db: Session,
        mind_map_id: UUID,
        ai_nodes: List[Dict[str, Any]],
        ai_edges: List[Dict[str, Any]],
        base_clock: int
    ) -> Dict[str, Any]:
        """
        3-Way Semantic Graph Merge:
        Merges AI-generated mind map changes while preserving concurrent human edits.
        
        Rules:
        1. If a node was edited or moved by a human AFTER base_clock, human edits are PRESERVED.
        2. If a node was deleted by a human, it remains deleted (tombstone check).
        3. Brand-new human nodes created during AI computation are preserved untouched.
        4. New AI nodes/edges are unioned into the graph.
        """
        room = self.initialize_room(db, mind_map_id)
        merge_clock = room.next_clock(base_clock)

        # 1. Map existing nodes
        existing_nodes = {n_id: n for n_id, n in room.nodes.items()}
        ai_node_dict = {str(n["id"]): n for n in ai_nodes}

        # Track surviving nodes
        final_nodes: Dict[str, NodeCRDT] = {}

        # First: Preserve all human nodes created or edited during AI execution (clock > base_clock)
        for n_id, crdt_node in existing_nodes.items():
            if n_id in room.tombstones:
                continue

            node_max_clock = max(
                crdt_node.label_reg.clock,
                crdt_node.pos_x_reg.clock,
                crdt_node.pos_y_reg.clock,
                crdt_node.score_reg.clock
            )

            if node_max_clock > base_clock:
                # Human edited or created this node concurrently during AI call! Human wins!
                final_nodes[n_id] = crdt_node
            elif n_id in ai_node_dict:
                # Untouched by human during AI call, safe for AI update
                ai_data = ai_node_dict[n_id]
                crdt_node.label_reg.update(ai_data["label"], merge_clock, "ai_merge")
                if "importance_score" in ai_data:
                    crdt_node.score_reg.update(float(ai_data["importance_score"]), merge_clock, "ai_merge")
                final_nodes[n_id] = crdt_node
            else:
                # Untouched by human, and AI removed it -> tombstone it
                room.tombstones[n_id] = merge_clock

        # Add brand-new AI nodes
        for n_data in ai_nodes:
            n_id = str(n_data["id"])
            if n_id in room.tombstones:
                continue
            if n_id not in final_nodes:
                new_crdt = NodeCRDT(
                    node_id=n_id,
                    mind_map_id=str(mind_map_id),
                    label=n_data["label"],
                    position_x=float(n_data.get("position_x", 0.0)),
                    position_y=float(n_data.get("position_y", 0.0)),
                    importance_score=float(n_data.get("importance_score", 1.0)),
                    node_type=n_data.get("type", "default"),
                    version=1,
                    clock=merge_clock,
                    client_id="ai_merge"
                )
                final_nodes[n_id] = new_crdt

        # 2. Merge edges
        final_edges: Dict[str, EdgeCRDT] = {}
        # Keep existing human edges if endpoints exist
        for e_id, crdt_edge in room.edges.items():
            if e_id in room.tombstones:
                continue
            if crdt_edge.source in final_nodes and crdt_edge.target in final_nodes:
                final_edges[e_id] = crdt_edge

        # Add AI edges
        for e_data in ai_edges:
            src = str(e_data["source"])
            tgt = str(e_data["target"])
            e_id = str(e_data.get("id") or uuid.uuid4())
            if src in final_nodes and tgt in final_nodes and e_id not in room.tombstones:
                # Check if duplicate edge exists
                duplicate = any(e.source == src and e.target == tgt for e in final_edges.values())
                if not duplicate:
                    new_edge_crdt = EdgeCRDT(
                        edge_id=e_id,
                        mind_map_id=str(mind_map_id),
                        source=src,
                        target=tgt,
                        label=e_data.get("label"),
                        version=1,
                        clock=merge_clock,
                        client_id="ai_merge"
                    )
                    final_edges[e_id] = new_edge_crdt

        # Update room state
        room.nodes = final_nodes
        room.edges = final_edges

        # 3. Synchronize to PostgreSQL in a single transaction
        try:
            # Upsert nodes in DB
            db_existing_nodes = {str(n.id): n for n in db.query(Node).filter(Node.mind_map_id == mind_map_id).all()}
            for n_id, crdt in final_nodes.items():
                if n_id in db_existing_nodes:
                    db_n = db_existing_nodes[n_id]
                    db_n.label = crdt.label_reg.value
                    db_n.position_x = crdt.pos_x_reg.value
                    db_n.position_y = crdt.pos_y_reg.value
                    db_n.importance_score = crdt.score_reg.value
                    db_n.version = crdt.version
                else:
                    db_n = Node(
                        id=UUID(n_id),
                        mind_map_id=mind_map_id,
                        label=crdt.label_reg.value,
                        position_x=crdt.pos_x_reg.value,
                        position_y=crdt.pos_y_reg.value,
                        importance_score=crdt.score_reg.value,
                        type=crdt.node_type,
                        version=1
                    )
                    db.add(db_n)

            # Delete nodes removed
            for n_id, db_n in db_existing_nodes.items():
                if n_id not in final_nodes:
                    db.delete(db_n)

            # Recreate edges
            db.query(Edge).filter(Edge.mind_map_id == mind_map_id).delete(synchronize_session=False)
            for e_id, crdt_e in final_edges.items():
                db_e = Edge(
                    id=UUID(e_id),
                    mind_map_id=mind_map_id,
                    source=UUID(crdt_e.source),
                    target=UUID(crdt_e.target),
                    label=crdt_e.label_reg.value,
                    type=crdt_e.edge_type,
                    animated=crdt_e.animated,
                    version=1
                )
                db.add(db_e)

            db.commit()
        except Exception:
            db.rollback()

        return {
            "type": "ai_graph_merged",
            "clock": merge_clock,
            "nodes": [n.to_dict() for n in room.nodes.values()],
            "edges": [e.to_dict() for e in room.edges.values()],
        }


# Singleton collaboration service
collaboration_service = CollaborationService()
