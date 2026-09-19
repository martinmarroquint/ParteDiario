import asyncio
import json
import logging
import time
import hmac
import hashlib
import httpx
from typing import Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    """Service to interact with Google Sheets API.
    
    Uses:
    - Google Sheets API v4 with API Key for READ operations
    - Apps Script web app for WRITE operations (append, update, delete)
    
    CACHE DE LECTURAS: con 100+ sesiones activas, las cargas simultaneas
    saturaban la API de Google Sheets (300 lecturas/min/proyecto) generando
    502. Todas las lecturas (get_range) se cachean con TTL y cada escritura
    invalida la hoja afectada, asi los datos quedan casi siempre frescos.
    El cache es de CLASE: aunque cada modulo cree su propia instancia del
    servicio (middleware, routers), todas comparten las mismas lecturas.
    """
    
    _read_cache: dict[tuple, tuple[float, Any]] = {}
    _READ_CACHE_TTL_SECONDS = 30
    # TTLs por-rango sobreescritos (get_range ttl=...) - dict[tuple, float]
    _READ_CACHE_TTL_BY_RANGE: dict[tuple, float] = {}
    # Lecturas EN CURSO (single-flight): cuando varias peticiones piden el
    # mismo rango al mismo tiempo (caché expirado), solo UNA ejecuta la
    # lectura a Google y las demas esperan esa misma promesa. Sin esto, un
    # mes frio con 100 usuarios simultaneos = 100 lecturas a la API.
    _inflight: dict[tuple, asyncio.Task] = {}
    # Generacion del cache: se incrementa en cada invalidacion. Una lectura que
    # empezo antes de una escritura NO re-cachea su resultado, evitando servir
    # datos previos a la escritura durante todo el TTL.
    _cache_generation: int = 0
    
    # Acciones de alta frecuencia que NO invalidan el cache (tracking interno
    # tipo heartbeat: no alteran datos que el panel muestre).
    _NO_INVALIDAN = {"actualizarHeartbeat"}
    
    @classmethod
    def _cache_get(cls, key: tuple) -> Optional[Any]:
        item = cls._read_cache.get(key)
        if item:
            ttl = cls._READ_CACHE_TTL_BY_RANGE.get(key, cls._READ_CACHE_TTL_SECONDS)
            if (time.time() - item[0]) < ttl:
                return item[1]
        return None
    
    @classmethod
    def _cache_set(cls, key: tuple, rows: Any) -> None:
        cls._read_cache[key] = (time.time(), rows)
        # Limpieza del TTL custom si ya existe para esa clave (nuevo valor fresco)
        cls._READ_CACHE_TTL_BY_RANGE.pop(key, None)
    
    @classmethod
    def invalidate_sheet(cls, sheet_name: str) -> None:
        """Descarta las lecturas cacheadas de una hoja (tras una escritura)."""
        for key in list(cls._read_cache):
            if key[0] == sheet_name:
                cls._read_cache.pop(key, None)
                cls._READ_CACHE_TTL_BY_RANGE.pop(key, None)
        # Invalida tambien las lecturas en curso de esa hoja: si terminan,
        # no re-cachearan datos previos a esta escritura.
        cls._cache_generation += 1
    
    @classmethod
    def invalidate_all(cls) -> None:
        """Descarta todo el cache (inicializarEstructura cambia el layout)."""
        cls._read_cache.clear()
        cls._READ_CACHE_TTL_BY_RANGE.clear()
        cls._cache_generation += 1
    
    def __init__(self):
        self.api_key = settings.GOOGLE_SHEETS_API_KEY
        self.sheet_id = settings.GOOGLE_SHEETS_ID
        self.base_url = "https://sheets.googleapis.com/v4/spreadsheets"
        self.apps_script_url = settings.GOOGLE_APPS_SCRIPT_URL
    
    async def get_range(self, sheet_name: str, cell_range: str = "", ttl: Optional[float] = None) -> list[list]:
        """Read data from a sheet range (Google Sheets API + cache TTL).

        `ttl` opcional (segundos): permite que lecturas mas lentas (ej. la hoja
        del ROL con miles de formulas) se cacheen mas tiempo sin tocar el TTL
        global de 30s que usan el resto de modulos con escrituras frecuentes.

        Los errores NO se cachean: un fallo transitorio de la API se reintenta
        en la siguiente peticion (los clientes ya reintentan en el frontend).
        """
        cache_key = (sheet_name, cell_range)
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached
        
        # Single-flight: si YA hay una lectura en curso de este rango
        # (caché expirado y varias peticiones a la vez), espera esa misma —
        # evita que 100 peticiones hagan 100 lecturas a Google.
        cls = self.__class__
        in_flight = cls._inflight.get(cache_key)
        if in_flight is not None and not in_flight.done():
            try:
                return await asyncio.shield(in_flight)
            except Exception:
                # Si la lectura compartida fallo, la siguiente peticion
                # reintenta por su cuenta. Solo se quita la entrada si sigue
                # siendo la MISMA tarea (nunca la de otra corrutina).
                if cls._inflight.get(cache_key) is in_flight:
                    cls._inflight.pop(cache_key, None)
                raise
        
        generation = cls._cache_generation
        task = asyncio.create_task(
            self._fetch_range(cache_key, sheet_name, cell_range, ttl, generation)
        )
        cls._inflight[cache_key] = task
        try:
            return await asyncio.shield(task)
        finally:
            # No borrar la entrada si otra corrutina ya la reemplazo.
            if cls._inflight.get(cache_key) is task:
                cls._inflight.pop(cache_key, None)
    
    async def _fetch_range(
        self, cache_key: tuple, sheet_name: str, cell_range: str,
        ttl: Optional[float], generation: int,
    ) -> list[list]:
        """Lectura real a Google Sheets (para _inflight, cache incluida)."""
        range_str = f"{sheet_name}!{cell_range}" if cell_range else sheet_name
        url = f"{self.base_url}/{self.sheet_id}/values/{range_str}"
        params = {"key": self.api_key, "majorDimension": "ROWS"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                rows = data.get("values", [])
                cls = self.__class__
                # Si hubo una escritura (invalidacion) mientras leiamos, NO
                # cachear: el resultado puede ser anterior a esa escritura.
                if cls._cache_generation != generation:
                    return rows
                if ttl is not None:
                    # Cache con TTL propio (sin tocar el TTL global de la clase)
                    cls._read_cache[cache_key] = (time.time(), rows)
                    cls._READ_CACHE_TTL_BY_RANGE[cache_key] = ttl
                else:
                    self._cache_set(cache_key, rows)
                return rows
        except httpx.HTTPError as e:
            logger.error(f"Error reading sheet {sheet_name}: {e}")
            return []
    
    async def update_range(self, sheet_name: str, cell_range: str, values: list[list]) -> dict:
        """Update data in a sheet range (uses Apps Script)."""
        return await self._apps_script_action("updateRange", {
            "hoja": sheet_name,
            "rango": cell_range,
            "valores": values
        })
    
    async def append_row(self, sheet_name: str, values: list) -> dict:
        """Append a new row to a sheet (uses Apps Script)."""
        return await self._apps_script_action("appendRow", {
            "hoja": sheet_name,
            "valores": values
        })
    
    async def delete_row(self, sheet_name: str, row_number: int) -> dict:
        """Delete a row from a sheet (uses Apps Script)."""
        return await self._apps_script_action("deleteRow", {
            "hoja": sheet_name,
            "fila": row_number
        })
    
    async def _apps_script_action(self, action: str, data: dict) -> dict:
        """Call the Apps Script web app for write operations.
        
        IMPORTANT: Google Apps Script web apps return 302 redirects on POST.
        follow_redirects=True is required, otherwise the redirect fails silently.
        
        NOTE: Apps Script executes BEFORE returning the response. If the connection
        fails after execution, the write DID succeed. For append/update operations,
        we treat connection errors as "probably succeeded".
        """
        if not self.apps_script_url:
            logger.warning(f"Apps Script URL not configured. Cannot perform write: {action}")
            raise RuntimeError("Servicio de escritura no disponible. Contacte al administrador.")
        
        payload = {"accion": action, **data}
        
        # HMAC SIGNING — Apps Script will verify this before processing
        # We MUST send the EXACT body that was signed. Apps Script's verifyHMAC:
        #   1. Parses JSON → JS object
        #   2. Removes _signature
        #   3. Re-serializes with sortedStringify() (compact, no spaces, sorted keys)
        #   4. Computes HMAC on that string
        # So we sign with the same compact format, then send THAT exact string.
        if settings.APPSCRIPT_HMAC_SECRET:
            # Step 1: Sign WITHOUT _signature (compact format)
            body_str = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
            signature = hmac.new(
                settings.APPSCRIPT_HMAC_SECRET.encode('utf-8'),
                body_str.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            # Step 2: Add _signature and re-serialize in SAME compact format
            payload["_signature"] = signature
            signed_body = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
        else:
            signed_body = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
        
        # Write operations: all actions that modify data in Google Sheets
        es_escritura = action in ('appendRow', 'updateRange', 'updateCell', 'deleteRow', 
                                   'guardarCelda', 'guardarLote', 'guardarIndividual',
                                   'registrarCeldaModificada', 'limpiarCeldasModificadas',
                                   'actualizarHeartbeat', 'marcarFinalizado', 'desmarcarFinalizado',
                                   'marcarLoteFinalizado', 'desmarcarLoteFinalizado',
                                   'registrarDescansoMedico', 'registrarVacaciones',
                                   'registrarCambiosOficiales', 'registrarSolicitudCambio',
                                   'actualizarSolicitudCambio',
                                   'bloquearHoja', 'desbloquearHoja', 'guardarRol', 'inicializarEstructura')
        
        # Invalidar el cache de la hoja afectada ANTES de escribir: Apps Script
        # ejecuta antes de devolver la respuesta, asi que aunque la conexion
        # falle el dato pudo cambiar — nunca servir lecturas viejas tras eso.
        if es_escritura and action not in self._NO_INVALIDAN:
            hoja = data.get("hoja")
            if hoja:
                self.invalidate_sheet(hoja)
            elif action == "inicializarEstructura":
                self.invalidate_all()
        
        try:
            async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
                # Send the EXACT signed body as text/plain — matches what frontend used to do
                # NOT json=payload which re-serializes with different format!
                response = await client.post(
                    self.apps_script_url,
                    content=signed_body.encode('utf-8'),
                    headers={"Content-Type": "text/plain"}
                )
                response.raise_for_status()
                result = response.json()
                # Check if Apps Script returned an error in the response body
                if isinstance(result, dict) and result.get("error"):
                    appscript_error = result['error']
                    logger.error(f"Apps Script returned error for {action}: {appscript_error}")
                    raise RuntimeError(f"Apps Script: {appscript_error}")
                return result
        except httpx.HTTPError as e:
            if es_escritura:
                # Apps Script likely executed before the connection error
                logger.warning(f"Apps Script connection error on write [{action}] - write probably succeeded: {e}")
                return {"status": "probablemente_exitoso", "accion": action}
            logger.error(f"Error calling Apps Script for {action}: {e}")
            raise RuntimeError("Error de conexion. Intente nuevamente.")
        except json.JSONDecodeError:
            if es_escritura:
                logger.warning(f"Apps Script returned non-JSON on write [{action}] - write probably succeeded")
                return {"status": "probablemente_exitoso", "accion": action}
            logger.error(f"Invalid JSON response from Apps Script for {action}")
            raise RuntimeError("Respuesta invalida del servidor. Intente nuevamente.")
    
    async def _get_sheet_ids(self) -> dict:
        """Get sheet names and their GIDs."""
        url = f"{self.base_url}/{self.sheet_id}"
        params = {"key": self.api_key}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                sheets = response.json().get("sheets", [])
                return {s["properties"]["title"]: s["properties"]["sheetId"] for s in sheets}
        except Exception as e:
            logger.error(f"Error getting sheet metadata: {e}")
            return {}
    
    async def find_row(self, sheet_name: str, column: int, value: str) -> Optional[list]:
        """Find a row where a specific column matches a value."""
        rows = await self.get_range(sheet_name)
        for row in rows:
            if len(row) > column and row[column] == value:
                return row
        return None
    
    async def find_rows(self, sheet_name: str, column: int, value: str) -> list[list]:
        """Find all rows where a specific column matches a value."""
        rows = await self.get_range(sheet_name)
        return [row for row in rows if len(row) > column and row[column] == value]
    
    async def find_row_index(self, sheet_name: str, column: int, value: str) -> Optional[int]:
        """Find the row number (1-indexed) where a column matches."""
        rows = await self.get_range(sheet_name)
        for idx, row in enumerate(rows):
            if len(row) > column and row[column] == value:
                return idx + 1  # 1-indexed
        return None
    
    async def update_cell(self, sheet_name: str, cell: str, value: str) -> dict:
        """Update a single cell (uses Apps Script)."""
        return await self._apps_script_action("updateCell", {
            "hoja": sheet_name,
            "celda": cell,
            "valor": value
        })
