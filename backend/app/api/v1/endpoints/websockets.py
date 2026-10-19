from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError

from app.core.config import settings
from app.services.websocket_manager import manager
from app.services.collaboration_service import collaboration_service
from app.db.session import SessionLocal
from app.repositories.user_repository import UserRepository
from app.models.mind_map import MindMap

router = APIRouter()

async def get_user_from_token(token: str):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
            
        db = SessionLocal()
        repo = UserRepository(db)
        user = repo.get_by_id(UUID(user_id_str))
        db.close()
        return user
    except JWTError:
        return None
    except Exception:
        return None

@router.websocket("/collaboration/{mind_map_id}")
async def websocket_endpoint(websocket: WebSocket, mind_map_id: UUID, token: str = None):
    if not token:
        await websocket.close(code=1008)
        return
        
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008)
        return

    # Security check: verify mind map exists
    db = SessionLocal()
    try:
        mind_map = db.query(MindMap).filter(MindMap.id == mind_map_id).first()
        if not mind_map:
            await websocket.close(code=1008)
            return

        # Connect user to connection manager
        await manager.connect(websocket, mind_map_id, user.id, user.full_name)

        # Send full initial CRDT sync state to newly connected client
        sync_state = collaboration_service.get_full_sync_state(db, mind_map_id)
        # Include current active users in sync state
        sync_state["connected_users"] = manager.get_room_users(mind_map_id)
        await websocket.send_json(sync_state)

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            clock = int(data.get("clock", 1))
            client_id = str(user.id)

            if msg_type == "node_update":
                node_id = data.get("node_id")
                fields = data.get("fields", {})
                delta = collaboration_service.apply_node_update(
                    db, mind_map_id, node_id, fields, clock, client_id
                )
                if delta:
                    await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)

            elif msg_type == "node_create":
                node_data = data.get("node", {})
                delta = collaboration_service.apply_node_create(
                    db, mind_map_id, node_data, clock, client_id
                )
                if delta:
                    await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)

            elif msg_type == "node_delete":
                node_id = data.get("node_id")
                delta = collaboration_service.apply_node_delete(
                    db, mind_map_id, node_id, clock, client_id
                )
                await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)

            elif msg_type == "edge_create":
                edge_data = data.get("edge", {})
                delta = collaboration_service.apply_edge_create(
                    db, mind_map_id, edge_data, clock, client_id
                )
                if delta:
                    await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)

            elif msg_type == "edge_delete":
                edge_id = data.get("edge_id")
                delta = collaboration_service.apply_edge_delete(
                    db, mind_map_id, edge_id, clock, client_id
                )
                await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)

            elif msg_type == "cursor_move":
                await manager.broadcast(mind_map_id, {
                    "type": "cursor_move",
                    "user_id": client_id,
                    "cursor": data.get("cursor"),
                }, exclude_ws=websocket)

            elif msg_type == "sync_request":
                current_state = collaboration_service.get_full_sync_state(db, mind_map_id)
                current_state["connected_users"] = manager.get_room_users(mind_map_id)
                await websocket.send_json(current_state)

            elif msg_type == "nodes_change":
                # Backward compatibility for legacy ReactFlow node change arrays
                changes = data.get("changes", [])
                for change in changes:
                    c_type = change.get("type")
                    c_id = change.get("id")
                    if c_type == "position" and "position" in change:
                        pos = change["position"]
                        delta = collaboration_service.apply_node_update(
                            db, mind_map_id, c_id,
                            {"position_x": pos.get("x", 0.0), "position_y": pos.get("y", 0.0)},
                            clock, client_id
                        )
                        if delta:
                            await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)
                    elif c_type == "remove":
                        delta = collaboration_service.apply_node_delete(
                            db, mind_map_id, c_id, clock, client_id
                        )
                        await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)

            elif msg_type == "node_text_update":
                # Backward compatibility for legacy text update
                node_id = data.get("nodeId")
                label = data.get("label", "")
                delta = collaboration_service.apply_node_update(
                    db, mind_map_id, node_id, {"label": label}, clock, client_id
                )
                if delta:
                    await manager.broadcast(mind_map_id, delta, exclude_ws=websocket)

            else:
                # Generic relay for other non-conflicting message types
                await manager.broadcast(mind_map_id, data, exclude_ws=websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, mind_map_id)
    finally:
        db.close()
