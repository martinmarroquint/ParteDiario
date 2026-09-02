from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.solicitud import (
    Solicitud, SolicitudCreate, SolicitudApprove, SolicitudReject,
    SolicitudResponse, SolicitudListResponse
)
from app.services.solicitud_service import SolicitudService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/solicitudes", tags=["Solicitudes de Cambio"])

sheets_service = GoogleSheetsService()
solicitud_service = SolicitudService(sheets_service)


@router.get("", response_model=SolicitudListResponse)
async def get_solicitudes(
    estado: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get solicitudes based on user permissions."""
    solicitudes = await solicitud_service.get_solicitudes(
        current_user.id, estado=estado, area=area
    )
    return SolicitudListResponse(solicitudes=solicitudes, total=len(solicitudes))


@router.get("/{solicitud_id}", response_model=SolicitudResponse)
async def get_solicitud(
    solicitud_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get solicitud by ID."""
    solicitud = await solicitud_service.get_solicitud(solicitud_id)
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return SolicitudResponse(solicitud=solicitud)


@router.post("", response_model=SolicitudResponse, status_code=201)
async def crear_solicitud(
    data: SolicitudCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new change request (any user)."""
    try:
        solicitud = await solicitud_service.crear_solicitud(current_user.id, data)
        return SolicitudResponse(solicitud=solicitud)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear solicitud: {str(e)}")


@router.put("/{solicitud_id}/approve", response_model=SolicitudResponse)
async def approve_solicitud(
    solicitud_id: str,
    data: SolicitudApprove,
    current_user: User = Depends(get_current_user)
):
    """Approve a solicitud."""
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
    current_user: User = Depends(get_current_user)
):
    """Reject a solicitud."""
    try:
        solicitud = await solicitud_service.rechazar_solicitud(
            solicitud_id, current_user.id, data
        )
        return SolicitudResponse(solicitud=solicitud)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
