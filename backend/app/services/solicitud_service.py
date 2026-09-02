import json
import logging
from datetime import datetime
from typing import Optional

from app.models.solicitud import (
    Solicitud, SolicitudCreate, SolicitudApprove, SolicitudReject
)
from app.models.estructura_jerarquica import NivelJerarquico, CadenaAprobacion
from app.services.sheets_service import GoogleSheetsService
from app.services.user_service import UserService
from app.services.role_service import RoleService

logger = logging.getLogger(__name__)


class SolicitudService:
    
    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
        self.user_service = UserService(sheets_service)
        self.role_service = RoleService(sheets_service)
    
    async def get_cadena_aprobacion(self, user_id: int) -> list[NivelJerarquico]:
        """Get the approval chain for a user."""
        rows = await self.sheets.find_rows("EstructuraJerarquica", 0, str(user_id))
        
        niveles = []
        for row in rows:
            if len(row) >= 7:
                nivel = NivelJerarquico(
                    nivel=int(row[1]) if row[1].isdigit() else 1,
                    area=row[2] if len(row) > 2 else None,
                    departamento=row[3] if len(row) > 3 else None,
                    division=row[4] if len(row) > 4 else None,
                    jefe_user_id=int(row[5]) if len(row) > 5 and row[5].isdigit() else 0,
                    jefe_nombre=row[6] if len(row) > 6 else "",
                    es_directo=row[7].upper() == "TRUE" if len(row) > 7 else True,
                )
                niveles.append(nivel)
        
        return sorted(niveles, key=lambda x: x.nivel)
    
    async def crear_solicitud(self, user_id: int, data: SolicitudCreate) -> Solicitud:
        """Create a new change request."""
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")
        
        # Get approval chain
        cadena = await self.get_cadena_aprobacion(user_id)
        if not cadena:
            raise ValueError("El usuario no tiene una estructura jerárquica definida. Contacte al administrador.")
        
        # Determine initial state
        primer_nivel = cadena[0].nivel
        estado_inicial = CadenaAprobacion.get_estado_inicial(primer_nivel)
        
        # Generate UUID
        import uuid
        solicitud_id = str(uuid.uuid4())[:8]
        
        solicitud = Solicitud(
            id=solicitud_id,
            solicitante_id=user_id,
            solicitante_nombre=user.nombre,
            fecha_solicitud=datetime.now().isoformat(),
            estado=estado_inicial,
            nivel_actual=primer_nivel,
            area_solicitante=data.area,
            persona_turno=data.persona_turno,
            dia=data.dia,
            turno_actual=data.turno_actual,
            turno_nuevo=data.turno_nuevo,
            persona_suplente=data.persona_suplente,
            motivo=data.motivo,
            mes=data.mes,
            anio=data.anio,
            aprobaciones=[],
            observaciones="",
        )
        
        # Save to Sheets
        row = [
            solicitud.id,
            solicitud.solicitante_id,
            solicitud.solicitante_nombre,
            solicitud.fecha_solicitud,
            solicitud.estado,
            solicitud.nivel_actual,
            solicitud.area_solicitante,
            solicitud.persona_turno,
            solicitud.dia,
            solicitud.turno_actual,
            solicitud.turno_nuevo,
            solicitud.persona_suplente,
            solicitud.motivo,
            solicitud.mes,
            solicitud.anio,
            json.dumps(solicitud.aprobaciones),
            solicitud.observaciones,
            solicitud.fecha_solicitud,
        ]
        
        await self.sheets.append_row("Solicitudes", row)
        return solicitud
    
    async def get_solicitud(self, solicitud_id: str) -> Optional[Solicitud]:
        """Get a solicitud by ID."""
        row = await self.sheets.find_row("Solicitudes", 0, solicitud_id)
        if not row:
            return None
        return self._row_to_solicitud(row)
    
    async def get_solicitudes(self, user_id: int, estado: Optional[str] = None, area: Optional[str] = None) -> list[Solicitud]:
        """Get solicitudes based on user permissions."""
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            return []
        
        rows = await self.sheets.get_range("Solicitudes")
        solicitudes = []
        
        is_admin = 4 in user.roles
        is_jefe_area = 1 in user.roles
        is_jefe_depto = 2 in user.roles
        is_jefe_div = 3 in user.roles
        
        for row in rows[1:] if len(rows) > 0 else []:
            if len(row) < 15:
                continue
            
            sol = self._row_to_solicitud(row)
            
            # Filter by status
            if estado and sol.estado != estado:
                continue
            
            # Filter by area
            if area and sol.area_solicitante != area:
                continue
            
            # Permission filter
            if is_admin:
                solicitudes.append(sol)
            elif sol.solicitante_id == user_id:
                # User can see their own solicitudes
                solicitudes.append(sol)
            elif is_jefe_area and sol.area_solicitante in user.areas:
                solicitudes.append(sol)
            elif is_jefe_depto:
                solicitudes.append(sol)
            elif is_jefe_div:
                solicitudes.append(sol)
        
        return solicitudes
    
    async def aprobar_solicitud(self, solicitud_id: str, aprobador_id: int, data: SolicitudApprove) -> Solicitud:
        """Approve a solicitud at the current level."""
        solicitud = await self.get_solicitud(solicitud_id)
        if not solicitud:
            raise ValueError("Solicitud no encontrada")
        
        if solicitud.estado == "APROBADA":
            raise ValueError("La solicitud ya está aprobada")
        
        if solicitud.estado == "RECHAZADA":
            raise ValueError("La solicitud fue rechazada")
        
        # Get approval chain
        cadena = await self.get_cadena_aprobacion(solicitud.solicitante_id)
        
        # Verify approver can approve
        puede_aprobar = False
        for nivel in cadena:
            if nivel.jefe_user_id == aprobador_id:
                if CadenaAprobacion.nivel_coincide_con_estado(nivel.nivel, solicitud.estado):
                    puede_aprobar = True
                    break
        
        # Admin can always approve
        aprobador = await self.user_service.get_user_by_id(aprobador_id)
        if aprobador and 4 in aprobador.roles:
            puede_aprobar = True
        
        if not puede_aprobar:
            raise PermissionError("No tienes permiso para aprobar esta solicitud en este estado")
        
        # Record approval
        aprobacion = {
            "aprobador_id": aprobador_id,
            "aprobador_nombre": aprobador.nombre if aprobador else "",
            "nivel": solicitud.nivel_actual,
            "fecha": datetime.now().isoformat(),
            "accion": "APROBADA",
            "observaciones": data.observaciones or "",
        }
        solicitud.aprobaciones.append(aprobacion)
        
        # Determine next state
        siguiente_estado = CadenaAprobacion.get_siguiente_estado(
            solicitud.estado, cadena, solicitud.nivel_actual
        )
        
        # Apply change if final approval
        if siguiente_estado == "APROBADA":
            await self._aplicar_cambio_turno(solicitud)
        
        # Update solicitud
        solicitud.estado = siguiente_estado
        solicitud.nivel_actual = CadenaAprobacion.get_siguiente_nivel(
            solicitud.nivel_actual, cadena
        )
        
        await self._update_solicitud(solicitud)
        
        return solicitud
    
    async def rechazar_solicitud(self, solicitud_id: str, aprobador_id: int, data: SolicitudReject) -> Solicitud:
        """Reject a solicitud."""
        solicitud = await self.get_solicitud(solicitud_id)
        if not solicitud:
            raise ValueError("Solicitud no encontrada")
        
        if solicitud.estado in ("APROBADA", "RECHAZADA"):
            raise ValueError("La solicitud ya fue procesada")
        
        aprobador = await self.user_service.get_user_by_id(aprobador_id)
        
        aprobacion = {
            "aprobador_id": aprobador_id,
            "aprobador_nombre": aprobador.nombre if aprobador else "",
            "nivel": solicitud.nivel_actual,
            "fecha": datetime.now().isoformat(),
            "accion": "RECHAZADA",
            "observaciones": data.motivo_rechazo,
        }
        solicitud.aprobaciones.append(aprobacion)
        solicitud.estado = "RECHAZADA"
        solicitud.observaciones = data.motivo_rechazo
        
        await self._update_solicitud(solicitud)
        return solicitud
    
    async def _aplicar_cambio_turno(self, solicitud: Solicitud):
        """Apply the approved turn change to the role sheet."""
        await self.role_service.update_celda(
            mes=solicitud.mes,
            anio=solicitud.anio,
            area=solicitud.area_solicitante,
            persona=solicitud.persona_turno,
            dia=solicitud.dia,
            turno=solicitud.turno_nuevo
        )
        logger.info(f"Cambio aplicado: {solicitud.persona_turno} día {solicitud.dia} → {solicitud.turno_nuevo}")
    
    async def _update_solicitud(self, solicitud: Solicitud):
        """Update solicitud in Sheets."""
        row_index = await self.sheets.find_row_index("Solicitudes", 0, solicitud.id)
        if not row_index:
            return
        
        await self.sheets.update_cell("Solicitudes", f"E{row_index}", solicitud.estado)
        await self.sheets.update_cell("Solicitudes", f"F{row_index}", str(solicitud.nivel_actual))
        await self.sheets.update_cell("Solicitudes", f"P{row_index}", json.dumps(solicitud.aprobaciones))
        await self.sheets.update_cell("Solicitudes", f"Q{row_index}", solicitud.observaciones)
        await self.sheets.update_cell("Solicitudes", f"R{row_index}", datetime.now().isoformat())
    
    def _row_to_solicitud(self, row: list) -> Solicitud:
        """Convert a sheet row to Solicitud model."""
        def safe_get(idx, default=""):
            return row[idx] if len(row) > idx else default
        
        try:
            aprobaciones = json.loads(safe_get(15, "[]"))
        except json.JSONDecodeError:
            aprobaciones = []
        
        return Solicitud(
            id=safe_get(0, ""),
            solicitante_id=int(safe_get(1, "0")),
            solicitante_nombre=safe_get(2, ""),
            fecha_solicitud=safe_get(3, ""),
            estado=safe_get(4, "ENVIADA"),
            nivel_actual=int(safe_get(5, "1")),
            area_solicitante=safe_get(6, ""),
            persona_turno=safe_get(7, ""),
            dia=int(safe_get(8, "0")),
            turno_actual=safe_get(9, ""),
            turno_nuevo=safe_get(10, ""),
            persona_suplente=safe_get(11, ""),
            motivo=safe_get(12, ""),
            mes=int(safe_get(13, "0")),
            anio=int(safe_get(14, "0")),
            aprobaciones=aprobaciones,
            observaciones=safe_get(16, ""),
            actualizado_en=safe_get(17, ""),
        )
