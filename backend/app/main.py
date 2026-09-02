import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import limiter

from app.routers import (
    auth,
    users,
    roles,
    solicitudes,
    descansos,
    vacaciones,
    areas,
    estructura_jerarquica,
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    yield
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API para gestión de roles de servicio hospitalario PNP",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

# Setup CORS
setup_cors(app)

# Rate limiter
app.state.limiter = limiter


# Logging middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log all requests with timing."""
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    log_data = {
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration_ms": round(duration * 1000, 2),
        "client": request.client.host if request.client else "unknown",
    }
    if response.status_code >= 400:
        logger.warning(f"Request failed: {log_data}")
    else:
        logger.info(f"Request: {log_data}")
    return response


# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(roles.router, prefix="/api/v1")
app.include_router(solicitudes.router, prefix="/api/v1")
app.include_router(descansos.router, prefix="/api/v1")
app.include_router(vacaciones.router, prefix="/api/v1")
app.include_router(areas.router, prefix="/api/v1")
app.include_router(estructura_jerarquica.router, prefix="/api/v1")


@app.get("/", tags=["Root"])
async def root():
    """Health check endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "google_sheets": "configured" if settings.GOOGLE_SHEETS_API_KEY else "not_configured",
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )
