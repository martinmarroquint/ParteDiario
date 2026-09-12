import logging
from fastapi import APIRouter, Depends, HTTPException

from app.models.solicitud import (
    SolicitudCreate, SolicitudApprove, SolicitudReject, SolicitudCancel,
    SolicitudResponse, SolicitudListResponse, SolicitudStats,
)
from app.services.solicitud_service import SolicitudService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/solicitudes", tags=["Solicitudes de Cambio"])

sheets_service = GoogleSheetsService()
solicitud_service = SolicitudService(sheets_service)


# ============================================
# Role helpers
# ============================================

def _user_is_jefe(user: User) -> bool:
    if hasattr(user, "roles") and user.roles:
        return any(r in user.roles for r in [1, 2, 3])
    return False


def _user_is_admin(user: User) -> bool:
    if hasattr(user, "roles") and user.roles:
        return 4 in user.roles
    return False


def _user_max_role(user: User) -> int:
    if hasattr(user, "roles") and user.roles:
        return max(user.roles)
    return 0


# ============================================
# Endpoints
# ============================================

@router.get("", response_model=SolicitudListResponse)
async def get_mis_solicitudes(current_user: User = Depends(get_current_user)):
    """Get solicitudes created by the current user."""
    solicitudes = await solicitud_service.get_solicitudes_propias(current_user.id)
    return SolicitudListResponse(solicitudes=solicitudes, total=len(solicitudes))


@router.get("/bandeja", response_model=SolicitudListResponse)
async def get_bandeja(current_user: User = Depends(get_current_user)):
    """Get solicitudes the user can act on (permission-filtered inbox)."""
    solicitudes = await solicitud_service.get_bandeja(current_user.id)
    return SolicitudListResponse(solicitudes=solicitudes, total=len(solicitudes))


@router.get("/estadisticas", response_model=SolicitudStats)
async def get_estadisticas(current_user: User = Depends(get_current_user)):
    """Get counts by status for the current user."""
    return await solicitud_service.get_estadisticas(current_user.id)


@router.get("/{solicitud_id}", response_model=SolicitudResponse)
async def get_solicitud(solicitud_id: str, current_user: User = Depends(get_current_user)):
    """Get a single solicitud with full history."""
    solicitud = await solicitud_service.get_solicitud(solicitud_id)
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return SolicitudResponse(solicitud=solicitud)


@router.post("", response_model=SolicitudResponse, status_code=201)
async def crear_solicitud(
    data: SolicitudCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new change request (any active user)."""
    try:
        solicitud = await solicitud_service.crear_solicitud(current_user.id, data)
        return SolicitudResponse(solicitud=solicitud)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Error creando solicitud: {e}")
        raise HTTPException(status_code=500, detail="Error interno al crear solicitud")


@router.put("/{solicitud_id}/approve", response_model=SolicitudResponse)
async def approve_solicitud(
    solicitud_id: str,
    data: SolicitudApprove,
    current_user: User = Depends(get_current_user),
):
    """Approve a solicitud at the current level."""
    try:
        solicitud = await solicitud_service.aprobar_solicitud(
            solicitud_id, current_user.id, data
        )
        return SolicitudResponse(solicitud=solicitud)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.put("/{solicitud_id}/reject", response_model=SolicitudResponse)
async def reject_solicitud(
    solicitud_id: str,
    data: SolicitudReject,
    current_user: User = Depends(get_current_user),
):
    """Reject a solicitud at the current level."""
    try:
        solicitud = await solicitud_service.rechazar_solicitud(
            solicitud_id, current_user.id, data
        )
        return SolicitudResponse(solicitud=solicitud)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.put("/{solicitud_id}/cancel", response_model=SolicitudResponse)
async def cancel_solicitud(
    solicitud_id: str,
    data: SolicitudCancel,
    current_user: User = Depends(get_current_user),
):
    """Cancel a solicitud (only by the requester, only if pending)."""
    try:
        solicitud = await solicitud_service.cancelar_solicitud(
            solicitud_id, current_user.id, data
        )
        return SolicitudResponse(solicitud=solicitud)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
