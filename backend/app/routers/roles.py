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


@router.get("/turnos")
async def get_turnos(current_user: User = Depends(get_current_user)):
    """Get available turnos from BD sheet (column A=name, column B=hours).
    Returns turnos with short codes matching frontend constantes.
    """
    rows = await sheets_service.get_range("BD")
    if not rows or len(rows) < 2:
        return {"turnos": _get_default_turnos(), "source": "default"}
    
    # Mapping: nombre completo → código corto (igual que en frontend)
    NAME_TO_CODE = {
        'MAÑANA': 'M',
        'TARDE': 'T',
        'FRANCO': 'F',
        '12 HRS M': 'MT',
        '12 HRS N': 'N',
        'FERIADO': 'FE',
        'VACACIONES': 'V',
        'FALTO AL SERVICIO': 'FS',
        'LICENCIA DE GRAVIDEZ': 'LG',
        'DESCANSO MEDICO': 'DM',
        'LEY 12633': 'L12',
        'HOSPITALIZADO': 'H',
        'COMISION': 'C',
        'PERMISO DE RADIACION': 'PR',
        'ADAPTACION A LA VIDA CIVIL': 'AVC',
        'LICENCIA POR ENFERMEDA GRAVE DE FAMILIAR': 'LEGF',
        'LICENCIA ENFERMEDAD GRAVE FAMILIAR': 'LEGF',
        'PERMISO A CUENTA DE VACACIONES': 'PCV',
        'REFERIDO A LIMA': 'RL',
        'SOMETIDO A LEY': 'SL',
        '24 X 48': '24',
        'SERVICIO CONTINUO': 'SC',
        'EXTERNO': 'EXT',
        'CUMPLEAÑOS 🥳🥳🥳🥳': '🎂',
        'RETEN': 'R',
        'SERVICIO': 'S',
        'MAÑANA - 12 HRS N': 'M/N',
        'TARDE - 12 HRS N': 'T/N',
        'ADMINISTRATIVO': 'ADM',
        'LICENCIA POR FALLECIMIENTO DE CONYUGUE': 'LFC',
        'LICENCIA FALLECIMIENTO CONYUGUE': 'LFC',
        'PAPELETA DE PERMISO': 'PP',
        'CAMBIADO OTRA UNIDAD': 'COU',
        '24 HRS MTN': '24M',
        'LICENCIA POR PATERNIDAD': 'LP',
        'OFICIAL DE PERMANENCIA (DIURNO)': 'PD',
        'OFICIAL DE PERMANENCIA (NOCTURNO)': 'PN',
        'OFICIAL DE PERMANENCIA (MAÑANA)': 'PM',
        'OFICIAL DE PERMANENCIA (TARDE)': 'PT',
        'CLASE DE DIA': 'CD',
    }
    
    turnos = []
    found_codes = set()
    
    for row in rows[1:]:  # Skip header
        if not row or not row[0]:
            continue
        nombre = str(row[0]).strip()
        horas = 0
        if len(row) > 1:
            try:
                horas = int(str(row[1]).strip())
            except (ValueError, TypeError):
                horas = 0
        
        nombre_upper = nombre.upper().strip()
        code = NAME_TO_CODE.get(nombre_upper)
        
        if code:
            found_codes.add(code)
            turnos.append({"codigo": code, "nombre": nombre, "horas": horas})
        else:
            # Unknown turno - generate a code
            code = nombre[:3].upper()
            c = code
            n = 2
            while c in found_codes:
                c = f"{code}{n}"
                n += 1
            found_codes.add(c)
            turnos.append({"codigo": c, "nombre": nombre, "horas": horas})
    
    return {"turnos": turnos, "source": "bd_sheet"}


def _get_default_turnos() -> list:
    """Default turnos if BD sheet is unavailable."""
    return [
        {"codigo": "M",   "nombre": "MAÑANA",                             "horas": 6},
        {"codigo": "T",   "nombre": "TARDE",                              "horas": 6},
        {"codigo": "F",   "nombre": "FRANCO",                             "horas": 0},
        {"codigo": "MT",  "nombre": "12 HRS M",                           "horas": 12},
        {"codigo": "N",   "nombre": "12 HRS N",                           "horas": 12},
        {"codigo": "FE",  "nombre": "FERIADO",                            "horas": 0},
        {"codigo": "V",   "nombre": "VACACIONES",                         "horas": 0},
        {"codigo": "FS",  "nombre": "FALTO AL SERVICIO",                  "horas": 0},
        {"codigo": "LG",  "nombre": "LICENCIA DE GRAVIDEZ",               "horas": 0},
        {"codigo": "DM",  "nombre": "DESCANSO MEDICO",                    "horas": 0},
        {"codigo": "L12", "nombre": "LEY 12633",                          "horas": 0},
        {"codigo": "H",   "nombre": "HOSPITALIZADO",                      "horas": 0},
        {"codigo": "C",   "nombre": "COMISION",                           "horas": 0},
        {"codigo": "PR",  "nombre": "PERMISO DE RADIACION",               "horas": 0},
        {"codigo": "AVC", "nombre": "ADAPTACION A LA VIDA CIVIL",         "horas": 0},
        {"codigo": "LEGF","nombre": "LICENCIA ENFERMEDAD GRAVE FAMILIAR", "horas": 0},
        {"codigo": "PCV", "nombre": "PERMISO A CUENTA DE VACACIONES",     "horas": 0},
        {"codigo": "RL",  "nombre": "REFERIDO A LIMA",                    "horas": 0},
        {"codigo": "SL",  "nombre": "SOMETIDO A LEY",                     "horas": 0},
        {"codigo": "24",  "nombre": "24 X 48",                            "horas": 24},
        {"codigo": "SC",  "nombre": "SERVICIO CONTINUO",                  "horas": 24},
        {"codigo": "EXT", "nombre": "EXTERNO",                            "horas": 0},
        {"codigo": "🎂",  "nombre": "CUMPLEAÑOS 🥳",                     "horas": 1},
        {"codigo": "R",   "nombre": "RETEN",                              "horas": 6},
        {"codigo": "S",   "nombre": "SERVICIO",                           "horas": 24},
        {"codigo": "M/N", "nombre": "MAÑANA - 12 HRS N",                  "horas": 18},
        {"codigo": "T/N", "nombre": "TARDE - 12 HRS N",                   "horas": 18},
        {"codigo": "ADM", "nombre": "ADMINISTRATIVO",                     "horas": 8},
        {"codigo": "LFC", "nombre": "LICENCIA FALLECIMIENTO CONYUGUE",    "horas": 0},
        {"codigo": "PP",  "nombre": "PAPELETA DE PERMISO",                "horas": 0},
        {"codigo": "COU", "nombre": "CAMBIADO OTRA UNIDAD",               "horas": 0},
        {"codigo": "24M", "nombre": "24 HRS MTN",                         "horas": 24},
        {"codigo": "LP",  "nombre": "LICENCIA POR PATERNIDAD",            "horas": 0},
        {"codigo": "PD",  "nombre": "OFICIAL DE PERMANENCIA (DIURNO)",    "horas": 12},
        {"codigo": "PN",  "nombre": "OFICIAL DE PERMANENCIA (NOCTURNO)",  "horas": 12},
        {"codigo": "PM",  "nombre": "OFICIAL DE PERMANENCIA (MAÑANA)",    "horas": 6},
        {"codigo": "PT",  "nombre": "OFICIAL DE PERMANENCIA (TARDE)",     "horas": 6},
        {"codigo": "CD",  "nombre": "CLASE DE DIA",                      "horas": 12},
    ]
