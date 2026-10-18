import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4
import math

from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.project_document import ProjectDocument, DocumentChunk
from app.services.rag_service import RAGService
from app.services.ai_service import AIService


class TestRAGPipeline(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        # Create a test user and test project
        self.test_user = User(
            id=uuid4(),
            email=f"rag_test_{uuid4().hex[:8]}@example.com",
            password_hash="hashed_test_password",
            full_name="RAG Test User",
            is_active=True,
        )
        self.db.add(self.test_user)
        self.db.flush()

        self.test_project = Project(
            id=uuid4(),
            title="Quantum Computing Project",
            description="Domain test project",
            user_id=self.test_user.id,
        )
        self.db.add(self.test_project)
        self.db.commit()

    def tearDown(self):
        try:
            # Clean up project documents, chunks, project, and user
            self.db.query(DocumentChunk).filter(
                DocumentChunk.document_id.in_(
                    self.db.query(ProjectDocument.id).filter(ProjectDocument.project_id == self.test_project.id)
                )
            ).delete(synchronize_session=False)

            self.db.query(ProjectDocument).filter(ProjectDocument.project_id == self.test_project.id).delete(synchronize_session=False)
            self.db.query(Project).filter(Project.id == self.test_project.id).delete(synchronize_session=False)
            self.db.query(User).filter(User.id == self.test_user.id).delete(synchronize_session=False)
            self.db.commit()
        except Exception:
            self.db.rollback()
        finally:
            self.db.close()

    def test_chunking_and_metadata(self):
        rag = RAGService(self.db)
        sample_text = (
            "Quantum superposition is a fundamental principle of quantum mechanics. "
            "In classical physics, a system is always in a definite state. "
            "In quantum mechanics, a system can be in multiple states simultaneously. "
            "Qubits can be in state 0, state 1, or any linear combination of both. "
            "Entanglement enables correlated states across quantum particles."
        )

        pages = [{"text": sample_text, "page_number": 1}]
        chunks = rag.chunk_text(pages, chunk_size=120, chunk_overlap=30)
        self.assertGreater(len(chunks), 1)
        for chunk in chunks:
            self.assertIn("content", chunk)
            self.assertIn("chunk_index", chunk)
            self.assertGreater(len(chunk["content"]), 0)

    def test_cosine_similarity(self):
        rag = RAGService(self.db)
        vec_a = [1.0, 0.0, 0.0]
        vec_b = [1.0, 0.0, 0.0]
        vec_c = [0.0, 1.0, 0.0]
        vec_d = [-1.0, 0.0, 0.0]

        # Identical vectors -> 1.0
        sim_identical = rag.cosine_similarity(vec_a, vec_b)
        self.assertAlmostEqual(sim_identical, 1.0, places=5)

        # Orthogonal vectors -> 0.0
        sim_orthogonal = rag.cosine_similarity(vec_a, vec_c)
        self.assertAlmostEqual(sim_orthogonal, 0.0, places=5)

        # Opposite vectors -> -1.0
        sim_opposite = rag.cosine_similarity(vec_a, vec_d)
        self.assertAlmostEqual(sim_opposite, -1.0, places=5)

    def test_grounding_prompt_formatting(self):
        rag = RAGService(self.db)
        mock_chunks = [
            {
                "chunk_id": str(uuid4()),
                "filename": "quantum_spec.pdf",
                "page_number": 2,
                "similarity": 0.885,
                "source_ref": "quantum_spec.pdf (Page 2)",
                "content": "Superconducting transmons operate at 15 millikelvin temperatures.",
            },
            {
                "chunk_id": str(uuid4()),
                "filename": "quantum_spec.pdf",
                "page_number": 5,
                "similarity": 0.821,
                "source_ref": "quantum_spec.pdf (Page 5)",
                "content": "Error mitigation uses zero-noise extrapolation and dynamical decoupling.",
            },
        ]

        formatted = rag.format_context_for_prompt(mock_chunks)
        self.assertIn("[Source 1: quantum_spec.pdf (Page 2)]", formatted)
        self.assertIn("Superconducting transmons", formatted)
        self.assertIn("[Source 2: quantum_spec.pdf (Page 5)]", formatted)
        self.assertIn("Error mitigation", formatted)

    def test_has_documents_flag(self):
        rag = RAGService(self.db)
        # Initially false
        self.assertFalse(rag.has_documents(self.test_project.id))

        # Add a test document
        doc = ProjectDocument(
            id=uuid4(),
            project_id=self.test_project.id,
            filename="notes.txt",
            file_type="txt",
            file_size=1024,
            chunk_count=2,
        )
        self.db.add(doc)
        self.db.commit()

        # Now true
        self.assertTrue(rag.has_documents(self.test_project.id))

    def test_cascading_document_deletion(self):
        rag = RAGService(self.db)
        doc = ProjectDocument(
            id=uuid4(),
            project_id=self.test_project.id,
            filename="architecture.md",
            file_type="md",
            file_size=2048,
            chunk_count=2,
        )
        self.db.add(doc)
        self.db.flush()

        chunk1 = DocumentChunk(
            id=uuid4(),
            document_id=doc.id,
            project_id=self.test_project.id,
            chunk_index=0,
            content="First architectural block",
            embedding=[0.1] * 10,
        )
        chunk2 = DocumentChunk(
            id=uuid4(),
            document_id=doc.id,
            project_id=self.test_project.id,
            chunk_index=1,
            content="Second architectural block",
            embedding=[0.2] * 10,
        )
        self.db.add_all([chunk1, chunk2])
        self.db.commit()

        # Verify chunks exist
        self.assertEqual(self.db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count(), 2)

        # Delete document via RAG service
        rag.delete_document(self.test_project.id, doc.id, self.test_user)

        # Verify document and related chunks are completely deleted
        self.assertIsNone(self.db.query(ProjectDocument).filter(ProjectDocument.id == doc.id).first())
        self.assertEqual(self.db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count(), 0)

    def test_multi_tenant_project_isolation(self):
        rag = RAGService(self.db)

        # Another user and project
        other_user = User(
            id=uuid4(),
            email=f"other_{uuid4().hex[:8]}@example.com",
            password_hash="password",
            full_name="Other User",
            is_active=True,
        )
        other_project = Project(
            id=uuid4(),
            title="Confidential Project",
            user_id=other_user.id,
        )
        self.db.add_all([other_user, other_project])
        self.db.commit()

        try:
            # Current test_user should NOT have access to other_project
            with self.assertRaises(Exception):
                rag._verify_project_access(other_project.id, self.test_user)
        finally:
            self.db.query(Project).filter(Project.id == other_project.id).delete(synchronize_session=False)
            self.db.query(User).filter(User.id == other_user.id).delete(synchronize_session=False)
            self.db.commit()


if __name__ == "__main__":
    unittest.main()
