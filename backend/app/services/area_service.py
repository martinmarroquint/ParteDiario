import logging
from typing import Optional

from app.models.area import Area
from app.services.sheets_service import GoogleSheetsService

logger = logging.getLogger(__name__)


class AreaService:
    
    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
    
    async def get_areas(self) -> list[Area]:
        """Get all areas."""
        rows = await self.sheets.get_range("Areas")
        areas = []
        
        for row in rows[1:] if len(rows) > 0 else []:
            if len(row) >= 5:
                areas.append(self._row_to_area(row))
        
        return areas
    
    async def get_area_by_codigo(self, codigo: str) -> Optional[Area]:
        """Get area by code."""
        row = await self.sheets.find_row("Areas", 2, codigo)
        if row:
            return self._row_to_area(row)
        return None
    
    async def is_area_locked(self, area_codigo: str, mes: int, anio: int) -> bool:
        """Check if an area is locked for a specific month."""
        area = await self.get_area_by_codigo(area_codigo)
        if not area:
            return False
        
        if area.bloqueado and area.mes_bloqueado == mes and area.anio_bloqueado == anio:
            return True
        return False
    
    async def lock_area(self, area_id: int, mes: int, anio: int) -> dict:
        """Lock an area for a specific month."""
        row_index = await self.sheets.find_row_index("Areas", 0, str(area_id))
        if not row_index:
            raise ValueError("Área no encontrada")
        
        await self.sheets.update_cell("Areas", f"F{row_index}", "TRUE")
        await self.sheets.update_cell("Areas", f"G{row_index}", str(mes))
        await self.sheets.update_cell("Areas", f"H{row_index}", str(anio))
        
        return {"message": f"Área bloqueada para {mes}/{anio}"}
    
    async def unlock_area(self, area_id: int) -> dict:
        """Unlock an area."""
        row_index = await self.sheets.find_row_index("Areas", 0, str(area_id))
        if not row_index:
            raise ValueError("Área no encontrada")
        
        await self.sheets.update_cell("Areas", f"F{row_index}", "FALSE")
        await self.sheets.update_cell("Areas", f"G{row_index}", "")
        await self.sheets.update_cell("Areas", f"H{row_index}", "")
        
        return {"message": "Área desbloqueada"}
    
    def _row_to_area(self, row: list) -> Area:
        """Convert sheet row to Area."""
        def safe_get(idx, default=""):
            return row[idx] if len(row) > idx else default
        
        return Area(
            id=int(safe_get(0, "0")),
            nombre=safe_get(1, ""),
            codigo=safe_get(2, ""),
            departamento=safe_get(3, ""),
            division=safe_get(4, ""),
            bloqueado=safe_get(5, "FALSE").upper() == "TRUE",
            mes_bloqueado=int(safe_get(6, "0")) if safe_get(6, "").isdigit() else None,
            anio_bloqueado=int(safe_get(7, "0")) if safe_get(7, "").isdigit() else None,
        )
