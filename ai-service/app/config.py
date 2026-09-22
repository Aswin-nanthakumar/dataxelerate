"""URBANFLOW AI service configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "URBANFLOW AI Service"
    version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8000
    internal_token: str = "urbanflow-internal"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    model_cache_ttl_s: int = 3600
    log_level: str = "info"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
