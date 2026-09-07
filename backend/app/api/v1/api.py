from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    projects,
    mind_maps,
    nodes,
    edges,
    integrations,
    websockets,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(mind_maps.router)
api_router.include_router(nodes.router)
api_router.include_router(edges.router)
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(websockets.router, prefix="/ws", tags=["websockets"])
