from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.descanso import (
    DescansoMedico, DescansoMedicoCreate,
    DescansoMedicoResponse, DescansoMedicoListResponse
)
from app.services.descanso_service import DescansoService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user, require_jefe_or_admin
from app.models.user import User

router = APIRouter(prefix="/descansos", tags=["Descansos Médicos"])

sheets_service = GoogleSheetsService()
descanso_service = DescansoService(sheets_service)


@router.get("", response_model=DescansoMedicoListResponse)
async def get_descansos(
    area: Optional[str] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    anio: Optional[int] = Query(None, ge=2020),
    current_user: User = Depends(get_current_user)
):
    """Get descansos based on user permissions."""
    descansos = await descanso_service.get_descansos(
        current_user.id, area=area, mes=mes, anio=anio
    )
    return DescansoMedicoListResponse(descansos=descansos, total=len(descansos))


@router.get("/mis", response_model=DescansoMedicoListResponse)
async def get_mis_descansos(
    anio: Optional[int] = Query(None, ge=2020),
    current_user: User = Depends(get_current_user)
):
    """Get current user's descansos."""
    descansos = await descanso_service.get_mis_descansos(current_user.id, anio=anio)
    return DescansoMedicoListResponse(descansos=descansos, total=len(descansos))


@router.get("/{descanso_id}", response_model=DescansoMedicoResponse)
async def get_descanso(
    descanso_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get descanso by ID."""
    descansos = await descanso_service.get_descansos(current_user.id)
    for d in descansos:
        if d.id == descanso_id:
            return DescansoMedicoResponse(descanso=d)
    raise HTTPException(status_code=404, detail="Descanso no encontrado")


@router.post("", response_model=DescansoMedicoResponse, status_code=201)
async def registrar_descanso(
    data: DescansoMedicoCreate,
    current_user: User = Depends(get_current_user)
):
    """Register a medical rest (any user for their area)."""
    try:
        descanso = await descanso_service.registrar_descanso(current_user.id, data)
        return DescansoMedicoResponse(descanso=descanso)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{descanso_id}")
async def eliminar_descanso(
    descanso_id: str,
    current_user: User = Depends(require_jefe_or_admin)
):
    """Delete a descanso (jefe_area+ or admin)."""
    result = await descanso_service.eliminar_descanso(descanso_id)
    if not result:
        raise HTTPException(status_code=404, detail="Descanso no encontrado")
    return {"message": "Descanso eliminado correctamente"}
