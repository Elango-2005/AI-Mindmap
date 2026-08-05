from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """
    Login request schema.
    """

    email: EmailStr
    password: str


class Token(BaseModel):
    """
    JWT access token response.
    """

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """
    JWT payload.
    """

    sub: str