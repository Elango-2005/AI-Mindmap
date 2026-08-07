from uuid import UUID

from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: UUID,
        project_data: ProjectCreate,
    ) -> Project:
        project = Project(
            user_id=user_id,
            **project_data.model_dump(),
        )

        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)

        return project

    def get_by_id(
        self,
        project_id: UUID,
    ) -> Project | None:
        return (
            self.db.query(Project)
            .filter(Project.id == project_id)
            .first()
        )

    def get_all_by_user(
        self,
        user_id: UUID,
    ) -> list[Project]:
        return (
            self.db.query(Project)
            .filter(Project.user_id == user_id)
            .order_by(Project.created_at.desc())
            .all()
        )

    def update(
        self,
        project: Project,
        project_data: ProjectUpdate,
    ) -> Project:
        update_data = project_data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(project, key, value)

        self.db.commit()
        self.db.refresh(project)

        return project

    def delete(
        self,
        project: Project,
    ) -> None:
        self.db.delete(project)
        self.db.commit()