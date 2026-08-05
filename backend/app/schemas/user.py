from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    """
    Base user schema.
    """

    full_name: str
    email: EmailStr


class UserCreate(UserBase):
    """
    Request schema for user registration.
    """

    password: str


class UserUpdate(BaseModel):
    """
    Request schema for updating a user profile.
    """

    full_name: str | None = None
    profile_image: str | None = None


class UserResponse(UserBase):
    """
    Response schema returned to the client.
    """

    id: UUID
    profile_image: str | None
    auth_provider: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)