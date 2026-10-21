import asyncio
import json
from uuid import UUID
from typing import Dict, List, Any
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps mind_map_id to a list of (WebSocket, user_id, user_name)
        self.active_connections: Dict[UUID, List[Dict[str, Any]]] = {}
        # Maps user_id to a list of WebSocket connections for personal notification delivery
        self.user_connections: Dict[UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, mind_map_id: UUID, user_id: UUID, user_name: str):
        await websocket.accept()
        if mind_map_id not in self.active_connections:
            self.active_connections[mind_map_id] = []
        
        connection_info = {
            "ws": websocket,
            "user_id": str(user_id),
            "user_name": user_name
        }
        self.active_connections[mind_map_id].append(connection_info)
        
        # Broadcast that a user joined
        await self.broadcast(mind_map_id, {
            "type": "user_joined",
            "user_id": str(user_id),
            "user_name": user_name
        }, exclude_ws=websocket)

    def disconnect(self, websocket: WebSocket, mind_map_id: UUID):
        if mind_map_id in self.active_connections:
            # Find the user to broadcast leave
            user_info = next((c for c in self.active_connections[mind_map_id] if c["ws"] == websocket), None)
            
            self.active_connections[mind_map_id] = [c for c in self.active_connections[mind_map_id] if c["ws"] != websocket]
            if len(self.active_connections[mind_map_id]) == 0:
                del self.active_connections[mind_map_id]
                
            if user_info:
                # Fire and forget the broadcast (since disconnect is synchronous)
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(self.broadcast(mind_map_id, {
                        "type": "user_left",
                        "user_id": user_info["user_id"]
                    }))
                except Exception:
                    pass

    async def broadcast(self, mind_map_id: UUID, message: dict, exclude_ws: WebSocket = None):
        if mind_map_id in self.active_connections:
            dead_sockets = []
            for connection in self.active_connections[mind_map_id]:
                if connection["ws"] != exclude_ws:
                    try:
                        await connection["ws"].send_json(message)
                    except Exception:
                        dead_sockets.append(connection["ws"])
                        
            # Clean up dead sockets
            for dead in dead_sockets:
                self.disconnect(dead, mind_map_id)

    def get_room_users(self, mind_map_id: UUID) -> List[Dict[str, Any]]:
        if mind_map_id not in self.active_connections:
            return []
        return [
            {"user_id": c["user_id"], "user_name": c["user_name"]}
            for c in self.active_connections[mind_map_id]
        ]

    # User-level Notification WebSocket Management
    async def connect_user(self, websocket: WebSocket, user_id: UUID):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)

    def disconnect_user(self, websocket: WebSocket, user_id: UUID):
        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                ws for ws in self.user_connections[user_id] if ws != websocket
            ]
            if len(self.user_connections[user_id]) == 0:
                del self.user_connections[user_id]

    async def broadcast_to_user(self, user_id: UUID, message: dict):
        if user_id in self.user_connections:
            dead_sockets = []
            for ws in list(self.user_connections[user_id]):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_sockets.append(ws)
            for dead in dead_sockets:
                self.disconnect_user(dead, user_id)


manager = ConnectionManager()
