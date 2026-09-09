import logging
import httpx
import json
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class MesaPartesService:
    """Service for Mesa de Partes document management.
    
    3 Sheets:
      DOCUMENTOS: ID, NUMERO, FECHA_REGISTRO, TIPO_DOC, N_DOC_ORIGEN,
                  FECHA_DOC, PROCEDENCIA, ASUNTO, CONTENIDO, FUENTE,
                  ESTADO, CREADO_POR, ESTADO_FINAL, FECHA_CIERRE
      DERIVACIONES: ID, DOCUMENTO_ID, AREA_DESTINO, PASE_NUMERO,
                    DERIVADO_POR, FECHA_DERIVACION, RECIBIDO_POR,
                    FECHA_RECEPCION, ESTADO, DEVUELTO_POR,
                    FECHA_RESPUESTA, DESCARGO, N_DESCARGO, HT
      HISTORIAL: ID, DOCUMENTO_ID, DERIVACION_ID, ACCION,
                 ESTADO_ANTERIOR, ESTADO_NUEVO, DETALLES,
                 REALIZADO_POR, FECHA
    
    Flow: REGISTRADO → DERIVADO → TRAMITADO → CERRADO
    Derivaciones: DERIVADO → RECIBIDO → DEVUELTO
    """
    
    BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets"
    
    def __init__(self):
        self.api_key = settings.GOOGLE_SHEETS_API_KEY
        self.sheet_id = settings.MESA_PARTES_SHEET_ID
        self.apps_script_url = settings.MESA_PARTES_APPS_SCRIPT_URL
    
    def _is_configured(self) -> bool:
        return bool(self.sheet_id and self.api_key)
    
    # ============================================
    # READ OPERATIONS (Google Sheets API)
    # ============================================
    
    async def _read_sheet(self, range_name: str) -> list[list]:
        """Read all rows from a sheet range."""
        if not self._is_configured():
            return []
        url = f"{self.BASE_URL}/{self.sheet_id}/values/{range_name}"
        params = {"key": self.api_key, "majorDimension": "ROWS"}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json().get("values", [])
        except Exception as e:
            logger.error(f"Error reading {range_name}: {e}")
            return []
    
    async def _read_documentos(self) -> list[dict]:
        """Read all documents from DOCUMENTOS sheet."""
        rows = await self._read_sheet("DOCUMENTOS")
        if not rows or len(rows) < 2:
            return []
        documentos = []
        for i, r in enumerate(rows[1:], start=1):
            documentos.append({
                "id": r[0] if len(r) > 0 else i,
                "numero": r[1] if len(r) > 1 else "",
                "fecha_registro": r[2] if len(r) > 2 else "",
                "tipo_doc": r[3] if len(r) > 3 else "",
                "n_doc_origen": r[4] if len(r) > 4 else "",
                "fecha_doc": r[5] if len(r) > 5 else "",
                "procedencia": r[6] if len(r) > 6 else "",
                "asunto": r[7] if len(r) > 7 else "",
                "contenido": r[8] if len(r) > 8 else "",
                "fuente": r[9] if len(r) > 9 else "fisico",
                "estado": r[10] if len(r) > 10 else "REGISTRADO",
                "creado_por": r[11] if len(r) > 11 else "",
                "estado_final": r[12] if len(r) > 12 else "",
                "fecha_cierre": r[13] if len(r) > 13 else "",
                "derivaciones": []
            })
        return documentos
    
    async def _read_derivaciones(self) -> list[dict]:
        """Read all derivations from DERIVACIONES sheet."""
        rows = await self._read_sheet("DERIVACIONES")
        if not rows or len(rows) < 2:
            return []
        derivaciones = []
        for i, r in enumerate(rows[1:], start=1):
            derivaciones.append({
                "id": r[0] if len(r) > 0 else i,
                "documento_id": r[1] if len(r) > 1 else "",
                "area_destino": r[2] if len(r) > 2 else "",
                "pase_numero": r[3] if len(r) > 3 else "",
                "derivado_por": r[4] if len(r) > 4 else "",
                "fecha_derivacion": r[5] if len(r) > 5 else "",
                "recibido_por": r[6] if len(r) > 6 else "",
                "fecha_recepcion": r[7] if len(r) > 7 else "",
                "estado": r[8] if len(r) > 8 else "DERIVADO",
                "devuelto_por": r[9] if len(r) > 9 else "",
                "fecha_respuesta": r[10] if len(r) > 10 else "",
                "descargo": r[11] if len(r) > 11 else "",
                "n_descargo": r[12] if len(r) > 12 else "",
                "ht": r[13] if len(r) > 13 else ""
            })
        return derivaciones
    
    async def _read_historial(self) -> list[dict]:
        """Read all history from HISTORIAL sheet."""
        rows = await self._read_sheet("HISTORIAL")
        if not rows or len(rows) < 2:
            return []
        historial = []
        for i, r in enumerate(rows[1:], start=1):
            historial.append({
                "id": r[0] if len(r) > 0 else i,
                "documento_id": r[1] if len(r) > 1 else "",
                "derivacion_id": r[2] if len(r) > 2 else "",
                "accion": r[3] if len(r) > 3 else "",
                "estado_anterior": r[4] if len(r) > 4 else "",
                "estado_nuevo": r[5] if len(r) > 5 else "",
                "detalles": r[6] if len(r) > 6 else "",
                "realizado_por": r[7] if len(r) > 7 else "",
                "fecha": r[8] if len(r) > 8 else ""
            })
        return historial
    
    # ============================================
    # WRITE OPERATIONS (via Apps Script)
    # ============================================
    
    async def _apps_script_action(self, action: str, data: dict) -> dict:
        """Call the Apps Script web app for write operations."""
        if not self.apps_script_url:
            logger.warning("Apps Script URL not configured for Mesa de Partes")
            return {"error": "Apps Script URL not configured"}
        
        payload = {"accion": action, **data}
        
        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                response = await client.post(
                    self.apps_script_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                logger.info(f"Apps Script [{action}]: status={response.status_code}")
                
                try:
                    return response.json()
                except Exception:
                    text = response.text.strip()
                    logger.info(f"Apps Script [{action}] text: {text[:300]}")
                    if "error" in text.lower():
                        return {"error": text}
                    return {"success": True, "raw": text}
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"Apps Script HTTP error [{action}]: {e.response.status_code}")
            try:
                resp = e.response.json()
                if not resp.get("success", True):
                    return resp
            except Exception:
                pass
            return {"error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            logger.error(f"Error calling Apps Script [{action}]: {e}")
            return {"error": str(e)}
    
    # ============================================
    # PUBLIC API METHODS
    # ============================================
    
    async def get_documentos(self, estado: Optional[str] = None, busqueda: Optional[str] = None, area: Optional[str] = None) -> list[dict]:
        """Get all documents with derivaciones attached."""
        documentos = await self._read_documentos()
        derivaciones = await self._read_derivaciones()
        
        # Attach derivaciones to documents
        for doc in documentos:
            doc["derivaciones"] = [d for d in derivaciones if str(d["documento_id"]) == str(doc["id"])]
        
        # Apply filters
        if estado:
            documentos = [d for d in documentos if d["estado"] == estado.upper()]
        
        if area:
            documentos = [d for d in documentos if any(
                der["area_destino"].upper() == area.upper()
                for der in d["derivaciones"]
            )]
        
        if busqueda:
            term = busqueda.lower()
            documentos = [d for d in documentos if
                term in d.get("asunto", "").lower() or
                term in d.get("contenido", "").lower() or
                term in d.get("tipo_doc", "").lower() or
                term in d.get("procedencia", "").lower() or
                term in d.get("numero", "").lower() or
                term in d.get("n_doc_origen", "").lower()
            ]
        
        return documentos
    
    async def get_documento(self, doc_id: int) -> Optional[dict]:
        """Get a single document with its derivaciones."""
        documentos = await self._read_documentos()
        derivaciones = await self._read_derivaciones()
        
        for doc in documentos:
            if int(doc["id"]) == doc_id:
                doc["derivaciones"] = [d for d in derivaciones if str(d["documento_id"]) == str(doc_id)]
                return doc
        return None
    
    async def get_historial(self, doc_id: int) -> list[dict]:
        """Get history for a document."""
        historial = await self._read_historial()
        return [h for h in historial if str(h["documento_id"]) == str(doc_id)]
    
    async def registrar(self, data: dict, user_name: str = "") -> dict:
        """Register a new document."""
        return await self._apps_script_action("registrar", {
            "tipo_doc": data.get("tipo_doc", ""),
            "n_doc_origen": data.get("n_doc_origen", ""),
            "fecha_doc": data.get("fecha_doc", ""),
            "procedencia": data.get("procedencia", ""),
            "asunto": data.get("asunto", ""),
            "contenido": data.get("contenido", ""),
            "fuente": data.get("fuente", "fisico"),
            "creado_por": user_name
        })
    
    async def derivar(self, doc_id: int, areas: list[str], user_name: str = "", pase_numero: str = "") -> dict:
        """Derive a document to one or more areas."""
        return await self._apps_script_action("derivar", {
            "documento_id": doc_id,
            "areas": areas,
            "derivado_por": user_name
        })
    
    async def recibir(self, derivacion_id: int, user_name: str = "") -> dict:
        """Area confirms receipt of a derivation."""
        return await self._apps_script_action("recibir", {
            "derivacion_id": derivacion_id,
            "recibido_por": user_name
        })
    
    async def devolver(self, derivacion_id: int, data: dict, user_name: str = "") -> dict:
        """Area returns document with response."""
        return await self._apps_script_action("devolver", {
            "derivacion_id": derivacion_id,
            "devuelto_por": user_name,
            "descargo": data.get("descargo", ""),
            "n_descargo": data.get("n_descargo", ""),
            "ht": data.get("ht", "")
        })
    
    async def tramitar(self, doc_id: int, user_name: str = "", observaciones: str = "") -> dict:
        """Mesa processes the returned document."""
        return await self._apps_script_action("tramitar", {
            "documento_id": doc_id,
            "realizado_por": user_name,
            "observaciones": observaciones
        })
    
    async def cerrar(self, doc_id: int, user_name: str = "", estado_final: str = "RESUELTO") -> dict:
        """Mesa closes the document."""
        return await self._apps_script_action("cerrar", {
            "documento_id": doc_id,
            "realizado_por": user_name,
            "estado_final": estado_final
        })
    
    async def eliminar(self, doc_id: int) -> dict:
        """Delete document and all related data."""
        return await self._apps_script_action("eliminar", {
            "id": doc_id,
            "numero": doc_id
        })
    
    async def get_opciones(self) -> dict:
        """Get dropdown options from config sheets and existing data."""
        # Tipos de documento desde hoja TIPO DOC (columna A)
        tipos_doc = []
        if self._is_configured():
            rows = await self._read_sheet("TIPO DOC")
            if rows:
                tipos_doc = sorted([
                    str(row[0]).strip()
                    for row in rows
                    if row and row[0] and str(row[0]).strip()
                ])
        
        # Procedencias y áreas de datos existentes
        documentos = await self._read_documentos()
        derivaciones = await self._read_derivaciones()
        
        procedencias = sorted(list(set(
            d["procedencia"] for d in documentos if d["procedencia"]
        )))
        
        areas = sorted(list(set(
            d["area_destino"] for d in derivaciones if d["area_destino"]
        )))
        
        return {
            "tipos_doc": tipos_doc,
            "procedencias": procedencias,
            "areas": areas
        }
