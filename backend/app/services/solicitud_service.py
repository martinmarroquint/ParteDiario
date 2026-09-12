import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from app.models.solicitud import (
    Solicitud, SolicitudCreate, SolicitudApprove,
    SolicitudReject, SolicitudCancel, SolicitudStats,
    Participante, ParticipanteCambio,
)
from app.services.sheets_service import GoogleSheetsService
from app.services.user_service import UserService, HOJA_USUARIOS
from app.services.role_service import RoleService
from app.utils.constants import (
    ESTADO_PENDIENTE, ESTADO_APROBADO, ESTADO_DESAPROBADO, ESTADO_CANCELADO,
    TRANSICIONES_VALIDAS, SHEETS_TABS,
)

logger = logging.getLogger(__name__)

HOJA_SOLICITUDES = "SOLICITUDES"

# SOLICITUDES sheet column mapping (A-T, 20 columns)
COL_ID = 0               # A
COL_SOLICITANTE_ID = 1   # B
COL_SOLICITANTE_NOMBRE = 2  # C
COL_SOLICITANTE_GRADO = 3   # D
COL_AREA_SOLICITANTE = 4    # E
COL_FECHA_SOLICITUD = 5     # F
COL_ESTADO = 6              # G
COL_NIVEL_ACTUAL = 7        # H
COL_TIPO_CAMBIO = 8         # I
COL_PARTICIPANTES = 9       # J
COL_MOTIVO = 10             # K
COL_PORMENORES = 11         # L
COL_HOJA = 12               # M
COL_MES = 13                # N
COL_ANIO = 14               # O
COL_CADENA = 15             # P
COL_HISTORIAL = 16          # Q
COL_CREADO_EN = 17          # R
COL_ACTUALIZADO_EN = 18     # S
COL_SOLICITANTE_DNI = 19    # T


