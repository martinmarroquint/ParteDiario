from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
import re


def setup_cors(app):
    """Configure CORS middleware.
    
    Allows configured origins PLUS any localhost origin (for development).
    This prevents CORS issues when testing from localhost:5173, :3000, etc.
    """
    origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]
    
    # Always allow any localhost origin for development
    allow_regex = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
