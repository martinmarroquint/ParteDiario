import os
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Google Sheets
    GOOGLE_SHEETS_API_KEY: str = ""
    GOOGLE_SHEETS_ID: str = ""
    GOOGLE_APPS_SCRIPT_URL: str = ""  # Apps Script web app URL for write operations
    
    # JWT
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://rolesdeservicio.web.app"
    
    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_API: str = "100/minute"
    
    # Environment
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # App Info
    APP_NAME: str = "OCR Roles Servicio API"
    APP_VERSION: str = "1.0.0"
    
    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v):
        if not v:
            raise ValueError(
                "JWT_SECRET es obligatorio. Configure la variable de entorno JWT_SECRET "
                "con un string aleatorio de al menos 32 caracteres. "
                "Ejemplo: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(v) < 32:
            raise ValueError(
                f"JWT_SECRET debe tener al menos 32 caracteres (actual: {len(v)}). "
                "Use: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
