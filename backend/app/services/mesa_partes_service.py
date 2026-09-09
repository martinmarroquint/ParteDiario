import logging
import httpx
import json
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class MesaPartesService:
    """Mesa de Partes v5.0 — Document management with full traceability.
    
    Sheets (Google Sheets via API read, Apps Script write):
      DOCUMENTOS   — Original registered documents (immutable after creation)
      MOVIMIENTOS  — Pases, devoluciones, resoluciones (derived documents)
      DERIVACIONES — Delivery status per area
      HISTORIAL    — Audit trail: who did what, when
      BD           — Catalogs: Col A=TipoDoc, Col B=TipoMov, Col C=Areas
    
    Flow:
      1. Registrar  → DOCUMENTO (REGISTRADO)
      2. Derivar    → MOVIMIENTO + DERIVACIÓN (DERIVADO)
      3. Recibir    → DERIVACIÓN (RECIBIDO)
      4. Devolver   → MOVIMIENTO DEVOLUCIÓN + DERIVACIÓN (DEVUELTO)
      5. Cerrar     → MOVIMIENTO RESOLUCIÓN + DOCUMENTO (CERRADO)
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
        for r in rows[1:]:
            documentos.append({
                "id": r[0] if len(r) > 0 else "",
                "numero": r[1] if len(r) > 1 else "",
                "fecha_registro": r[2] if len(r) > 2 else "",
                "tipo_doc": r[3] if len(r) > 3 else "",
                "n_doc_origen": r[4] if len(r) > 4 else "",
                "fecha_doc": r[5] if len(r) > 5 else "",
                "procedencia": r[6] if len(r) > 6 else "",
                "asunto": r[7] if len(r) > 7 else "",
                "contenido": r[8] if len(r) > 8 else "",
                "fuente": r[9] if len(r) > 9 else "fisico",
                "creado_por": r[10] if len(r) > 10 else "",
                "estado": r[11] if len(r) > 11 else "REGISTRADO",
                "movimientos": [],
                "derivaciones": []
            })
        documentos.sort(key=lambda d: int(d["id"]) if str(d["id"]).isdigit() else 0, reverse=True)
        return documentos
    
    async def _read_movimientos(self) -> list[dict]:
        """Read all movements from MOVIMIENTOS sheet."""
        rows = await self._read_sheet("MOVIMIENTOS")
        if not rows or len(rows) < 2:
            return []
        movimientos = []
        for r in rows[1:]:
            movimientos.append({
                "id": r[0] if len(r) > 0 else "",
                "documento_id": r[1] if len(r) > 1 else "",
                "tipo_mov": r[2] if len(r) > 2 else "",
                "numero": r[3] if len(r) > 3 else "",
                "fecha": r[4] if len(r) > 4 else "",
                "contenido": r[5] if len(r) > 5 else "",
                "area_destino": r[6] if len(r) > 6 else "",
                "creado_por": r[7] if len(r) > 7 else ""
            })
        return movimientos
    
    async def _read_derivaciones(self) -> list[dict]:
        """Read all derivations from DERIVACIONES sheet."""
        rows = await self._read_sheet("DERIVACIONES")
        if not rows or len(rows) < 2:
            return []
        derivaciones = []
        for r in rows[1:]:
            derivaciones.append({
                "id": r[0] if len(r) > 0 else "",
                "documento_id": r[1] if len(r) > 1 else "",
                "movimiento_id": r[2] if len(r) > 2 else "",
                "area_destino": r[3] if len(r) > 3 else "",
                "fecha_derivacion": r[4] if len(r) > 4 else "",
                "recibido_por": r[5] if len(r) > 5 else "",
                "fecha_recepcion": r[6] if len(r) > 6 else "",
                "devuelto_por": r[7] if len(r) > 7 else "",
                "fecha_devolucion": r[8] if len(r) > 8 else "",
                "estado": r[9] if len(r) > 9 else "DERIVADO"
            })
        return derivaciones
    
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
        """Get all documents with movements and derivations attached."""
        documentos = await self._read_documentos()
        movimientos = await self._read_movimientos()
        derivaciones = await self._read_derivaciones()
        
        # Attach movimientos and derivaciones to documents
        for doc in documentos:
            doc["movimientos"] = [m for m in movimientos if str(m["documento_id"]) == str(doc["id"])]
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
        """Get a single document with its movements and derivations."""
        documentos = await self._read_documentos()
        movimientos = await self._read_movimientos()
        derivaciones = await self._read_derivaciones()
        
        for doc in documentos:
            if int(doc["id"]) == doc_id:
                doc["movimientos"] = [m for m in movimientos if str(m["documento_id"]) == str(doc_id)]
                doc["derivaciones"] = [d for d in derivaciones if str(d["documento_id"]) == str(doc_id)]
                return doc
        return None
    
    async def get_bandeja(self, area: str) -> list[dict]:
        """Get documents derived to a specific area (bandeja)."""
        documentos = await self._read_documentos()
        derivaciones = await self._read_derivaciones()
        movimientos = await self._read_movimientos()
        
        # Filter derivations for this area
        area_derivs = [d for d in derivaciones if d["area_destino"].upper() == area.upper()]
        doc_ids = set(d["documento_id"] for d in area_derivs)
        
        # Filter documents
        result = []
        for doc in documentos:
            if str(doc["id"]) in doc_ids:
                doc["derivaciones"] = [d for d in area_derivs if str(d["documento_id"]) == str(doc["id"])]
                doc["movimientos"] = [m for m in movimientos if str(m["documento_id"]) == str(doc["id"])]
                result.append(doc)
        
        result.sort(key=lambda d: int(d["id"]) if str(d["id"]).isdigit() else 0, reverse=True)
        return result
    
    async def get_historial(self, doc_id: int) -> list[dict]:
        """Get history for a document."""
        if not self._is_configured():
            return []
        rows = await self._read_sheet("HISTORIAL")
        if not rows or len(rows) < 2:
            return []
        historial = []
        for r in rows[1:]:
            if str(r[1] if len(r) > 1 else "") == str(doc_id):
                historial.append({
                    "id": r[0] if len(r) > 0 else "",
                    "documento_id": r[1] if len(r) > 1 else "",
                    "movimiento_id": r[2] if len(r) > 2 else "",
                    "accion": r[3] if len(r) > 3 else "",
                    "detalles": r[4] if len(r) > 4 else "",
                    "realizado_por": r[5] if len(r) > 5 else "",
                    "fecha": r[6] if len(r) > 6 else ""
                })
        return historial
    
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
    
    async def derivar(self, doc_id: int, areas: list[str], tipo_mov: str = "PASE", contenido: str = "", user_name: str = "") -> dict:
        """Derive a document to one or more areas with a movement document."""
        return await self._apps_script_action("derivar", {
            "documento_id": doc_id,
            "areas": areas,
            "tipo_mov": tipo_mov,
            "contenido": contenido,
            "creado_por": user_name
        })
    
    async def recibir(self, derivacion_id: int, user_name: str = "") -> dict:
        """Area confirms receipt of a derivation."""
        return await self._apps_script_action("recibir", {
            "derivacion_id": derivacion_id,
            "recibido_por": user_name
        })
    
    async def devolver(self, derivacion_id: int, data: dict, user_name: str = "") -> dict:
        """Area returns document with devolution document."""
        return await self._apps_script_action("devolver", {
            "derivacion_id": derivacion_id,
            "contenido": data.get("contenido", ""),
            "n_descargo": data.get("n_descargo", ""),
            "devuelto_por": user_name
        })
    
    async def cerrar(self, doc_id: int, data: dict, user_name: str = "") -> dict:
        """Mesa closes document with resolution document."""
        return await self._apps_script_action("cerrar", {
            "documento_id": doc_id,
            "contenido": data.get("contenido", ""),
            "estado_final": data.get("estado_final", "RESUELTO"),
            "creado_por": user_name
        })
    
    async def eliminar(self, doc_id: int) -> dict:
        """Delete document and all related data."""
        return await self._apps_script_action("eliminar", {
            "id": doc_id,
            "numero": doc_id
        })
    
    async def get_opciones(self) -> dict:
        """Get dropdown options from BD sheet.
        
        BD sheet structure:
          Col A (0) = TIPO DOC. (registration types)
          Col B (1) = DOC. DE TRAMITE (movement types: PASE, DECRETO, etc.)
          Col C (2) = AREA ENTREGADA (destination areas)
        """
        if not self._is_configured():
            return {"tipos_doc": [], "tipos_mov": [], "areas": []}
        
        rows = await self._read_sheet("BD")
        if not rows or len(rows) < 2:
            return {"tipos_doc": [], "tipos_mov": [], "areas": []}
        
        tipos_doc = set()
        tipos_mov = set()
        areas = []
        
        data_rows = rows[1:]  # Skip header
        
        for row in data_rows:
            # Col A = Tipo documento (registro)
            if row and len(row) > 0 and row[0] and str(row[0]).strip():
                val = str(row[0]).strip()
                if val.upper() not in ("TIPO DOC.", "TIPO DOC", "TIPO"):
                    tipos_doc.add(val)
            
            # Col B = Tipo movimiento (pase/decreto/etc)
            if row and len(row) > 1 and row[1] and str(row[1]).strip():
                val = str(row[1]).strip()
                if val.upper() not in ("DOC. DE TRAMITE", "DOC DE TRAMITE", "DOC DE TRAMITES"):
                    tipos_mov.add(val)
            
            # Col C = Áreas
            if row and len(row) > 2 and row[2] and str(row[2]).strip():
                val = str(row[2]).strip()
                if val.upper() not in ("AREA ENTREGADA", "AREA", "AREAS"):
                    areas.append(val)
        
        return {
            "tipos_doc": sorted(tipos_doc),
            "tipos_mov": sorted(tipos_mov),
            "areas": areas  # Mantener orden del sheet
        }
