import uuid
import logging
from datetime import datetime
from typing import Optional

from app.models.descanso import DescansoMedico, DescansoMedicoCreate
from app.services.sheets_service import GoogleSheetsService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)


class DescansoService:
    
    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
        self.user_service = UserService(sheets_service)
    
    async def get_descansos(self, user_id: int, area: Optional[str] = None, 
                            mes: Optional[int] = None, anio: Optional[int] = None) -> list[DescansoMedico]:
        """Get descansos based on user permissions."""
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            return []
        
        rows = await self.sheets.get_range("DescansosMedicos")
        descansos = []
        
        is_admin = 4 in user.roles
        
        for row in rows[1:] if len(rows) > 0 else []:
            if len(row) < 8:
                continue
            
            descanso = self._row_to_descanso(row)
            
            # Filter by area
            if area:
                descanso_user = await self.user_service.get_user_by_id(descanso.usuario_id)
                if descanso_user and area not in descanso_user.areas:
                    continue
            
            # Filter by month/year if provided
            if mes and anio:
                try:
                    descanso_inicio = datetime.strptime(descanso.fecha_inicio, "%Y-%m-%d")
                    if descanso_inicio.month != mes or descanso_inicio.year != anio:
                        continue
                except ValueError:
                    pass
            
            # Permission check
            if is_admin:
                descansos.append(descanso)
            elif descanso.usuario_id == user_id:
                descansos.append(descanso)
            elif area and area in user.areas:
                descansos.append(descanso)
        
        return descansos
    
    async def get_mis_descansos(self, user_id: int, anio: Optional[int] = None) -> list[DescansoMedico]:
        """Get current user's descansos."""
        rows = await self.sheets.get_range("DescansosMedicos")
        descansos = []
        
        for row in rows[1:] if len(rows) > 0 else []:
            if len(row) < 8:
                continue
            
            descanso = self._row_to_descanso(row)
            
            if descanso.usuario_id != user_id:
                continue
            
            if anio:
                try:
                    descanso_inicio = datetime.strptime(descanso.fecha_inicio, "%Y-%m-%d")
                    if descanso_inicio.year != anio:
                        continue
                except ValueError:
                    pass
            
            descansos.append(descanso)
        
        return descansos
    
    async def registrar_descanso(self, user_id: int, data: DescansoMedicoCreate) -> DescansoMedico:
        """Register a medical rest for a user."""
        target_user = await self.user_service.get_user_by_id(data.usuario_id)
        if not target_user:
            raise ValueError("Usuario no encontrado")
        
        registrador = await self.user_service.get_user_by_id(user_id)
        
        descanso_id = str(uuid.uuid4())[:8]
        
        descanso = DescansoMedico(
            id=descanso_id,
            usuario_id=data.usuario_id,
            usuario_nombre=target_user.nombre,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            codigo_cie10=data.codigo_cie10.upper(),
            diagnostico=data.diagnostico,
            medico_tratante=data.medico_tratante,
            registro=data.registro,
            registrado_por=user_id,
            registrado_por_nombre=registrador.nombre if registrador else "",
            fecha_registro=datetime.now().isoformat(),
        )
        
        row = [
            descanso.id,
            descanso.usuario_id,
            descanso.usuario_nombre,
            descanso.fecha_inicio,
            descanso.fecha_fin,
            descanso.codigo_cie10,
            descanso.diagnostico,
            descanso.medico_tratante,
            descanso.registro,
            descanso.registrado_por,
            descanso.registrado_por_nombre,
            descanso.fecha_registro,
        ]
        
        await self.sheets.append_row("DescansosMedicos", row)
        return descanso
    
    async def eliminar_descanso(self, descanso_id: str) -> bool:
        """Delete a descanso by ID."""
        row_index = await self.sheets.find_row_index("DescansosMedicos", 0, descanso_id)
        if row_index:
            await self.sheets.delete_row("DescansosMedicos", row_index)
            return True
        return False
    
    def _row_to_descanso(self, row: list) -> DescansoMedico:
        """Convert sheet row to DescansoMedico."""
        def safe_get(idx, default=""):
            return row[idx] if len(row) > idx else default
        
        return DescansoMedico(
            id=safe_get(0, ""),
            usuario_id=int(safe_get(1, "0")),
            usuario_nombre=safe_get(2, ""),
            fecha_inicio=safe_get(3, ""),
            fecha_fin=safe_get(4, ""),
            codigo_cie10=safe_get(5, ""),
            diagnostico=safe_get(6, ""),
            medico_tratante=safe_get(7, ""),
            registro=safe_get(8, ""),
            registrado_por=int(safe_get(9, "0")) if safe_get(9, "").isdigit() else 0,
            registrado_por_nombre=safe_get(10, ""),
            fecha_registro=safe_get(11, ""),
        )
