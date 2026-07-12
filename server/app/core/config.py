"""Application settings loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed configuration for the EcoSphere backend."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://localhost:5432/ecosphere"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    upload_dir: str = "uploads"
    max_upload_mb: int = 5

    mail_enabled: bool = False
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = "noreply@ecosphere.local"
    mail_server: str = "smtp.mailtrap.io"
    mail_port: int = 587


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
