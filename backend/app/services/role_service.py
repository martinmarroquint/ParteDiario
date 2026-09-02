import logging
from typing import Optional

from app.models.role import (
    RolePersona, RolServicio, RolServicioResponse,
    RolSyncRequest, RolCeldaRequest
)
from app.services.sheets_service import GoogleSheetsService

logger = logging.getLogger(__name__)


class RoleService:
    
    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
    
    def _get_sheet_name(self, mes: int, anio: int) -> str:
        """Get the sheet tab name for a specific month/year."""
        return f"Roles_{mes}_{anio}"
    
    async def get_roles(self, mes: int, anio: int, area: str) -> Optional[RolServicioResponse]:
        """Get roles for a specific month, year and area."""
        sheet_name = self._get_sheet_name(mes, anio)
        rows = await self.sheets.get_range(sheet_name)
        
        if not rows:
            return None
        
        # Filter by area (column D = area)
        personas = []
        finalizado = False
        
        for row in rows[1:] if len(rows) > 0 else []:  # Skip header
            if len(row) < 7:
                continue
            
            row_area = row[3] if len(row) > 3 else ""
            if row_area != area:
                continue
            
            persona = row[4] if len(row) > 4 else ""
            grado = row[5] if len(row) > 5 else ""
            
            # Parse turnos (columns G-AG = days 1-31)
            turnos = {}
            for day in range(1, 32):
                col_idx = 6 + (day - 1)  # Column G = index 6
                turno = row[col_idx] if len(row) > col_idx else ""
                if turno:
                    turnos[day] = turno
            
            # Check finalizado flag (column AH)
            if len(row) > 37:
                finalizado = row[37].upper() == "TRUE"
            
            personas.append(RolePersona(
                persona=persona,
                grado=grado,
                turnos=turnos
            ))
        
        return RolServicioResponse(
            mes=mes,
            anio=anio,
            area=area,
            personas=personas,
            finalizado=finalizado
        )
    
    async def save_roles(self, mes: int, anio: int, area: str, personas: list[RolePersona], user_id: int) -> dict:
        """Save roles for a specific month/year/area."""
        sheet_name = self._get_sheet_name(mes, anio)
        
        # Check if sheet exists, create if not
        existing = await self.sheets.get_range(sheet_name)
        if not existing:
            # Create header row
            header = ["ID", "Mes", "Año", "Área", "Persona", "Grado"]
            for day in range(1, 32):
                header.append(f"Día {day}")
            header.append("Finalizado")
            header.append("Creado por")
            header.append("Fecha creación")
            await self.sheets.append_row(sheet_name, header)
        
        for persona in personas:
            row = [
                "",  # ID auto
                mes,
                anio,
                area,
                persona.persona,
                persona.grado,
            ]
            for day in range(1, 32):
                row.append(persona.turnos.get(day, ""))
            row.append("FALSE")  # finalizado
            row.append(user_id)
            row.append("")  # fecha creación
            
            await self.sheets.append_row(sheet_name, row)
        
        return {"message": f"Roles guardados para {area}/{mes}/{anio}"}
    
    async def update_celda(self, mes: int, anio: int, area: str, persona: str, dia: int, turno: str) -> dict:
        """Update a single cell in the role sheet."""
        sheet_name = self._get_sheet_name(mes, anio)
        rows = await self.sheets.get_range(sheet_name)
        
        for idx, row in enumerate(rows[1:] if len(rows) > 0 else [], start=2):
            if len(row) > 4 and row[4] == persona and row[3] == area:
                col_idx = 6 + (dia - 1)  # Column G = day 1
                from app.utils.constants import TURNOS_VALIDOS
                if turno.upper() not in TURNOS_VALIDOS:
                    return {"error": f"Turno '{turno}' no es válido"}
                
                # Build cell reference (e.g., G5)
                col_letter = chr(64 + col_idx) if col_idx <= 26 else self._get_col_letter(col_idx)
                await self.sheets.update_cell(sheet_name, f"{col_letter}{idx}", turno.upper())
                return {"message": f"Turno actualizado: {persona} día {dia} → {turno}"}
        
        return {"error": f"Persona '{persona}' no encontrada en área '{area}'"}
    
    async def sync_roles(self, mes: int, anio: int, area: str, datos: list[RolePersona], user_id: int) -> dict:
        """Sync complete role data (replace all)."""
        sheet_name = self._get_sheet_name(mes, anio)
        
        # Delete existing data for this area
        rows = await self.sheets.get_range(sheet_name)
        if rows:
            for idx in range(len(rows) - 1, 0, -1):
                row = rows[idx]
                if len(row) > 3 and row[3] == area:
                    await self.sheets.delete_row(sheet_name, idx + 1)
        
        # Re-save
        result = await self.save_roles(mes, anio, area, datos, user_id)
        return result
    
    async def finalizar_rol(self, mes: int, anio: int, area: str) -> dict:
        """Mark role as finalized."""
        sheet_name = self._get_sheet_name(mes, anio)
        rows = await self.sheets.get_range(sheet_name)
        
        for idx, row in enumerate(rows[1:] if len(rows) > 0 else [], start=2):
            if len(row) > 3 and row[3] == area:
                await self.sheets.update_cell(sheet_name, f"AH{idx}", "TRUE")
        
        return {"message": f"Rol finalizado para {area}/{mes}/{anio}"}
    
    async def desfinalizar_rol(self, mes: int, anio: int, area: str) -> dict:
        """Unmark role as finalized."""
        sheet_name = self._get_sheet_name(mes, anio)
        rows = await self.sheets.get_range(sheet_name)
        
        for idx, row in enumerate(rows[1:] if len(rows) > 0 else [], start=2):
            if len(row) > 3 and row[3] == area:
                await self.sheets.update_cell(sheet_name, f"AH{idx}", "FALSE")
        
        return {"message": f"Rol desfinalizado para {area}/{mes}/{anio}"}
    
    def _get_col_letter(self, col_num: int) -> str:
        """Convert column number to Excel-style letter (1=A, 27=AA)."""
        result = ""
        while col_num > 0:
            col_num, remainder = divmod(col_num - 1, 26)
            result = chr(65 + remainder) + result
        return result
