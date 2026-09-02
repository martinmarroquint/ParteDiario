import logging
import time
from fastapi import Request

logger = logging.getLogger("audit")


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
