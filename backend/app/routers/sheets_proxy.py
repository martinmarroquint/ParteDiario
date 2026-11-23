"""
Google Sheets Proxy — shields the API key AND HMAC secret from the frontend.

Instead of the frontend calling sheets.googleapis.com or Apps Script directly
(exposing the API key or HMAC secret in the JS bundle), it calls:
- GET  /api/v1/sheets/{sheet_name}      → backend proxies read via Sheets API
- POST /api/v1/sheets/write              → backend proxies write via Apps Script with HMAC

This keeps ALL secrets server-side.

SEGURIDAD
- Lectura: solo las pestanas que el panel necesita (meses, ESTADOS,
  CELDA_MODIFICADA, CAMBIOS, BD, CONFIG). USUARIOS_OCR (hashes de contrasena),
  RECUPERACION, SOLICITUDES, PERSONAL, etc. NO se exponen por aqui: tienen sus
  propios endpoints con control de permisos.
- Escritura: lista blanca de acciones POR ROL. Antes cualquier usuario logueado
  podia mandar `admin_actualizarUsuario` (hacerse admin), `updateRange` o
  `deleteRow` sobre cualquier hoja.
"""
import asyncio
import logging
import time
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.sheets_service import GoogleSheetsService
from app.utils.hojas import es_hoja_mes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sheets", tags=["Sheets Proxy"])

sheets_service = GoogleSheetsService()

# Cache de metadata de hojas: el spreadsheet.get es pesado y se llamaba en
# cada carga del panel — con varios dispositivos saturaba la API (502).
# Guarda (timestamp, lista, version_de_estructura).
_METADATA_CACHE: dict[str, tuple[float, list, int]] = {}
_METADATA_TTL_SECONDS = 300  # 5 minutos

# Pestanas (no mensuales) que el panel puede leer.
HOJAS_LECTURA = {"ESTADOS", "CELDA_MODIFICADA", "CAMBIOS", "BD", "CONFIG"}

# Acciones de escritura permitidas por tipo de usuario.
_ACCIONES_BASE = {
    # Todos (incluido usuario base): consulta de cambios, marcas visuales y
    # registro de descanso medico (la celda solo puede ser DESCANSO MEDICO).
    "obtenerHeartbeat", "registrarDescansoMedico", "registrarCeldaModificada",
    "guardarCelda", "guardarIndividual",
}
_ACCIONES_JEFE = _ACCIONES_BASE | {
    "guardarLote", "guardarLoteCeldas", "limpiarCeldasModificadas",
    "registrarVacaciones", "marcarFinalizado",
}
_ACCIONES_JEFE_DIVISION = _ACCIONES_JEFE | {"desmarcarFinalizado"}
_ACCIONES_ADMIN = _ACCIONES_JEFE_DIVISION | {
    "marcarLoteFinalizado", "desmarcarLoteFinalizado",
    "guardarConfigGlobal",
}
# Acciones que un usuario sin permiso de edicion solo puede usar para marcar
# DESCANSO MEDICO (mismo criterio que ya tenia el rol visualizador).
_SOLO_DESCANSO = {"guardarCelda", "guardarIndividual"}


def _es_descanso(valor: Any) -> bool:
    v = str(valor or "").strip().upper()
    return v == "DM" or v.startswith("DESCANSO")


def _acciones_permitidas(user: User) -> set[str]:
    roles = set(user.roles or [])
    if 4 in roles:
        return _ACCIONES_ADMIN
    if 3 in roles:
        return _ACCIONES_JEFE_DIVISION
    if roles & {1, 2}:
        return _ACCIONES_JEFE
    return _ACCIONES_BASE


def _puede_editar_turnos(user: User) -> bool:
    return bool(set(user.roles or []) & {1, 2, 3, 4})


def _hoja_legible(sheet_name: str) -> bool:
    return sheet_name in HOJAS_LECTURA or es_hoja_mes(sheet_name)


class SheetRangeResponse(BaseModel):
    range: str
    values: list[list]


class AppsScriptWriteRequest(BaseModel):
    """Generic write request to forward to Apps Script with HMAC signing."""
    accion: str
    # All other fields go as **extras
    datos: Optional[dict[str, Any]] = None


