from uuid import UUID

from app.db.session import SessionLocal
from app.models.node import Node
from app.models.edge import Edge


MIND_MAP_ID = UUID(
    "9270a4c5-eb94-41ea-9b01-02223dee7dd8"
)


db = SessionLocal()

try:
    # Create temporary nodes
    node_a = Node(
        mind_map_id=MIND_MAP_ID,
        label="TEMP DELETE A",
        type="default",
        position_x=0.0,
        position_y=0.0,
    )

    node_b = Node(
        mind_map_id=MIND_MAP_ID,
        label="TEMP DELETE B",
        type="default",
        position_x=100.0,
        position_y=100.0,
    )

    db.add_all([node_a, node_b])
    db.flush()

    # Create temporary edge
    edge = Edge(
        mind_map_id=MIND_MAP_ID,
        source=node_a.id,
        target=node_b.id,
        type="default",
        animated=False,
    )

    db.add(edge)
    db.flush()

    print("TEMP GRAPH CREATED")
    print("Node A:", node_a.id)
    print("Node B:", node_b.id)
    print("Edge:", edge.id)

    # Commit test graph
    db.commit()

    # Delete edge first
    db.delete(edge)

    # Delete nodes
    db.delete(node_a)
    db.delete(node_b)

    db.commit()

    # Verify cleanup
    remaining_nodes = (
        db.query(Node)
        .filter(
            Node.mind_map_id == MIND_MAP_ID,
            Node.label.in_(
                ["TEMP DELETE A", "TEMP DELETE B"]
            ),
        )
        .count()
    )

    remaining_edges = (
        db.query(Edge)
        .filter(Edge.mind_map_id == MIND_MAP_ID)
        .filter(
            Edge.source.in_(
                db.query(Node.id).filter(
                    Node.mind_map_id == MIND_MAP_ID
                )
            )
        )
        .count()
    )

    print("TEMP GRAPH DELETED")
    print("Remaining temporary nodes:", remaining_nodes)
    print("Remaining related edges:", remaining_edges)

finally:
    db.close()