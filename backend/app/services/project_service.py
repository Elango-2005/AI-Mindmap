from uuid import UUID

from app.models.project import Project
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
)


class ProjectService:
    """
    Project business logic.
    """

    def __init__(self, repository: ProjectRepository):
        self.repository = repository

    def create_project(
        self,
        current_user: User,
        project_data: ProjectCreate,
    ) -> Project:
        """
        Create a new project.
        """

        return self.repository.create(
            user_id=current_user.id,
            project_data=project_data,
        )

    def get_user_projects(
        self,
        current_user: User,
    ) -> list[Project]:
        """
        Get all projects for the current user.
        """

        return self.repository.get_all_by_user(
            user_id=current_user.id,
        )

    def get_project(
        self,
        project_id: UUID,
        current_user: User,
    ) -> Project:
        """
        Get a project by ID and verify ownership.
        """

        project = self.repository.get_by_id(project_id)

        if project is None:
            raise ValueError("Project not found.")

        if project.user_id != current_user.id:
            raise ValueError("Access denied.")

        return project

    def update_project(
        self,
        project_id: UUID,
        current_user: User,
        project_data: ProjectUpdate,
    ) -> Project:
        """
        Update a project.
        """

        project = self.get_project(
            project_id=project_id,
            current_user=current_user,
        )

        return self.repository.update(
            project=project,
            project_data=project_data,
        )

    def delete_project(
        self,
        project_id: UUID,
        current_user: User,
    ) -> None:
        """
        Delete a project.
        """

        project = self.get_project(
            project_id=project_id,
            current_user=current_user,
        )

        self.repository.delete(project)