# IMPORTANTE: esta ruta va ANTES de "/{sheet_name}" (si no, la capturaria).
@router.get("/estado-cambios")
async def estado_cambios(
    hoja: str = Query("", description="Pestana del mes que el panel tiene abierta"),
    current_user: User = Depends(get_current_user),
):
    """Token barato para el refresco en tiempo real del panel.

    Combina el contador de escrituras del backend (instantaneo, sin tocar
    Google) con el heartbeat de CONFIG!F2 que el Apps Script actualiza en cada
    escritura (cacheado 15 s, una sola lectura para todos los usuarios).
    Si el token cambia, el panel vuelve a leer la hoja del mes.
    """
    heartbeat = ""
    try:
        filas = await sheets_service.get_range("CONFIG", "F2", ttl=15)
        heartbeat = str(filas[0][0]) if filas and filas[0] else ""
    except Exception:
        pass
    local = GoogleSheetsService.version(hoja) if hoja else GoogleSheetsService.version()
    return {"token": f"{local}|{heartbeat}", "heartbeat": heartbeat}


@router.get("/{sheet_name}", response_model=SheetRangeResponse)
async def read_sheet(
    sheet_name: str,
    range: Optional[str] = Query(None, description="Cell range, e.g. A1:Z100"),
    current_user: User = Depends(get_current_user),
):
    """Read data from a Google Sheets range.

    This proxies the request through the backend, keeping the API key server-side.
    Requiere autenticacion y la pestana debe estar en la lista permitida.
    """
    if not _hoja_legible(sheet_name):
        raise HTTPException(status_code=403, detail="Hoja no disponible")
    try:
        full_range = sheets_service.rango_a1(sheet_name, range or "")
        rows = await sheets_service.get_range(sheet_name, range or "")
        return SheetRangeResponse(range=full_range, values=rows)
    except Exception as e:
        logger.error(f"Sheets proxy error [{sheet_name}]: {e}")
        raise HTTPException(status_code=502, detail="Error al leer datos del servidor")


@router.get("/metadata/{sheet_name}")
async def get_sheet_metadata(
    sheet_name: str,
    current_user: User = Depends(get_current_user),
):
    """Get metadata (sheet list) for a spreadsheet.

    This replaces direct calls to sheets.googleapis.com/v4/spreadsheets/{id}
    Requiere autenticacion.
    """
    try:
        now = time.time()
        estructura = GoogleSheetsService._estructura_version
        cached = _METADATA_CACHE.get(sheet_name)
        if cached and now - cached[0] < _METADATA_TTL_SECONDS and cached[2] == estructura:
            return {"sheets": cached[1]}

        url = f"{sheets_service.base_url}/{sheets_service.sheet_id}"
        params = {"key": sheets_service.api_key, "fields": "sheets.properties.title"}

        import httpx
        last_err = None
        # 1 reintento ante fallos transitorios de Google Sheets API
        for intento in range(2):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                sheets_list = [
                    s.get("properties", {}).get("title", "")
                    for s in data.get("sheets", [])
                ]
                sheets_list = [t for t in sheets_list if t]
                _METADATA_CACHE[sheet_name] = (time.time(), sheets_list, estructura)
                return {"sheets": sheets_list}
            except Exception as e:
                last_err = e
                if intento == 0:
                    await asyncio.sleep(1.0)
        raise last_err
    except Exception as e:
        logger.error(f"Sheets metadata error: {e}")
        raise HTTPException(status_code=502, detail="Error al obtener metadata")


@router.post("/write")
async def apps_script_write_proxy(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Write proxy to Apps Script (firma HMAC en el servidor).

    Solo acepta las acciones que el rol del usuario puede usar. Quien no edita
    turnos (usuario base, tramite, visualizador) solo puede marcar DESCANSO
    MEDICO en las celdas del rol.
    """
    accion = body.get("accion")
    if not accion:
        raise HTTPException(status_code=400, detail="Falta campo 'accion'")

    if accion not in _acciones_permitidas(current_user):
        logger.warning(f"Accion '{accion}' rechazada para user_id={current_user.id} roles={current_user.roles}")
        raise HTTPException(status_code=403, detail="No tiene permisos para esta accion")

    if accion in _SOLO_DESCANSO and not _puede_editar_turnos(current_user):
        valores = body.get("valores")
        if accion == "guardarIndividual":
            lista = valores if isinstance(valores, list) else [valores]
            permitido = bool(lista) and all(_es_descanso(v) for v in lista)
        else:
            permitido = _es_descanso(body.get("valor"))
        if not permitido:
            raise HTTPException(status_code=403, detail="Solo puede registrar descanso medico")

    # Las escrituras de celdas deben ir a una pestana de mes real.
    if accion in ("guardarCelda", "guardarIndividual", "guardarLote", "guardarLoteCeldas"):
        if not es_hoja_mes(str(body.get("hoja", ""))):
            raise HTTPException(status_code=400, detail="Hoja de mes invalida")

    try:
        data = {k: v for k, v in body.items() if k != "accion"}
        result = await sheets_service._apps_script_action(accion, data)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Apps Script proxy error [{accion}]: {e}")
        raise HTTPException(status_code=502, detail="Error al procesar la solicitud")
