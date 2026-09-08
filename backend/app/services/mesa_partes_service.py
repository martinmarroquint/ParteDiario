import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class MesaPartesService:
    """Service for Mesa de Partes document management.
    
    Sheet: "DOCUMENTOS" (14 columns A-N)
    Columns:
      A=N° B=FECHA C=TIPO_DOC D=N_DOC_ORIGEN E=FECHA_DOC
      F=PROCEDENCIA G=CONTENIDO H=ESTADO I=DOC_TRAMITE
      J=N_DOC_TRAMITADO K=AREA_ENTREGADA L=DESCARGO M=N_DESCARGO N=HT
    
    Flow: PENDIENTE → ENTREGADO → RESUELTO
    """
    
    SHEET_NAME = "DOCUMENTOS"  # Correct sheet name from Apps Script
    BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets"
    
    # Column mapping (1-indexed for Google Sheets, 0-indexed for row arrays)
    # Row array index: 0=A(N°), 1=B(FECHA), 2=C(TIPO), ...
    COL = {
        'numero': 0,        # A
        'fecha': 1,         # B
        'tipo_doc': 2,      # C
        'n_doc_origen': 3,  # D
        'fecha_doc': 4,     # E
        'procedencia': 5,   # F
        'contenido': 6,     # G
        'estado': 7,        # H
        'doc_tramite': 8,   # I
        'n_doc_tramitado': 9, # J
        'area_entregada': 10, # K
        'descargo': 11,     # L
        'n_descargo': 12,   # M
        'ht': 13,           # N
    }
    
    # Google Sheets column letters (1-indexed: A=1, B=2, ...)
    COL_LETTERS = {
        'numero': 'A', 'fecha': 'B', 'tipo_doc': 'C', 'n_doc_origen': 'D',
        'fecha_doc': 'E', 'procedencia': 'F', 'contenido': 'G', 'estado': 'H',
        'doc_tramite': 'I', 'n_doc_tramitado': 'J', 'area_entregada': 'K',
        'descargo': 'L', 'n_descargo': 'M', 'ht': 'N',
    }
    
    def __init__(self):
        self.api_key = settings.GOOGLE_SHEETS_API_KEY
        self.sheet_id = settings.MESA_PARTES_SHEET_ID
        self.apps_script_url = settings.MESA_PARTES_APPS_SCRIPT_URL
    
    def _is_configured(self) -> bool:
        return bool(self.sheet_id and self.api_key)
    
    async def _get_all_rows(self) -> list[list]:
        """Read all rows from the DOCUMENTOS sheet."""
        if not self._is_configured():
            logger.warning("Mesa de Partes Google Sheets not configured")
            return []
        
        url = f"{self.BASE_URL}/{self.sheet_id}/values/{self.SHEET_NAME}"
        params = {"key": self.api_key, "majorDimension": "ROWS"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json().get("values", [])
        except Exception as e:
            logger.error(f"Error reading Mesa de Partes sheet: {e}")
            return []
    
    async def _apps_script_action(self, action: str, data: dict) -> dict:
        """Call the Apps Script web app for write operations.
        
        Google Apps Script returns a 302 redirect on POST requests.
        We follow redirects and parse the final JSON response.
        """
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
                
                logger.info(f"Apps Script [{action}]: status={response.status_code}, url={response.url}")
                
                # Parse response
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
    
    def _row_to_documento(self, row: list, index: int) -> dict:
        """Convert a sheet row (14 columns) to a document dict."""
        def get(col_key, default=""):
            idx = self.COL[col_key]
            return row[idx] if len(row) > idx else default
        
        return {
            "id": index + 1,  # Sheet row: header=row1, data starts at row2, index starts at 1
            "numero": str(get('numero', str(index + 1))),
            "fecha": str(get('fecha')),
            "tipo_doc": str(get('tipo_doc')),
            "n_doc_origen": str(get('n_doc_origen')),
            "fecha_doc": str(get('fecha_doc')),
            "procedencia": str(get('procedencia')),
            "contenido": str(get('contenido')),
            "estado": str(get('estado', 'PENDIENTE')),
            "doc_tramite": str(get('doc_tramite')),
            "n_doc_tramitado": str(get('n_doc_tramitado')),
            "area_entregada": str(get('area_entregada')),
            "descargo": str(get('descargo')),
            "n_descargo": str(get('n_descargo')),
            "ht": str(get('ht')),
        }
    
    async def get_documentos(self, estado: Optional[str] = None, busqueda: Optional[str] = None, area: Optional[str] = None) -> list[dict]:
        """Get all documents with optional filters.
        
        Args:
            estado: Filter by document state (PENDIENTE/ENTREGADO/RESUELTO)
            busqueda: Search in contenido, tipo_doc, procedencia, numero
            area: Filter by area_entregada (for jefes to see only their docs)
        """
        rows = await self._get_all_rows()
        if not rows or len(rows) < 2:
            return []
        
        data_rows = rows[1:]  # Skip header
        documentos = [self._row_to_documento(row, i + 1) for i, row in enumerate(data_rows)]
        
        # Reverse: most recent first (newest rows at bottom of sheet)
        documentos.reverse()
        
        if estado:
            documentos = [d for d in documentos if d["estado"] == estado.upper()]
        
        if area:
            # Exact match on area_entregada
            documentos = [d for d in documentos if d["area_entregada"].upper() == area.upper()]
        
        if busqueda:
            term = busqueda.lower()
            documentos = [d for d in documentos if 
                term in d.get("contenido", "").lower() or
                term in d.get("tipo_doc", "").lower() or
                term in d.get("n_doc_origen", "").lower() or
                term in d.get("procedencia", "").lower() or
                term in d.get("numero", "").lower()
            ]
        
        return documentos
    
    async def get_documento(self, doc_id: int) -> Optional[dict]:
        """Get a document by sheet row ID."""
        rows = await self._get_all_rows()
        if not rows or len(rows) < 2:
            return None
        
        data_rows = rows[1:]
        # doc_id is the sheet row number (2-indexed), array is 0-indexed
        index = doc_id - 2
        
        if 0 <= index < len(data_rows):
            return self._row_to_documento(data_rows[index], index + 1)
        return None
    
    async def registrar_documento(self, data: dict, user_name: str = "") -> dict:
        """Register a new document (Etapa 1: Recepción). Estado: PENDIENTE"""
        row_data = {
            "accion": "registrar",
            "tipoDoc": data.get("tipo_doc", ""),
            "nDocOrigen": data.get("n_doc_origen", ""),
            "fecha": data.get("fecha", ""),
            "fechaDoc": data.get("fecha_doc", ""),
            "procedencia": data.get("procedencia", ""),
            "contenido": data.get("contenido", ""),
        }
        
        return await self._apps_script_action("registrar", row_data)
    
    async def actualizar_documento(self, doc_id: int, data: dict) -> dict:
        """Update document Etapa 1 fields only (B-G columns)."""
        row_data = {
            "accion": "actualizar",
            "fila": doc_id,
            "tipoDoc": data.get("tipo_doc", ""),
            "nDocOrigen": data.get("n_doc_origen", ""),
            "fecha": data.get("fecha", ""),
            "fechaDoc": data.get("fecha_doc", ""),
            "procedencia": data.get("procedencia", ""),
            "contenido": data.get("contenido", ""),
        }
        
        return await self._apps_script_action("actualizar", row_data)
    
    async def entregar_documento(self, doc_id: int, data: dict) -> dict:
        """Deliver document (Etapa 2: Derivación). PENDIENTE → ENTREGADO
        Sets: H=ENTREGADO, I=docTramite, J=nDocTramitado, K=areaEntregada
        """
        row_data = {
            "accion": "entregar",
            "fila": doc_id,
            "docTramite": data.get("doc_tramite", ""),
            "nDocTramitado": data.get("n_doc_tramitado", ""),
            "areaEntregada": data.get("area_entregada", ""),
        }
        
        return await self._apps_script_action("entregar", row_data)
    
    async def descargar_documento(self, doc_id: int, data: dict) -> dict:
        """Resolve document (Etapa 3: Resolución). ENTREGADO → RESUELTO
        Sets: H=RESUELTO, L=descargo, M=nDescargo
        """
        row_data = {
            "accion": "descargar",
            "fila": doc_id,
            "descargo": data.get("descargo", ""),
            "nDescargo": data.get("n_descargo", ""),
        }
        
        return await self._apps_script_action("descargar", row_data)
    
    async def _get_bd_rows(self) -> list[list]:
        """Read all rows from the BD sheet (catalog of document types)."""
        if not self._is_configured():
            return []
        
        url = f"{self.BASE_URL}/{self.sheet_id}/values/BD"
        params = {"key": self.api_key, "majorDimension": "ROWS"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json().get("values", [])
        except Exception as e:
            logger.error(f"Error reading BD sheet: {e}")
            return []
    
    async def get_opciones(self) -> dict:
        """Get distinct values for dropdowns.
        
        tipo_doc: from BD sheet (catalog of document types)
        areas, docs_tramite: from DOCUMENTOS sheet (derived from actual data)
        """
        # Read tipo_doc from BD sheet (catalog)
        bd_rows = await self._get_bd_rows()
        tipos_doc = []
        if bd_rows and len(bd_rows) > 1:
            tipos_doc = sorted(list(set(
                str(row[0]) for row in bd_rows[1:] 
                if row and len(row) > 0 and row[0]
            )))
        
        # Read areas and docs_tramite from DOCUMENTOS sheet
        rows = await self._get_all_rows()
        areas = []
        docs_tramite = []
        if rows and len(rows) > 1:
            data_rows = rows[1:]
            areas = sorted(list(set(
                str(row[self.COL['area_entregada']]) for row in data_rows 
                if len(row) > self.COL['area_entregada'] and row[self.COL['area_entregada']]
            )))
            docs_tramite = sorted(list(set(
                str(row[self.COL['doc_tramite']]) for row in data_rows 
                if len(row) > self.COL['doc_tramite'] and row[self.COL['doc_tramite']]
            )))
        
        return {
            "tipos_doc": tipos_doc,
            "areas": areas,
            "docs_tramite": docs_tramite,
        }
    
    async def eliminar_documento(self, doc_id: int) -> dict:
        """Delete a document row (admin only)."""
        return await self._apps_script_action("eliminar", {"fila": doc_id})