class SolicitudService:

    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
        self.user_service = UserService(sheets_service)
        self.role_service = RoleService(sheets_service)

    # ------------------------------------------------------------------
    # Chain builder
    # ------------------------------------------------------------------

    async def _build_cadena_aprobacion(self, area: str) -> list[dict]:
        """Build approval chain from USUARIOS_OCR.

        Logic (mirrors servicioSolicitudes.js):
        1. Read all users from USUARIOS_OCR
        2. Keep users with rol 1-3 whose areas_json includes `area`
        3. Sort by role ascending (1 → 2 → 3)
        4. Deduplicate by nombre
        5. Always append Administrador (nivel 4)
        """
        rows = await self.sheets.get_range(HOJA_USUARIOS)
        if not rows:
            return [{"nombre": "Administrador", "nivel": 4, "user_id": 0}]

        jefes = []
        for row in rows[1:]:  # skip header
            if len(row) < 8:
                continue
            user_id = int(row[0]) if row[0].isdigit() else 0
            nombre = row[1].strip() if row[1] else ""
            rol = int(row[6]) if row[6].isdigit() else 0

            areas_raw = row[7] if len(row) > 7 else "[]"
            try:
                areas = json.loads(areas_raw) if areas_raw.startswith("[") else [a.strip() for a in areas_raw.split(",") if a.strip()]
            except (json.JSONDecodeError, TypeError):
                areas = [a.strip() for a in areas_raw.split(",") if a.strip()]

            if rol in (1, 2, 3) and area in areas:
                jefes.append({"nombre": nombre, "nivel": rol, "user_id": user_id})

        # Sort by nivel ascending
        jefes.sort(key=lambda x: x["nivel"])

        # Deduplicate by nombre
        seen = set()
        cadena = []
        for j in jefes:
            if j["nombre"] not in seen:
                seen.add(j["nombre"])
                cadena.append(j)

        # Always append admin
        cadena.append({"nombre": "Administrador", "nivel": 4, "user_id": 0})

        return cadena

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def crear_solicitud(self, user_id: int, data: SolicitudCreate) -> Solicitud:
        """Create a new solicitud."""
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")

        area = data.participantes[0].area if data.participantes else ""
        if not area:
            area = user.areas[0] if user.areas else ""

        cadena = await self._build_cadena_aprobacion(area)
        primer_nivel = cadena[0]["nivel"] if cadena else 4

        now = datetime.now().isoformat()
        solicitud_id = str(uuid.uuid4())[:8]

        solicitud = Solicitud(
            id=solicitud_id,
            solicitante_id=user_id,
            solicitante_nombre=user.nombre,
            solicitante_grado=user.grado if hasattr(user, "grado") else "",
            fecha_solicitud=now,
            estado=ESTADO_PENDIENTE,
            nivel_actual=primer_nivel,
            area_solicitante=area,
            tipo_cambio=data.tipo_cambio,
            participantes=data.participantes,
            motivo=data.motivo,
            pormenores=data.pormenores,
            hoja=data.hoja,
            mes=data.mes,
            anio=data.anio,
            cadena=cadena,
            historial=[],
            creado_en=now,
            actualizado_en=now,
        )

        row = self._solicitud_to_row(solicitud)
        await self.sheets.append_row(HOJA_SOLICITUDES, row)
        logger.info(f"Solicitud {solicitud_id} creada por {user.nombre}")
        return solicitud

    async def get_solicitud(self, solicitud_id: str) -> Optional[Solicitud]:
        """Get a single solicitud by ID."""
        row = await self.sheets.find_row(HOJA_SOLICITUDES, COL_ID, solicitud_id)
        if not row:
            return None
        return self._row_to_solicitud(row)

    async def get_solicitudes_propias(self, user_id: int) -> list[Solicitud]:
        """Get solicitudes where the user is the requester."""
        rows = await self.sheets.get_range(HOJA_SOLICITUDES)
        result = []
        for row in rows[1:] if rows else []:
            if len(row) <= COL_SOLICITANTE_ID:
                continue
            sol = self._row_to_solicitud(row)
            if sol.solicitante_id == user_id:
                result.append(sol)
        result.sort(key=lambda s: s.id, reverse=True)
        return result

    async def get_bandeja(self, user_id: int) -> list[Solicitud]:
        """Get solicitudes the user can act on (inbox).

        - Admin (rol 4): ALL pending solicitudes
        - Jefe (rol 1-3): solicitudes in their areas where nivel_actual matches their role
        - Regular (rol 0): own solicitudes only (same as get_solicitudes_propias)
        """
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            return []

        is_admin = 4 in user.roles
        is_jefe = any(r in user.roles for r in [1, 2, 3])
        user_roles = set(user.roles)
        user_areas = set(user.areas) if user.areas else set()

        rows = await self.sheets.get_range(HOJA_SOLICITUDES)
        result = []

        for row in rows[1:] if rows else []:
            if len(row) <= COL_ESTADO:
                continue
            sol = self._row_to_solicitud(row)

            if sol.estado != ESTADO_PENDIENTE:
                continue

            if is_admin:
                result.append(sol)
            elif is_jefe:
                # Can act if solicitud's nivel_actual matches one of the user's roles
                # and the solicitud is in their area
                in_area = sol.area_solicitante in user_areas or any(
                    p.area in user_areas for p in sol.participantes
                )
                nivel_match = sol.nivel_actual in user_roles
                if in_area and nivel_match:
                    result.append(sol)

        result.sort(key=lambda s: s.id, reverse=True)
        return result

    async def get_estadisticas(self, user_id: int) -> SolicitudStats:
        """Count solicitudes by status for the current user."""
        rows = await self.sheets.get_range(HOJA_SOLICITUDES)
        pendientes = aprobadas = desaprobadas = canceladas = 0

        for row in rows[1:] if rows else []:
            if len(row) <= COL_SOLICITANTE_ID:
                continue
            sol = self._row_to_solicitud(row)
            if sol.solicitante_id != user_id:
                continue
            if sol.estado == ESTADO_PENDIENTE:
                pendientes += 1
            elif sol.estado == ESTADO_APROBADO:
                aprobadas += 1
            elif sol.estado == ESTADO_DESAPROBADO:
                desaprobadas += 1
            elif sol.estado == ESTADO_CANCELADO:
                canceladas += 1

        return SolicitudStats(
            total_solicitudes=pendientes + aprobadas + desaprobadas + canceladas,
            pendientes=pendientes,
            aprobadas=aprobadas,
            desaprobadas=desaprobadas,
            canceladas=canceladas,
        )

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    async def aprobar_solicitud(
        self, solicitud_id: str, aprobador_id: int, data: SolicitudApprove
    ) -> Solicitud:
        """Approve a solicitud at the current level."""
        solicitud = await self.get_solicitud(solicitud_id)
        if not solicitud:
            raise ValueError("Solicitud no encontrada")
        if solicitud.estado != ESTADO_PENDIENTE:
            raise ValueError(f"La solicitud ya fue procesada (estado: {solicitud.estado})")

        aprobador = await self.user_service.get_user_by_id(aprobador_id)
        if not aprobador:
            raise ValueError("Aprobador no encontrado")

        # Permission check
        is_admin = 4 in aprobador.roles
        can_approve = False

        if is_admin:
            can_approve = True
        else:
            # User must be a jefe and nivel_actual must match one of their roles
            if solicitud.nivel_actual in aprobador.roles:
                # Area must match
                in_area = (
                    solicitud.area_solicitante in aprobador.areas
                    or any(p.area in aprobador.areas for p in solicitud.participantes)
                )
                if in_area:
                    can_approve = True

        if not can_approve:
            raise PermissionError("No tienes permiso para aprobar esta solicitud en este nivel")

        now = datetime.now().isoformat()

        # Record in historial
        historial_entry = {
            "accion": "APROBADO",
            "aprobador_id": aprobador_id,
            "aprobador_nombre": aprobador.nombre,
            "nivel": solicitud.nivel_actual,
            "fecha": now,
            "observaciones": data.observaciones or "",
        }
        solicitud.historial.append(historial_entry)

        # Find next level in chain
        next_level = None
        found_current = False
        for step in solicitud.cadena:
            if found_current:
                next_level = step["nivel"]
                break
            if step["nivel"] == solicitud.nivel_actual:
                found_current = True

        if next_level is not None:
            # Advance to next level
            solicitud.nivel_actual = next_level
        else:
            # Was the last level → fully approved
            solicitud.estado = ESTADO_APROBADO
            await self._aplicar_cambios(solicitud)

        solicitud.actualizado_en = now
        await self._update_solicitud(solicitud)
        logger.info(
            f"Solicitud {solicitud_id} aprobada nivel {historial_entry['nivel']} "
            f"por {aprobador.nombre}"
        )
        return solicitud

    async def rechazar_solicitud(
        self, solicitud_id: str, aprobador_id: int, data: SolicitudReject
    ) -> Solicitud:
        """Reject a solicitud at the current level."""
        solicitud = await self.get_solicitud(solicitud_id)
        if not solicitud:
            raise ValueError("Solicitud no encontrada")
        if solicitud.estado != ESTADO_PENDIENTE:
            raise ValueError(f"La solicitud ya fue procesada (estado: {solicitud.estado})")

        aprobador = await self.user_service.get_user_by_id(aprobador_id)
        if not aprobador:
            raise ValueError("Aprobador no encontrado")

        # Same permission check as approve
        is_admin = 4 in aprobador.roles
        can_reject = False

        if is_admin:
            can_reject = True
        else:
            if solicitud.nivel_actual in aprobador.roles:
                in_area = (
                    solicitud.area_solicitante in aprobador.areas
                    or any(p.area in aprobador.areas for p in solicitud.participantes)
                )
                if in_area:
                    can_reject = True

        if not can_reject:
            raise PermissionError("No tienes permiso para rechazar esta solicitud en este nivel")

        now = datetime.now().isoformat()

        historial_entry = {
            "accion": "DESAPROBADO",
            "aprobador_id": aprobador_id,
            "aprobador_nombre": aprobador.nombre,
            "nivel": solicitud.nivel_actual,
            "fecha": now,
            "observaciones": data.motivo_rechazo,
        }
        solicitud.historial.append(historial_entry)
        solicitud.estado = ESTADO_DESAPROBADO
        solicitud.actualizado_en = now

        await self._update_solicitud(solicitud)
        logger.info(
            f"Solicitud {solicitud_id} rechazada nivel {historial_entry['nivel']} "
            f"por {aprobador.nombre}"
        )
        return solicitud

    async def cancelar_solicitud(
        self, solicitud_id: str, solicitante_id: int, data: SolicitudCancel
    ) -> Solicitud:
        """Cancel a solicitud (only by the requester, only if pending)."""
        solicitud = await self.get_solicitud(solicitud_id)
        if not solicitud:
            raise ValueError("Solicitud no encontrada")
        if solicitud.solicitante_id != solicitante_id:
            raise PermissionError("Solo el solicitante puede cancelar la solicitud")
        if solicitud.estado != ESTADO_PENDIENTE:
            raise ValueError(f"La solicitud no se puede cancelar (estado: {solicitud.estado})")

        now = datetime.now().isoformat()

        historial_entry = {
            "accion": "CANCELADO",
            "aprobador_id": solicitante_id,
            "aprobador_nombre": solicitud.solicitante_nombre,
            "nivel": solicitud.nivel_actual,
            "fecha": now,
            "observaciones": data.motivo or "",
        }
        solicitud.historial.append(historial_entry)
        solicitud.estado = ESTADO_CANCELADO
        solicitud.actualizado_en = now

        await self._update_solicitud(solicitud)
        logger.info(f"Solicitud {solicitud_id} cancelada por {solicitud.solicitante_nombre}")
        return solicitud

    # ------------------------------------------------------------------
    # Apply changes to role sheet
    # ------------------------------------------------------------------

    async def _aplicar_cambios(self, solicitud: Solicitud) -> None:
        """Write approved turn changes to the role sheet via role_service."""
        for participante in solicitud.participantes:
            for cambio in participante.cambios:
                result = await self.role_service.update_celda(
                    mes=solicitud.mes,
                    anio=solicitud.anio,
                    area=participante.area,
                    persona=participante.nombre,
                    dia=cambio.dia,
                    turno=cambio.turno_nuevo,
                )
                if result and result.get("error"):
                    logger.warning(
                        f"Error aplicando cambio {participante.nombre} día {cambio.dia}: "
                        f"{result['error']}"
                    )
                else:
                    logger.info(
                        f"Cambio aplicado: {participante.nombre} día {cambio.dia} "
                        f"→ {cambio.turno_nuevo}"
                    )

    # ------------------------------------------------------------------
    # Sheet persistence helpers
    # ------------------------------------------------------------------

    async def _update_solicitud(self, solicitud: Solicitud) -> None:
        """Update mutable fields of an existing solicitud row."""
        row_index = await self.sheets.find_row_index(HOJA_SOLICITUDES, COL_ID, solicitud.id)
        if not row_index:
            logger.error(f"No se encontró solicitud {solicitud.id} para actualizar")
            return

        await self.sheets.update_cell(HOJA_SOLICITUDES, f"G{row_index}", solicitud.estado)
        await self.sheets.update_cell(HOJA_SOLICITUDES, f"H{row_index}", str(solicitud.nivel_actual))
        await self.sheets.update_cell(HOJA_SOLICITUDES, f"P{row_index}", json.dumps(solicitud.cadena, ensure_ascii=False))
        await self.sheets.update_cell(HOJA_SOLICITUDES, f"Q{row_index}", json.dumps(solicitud.historial, ensure_ascii=False))
        await self.sheets.update_cell(HOJA_SOLICITUDES, f"S{row_index}", solicitud.actualizado_en)

    def _solicitud_to_row(self, s: Solicitud) -> list:
        """Convert a Solicitud to a flat list for the sheet row."""
        return [
            s.id,                                     # A
            str(s.solicitante_id),                    # B
            s.solicitante_nombre,                     # C
            s.solicitante_grado,                      # D
            s.area_solicitante,                       # E
            s.fecha_solicitud,                        # F
            s.estado,                                 # G
            str(s.nivel_actual),                      # H
            s.tipo_cambio,                            # I
            json.dumps([p.model_dump() for p in s.participantes], ensure_ascii=False),  # J
            s.motivo,                                 # K
            s.pormenores,                             # L
            s.hoja,                                   # M
            str(s.mes),                               # N
            str(s.anio),                              # O
            json.dumps(s.cadena, ensure_ascii=False), # P
            json.dumps(s.historial, ensure_ascii=False),  # Q
            s.creado_en,                              # R
            s.actualizado_en,                         # S
            "",                                       # T (solicitante_dni — not available from User model directly)
        ]

    def _row_to_solicitud(self, row: list) -> Solicitud:
        """Convert a flat sheet row to a Solicitud model."""
        def safe(idx: int, default="") -> str:
            return row[idx] if len(row) > idx else default

        def safe_json(idx: int, default=None):
            raw = safe(idx, "[]")
            if not raw:
                return default if default is not None else []
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                return default if default is not None else []

        participantes_data = safe_json(COL_PARTICIPANTES, [])
        participantes = []
        for p in participantes_data:
            if isinstance(p, dict):
                cambios_raw = p.get("cambios", [])
                cambios = [ParticipanteCambio(**c) if isinstance(c, dict) else c for c in cambios_raw]
                participantes.append(Participante(
                    nombre=p.get("nombre", ""),
                    dni=p.get("dni", ""),
                    area=p.get("area", ""),
                    fila=p.get("fila", 0),
                    cambios=cambios,
                ))

        return Solicitud(
            id=safe(COL_ID, ""),
            solicitante_id=int(safe(COL_SOLICITANTE_ID, "0")) if safe(COL_SOLICITANTE_ID, "0").isdigit() else 0,
            solicitante_nombre=safe(COL_SOLICITANTE_NOMBRE, ""),
            solicitante_grado=safe(COL_SOLICITANTE_GRADO, ""),
            fecha_solicitud=safe(COL_FECHA_SOLICITUD, ""),
            estado=safe(COL_ESTADO, ESTADO_PENDIENTE),
            nivel_actual=int(safe(COL_NIVEL_ACTUAL, "4")) if safe(COL_NIVEL_ACTUAL, "4").isdigit() else 4,
            area_solicitante=safe(COL_AREA_SOLICITANTE, ""),
            tipo_cambio=safe(COL_TIPO_CAMBIO, ""),
            participantes=participantes,
            motivo=safe(COL_MOTIVO, ""),
            pormenores=safe(COL_PORMENORES, ""),
            hoja=safe(COL_HOJA, ""),
            mes=int(safe(COL_MES, "0")) if safe(COL_MES, "0").isdigit() else 0,
            anio=int(safe(COL_ANIO, "0")) if safe(COL_ANIO, "0").isdigit() else 0,
            cadena=safe_json(COL_CADENA, []),
            historial=safe_json(COL_HISTORIAL, []),
            creado_en=safe(COL_CREADO_EN, ""),
            actualizado_en=safe(COL_ACTUALIZADO_EN, ""),
        )
