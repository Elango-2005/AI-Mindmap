import unittest
from uuid import uuid4
from app.services.ai_service import ai_service
from app.schemas.node import NodeCreate, NodeUpdate, NodeResponse
from app.models.node import Node
from app.db.session import SessionLocal

class TestImportanceScoring(unittest.TestCase):
    def test_schema_defaults(self):
        node_create = NodeCreate(label="Test Root")
        self.assertEqual(node_create.importance_score, 1.0)

        node_update = NodeUpdate(importance_score=0.75)
        self.assertEqual(node_update.importance_score, 0.75)

    def test_ai_validation_and_clamping(self):
        # Test out of range high
        test_graph = {
            "nodes": [
                {"id": "n1", "label": "Over-priority Node", "importance_score": 1.7},
                {"id": "n2", "label": "Negative Node", "importance_score": -0.5},
                {"id": "n3", "label": "Valid Node", "importance_score": 0.65},
                {"id": "n4", "label": "Missing Score Node"}
            ],
            "edges": [
                {"source": "n1", "target": "n2"},
                {"source": "n1", "target": "n3"},
                {"source": "n1", "target": "n4"}
            ]
        }
        validated = ai_service.validate_mind_map(test_graph)
        nodes_dict = {n["id"]: n for n in validated["nodes"]}

        # Check clamping
        self.assertEqual(nodes_dict["n1"]["importance_score"], 1.0)
        self.assertEqual(nodes_dict["n2"]["importance_score"], 0.0)
        self.assertEqual(nodes_dict["n3"]["importance_score"], 0.65)
        self.assertTrue(0.0 <= nodes_dict["n4"]["importance_score"] <= 1.0)

    def test_existing_nodes_in_database(self):
        db = SessionLocal()
        try:
            # Query any existing nodes in DB to verify server_default applied
            nodes = db.query(Node).limit(5).all()
            for node in nodes:
                self.assertIsNotNone(node.importance_score)
                self.assertTrue(0.0 <= node.importance_score <= 1.0)
        finally:
            db.close()

if __name__ == "__main__":
    unittest.main()
