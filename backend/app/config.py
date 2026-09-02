import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Google Sheets
    GOOGLE_SHEETS_API_KEY: str = ""
    GOOGLE_SHEETS_ID: str = ""
    GOOGLE_APPS_SCRIPT_URL: str = ""  # Apps Script web app URL for write operations
    
    # JWT
    JWT_SECRET: str = "change-this-to-a-secure-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_API: str = "100/minute"
    
    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # App Info
    APP_NAME: str = "OCR Roles Servicio API"
    APP_VERSION: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
