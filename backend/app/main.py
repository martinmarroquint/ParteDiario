import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

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
    mesa_partes,
    sheets_proxy,
    migration,
    rol_servicio,
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
    # Precalienta el cache de /rol-servicio (parte diario) para que la
    # primera peticion no espere ~7s de lecturas a Google Sheets.
    prewarm_task = asyncio.create_task(rol_servicio.prewarm())
    yield
    prewarm_task.cancel()
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API para gestión de roles de servicio hospitalario PNP",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT == "development" else None,
)

# Setup CORS
setup_cors(app)

# Rate limiter — must be wired as middleware + exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# Logging middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log all requests with timing."""
    start_time = time.time()
    try:
        response = await call_next(request)
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Request crashed: {request.method} {request.url.path} - {e} ({round((time.time() - start_time) * 1000, 2)}ms)")
        raise
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
app.include_router(mesa_partes.router, prefix="/api/v1")
app.include_router(sheets_proxy.router, prefix="/api/v1")
app.include_router(migration.router, prefix="/api/v1")
app.include_router(rol_servicio.router, prefix="/api/v1")


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root():
    """Health check endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "database": "supabase" if settings.USE_SUPABASE else "google_sheets",
            "google_sheets": "configured" if settings.GOOGLE_SHEETS_API_KEY else "not_configured",
            "supabase": "configured" if settings.SUPABASE_URL else "not_configured",
        },
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )
