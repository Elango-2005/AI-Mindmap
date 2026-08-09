from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    projects,
    mind_maps,
    nodes,
    edges,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(mind_maps.router)
api_router.include_router(nodes.router)
api_router.include_router(edges.router)