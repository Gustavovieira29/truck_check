from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    database_url: str = 'sqlite:///./truck_check.db'
    app_env: str = 'development'
    cors_origins: str = 'http://localhost:4173,http://localhost:5173'
    smtp_host: Optional[str] = 'localhost'
    smtp_port: int = 1025
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = 'noreply@truckcheck.local'
    smtp_use_tls: bool = False

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / '.env',
        env_file_encoding='utf-8',
    )


settings = Settings()
