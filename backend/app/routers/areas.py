from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.area import Area, AreaLockRequest, AreaListResponse
from app.services.area_service import AreaService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/areas", tags=["Áreas"])

sheets_service = GoogleSheetsService()
area_service = AreaService(sheets_service)


@router.get("", response_model=AreaListResponse)
async def get_areas(current_user: User = Depends(get_current_user)):
    """Get all areas."""
    areas = await area_service.get_areas()
    return AreaListResponse(areas=areas, total=len(areas))


@router.get("/{area_codigo}/bloqueado")
async def is_area_locked(
    area_codigo: str,
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2020),
    current_user: User = Depends(get_current_user)
):
    """Check if an area is locked."""
    locked = await area_service.is_area_locked(area_codigo, mes, anio)
    return {"area": area_codigo, "bloqueado": locked, "mes": mes, "anio": anio}


@router.post("/{area_id}/lock")
async def lock_area(
    area_id: int,
    data: AreaLockRequest,
    current_user: User = Depends(require_admin)
):
    """Lock an area (admin only)."""
    try:
        result = await area_service.lock_area(area_id, data.mes, data.anio)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{area_id}/unlock")
async def unlock_area(
    area_id: int,
    current_user: User = Depends(require_admin)
):
    """Unlock an area (admin only)."""
    try:
        result = await area_service.unlock_area(area_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
