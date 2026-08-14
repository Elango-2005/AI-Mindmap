from uuid import UUID

from app.db.session import SessionLocal
from app.models.node import Node
from app.models.edge import Edge
from app.repositories.mind_map_repository import MindMapRepository
from app.services.ai_mind_map_service import AIMindMapService
from app.services.ai_service import AIService


MIND_MAP_ID = UUID(
    "9270a4c5-eb94-41ea-9b01-02223dee7dd8"
)


db = SessionLocal()

service = AIMindMapService(
    db=db,
    mind_map_repository=MindMapRepository(db),
    ai_service=AIService(),
)

try:
    # --------------------------------------------------
    # Create OLD graph
    # --------------------------------------------------

    old_node_a = Node(
        mind_map_id=MIND_MAP_ID,
        label="ROLLBACK OLD A",
        type="default",
        position_x=0.0,
        position_y=0.0,
    )

    old_node_b = Node(
        mind_map_id=MIND_MAP_ID,
        label="ROLLBACK OLD B",
        type="default",
        position_x=100.0,
        position_y=100.0,
    )

    db.add_all([
        old_node_a,
        old_node_b,
    ])

    db.flush()

    old_edge = Edge(
        mind_map_id=MIND_MAP_ID,
        source=old_node_a.id,
        target=old_node_b.id,
        type="default",
        animated=False,
    )

    db.add(old_edge)
    db.commit()

    print("OLD GRAPH CREATED")

    # --------------------------------------------------
    # Invalid NEW graph
    # --------------------------------------------------

    invalid_graph = {
        "nodes": [
            {
                "id": "root",
                "label": "NEW ROOT",
            },
            {
                "id": "child",
                "label": "NEW CHILD",
            },
        ],
        "edges": [
            {
                "source": "root",
                "target": "invalid-node",
            }
        ],
    }

    # --------------------------------------------------
    # Attempt replacement
    # --------------------------------------------------

    try:
        service.replace_mind_map_graph(
            MIND_MAP_ID,
            invalid_graph,
        )

    except Exception as error:
        print(
            "EXPECTED REPLACEMENT FAILURE:",
            error,
        )

    # --------------------------------------------------
    # Verify OLD graph survived
    # --------------------------------------------------

    old_nodes = (
        db.query(Node)
        .filter(
            Node.mind_map_id == MIND_MAP_ID,
            Node.label.in_([
                "ROLLBACK OLD A",
                "ROLLBACK OLD B",
            ]),
        )
        .count()
    )

    new_nodes = (
        db.query(Node)
        .filter(
            Node.mind_map_id == MIND_MAP_ID,
            Node.label.in_([
                "NEW ROOT",
                "NEW CHILD",
            ]),
        )
        .count()
    )

    old_edges = (
        db.query(Edge)
        .filter(
            Edge.mind_map_id == MIND_MAP_ID
        )
        .count()
    )

    print(
        "Old nodes after rollback:",
        old_nodes,
    )

    print(
        "New nodes after rollback:",
        new_nodes,
    )

    print(
        "Edges after rollback:",
        old_edges,
    )

finally:
    db.close()