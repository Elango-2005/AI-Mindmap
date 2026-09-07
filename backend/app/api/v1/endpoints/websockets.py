from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError

from app.core.config import settings
from app.services.websocket_manager import manager
from app.db.session import SessionLocal
from app.repositories.user_repository import UserRepository

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
        
    await manager.connect(websocket, mind_map_id, user.id, user.full_name)
    
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast the data to everyone else in the room
            await manager.broadcast(mind_map_id, data, exclude_ws=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, mind_map_id)
