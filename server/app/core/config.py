from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Hirelens API"
    app_version: str = "0.2.0"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/codeeditor"
    frontend_origin: str = "http://localhost:5173"
    execution_timeout_ms: int = 5000

    # JWT
    secret_key: str = "CHANGE_ME_IN_PRODUCTION_USE_A_LONG_RANDOM_STRING"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
