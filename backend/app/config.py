import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "AICTE SmartApproval"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "aicte-smartapproval-secret-key-change-in-production-smart-india-hackathon-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    DATABASE_URL: str = "mysql+pymysql://root:12345@localhost:3306/aicte_smartapproval"
    SQL_ECHO: bool = False

    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 15728640  # 15MB

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://institution.example.com",
        "https://reviewer.example.com",
        "https://api.example.com"
    ]

    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()
