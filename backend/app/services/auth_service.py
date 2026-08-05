from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.schemas.auth import LoginRequest, Token
from app.models.user import User
from app.core.security import (
    verify_password,
    create_access_token,
)


class AuthService:
    """
    Authentication business logic.
    """

    def __init__(self, repository: UserRepository):
        self.repository = repository

    def register(self, user_data: UserCreate) -> User:
        """
        Register a new user.
        """

        existing_user = self.repository.get_by_email(user_data.email)

        if existing_user:
            raise ValueError("Email already registered.")

        return self.repository.create(user_data)

    def login(self, login_data: LoginRequest) -> Token:
        """
        Authenticate a user.
        """

        user = self.repository.get_by_email(login_data.email)

        if user is None:
            raise ValueError("Invalid email or password.")

        if not verify_password(
            login_data.password,
            user.password_hash,
        ):
            raise ValueError("Invalid email or password.")

        access_token = create_access_token(
            subject=str(user.id)
        )

        return Token(
            access_token=access_token
        )