import unittest
from uuid import uuid4, UUID
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.mind_map import MindMap
from app.models.node import Node
from app.models.edge import Edge
from app.services.collaboration_service import (
    FieldRegister,
    NodeCRDT,
    EdgeCRDT,
    CollaborationService,
    collaboration_service,
)
from app.core.security import hash_password


class TestCollaborationCRDT(unittest.TestCase):
    def setUp(self):
        self.db: Session = SessionLocal()
        self.collab = CollaborationService()

        # Create a test user, project, and mind map for isolation
        self.user = User(
            email=f"collab_test_{uuid4().hex[:8]}@example.com",
            password_hash=hash_password("password123"),
            full_name="Collab Test User"
        )
        self.db.add(self.user)
        self.db.flush()

        self.project = Project(
            title="Collab Test Project",
            user_id=self.user.id
        )
        self.db.add(self.project)
        self.db.flush()

        self.mind_map = MindMap(
            title="CRDT Test Map",
            project_id=self.project.id
        )
        self.db.add(self.mind_map)
        self.db.commit()

    def tearDown(self):
        try:
            self.db.query(Edge).filter(Edge.mind_map_id == self.mind_map.id).delete()
            self.db.query(Node).filter(Node.mind_map_id == self.mind_map.id).delete()
            self.db.query(MindMap).filter(MindMap.id == self.mind_map.id).delete()
            self.db.query(Project).filter(Project.id == self.project.id).delete()
            self.db.query(User).filter(User.id == self.user.id).delete()
            self.db.commit()
        except Exception:
            self.db.rollback()
        finally:
            self.db.close()

    def test_field_register_lww_and_tie_breaking(self):
        """Test that FieldRegister respects Lamport clocks and client_id tie breaking."""
        reg = FieldRegister("Initial", clock=1, client_id="client_a")
        
        # Lower clock should be rejected
        updated = reg.update("Stale", incoming_clock=0, incoming_client_id="client_b")
        self.assertFalse(updated)
        self.assertEqual(reg.value, "Initial")

        # Higher clock should win
        updated = reg.update("Newer", incoming_clock=2, incoming_client_id="client_a")
        self.assertTrue(updated)
        self.assertEqual(reg.value, "Newer")
        self.assertEqual(reg.clock, 2)

        # Equal clock with higher client_id should win
        updated = reg.update("TieWinner", incoming_clock=2, incoming_client_id="client_z")
        self.assertTrue(updated)
        self.assertEqual(reg.value, "TieWinner")

        # Equal clock with lower client_id should lose
        updated = reg.update("TieLoser", incoming_clock=2, incoming_client_id="client_a")
        self.assertFalse(updated)
        self.assertEqual(reg.value, "TieWinner")

    def test_concurrent_different_nodes(self):
        """Test that concurrent operations on different nodes both succeed without conflict."""
        node1_id = str(uuid4())
        node2_id = str(uuid4())

        delta1 = self.collab.apply_node_create(
            self.db, self.mind_map.id,
            {"id": node1_id, "label": "Node 1", "position_x": 100, "position_y": 100},
            clock=2, client_id="user_a"
        )
        self.assertIsNotNone(delta1)
        self.assertEqual(delta1["type"], "node_created")

        delta2 = self.collab.apply_node_create(
            self.db, self.mind_map.id,
            {"id": node2_id, "label": "Node 2", "position_x": 300, "position_y": 200},
            clock=2, client_id="user_b"
        )
        self.assertIsNotNone(delta2)
        self.assertEqual(delta2["type"], "node_created")

        room = self.collab.get_room(self.mind_map.id)
        self.assertIn(node1_id, room.nodes)
        self.assertIn(node2_id, room.nodes)

        # Verify DB persistence
        db_nodes = self.db.query(Node).filter(Node.mind_map_id == self.mind_map.id).all()
        db_node_ids = {str(n.id) for n in db_nodes}
        self.assertIn(node1_id, db_node_ids)
        self.assertIn(node2_id, db_node_ids)

    def test_concurrent_field_edits_same_node(self):
        """
        User A updates position while User B updates label on the SAME node.
        Both updates must cleanly merge without overwriting the other field.
        """
        node_id = str(uuid4())
        self.collab.apply_node_create(
            self.db, self.mind_map.id,
            {"id": node_id, "label": "Original Title", "position_x": 10.0, "position_y": 20.0},
            clock=1, client_id="setup"
        )

        # User A moves node to (500, 600)
        delta_a = self.collab.apply_node_update(
            self.db, self.mind_map.id, node_id,
            {"position_x": 500.0, "position_y": 600.0},
            clock=5, client_id="user_a"
        )
        self.assertIsNotNone(delta_a)
        self.assertEqual(delta_a["fields"]["position_x"], 500.0)

        # User B renames node concurrently at clock 5
        delta_b = self.collab.apply_node_update(
            self.db, self.mind_map.id, node_id,
            {"label": "Renamed By B"},
            clock=5, client_id="user_b"
        )
        self.assertIsNotNone(delta_b)
        self.assertEqual(delta_b["fields"]["label"], "Renamed By B")

        # In-memory CRDT check: both position and label survived!
        room = self.collab.get_room(self.mind_map.id)
        node_crdt = room.nodes[node_id]
        self.assertEqual(node_crdt.label_reg.value, "Renamed By B")
        self.assertEqual(node_crdt.pos_x_reg.value, 500.0)
        self.assertEqual(node_crdt.pos_y_reg.value, 600.0)

        # Database persistence check: both fields merged in PostgreSQL!
        db_node = self.db.query(Node).filter(Node.id == UUID(node_id)).first()
        self.assertEqual(db_node.label, "Renamed By B")
        self.assertEqual(db_node.position_x, 500.0)
        self.assertEqual(db_node.position_y, 600.0)

    def test_concurrent_text_edits_same_node(self):
        """Two users rename the same node: Lamport clock decides the winner."""
        node_id = str(uuid4())
        self.collab.apply_node_create(
            self.db, self.mind_map.id,
            {"id": node_id, "label": "Initial", "position_x": 0.0, "position_y": 0.0},
            clock=1, client_id="setup"
        )

        # User A renames with clock 3
        self.collab.apply_node_update(
            self.db, self.mind_map.id, node_id,
            {"label": "User A Title"},
            clock=3, client_id="user_a"
        )

        # User B renames with clock 4 (later logical time)
        self.collab.apply_node_update(
            self.db, self.mind_map.id, node_id,
            {"label": "User B Title"},
            clock=4, client_id="user_b"
        )

        room = self.collab.get_room(self.mind_map.id)
        self.assertEqual(room.nodes[node_id].label_reg.value, "User B Title")

        # User A tries to apply older update with clock 3 -> rejected
        rejected = self.collab.apply_node_update(
            self.db, self.mind_map.id, node_id,
            {"label": "Stale Title A"},
            clock=3, client_id="user_a"
        )
        self.assertIsNone(rejected)
        self.assertEqual(room.nodes[node_id].label_reg.value, "User B Title")

    def test_tombstone_prevents_zombie_revival(self):
        """A deleted node cannot be resurrected by a stale or concurrent update."""
        node_id = str(uuid4())
        self.collab.apply_node_create(
            self.db, self.mind_map.id,
            {"id": node_id, "label": "To Be Deleted", "position_x": 0.0, "position_y": 0.0},
            clock=1, client_id="setup"
        )

        # Delete node at clock 5
        delete_delta = self.collab.apply_node_delete(
            self.db, self.mind_map.id, node_id, clock=5, client_id="user_deleter"
        )
        self.assertEqual(delete_delta["type"], "node_deleted")
        
        room = self.collab.get_room(self.mind_map.id)
        self.assertNotIn(node_id, room.nodes)
        self.assertIn(node_id, room.tombstones)

        # Stale update with clock 4 tries to resurrect or edit
        stale_result = self.collab.apply_node_update(
            self.db, self.mind_map.id, node_id,
            {"label": "Resurrect Me"},
            clock=4, client_id="stale_client"
        )
        self.assertIsNone(stale_result)
        self.assertNotIn(node_id, room.nodes)

        # Stale create with same ID and older clock tries to resurrect
        stale_create = self.collab.apply_node_create(
            self.db, self.mind_map.id,
            {"id": node_id, "label": "Zombie Node"},
            clock=4, client_id="stale_client"
        )
        self.assertIsNone(stale_create)
        self.assertNotIn(node_id, room.nodes)

    def test_referential_integrity_prunes_edges(self):
        """Deleting a node automatically prunes and tombstones incident edges."""
        n1_id = str(uuid4())
        n2_id = str(uuid4())
        edge_id = str(uuid4())

        self.collab.apply_node_create(self.db, self.mind_map.id, {"id": n1_id, "label": "Node 1"}, clock=1, client_id="init")
        self.collab.apply_node_create(self.db, self.mind_map.id, {"id": n2_id, "label": "Node 2"}, clock=1, client_id="init")
        edge_delta = self.collab.apply_edge_create(
            self.db, self.mind_map.id,
            {"id": edge_id, "source": n1_id, "target": n2_id},
            clock=2, client_id="init"
        )
        self.assertIsNotNone(edge_delta)

        # Delete Node 1
        delete_delta = self.collab.apply_node_delete(
            self.db, self.mind_map.id, n1_id, clock=3, client_id="user_deleter"
        )
        self.assertIn(edge_id, delete_delta["pruned_edge_ids"])

        room = self.collab.get_room(self.mind_map.id)
        self.assertNotIn(edge_id, room.edges)
        self.assertIn(edge_id, room.tombstones)

        # Verify edge removed from DB
        db_edge = self.db.query(Edge).filter(Edge.id == UUID(edge_id)).first()
        self.assertIsNone(db_edge)

    def test_ai_three_way_merge_preserves_concurrent_human_edits(self):
        """
        AI generation begins at base_clock=10.
        Human concurrently edits Node 1 (label + position) at clock=12.
        AI returns with its own suggestion for Node 1 plus a new Node 2.
        Result: Human's concurrent edits to Node 1 are preserved over AI changes, and Node 2 is added.
        """
        n1_id = str(uuid4())
        n2_id = str(uuid4())
        self.collab.apply_node_create(
            self.db, self.mind_map.id,
            {"id": n1_id, "label": "Human Original", "position_x": 100.0, "position_y": 100.0},
            clock=5, client_id="init"
        )

        base_clock = 10

        # Human edits Node 1 concurrently while AI is running (clock 12 > base_clock 10)
        self.collab.apply_node_update(
            self.db, self.mind_map.id, n1_id,
            {"label": "Human Handcrafted Label", "position_x": 888.0, "position_y": 999.0},
            clock=12, client_id="human_user"
        )

        # AI completes and suggests changes to Node 1 and creates Node 2
        ai_nodes = [
            {"id": n1_id, "label": "AI Proposed Overwrite", "position_x": 0.0, "position_y": 0.0, "importance_score": 0.9},
            {"id": n2_id, "label": "AI Generated Node 2", "position_x": 200.0, "position_y": 300.0, "importance_score": 0.8}
        ]
        ai_edges = [
            {"source": n1_id, "target": n2_id}
        ]

        merge_result = self.collab.merge_ai_graph(
            self.db, self.mind_map.id, ai_nodes, ai_edges, base_clock=base_clock
        )
        self.assertEqual(merge_result["type"], "ai_graph_merged")

        room = self.collab.get_room(self.mind_map.id)
        # Node 1 must retain Human edits!
        n1_crdt = room.nodes[n1_id]
        self.assertEqual(n1_crdt.label_reg.value, "Human Handcrafted Label")
        self.assertEqual(n1_crdt.pos_x_reg.value, 888.0)
        self.assertEqual(n1_crdt.pos_y_reg.value, 999.0)

        # Node 2 was added by AI
        self.assertIn(n2_id, room.nodes)
        self.assertEqual(room.nodes[n2_id].label_reg.value, "AI Generated Node 2")

        # In DB, human edits are preserved
        db_n1 = self.db.query(Node).filter(Node.id == UUID(n1_id)).first()
        self.assertEqual(db_n1.label, "Human Handcrafted Label")
        self.assertEqual(db_n1.position_x, 888.0)

    def test_reconnect_convergence_via_sync_state(self):
        """Disconnect/reconnect convergence: sync_state sends all active nodes, edges, tombstones."""
        n1_id = str(uuid4())
        n2_id = str(uuid4())
        self.collab.apply_node_create(self.db, self.mind_map.id, {"id": n1_id, "label": "A"}, clock=1, client_id="c1")
        self.collab.apply_node_create(self.db, self.mind_map.id, {"id": n2_id, "label": "B"}, clock=2, client_id="c2")
        self.collab.apply_node_delete(self.db, self.mind_map.id, n2_id, clock=3, client_id="c1")

        sync_state = self.collab.get_full_sync_state(self.db, self.mind_map.id)
        self.assertEqual(sync_state["type"], "sync_state")
        
        node_ids = [n["id"] for n in sync_state["nodes"]]
        self.assertIn(n1_id, node_ids)
        self.assertNotIn(n2_id, node_ids)
        self.assertIn(n2_id, sync_state["tombstones"])


if __name__ == "__main__":
    unittest.main()
