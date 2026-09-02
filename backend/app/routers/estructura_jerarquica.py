from fastapi import APIRouter, Depends, HTTPException

from app.models.estructura_jerarquica import EstructuraJerarquica, EstructuraJerarquicaResponse, NivelJerarquico
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/estructura-jerarquica", tags=["Estructura Jerárquica"])

sheets_service = GoogleSheetsService()


@router.get("/{user_id}", response_model=EstructuraJerarquicaResponse)
async def get_estructura(
    user_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get the hierarchical structure for a user."""
    rows = await sheets_service.find_rows("EstructuraJerarquica", 0, str(user_id))
    
    niveles = []
    for row in rows:
        if len(row) >= 6:
            nivel = NivelJerarquico(
                nivel=int(row[1]) if row[1].isdigit() else 1,
                area=row[2] if len(row) > 2 and row[2] else None,
                departamento=row[3] if len(row) > 3 and row[3] else None,
                division=row[4] if len(row) > 4 and row[4] else None,
                jefe_user_id=int(row[5]) if len(row) > 5 and row[5].isdigit() else 0,
                jefe_nombre=row[6] if len(row) > 6 else "",
                es_directo=row[7].upper() == "TRUE" if len(row) > 7 else True,
            )
            niveles.append(nivel)
    
    return EstructuraJerarquicaResponse(
        user_id=user_id,
        cadena=sorted(niveles, key=lambda x: x.nivel)
    )


@router.put("/{user_id}")
async def update_estructura(
    user_id: int,
    data: EstructuraJerarquica,
    current_user: User = Depends(require_admin)
):
    """Update hierarchical structure for a user (admin only)."""
    # Delete existing entries
    existing_rows = await sheets_service.find_rows("EstructuraJerarquica", 0, str(user_id))
    for i in range(len(existing_rows)):
        row_idx = await sheets_service.find_row_index("EstructuraJerarquica", 0, str(user_id))
        if row_idx:
            await sheets_service.delete_row("EstructuraJerarquica", row_idx)
    
    # Add new entries
    for nivel in data.niveles:
        row = [
            user_id,
            nivel.nivel,
            nivel.area or "",
            nivel.departamento or "",
            nivel.division or "",
            nivel.jefe_user_id,
            nivel.jefe_nombre or "",
            "TRUE" if nivel.es_directo else "FALSE",
        ]
        await sheets_service.append_row("EstructuraJerarquica", row)
    
    return {"message": f"Estructura jerárquica actualizada para usuario {user_id}"}
