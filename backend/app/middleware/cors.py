from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


def setup_cors(app):
    """Configure CORS middleware.

    Origins configured in ALLOWED_ORIGINS are always allowed.
    Localhost is always allowed (developers need to test locally).
    """
    origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Always allow localhost for local development
    allow_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=allow_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,
    )