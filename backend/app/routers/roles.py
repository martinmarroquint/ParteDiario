from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.role import (
    RolServicioResponse, RolSyncRequest, RolFinalizarRequest,
    RolCeldaRequest
)
from app.services.role_service import RoleService
from app.services.area_service import AreaService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user, require_jefe_or_admin
from app.models.user import User

router = APIRouter(prefix="/roles", tags=["Roles de Servicio"])

sheets_service = GoogleSheetsService()
role_service = RoleService(sheets_service)
area_service = AreaService(sheets_service)


@router.get("", response_model=RolServicioResponse)
async def get_roles(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2020),
    area: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    """Get roles for a specific month, year and area."""
    roles = await role_service.get_roles(mes, anio, area)
    if not roles:
        raise HTTPException(status_code=404, detail="No se encontraron roles para estos parámetros")
    return roles


@router.post("", response_model=dict)
async def save_roles(
    data: RolServicioResponse,
    current_user: User = Depends(require_jefe_or_admin)
):
    """Save roles (jefe_area+ or admin)."""
    # Check if area is locked
    locked = await area_service.is_area_locked(data.area, data.mes, data.anio)
    if locked:
        raise HTTPException(status_code=400, detail="El área está bloqueada para este mes")
    
    result = await role_service.save_roles(data.mes, data.anio, data.area, data.personas, current_user.id)
    return result


@router.put("/celda", response_model=dict)
async def update_celda(
    data: RolCeldaRequest,
    current_user: User = Depends(require_jefe_or_admin)
):
    """Update a single cell in the role sheet."""
    # Check if area is locked
    locked = await area_service.is_area_locked(data.area, data.mes, data.anio)
    if locked:
        raise HTTPException(status_code=400, detail="El área está bloqueada para este mes")
    
    result = await role_service.update_celda(
        data.mes, data.anio, data.area, data.persona, data.dia, data.turno
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/sync", response_model=dict)
async def sync_roles(
    data: RolSyncRequest,
    current_user: User = Depends(require_jefe_or_admin)
):
    """Sync complete role data."""
    locked = await area_service.is_area_locked(data.area, data.mes, data.anio)
    if locked:
        raise HTTPException(status_code=400, detail="El área está bloqueada para este mes")
    
    result = await role_service.sync_roles(data.mes, data.anio, data.area, data.datos, current_user.id)
    return result


@router.post("/finalizar", response_model=dict)
async def finalizar_rol(
    data: RolFinalizarRequest,
    current_user: User = Depends(require_jefe_or_admin)
):
    """Mark role as finalized."""
    result = await role_service.finalizar_rol(data.mes, data.anio, data.area)
    return result


@router.post("/desfinalizar", response_model=dict)
async def desfinalizar_rol(
    data: RolFinalizarRequest,
    current_user: User = Depends(require_jefe_or_admin)
):
    """Unmark role as finalized (jefe_division+ or admin only)."""
    if 3 not in current_user.roles and 4 not in current_user.roles:
        raise HTTPException(status_code=403, detail="Se requiere jefe de división o admin")
    
    result = await role_service.desfinalizar_rol(data.mes, data.anio, data.area)
    return result
