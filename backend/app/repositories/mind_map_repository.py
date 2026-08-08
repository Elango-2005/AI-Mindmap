from uuid import UUID

from sqlalchemy.orm import Session

from app.models.mind_map import MindMap
from app.schemas.mind_map import MindMapCreate, MindMapUpdate


class MindMapRepository:
    """
    Repository for MindMap database operations.
    """

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        project_id: UUID,
        mind_map_data: MindMapCreate,
    ) -> MindMap:
        """
        Create a new mind map.
        """

        mind_map = MindMap(
            project_id=project_id,
            title=mind_map_data.title,
        )

        self.db.add(mind_map)
        self.db.commit()
        self.db.refresh(mind_map)

        return mind_map

    def get_all_by_project(
        self,
        project_id: UUID,
    ) -> list[MindMap]:
        """
        Get all mind maps belonging to a project.
        """

        return (
            self.db.query(MindMap)
            .filter(MindMap.project_id == project_id)
            .all()
        )

    def get_by_id(
        self,
        mind_map_id: UUID,
    ) -> MindMap | None:
        """
        Get a mind map by ID.
        """

        return (
            self.db.query(MindMap)
            .filter(MindMap.id == mind_map_id)
            .first()
        )

    def update(
        self,
        mind_map: MindMap,
        mind_map_data: MindMapUpdate,
    ) -> MindMap:
        """
        Update an existing mind map.
        """

        if mind_map_data.title is not None:
            mind_map.title = mind_map_data.title

        self.db.commit()
        self.db.refresh(mind_map)

        return mind_map

    def delete(
        self,
        mind_map: MindMap,
    ) -> None:
        """
        Delete a mind map.
        """

        self.db.delete(mind_map)
        self.db.commit()