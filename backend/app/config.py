import os
import json
from typing import List, Union, Optional
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

    ALLOWED_ORIGINS: Union[List[str], str] = [
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
    ALLOWED_ORIGIN_REGEX: Optional[str] = r"^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$"

    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    def get_allowed_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, str):
            val = self.ALLOWED_ORIGINS.strip()
            if val.startswith("[") and val.endswith("]"):
                try:
                    return json.loads(val)
                except Exception:
                    pass
            return [o.strip() for o in val.split(",") if o.strip()]
        return list(self.ALLOWED_ORIGINS)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()
