import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.descanso import (
    DescansoMedico, DescansoMedicoCreate,
    DescansoMedicoResponse, DescansoMedicoListResponse,
    DescansoRolCreate, DescansoRolResponse,
)
from app.services.descanso_service import DescansoService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user, require_jefe_or_admin
from app.models.user import User

logger = logging.getLogger(__name__)

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
    """Register a medical rest (any authenticated user, incluido el visor)."""
    try:
        descanso = await descanso_service.registrar_descanso(current_user.id, data)
        return DescansoMedicoResponse(descanso=descanso)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rol", response_model=DescansoRolResponse, status_code=201)
async def registrar_descanso_en_rol(
    data: DescansoRolCreate,
    current_user: User = Depends(get_current_user),
):
    """Registra un descanso medico del personal del ROL (lo que usa el panel).

    Marca DESCANSO MEDICO en las pestanas de mes afectadas y deja constancia
    en DESCANSOS_MEDICOS. Mismo permiso que antes (cualquier usuario
    autenticado, incluido el visor). Si algo falla, devuelve el error en vez
    de dar por registrado lo que no se guardo.
    """
    try:
        return await descanso_service.registrar_en_rol(
            data, responsable=current_user.nombre or f"user {current_user.id}"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Error de almacenamiento registrando descanso: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception(f"Error inesperado registrando descanso: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error interno al registrar el descanso. Revise el rol e intente nuevamente.",
        )


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
