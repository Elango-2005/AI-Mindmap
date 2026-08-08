from uuid import UUID

from app.models.mind_map import MindMap
from app.models.user import User
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.mind_map import MindMapCreate, MindMapUpdate


class MindMapService:
    """
    MindMap business logic.
    """

    def __init__(
        self,
        mind_map_repository: MindMapRepository,
        project_repository: ProjectRepository,
    ):
        self.mind_map_repository = mind_map_repository
        self.project_repository = project_repository

    def create_mind_map(
        self,
        project_id: UUID,
        current_user: User,
        mind_map_data: MindMapCreate,
    ) -> MindMap:
        """
        Create a mind map inside a project owned by the current user.
        """

        project = self.project_repository.get_by_id(project_id)

        if project is None:
            raise ValueError("Project not found.")

        if project.user_id != current_user.id:
            raise ValueError("Access denied.")

        return self.mind_map_repository.create(
            project_id=project_id,
            mind_map_data=mind_map_data,
        )

    def get_project_mind_maps(
        self,
        project_id: UUID,
        current_user: User,
    ) -> list[MindMap]:
        """
        Get all mind maps belonging to a project.
        """

        self._verify_project_access(
            project_id,
            current_user,
        )

        return self.mind_map_repository.get_all_by_project(
            project_id=project_id,
        )

    def get_mind_map(
        self,
        mind_map_id: UUID,
        current_user: User,
    ) -> MindMap:
        """
        Get a mind map and verify ownership.
        """

        mind_map = self.mind_map_repository.get_by_id(
            mind_map_id
        )

        if mind_map is None:
            raise ValueError("Mind map not found.")

        self._verify_project_access(
            mind_map.project_id,
            current_user,
        )

        return mind_map

    def update_mind_map(
        self,
        mind_map_id: UUID,
        current_user: User,
        mind_map_data: MindMapUpdate,
    ) -> MindMap:
        """
        Update a mind map.
        """

        mind_map = self.get_mind_map(
            mind_map_id,
            current_user,
        )

        return self.mind_map_repository.update(
            mind_map=mind_map,
            mind_map_data=mind_map_data,
        )

    def delete_mind_map(
        self,
        mind_map_id: UUID,
        current_user: User,
    ) -> None:
        """
        Delete a mind map.
        """

        mind_map = self.get_mind_map(
            mind_map_id,
            current_user,
        )

        self.mind_map_repository.delete(mind_map)

    def _verify_project_access(
        self,
        project_id: UUID,
        current_user: User,
    ) -> None:
        """
        Verify that the current user owns the project.
        """

        project = self.project_repository.get_by_id(
            project_id
        )

        if project is None:
            raise ValueError("Project not found.")

        if project.user_id != current_user.id:
            raise ValueError("Access denied.")