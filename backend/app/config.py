"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # AI Parser
    GEMINI_API_KEY: str = ""

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/nlc.db"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    # App
    APP_NAME: str = "NLC - Natural Language Workflow Compiler"
    DEBUG: bool = True

    # Authentication
    SECRET_KEY: str = "veriflow-dev-secret-key-change-in-production-2024"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for demo

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
