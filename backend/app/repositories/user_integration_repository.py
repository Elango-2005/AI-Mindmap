from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user_integration import UserIntegration


class UserIntegrationRepository:
    """
    Repository for UserIntegration database operations.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_by_user_and_provider(
        self, user_id: UUID, provider: str
    ) -> UserIntegration | None:
        return (
            self.db.query(UserIntegration)
            .filter(
                UserIntegration.user_id == user_id,
                UserIntegration.provider == provider,
            )
            .first()
        )

    def upsert(
        self,
        user_id: UUID,
        provider: str,
        access_token: str,
        refresh_token: str | None = None,
        token_type: str = "Bearer",
        scope: str | None = None,
        expires_at: datetime | None = None,
        account_id: str | None = None,
        account_name: str | None = None,
        account_email: str | None = None,
    ) -> UserIntegration:
        integration = self.get_by_user_and_provider(user_id, provider)
        if integration:
            integration.access_token = access_token
            if refresh_token is not None:
                integration.refresh_token = refresh_token
            integration.token_type = token_type
            if scope is not None:
                integration.scope = scope
            if expires_at is not None:
                integration.expires_at = expires_at
            if account_id is not None:
                integration.account_id = account_id
            if account_name is not None:
                integration.account_name = account_name
            if account_email is not None:
                integration.account_email = account_email
            integration.updated_at = datetime.utcnow()
        else:
            integration = UserIntegration(
                user_id=user_id,
                provider=provider,
                access_token=access_token,
                refresh_token=refresh_token,
                token_type=token_type,
                scope=scope,
                expires_at=expires_at,
                account_id=account_id,
                account_name=account_name,
                account_email=account_email,
            )
            self.db.add(integration)

        self.db.commit()
        self.db.refresh(integration)
        return integration

    def delete(self, user_id: UUID, provider: str) -> bool:
        integration = self.get_by_user_and_provider(user_id, provider)
        if integration:
            self.db.delete(integration)
            self.db.commit()
            return True
        return False
