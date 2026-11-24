import uuid
import logging
from datetime import date, datetime, timedelta
from typing import Optional

from app.models.descanso import (
    DescansoMedico, DescansoMedicoCreate,
    DescansoRolCreate, DescansoRolHoja, DescansoRolResponse,
)
from app.models.solicitud import Participante
from app.services.sheets_service import GoogleSheetsService
from app.services.user_service import UserService
from app.services.solicitud_service import SolicitudService, _col_letter
from app.utils.hojas import nombre_hoja, ahora_lima_iso

logger = logging.getLogger(__name__)

# Texto que guarda la hoja del mes para el turno DM.
VALOR_DM = "DESCANSO MEDICO"
MAX_DIAS_DESCANSO = 366


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
    
    # ------------------------------------------------------------------
    # Registro sobre el ROL (lo que usa el panel)
    # ------------------------------------------------------------------

    async def registrar_en_rol(self, data: DescansoRolCreate, responsable: str) -> DescansoRolResponse:
        """Marca DESCANSO MEDICO en el rol y deja constancia en DESCANSOS_MEDICOS.

        Regla: se marcan los dias desde `fecha_inicio` hasta el dia ANTERIOR a
        `fecha_retorno` (ese dia la persona se reincorpora).

        1. Valida fechas y ubica a la persona en CADA pestana de mes afectada
           por DNI/nombre (nunca por una fila que pudo moverse).
        2. Solo si todo cuadra, escribe: una escritura por mes (dias seguidos).
        3. Registra la constancia. Si algo falla, el error llega al usuario.
        """
        try:
            inicio = date.fromisoformat(data.fecha_inicio)
            retorno = date.fromisoformat(data.fecha_retorno)
        except ValueError:
            raise ValueError("Fechas invalidas")
        if retorno <= inicio:
            raise ValueError("La fecha de retorno debe ser posterior a la fecha de inicio")
        if (retorno - inicio).days > MAX_DIAS_DESCANSO:
            raise ValueError(f"El descanso no puede superar {MAX_DIAS_DESCANSO} dias")

        # Dias agrupados por pestana de mes (en orden).
        por_hoja: dict[str, list[int]] = {}
        d = inicio
        while d < retorno:
            por_hoja.setdefault(nombre_hoja(d.month, d.year), []).append(d.day)
            d += timedelta(days=1)

        persona = Participante(
            nombre=data.personal_nombre, dni=data.personal_dni,
            area=data.personal_area, fila=0,
        )

        # 1) Ubicar en todas las hojas ANTES de escribir nada.
        plan: list[tuple[str, int, list[int]]] = []
        dias_sin_hoja: list[str] = []
        for hoja, dias in por_hoja.items():
            invalidar = getattr(self.sheets, "invalidate_sheet", None)
            if invalidar:
                invalidar(hoja)
            filas = await self.sheets.get_range(hoja, "A:E")
            if not filas:
                dias_sin_hoja.extend(f"{dia} {hoja}" for dia in dias)
                continue
            fila = SolicitudService._ubicar_fila(filas, persona)
            if not fila:
                raise ValueError(
                    f"No se encontro a {data.personal_nombre} en la hoja {hoja}. "
                    "No se registro nada."
                )
            plan.append((hoja, fila, dias))

        if not plan:
            raise ValueError(
                "Ningun dia del descanso tiene hoja de rol creada todavia. No se registro nada."
            )

        # 2) Escribir (dias seguidos dentro del mes: una sola escritura).
        escritas: list[DescansoRolHoja] = []
        for hoja, fila, dias in plan:
            col_inicio = _col_letter(5 + dias[0])  # dia 1 -> columna F
            try:
                await self.sheets._apps_script_action("guardarIndividual", {
                    "hoja": hoja, "fila": fila, "colInicio": col_inicio,
                    "valores": [VALOR_DM] * len(dias),
                })
            except Exception as e:
                hechas = ", ".join(f"{h.hoja} ({len(h.dias)} dias)" for h in escritas)
                raise RuntimeError(
                    f"No se pudo marcar el descanso en {hoja}: {e}."
                    + (f" Ya se marco: {hechas}." if hechas else " No se marco nada.")
                    + " Intente nuevamente."
                )
            escritas.append(DescansoRolHoja(hoja=hoja, fila=fila, dias=dias))

        total = sum(len(h.dias) for h in escritas)
        advertencias: list[str] = []
        if dias_sin_hoja:
            advertencias.append(
                "Estos dias aun no tienen hoja de rol y NO se marcaron: "
                + ", ".join(dias_sin_hoja)
                + ". Marquelos cuando se cree ese mes."
            )

        # 3) Constancia en DESCANSOS_MEDICOS (el rol ya quedo marcado).
        try:
            await self.sheets._apps_script_action("registrarDescansoMedico", {"datos": {
                "fecha_registro": ahora_lima_iso(),
                "personal_nombre": data.personal_nombre,
                "personal_grado": data.personal_grado,
                "personal_dni": data.personal_dni,
                "personal_area": data.personal_area,
                "medico_nombre": data.medico_nombre,
                "medico_especialidad": data.medico_especialidad,
                "fecha_inicio": data.fecha_inicio,
                "fecha_fin": data.fecha_retorno,
                "dias_descanso": (retorno - inicio).days,
                "diagnostico": data.diagnostico,
                "observaciones": data.observaciones,
                "hoja_rol": ", ".join(h.hoja for h in escritas),
                "fila_rol": ", ".join(str(h.fila) for h in escritas),
                "dias_marcados": total,
                "registrado_por": responsable,
            }})
        except Exception as e:
            logger.error(f"Descanso marcado en el rol pero sin constancia: {e}")
            advertencias.append(
                "El descanso quedo marcado en el rol, pero no se pudo guardar la "
                "constancia en DESCANSOS_MEDICOS. Avise al administrador."
            )

        logger.info(
            f"Descanso medico: {data.personal_nombre} {total} dia(s) en "
            f"{', '.join(h.hoja for h in escritas)} por {responsable}"
        )
        return DescansoRolResponse(
            mensaje=f"Descanso medico registrado: {total} dia(s) marcados en el rol.",
            dias_marcados=total,
            hojas=escritas,
            dias_sin_hoja=dias_sin_hoja,
            advertencias=advertencias,
        )

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
