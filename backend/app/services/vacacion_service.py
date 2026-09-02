import uuid
import logging
from datetime import datetime
from typing import Optional

from app.models.vacacion import Vacacion, VacacionCreate
from app.services.sheets_service import GoogleSheetsService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)


class VacacionService:
    
    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
        self.user_service = UserService(sheets_service)
    
    async def get_vacaciones(self, user_id: int, area: Optional[str] = None, 
                             anio: Optional[int] = None) -> list[Vacacion]:
        """Get vacations based on user permissions."""
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            return []
        
        rows = await self.sheets.get_range("Vacaciones")
        vacaciones = []
        
        is_admin = 4 in user.roles
        
        for row in rows[1:] if len(rows) > 0 else []:
            if len(row) < 6:
                continue
            
            vacacion = self._row_to_vacacion(row)
            
            if area:
                vacacion_user = await self.user_service.get_user_by_id(vacacion.usuario_id)
                if vacacion_user and area not in vacacion_user.areas:
                    continue
            
            if anio:
                try:
                    vac_inicio = datetime.strptime(vacacion.fecha_inicio, "%Y-%m-%d")
                    if vac_inicio.year != anio:
                        continue
                except ValueError:
                    pass
            
            if is_admin:
                vacaciones.append(vacacion)
            elif vacacion.usuario_id == user_id:
                vacaciones.append(vacacion)
            elif area and area in user.areas:
                vacaciones.append(vacacion)
        
        return vacaciones
    
    async def get_mis_vacaciones(self, user_id: int, anio: Optional[int] = None) -> list[Vacacion]:
        """Get current user's vacations."""
        rows = await self.sheets.get_range("Vacaciones")
        vacaciones = []
        
        for row in rows[1:] if len(rows) > 0 else []:
            if len(row) < 6:
                continue
            
            vacacion = self._row_to_vacacion(row)
            
            if vacacion.usuario_id != user_id:
                continue
            
            if anio:
                try:
                    vac_inicio = datetime.strptime(vacacion.fecha_inicio, "%Y-%m-%d")
                    if vac_inicio.year != anio:
                        continue
                except ValueError:
                    pass
            
            vacaciones.append(vacacion)
        
        return vacaciones
    
    async def registrar_vacacion(self, user_id: int, data: VacacionCreate) -> Vacacion:
        """Register vacation for a user."""
        target_user = await self.user_service.get_user_by_id(data.usuario_id)
        if not target_user:
            raise ValueError("Usuario no encontrado")
        
        registrador = await self.user_service.get_user_by_id(user_id)
        
        vacacion_id = str(uuid.uuid4())[:8]
        
        vacacion = Vacacion(
            id=vacacion_id,
            usuario_id=data.usuario_id,
            usuario_nombre=target_user.nombre,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            tipo=data.tipo,
            registrado_por=user_id,
            registrado_por_nombre=registrador.nombre if registrador else "",
            fecha_registro=datetime.now().isoformat(),
        )
        
        row = [
            vacacion.id,
            vacacion.usuario_id,
            vacacion.usuario_nombre,
            vacacion.fecha_inicio,
            vacacion.fecha_fin,
            vacacion.tipo,
            vacacion.registrado_por,
            vacacion.registrado_por_nombre,
            vacacion.fecha_registro,
        ]
        
        await self.sheets.append_row("Vacaciones", row)
        return vacacion
    
    async def eliminar_vacacion(self, vacacion_id: str) -> bool:
        """Delete a vacation record."""
        row_index = await self.sheets.find_row_index("Vacaciones", 0, vacacion_id)
        if row_index:
            await self.sheets.delete_row("Vacaciones", row_index)
            return True
        return False
    
    def _row_to_vacacion(self, row: list) -> Vacacion:
        """Convert sheet row to Vacacion."""
        def safe_get(idx, default=""):
            return row[idx] if len(row) > idx else default
        
        return Vacacion(
            id=safe_get(0, ""),
            usuario_id=int(safe_get(1, "0")),
            usuario_nombre=safe_get(2, ""),
            fecha_inicio=safe_get(3, ""),
            fecha_fin=safe_get(4, ""),
            tipo=safe_get(5, "V"),
            registrado_por=int(safe_get(6, "0")) if safe_get(6, "").isdigit() else 0,
            registrado_por_nombre=safe_get(7, ""),
            fecha_registro=safe_get(8, ""),
        )
