"""Padron de personal y preparacion de meses (solo administrador)."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.middleware.auth import require_admin
from app.models.user import User
from app.services.personal_service import PersonalService
from app.services.sheets_service import GoogleSheetsService
from app.utils.hojas import hoja_actual

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/personal", tags=["Padron de personal"])

sheets_service = GoogleSheetsService()
personal_service = PersonalService(sheets_service)


class PersonaIn(BaseModel):
    dni: str = Field("", max_length=12)
    grado: str = Field(..., max_length=40)
    nombre: str = Field(..., max_length=120)
    area: str = Field(..., max_length=120)
    medico: bool = False


class Clave(BaseModel):
    dni: str = ""
    nombre: str = ""


class AltaIn(BaseModel):
    persona: PersonaIn
    desde: str = ""   # pestana desde la que rige (default: mes actual)


class EditarIn(BaseModel):
    clave: Clave
    persona: PersonaIn
    desde: str = ""


class BajaIn(BaseModel):
    clave: Clave
    desde: str = ""


class ReactivarIn(BaseModel):
    clave: Clave
    area: str
    desde: str = ""


class InicializarIn(BaseModel):
    hoja_origen: str


class GenerarMesIn(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2027, le=2100)
    plantilla: Optional[str] = ""


async def _ejecutar(coro):
    try:
        return await coro
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Error devuelto por el Apps Script ("Apps Script: <mensaje>")
        raise HTTPException(status_code=400, detail=str(e).replace("Apps Script: ", ""))


@router.get("")
async def listar(current_user: User = Depends(require_admin)):
    data = await _ejecutar(personal_service.listar())
    data["hojas"] = await _ejecutar(personal_service.hojas_mes())
    data["hoja_actual"] = hoja_actual()
    data["total"] = len(data["personal"])
    return data


@router.post("/inicializar")
async def inicializar(body: InicializarIn, current_user: User = Depends(require_admin)):
    return await _ejecutar(personal_service.inicializar(body.hoja_origen, current_user.nombre))


@router.post("")
async def alta(body: AltaIn, current_user: User = Depends(require_admin)):
    return await _ejecutar(personal_service.alta(body.persona.model_dump(), body.desde, current_user.nombre))


@router.put("")
async def editar(body: EditarIn, current_user: User = Depends(require_admin)):
    return await _ejecutar(personal_service.editar(
        body.clave.model_dump(), body.persona.model_dump(), body.desde, current_user.nombre))


@router.post("/baja")
async def baja(body: BajaIn, current_user: User = Depends(require_admin)):
    return await _ejecutar(personal_service.baja(body.clave.model_dump(), body.desde, current_user.nombre))


@router.post("/reactivar")
async def reactivar(body: ReactivarIn, current_user: User = Depends(require_admin)):
    return await _ejecutar(personal_service.reactivar(
        body.clave.model_dump(), body.area, body.desde, current_user.nombre))


@router.get("/anio/{anio}")
async def estado_anio(anio: int, current_user: User = Depends(require_admin)):
    return {"anio": anio, "meses": await _ejecutar(personal_service.estado_anio(anio))}


@router.post("/generar-mes")
async def generar_mes(body: GenerarMesIn, current_user: User = Depends(require_admin)):
    return await _ejecutar(personal_service.generar_mes(
        body.mes, body.anio, body.plantilla or "", current_user.nombre))
