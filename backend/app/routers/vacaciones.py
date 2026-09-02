from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.vacacion import (
    Vacacion, VacacionCreate,
    VacacionResponse, VacacionListResponse
)
from app.services.vacacion_service import VacacionService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user, require_jefe_or_admin
from app.models.user import User

router = APIRouter(prefix="/vacaciones", tags=["Vacaciones"])

sheets_service = GoogleSheetsService()
vacacion_service = VacacionService(sheets_service)


@router.get("", response_model=VacacionListResponse)
async def get_vacaciones(
    area: Optional[str] = Query(None),
    anio: Optional[int] = Query(None, ge=2020),
    current_user: User = Depends(get_current_user)
):
    """Get vacations based on user permissions."""
    vacaciones = await vacacion_service.get_vacaciones(
        current_user.id, area=area, anio=anio
    )
    return VacacionListResponse(vacaciones=vacaciones, total=len(vacaciones))


@router.get("/mis", response_model=VacacionListResponse)
async def get_mis_vacaciones(
    anio: Optional[int] = Query(None, ge=2020),
    current_user: User = Depends(get_current_user)
):
    """Get current user's vacations."""
    vacaciones = await vacacion_service.get_mis_vacaciones(current_user.id, anio=anio)
    return VacacionListResponse(vacaciones=vacaciones, total=len(vacaciones))


@router.post("", response_model=VacacionResponse, status_code=201)
async def registrar_vacacion(
    data: VacacionCreate,
    current_user: User = Depends(get_current_user)
):
    """Register vacation (any user for their area)."""
    try:
        vacacion = await vacacion_service.registrar_vacacion(current_user.id, data)
        return VacacionResponse(vacacion=vacacion)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{vacacion_id}")
async def eliminar_vacacion(
    vacacion_id: str,
    current_user: User = Depends(require_jefe_or_admin)
):
    """Delete a vacation record (jefe_area+ or admin)."""
    result = await vacacion_service.eliminar_vacacion(vacacion_id)
    if not result:
        raise HTTPException(status_code=404, detail="Vacación no encontrada")
    return {"message": "Vacación eliminada correctamente"}
