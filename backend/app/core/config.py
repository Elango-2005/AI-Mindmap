from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from the .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    # --------------------------------------------------
    # Project
    # --------------------------------------------------

    PROJECT_NAME: str = "AI MindMap API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: str | bool = False

    # --------------------------------------------------
    # Database
    # --------------------------------------------------

    DATABASE_URL: str

    # --------------------------------------------------
    # Security
    # --------------------------------------------------

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --------------------------------------------------
    # AI
    # --------------------------------------------------

    GEMINI_API_KEY: str = Field(default="")

    # --------------------------------------------------
    # Frontend
    # --------------------------------------------------

    FRONTEND_URL: str

    # --------------------------------------------------
    # Integrations - MindMeister
    # --------------------------------------------------

    MINDMEISTER_CLIENT_ID: str = Field(default="")
    MINDMEISTER_CLIENT_SECRET: str = Field(default="")
    MINDMEISTER_REDIRECT_URI: str = Field(
        default="http://127.0.0.1:8000/api/v1/integrations/mindmeister/callback"
    )

    # --------------------------------------------------
    # Integrations - Coggle
    # --------------------------------------------------

    COGGLE_CLIENT_ID: str = Field(default="")
    COGGLE_CLIENT_SECRET: str = Field(default="")
    COGGLE_REDIRECT_URI: str = Field(
        default="http://127.0.0.1:8000/api/v1/integrations/coggle/callback"
    )


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    """
    return Settings()


settings = get_settings()
