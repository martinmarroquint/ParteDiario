from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
import re


def setup_cors(app):
    """Configure CORS middleware.
    
    SECURITY FIX: In production, only allow the configured origins.
    Localhost is allowed only when ENVIRONMENT=development.
    """
    origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]
    
    # Only allow localhost in development mode
    allow_regex = None
    if settings.ENVIRONMENT == "development":
        allow_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=allow_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["*"],
    )
