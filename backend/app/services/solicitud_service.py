import asyncio
import json
import logging
import unicodedata
import uuid
from datetime import date
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
)
from app.utils.hojas import ANIO_LEGADO, nombre_hoja, hoy_lima, ahora_lima_iso

logger = logging.getLogger(__name__)

HOJA_SOLICITUDES = "SOLICITUDES"

# Un lock por id de solicitud en creacion: dos envios con la misma clave no
# pueden crear dos filas aunque lleguen a la vez.
_LOCKS_CREACION: dict[str, asyncio.Lock] = {}

# Cabecera canonica de la hoja SOLICITUDES (coincide con el mapeo COL_* de abajo).
SOLICITUDES_HEADER = [
    "id", "solicitante_id", "solicitante_nombre", "solicitante_grado",
    "area_solicitante", "fecha_solicitud", "estado", "nivel_actual",
    "tipo_cambio", "participantes", "motivo", "pormenores", "hoja",
    "mes", "anio", "cadena", "historial", "creado_en", "actualizado_en",
    "solicitante_dni",
]

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

# Nombre exacto del turno por codigo (respaldo para solicitudes creadas antes
# de que el frontend enviara turno_nuevo_nombre). La hoja del mes guarda el
# NOMBRE del turno, no el codigo.
_TURNO_NOMBRE = {
    "M": "MAÑANA", "T": "TARDE", "F": "FRANCO", "MT": "12 HRS M",
    "N": "12 HRS N", "FE": "FERIADO", "V": "VACACIONES",
    "FS": "FALTO AL SERVICIO", "LG": "LICENCIA DE GRAVIDEZ",
    "DM": "DESCANSO MEDICO", "L12": "LEY 12633", "H": "HOSPITALIZADO",
    "C": "COMISION", "PR": "PERMISO DE RADIACION",
    "AVC": "ADAPTACION A LA VIDA CIVIL",
    "LEGF": "LICENCIA ENFERMEDAD GRAVE FAMILIAR",
    "PCV": "PERMISO A CUENTA DE VACACIONES", "RL": "REFERIDO A LIMA",
    "SL": "SOMETIDO A LEY", "24": "24 X 48", "SC": "SERVICIO CONTINUO",
    "EXT": "EXTERNO", "R": "RETEN", "S": "SERVICIO",
    "M/N": "MAÑANA - 12 HRS N", "T/N": "TARDE - 12 HRS N",
    "ADM": "ADMINISTRATIVO", "LFC": "LICENCIA FALLECIMIENTO CONYUGUE",
    "PP": "PAPELETA DE PERMISO", "COU": "CAMBIADO OTRA UNIDAD",
    "24M": "24 HRS MTN", "LP": "LICENCIA POR PATERNIDAD",
    "PD": "OFICIAL DE PERMANENCIA (DIURNO)",
    "PN": "OFICIAL DE PERMANENCIA (NOCTURNO)",
    "PM": "OFICIAL DE PERMANENCIA (MAÑANA)",
    "PT": "OFICIAL DE PERMANENCIA (TARDE)", "CD": "CLASE DE DIA",
}

_ROL_MAP = {
    "usuario": 0, "jefe_area": 1, "jefe_departamento": 2,
    "jefe_division": 3, "admin": 4, "tramite_documentario": 5,
    # Solo lectura: nunca entra a una cadena de aprobacion.
    "visualizador": 6, "visor": 6, "lector": 6, "viewer": 6, "solo_lectura": 6,
}


def _parse_roles(raw) -> list[int]:
    """Acepta '1', '1,2', 'jefe_area' o 'jefe_area,jefe_division'."""
    out: list[int] = []
    for parte in str(raw or "").replace(";", ",").split(","):
        p = parte.strip()
        if not p:
            continue
        if p.isdigit():
            out.append(int(p))
        elif p.lower() in _ROL_MAP:
            out.append(_ROL_MAP[p.lower()])
    return out


def _norm(texto) -> str:
    """Normaliza un nombre de area: mayusculas, sin tildes, espacios simples.

    La hoja tiene variantes del mismo nombre ('AREA' / 'ÁREA', 'ANESTESIOLOGIA'
    / 'ANESTECIOLOGIA'): comparar el string crudo hacia que la cadena se cayera
    a solo Administrador.
    """
    s = unicodedata.normalize("NFKD", str(texto or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.upper().split())


# Nombres de turno que el sistema reconoce (normalizados).
_NOMBRES_CONOCIDOS = {_norm(n) for n in _TURNO_NOMBRE.values()}


def _lima_hoy() -> date:
    """Fecha de hoy en hora de Peru (UTC-5, sin horario de verano)."""
    return hoy_lima()


def _hoja_mes(mes: int, anio: int = ANIO_LEGADO) -> str:
    """(1, 2026) -> 'ENERO'; (1, 2027) -> 'ENERO 2027'. Pestana del rol mensual."""
    return nombre_hoja(mes, anio)


# Valor de "sin turno" que manda el formulario de solicitud.
_SIN_TURNO = {"", "S/T", "SIN TURNO", "SIN ASIGNAR"}


def _nombre_turno(codigo: str) -> str:
    """Codigo ('M') -> nombre tal como lo guarda la hoja ('MAÑANA')."""
    c = (codigo or "").strip()
    if c.upper() in _SIN_TURNO:
        return ""
    return _TURNO_NOMBRE.get(c.upper(), c)


def _col_letter(col_num: int) -> str:
    """Numero de columna 1-based -> letra Excel (1=A, 6=F)."""
    result = ""
    while col_num > 0:
        col_num, rem = divmod(col_num - 1, 26)
        result = chr(65 + rem) + result
    return result


class SolicitudService:

    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
        self.user_service = UserService(sheets_service)
        self.role_service = RoleService(sheets_service)

    # ------------------------------------------------------------------
    # Chain builder
    # ------------------------------------------------------------------

    async def _build_cadena_aprobacion(
        self,
        area: str,
        excluir_user_id: int | None = None,
        excluir_nombre: str = "",
        incluir_admin: bool = True,
    ) -> list[dict]:
        """Build approval chain from USUARIOS_OCR.

        Logic (mirrors servicioSolicitudes.js):
        1. Read all users from USUARIOS_OCR
        2. Keep users with rol 1-3 whose areas_json includes `area`
        3. Sort by role ascending (1 → 2 → 3)
        4. Deduplicate by nombre
        5. Always append Administrador (nivel 4)

        El solicitante NUNCA aprueba su propia solicitud: si es jefe de area,
        su nivel se omite y la cadena continua con el siguiente escalon. Si no
        queda ningun jefe, la cadena queda solo con el Administrador.
        """
        rows = await self.sheets.get_range(HOJA_USUARIOS)
        if not rows:
            # get_range devuelve [] cuando falla la lectura: antes la cadena
            # quedaba solo con el Administrador y se saltaba a los jefes.
            raise RuntimeError(
                "No se pudo leer la lista de usuarios para armar la cadena de "
                "aprobacion. Intente nuevamente en unos segundos."
            )

        jefes = []
        area_norm = _norm(area)
        for row in rows[1:]:  # skip header
            if len(row) < 8:
                continue
            user_id = int(row[0]) if row[0].isdigit() else 0
            nombre = row[1].strip() if row[1] else ""
            roles = _parse_roles(row[6])

            areas_raw = row[7] if len(row) > 7 else "[]"
            try:
                areas = json.loads(areas_raw) if areas_raw.startswith("[") else [a.strip() for a in areas_raw.split(",") if a.strip()]
            except (json.JSONDecodeError, TypeError):
                areas = [a.strip() for a in areas_raw.split(",") if a.strip()]

            if not nombre or not area_norm:
                continue
            if all(_norm(a) != area_norm for a in areas):
                continue

            # El solicitante no entra a su propia cadena de aprobacion.
            if excluir_user_id is not None and user_id == excluir_user_id:
                continue
            if excluir_nombre and _norm(nombre) == _norm(excluir_nombre):
                continue

            # Una persona puede tener varios niveles de jefatura: entra a la
            # cadena en CADA uno de sus roles (1=jefe_area, 2=depto, 3=div).
            for r in roles:
                if r in (1, 2, 3):
                    jefes.append({"nombre": nombre, "nivel": r, "user_id": user_id})

        # Sort by nivel ascending
        jefes.sort(key=lambda x: x["nivel"])

        # Deduplicate by (nombre, nivel): la misma persona no se repite en el
        # mismo nivel, pero puede aparecer en varios niveles distintos.
        seen = set()
        cadena = []
        for j in jefes:
            clave = (j["nombre"], j["nivel"])
            if clave not in seen:
                seen.add(clave)
                cadena.append(j)

        # Always append admin (salvo que el solicitante sea el propio admin:
        # nadie aprueba su propia solicitud).
        if incluir_admin:
            cadena.append({"nombre": "Administrador", "nivel": 4, "user_id": 0})

        return cadena

    @staticmethod
    def _orden(sol: Solicitud) -> str:
        """Mas recientes primero. El id es aleatorio: se ordena por fecha."""
        return sol.creado_en or sol.fecha_solicitud or ""

    def _current_step_index(self, solicitud: Solicitud) -> int:
        """Posicion en la cadena = numero de aprobaciones ya registradas.

        Avanzar por POSICION (no por el valor del nivel) es lo que evita que
        la cadena se trabe cuando hay dos jefes del mismo nivel."""
        return sum(1 for h in solicitud.historial if h.get("accion") == "APROBADO")

    def _paso_actual(self, solicitud: Solicitud) -> Optional[dict]:
        """Paso de la cadena que debe actuar ahora (None si ya termino)."""
        idx = self._current_step_index(solicitud)
        if 0 <= idx < len(solicitud.cadena):
            return solicitud.cadena[idx]
        return None

    def _puede_actuar(self, solicitud: Solicitud, actor) -> bool:
        """True si `actor` es exactamente quien ocupa el paso actual.

        Antes bastaba con tener el rol y el area, o ser admin: el admin podia
        aprobar en cualquier escalon y se saltaba la cadena. Ahora manda la
        posicion en la cadena, no el rol.
        """
        if solicitud.estado != ESTADO_PENDIENTE:
            return False
        if int(solicitud.solicitante_id) == int(actor.id):
            return False

        paso = self._paso_actual(solicitud)
        if not paso:
            return False

        uid = paso.get("user_id") or 0
        if uid:
            return int(uid) == int(actor.id)

        # Cadenas antiguas sin user_id: se resuelve por nivel + area.
        nivel = paso.get("nivel")
        if nivel == 4:
            return 4 in actor.roles
        if nivel not in (actor.roles or []):
            return False
        areas_actor = {_norm(a) for a in (actor.areas or [])}
        return (
            _norm(solicitud.area_solicitante) in areas_actor
            or any(_norm(p.area) in areas_actor for p in solicitud.participantes)
        )

    def _dias_de(self, solicitud: Solicitud) -> list[date]:
        """Fechas reales de todos los cambios pedidos en la solicitud."""
        out: list[date] = []
        for p in solicitud.participantes:
            for c in p.cambios:
                try:
                    out.append(date(int(solicitud.anio), int(solicitud.mes), int(c.dia)))
                except (TypeError, ValueError):
                    continue
        return out

    def _fuera_de_plazo(self, solicitud: Solicitud) -> bool:
        """La solicitud debio validarse antes del dia del turno.

        Si el turno mas cercano ya llego (o paso), la solicitud no tiene valor.
        """
        dias = self._dias_de(solicitud)
        if not dias:
            return False
        return min(dias) <= _lima_hoy()

    async def _expirar_si_corresponde(self, solicitud: Solicitud) -> bool:
        """Cierra por plazo una solicitud que ya no puede aplicarse.

        No hay scheduler: el vencimiento se evalua de forma perezosa cada vez
        que la solicitud se lee o se intenta actuar sobre ella.
        """
        if solicitud.estado != ESTADO_PENDIENTE or not self._fuera_de_plazo(solicitud):
            return False

        now = ahora_lima_iso()
        solicitud.estado = ESTADO_DESAPROBADO
        solicitud.historial.append({
            "accion": "DESAPROBADO",
            "aprobador_id": 0,
            "aprobador_nombre": "Sistema",
            "nivel": solicitud.nivel_actual,
            "fecha": now,
            "observaciones": (
                "FUERA DE PLAZO: la solicitud no fue validada antes del dia del turno"
            ),
        })
        solicitud.actualizado_en = now
        try:
            await self._update_solicitud(solicitud)
        except Exception as e:
            # El cierre por plazo es perezoso: si no se pudo guardar ahora se
            # reintenta en la proxima lectura. No debe vaciar los listados.
            logger.warning(f"No se pudo cerrar por plazo la solicitud {solicitud.id}: {e}")
        logger.info(f"Solicitud {solicitud.id} cerrada por plazo")
        return True

    async def _mes_finalizado(self, area: str, mes: int, anio: int = ANIO_LEGADO) -> bool:
        """True si el rol de esa area/mes ya esta FINALIZADO en ESTADOS.

        ESTADOS usa el nombre de la pestana como clave ('NOVIEMBRE',
        'ENERO 2027'), asi que cada anio queda separado."""
        try:
            rows = await self.sheets.get_range("ESTADOS")
        except Exception as e:
            logger.warning(f"No se pudo leer ESTADOS: {e}")
            return False

        hoja = _norm(_hoja_mes(mes, anio))
        objetivo = _norm(area)
        for row in rows[1:] if rows else []:
            if len(row) < 3:
                continue
            if _norm(row[0]) == hoja and _norm(row[1]) == objetivo:
                return str(row[2]).strip().upper() == "FINALIZADO"
        return False

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    @staticmethod
    def _id_desde_cliente(id_cliente: Optional[str]) -> Optional[str]:
        """'3f9a1c2e-....' -> '3f9a1c2e' (mismo formato que los ids aleatorios)."""
        limpio = "".join(c for c in (id_cliente or "") if c.isalnum()).lower()
        return limpio[:8] if len(limpio) >= 8 else None

    async def crear_solicitud(self, user_id: int, data: SolicitudCreate) -> Solicitud:
        """Crea una solicitud. Idempotente si el front manda `id_cliente`.

        Si el navegador corta por timeout pero el backend SI la guardo, el
        reenvio llega con la misma clave y se devuelve la existente en vez de
        crear un duplicado. El lock cubre el caso en que el reenvio llega
        mientras la primera peticion todavia se esta procesando.
        """
        solicitud_id = self._id_desde_cliente(data.id_cliente)
        if not solicitud_id:
            return await self._crear_solicitud(user_id, data, str(uuid.uuid4())[:8])

        # (Los locks no se borran: uno por solicitud creada es despreciable y
        # borrarlos abriria una carrera con peticiones que esperan.)
        lock = _LOCKS_CREACION.setdefault(solicitud_id, asyncio.Lock())
        async with lock:
            existente = await self.sheets.find_row(HOJA_SOLICITUDES, COL_ID, solicitud_id)
            if existente:
                previa = self._row_seguro(existente)
                if previa and previa.solicitante_id == user_id:
                    logger.info(f"Solicitud {solicitud_id} ya existia (reenvio): no se duplica")
                    return previa
                # Clave ya usada por otra persona: id nuevo al azar.
                solicitud_id = str(uuid.uuid4())[:8]
            return await self._crear_solicitud(user_id, data, solicitud_id)

    async def _crear_solicitud(
        self, user_id: int, data: SolicitudCreate, solicitud_id: str
    ) -> Solicitud:
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")

        area = data.participantes[0].area if data.participantes else ""
        if not area:
            area = user.areas[0] if user.areas else ""
        if not area:
            raise ValueError(
                "No se pudo determinar el area del solicitante; contacta al administrador"
            )

        # Regla de plazo: el cambio se pide (y se valida) antes del dia del turno.
        hoy = _lima_hoy()
        for participante in data.participantes:
            for cambio in participante.cambios:
                try:
                    fecha_turno = date(int(data.anio), int(data.mes), int(cambio.dia))
                except (TypeError, ValueError):
                    raise ValueError(f"Dia invalido: {cambio.dia}/{data.mes}/{data.anio}")
                if fecha_turno <= hoy:
                    raise ValueError(
                        "El cambio debe solicitarse al menos 1 dia antes del turno; "
                        f"el dia {cambio.dia}/{data.mes}/{data.anio} ya no es valido"
                    )

        hoja_real = _hoja_mes(data.mes, data.anio)
        areas_involucradas = {area} | {p.area for p in data.participantes if p.area}
        for a in areas_involucradas:
            if await self._mes_finalizado(a, data.mes, data.anio):
                raise ValueError(f"El rol de {hoja_real} para {a} esta FINALIZADO")

        es_admin_solicitante = 4 in (user.roles or [])
        cadena = await self._build_cadena_aprobacion(
            area,
            excluir_user_id=user_id,
            excluir_nombre=(user.nombre or "").strip(),
            incluir_admin=not es_admin_solicitante,
        )
        if not cadena:
            raise ValueError(
                "No hay jefes configurados para tu area; no se puede armar la "
                "cadena de aprobacion. Contacta al administrador."
            )
        primer_nivel = cadena[0]["nivel"] if cadena else 4

        now = ahora_lima_iso()

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
            # La pestana se deriva de mes/anio (no se confia en la del navegador).
            hoja=hoja_real or data.hoja,
            mes=data.mes,
            anio=data.anio,
            cadena=cadena,
            historial=[],
            creado_en=now,
            actualizado_en=now,
        )

        row = self._solicitud_to_row(solicitud)
        # La hoja se crea sola si no existe (auto-reparable).
        await self.sheets.asegurar_hoja(HOJA_SOLICITUDES, SOLICITUDES_HEADER)
        await self.sheets.append_row(HOJA_SOLICITUDES, row)
        logger.info(f"Solicitud {solicitud_id} creada por {user.nombre}")
        return solicitud

    async def get_solicitud(self, solicitud_id: str) -> Optional[Solicitud]:
        """Get a single solicitud by ID."""
        row = await self.sheets.find_row(HOJA_SOLICITUDES, COL_ID, solicitud_id)
        if not row:
            return None
        solicitud = self._row_to_solicitud(row)
        await self._expirar_si_corresponde(solicitud)
        return solicitud

    async def get_solicitudes_propias(self, user_id: int) -> list[Solicitud]:
        """Get solicitudes where the user is the requester."""
        rows = await self.sheets.get_range(HOJA_SOLICITUDES)
        result = []
        for row in rows[1:] if rows else []:
            if len(row) <= COL_SOLICITANTE_ID:
                continue
            sol = self._row_seguro(row)
            if not sol or sol.solicitante_id != user_id:
                continue
            await self._expirar_si_corresponde(sol)
            result.append(sol)
        result.sort(key=self._orden, reverse=True)
        return result

    async def get_bandeja(self, user_id: int) -> list[Solicitud]:
        """Solicitudes que este usuario debe resolver AHORA.

        La bandeja es "mi turno": solo el paso actual de la cadena. Sirve para
        jefes y para el admin (que recien ve la solicitud en el ultimo escalon,
        no antes). El solicitante nunca ve su propia solicitud aqui.
        """
        user = await self.user_service.get_user_by_id(user_id)
        if not user:
            return []

        # Asegura que la hoja exista (auto-reparable) antes de leerla.
        await self.sheets.asegurar_hoja(HOJA_SOLICITUDES, SOLICITUDES_HEADER)

        rows = await self.sheets.get_range(HOJA_SOLICITUDES)
        result = []

        for row in rows[1:] if rows else []:
            if len(row) <= COL_ESTADO:
                continue
            sol = self._row_seguro(row)

            if not sol or sol.estado != ESTADO_PENDIENTE:
                continue
            if sol.solicitante_id == user_id:
                continue
            if await self._expirar_si_corresponde(sol):
                continue
            if self._puede_actuar(sol, user):
                result.append(sol)

        result.sort(key=self._orden, reverse=True)
        return result

    async def get_estadisticas(self, user_id: int) -> SolicitudStats:
        """Count solicitudes by status for the current user."""
        rows = await self.sheets.get_range(HOJA_SOLICITUDES)
        pendientes = aprobadas = desaprobadas = canceladas = 0

        for row in rows[1:] if rows else []:
            if len(row) <= COL_SOLICITANTE_ID:
                continue
            sol = self._row_seguro(row)
            if not sol or sol.solicitante_id != user_id:
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
            if self._fuera_de_plazo(solicitud):
                raise ValueError("La solicitud esta fuera de plazo y fue cerrada")
            raise ValueError(f"La solicitud ya fue procesada (estado: {solicitud.estado})")

        aprobador = await self.user_service.get_user_by_id(aprobador_id)
        if not aprobador:
            raise ValueError("Aprobador no encontrado")

        # Conflicto de interes: nadie aprueba su propia solicitud.
        if int(aprobador_id) == int(solicitud.solicitante_id):
            raise PermissionError("No puedes aprobar tu propia solicitud de cambio de turno")

        # Solo actua quien ocupa el paso ACTUAL de la cadena. El admin ya no
        # puede saltarse escalones: recien actua cuando la cadena llega a el.
        if not self._puede_actuar(solicitud, aprobador):
            raise PermissionError("No es tu turno para aprobar esta solicitud")

        now = ahora_lima_iso()

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

        # Avanzar por POSICION en la cadena (no por valor de nivel): si hay
        # dos jefes del mismo nivel, el siguiente paso es el que sigue en la
        # lista, no otro paso del mismo nivel. Evita que la cadena se trabe.
        pasos_aprobados = self._current_step_index(solicitud)
        if pasos_aprobados < len(solicitud.cadena):
            solicitud.nivel_actual = solicitud.cadena[pasos_aprobados]["nivel"]
        else:
            # Ultimo nivel: aplicar los cambios al rol real ANTES de marcar
            # APROBADO. Si algo falla, la solicitud queda PENDIENTE y se puede
            # reintentar (nunca se pierde el cambio en silencio).
            errores = await self._aplicar_cambios(solicitud)
            if errores:
                raise ValueError(
                    "No se pudieron aplicar los cambios al rol: " + "; ".join(errores)
                )
            solicitud.estado = ESTADO_APROBADO

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
            if self._fuera_de_plazo(solicitud):
                raise ValueError("La solicitud esta fuera de plazo y fue cerrada")
            raise ValueError(f"La solicitud ya fue procesada (estado: {solicitud.estado})")

        aprobador = await self.user_service.get_user_by_id(aprobador_id)
        if not aprobador:
            raise ValueError("Aprobador no encontrado")

        # Mismo criterio que aprobar: solo el paso actual de la cadena.
        if int(aprobador_id) == int(solicitud.solicitante_id):
            raise PermissionError("No puedes rechazar tu propia solicitud de cambio de turno")
        if not self._puede_actuar(solicitud, aprobador):
            raise PermissionError("No es tu turno para rechazar esta solicitud")

        now = ahora_lima_iso()

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

        now = ahora_lima_iso()

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

    @staticmethod
    def _ubicar_fila(filas: list[list], participante: Participante) -> Optional[int]:
        """Fila (1-based) del participante en la hoja del mes.

        Se identifica por DNI (o por nombre si no hay DNI). La `fila` guardada
        en la solicitud solo se usa si TODAVIA corresponde a esa persona: si
        alguien inserto, borro u ordeno filas, se busca de nuevo en vez de
        escribir el turno en otra persona.
        """
        dni = (participante.dni or "").strip()
        nombre = _norm(participante.nombre)

        def coincide(row: list) -> bool:
            row_dni = (row[0] if len(row) > 0 else "").strip()
            row_nombre = _norm(row[2] if len(row) > 2 else "")
            if dni and row_dni:
                return row_dni == dni and (not nombre or not row_nombre or row_nombre == nombre)
            return bool(nombre) and row_nombre == nombre

        f = participante.fila or 0
        if 2 <= f <= len(filas) and coincide(filas[f - 1]):
            return f

        candidatos = [i + 1 for i, row in enumerate(filas) if i > 0 and coincide(row)]
        if len(candidatos) == 1:
            return candidatos[0]
        if not candidatos and dni:
            # DNI distinto o vacio en la hoja: ultimo intento solo por nombre.
            por_nombre = [i + 1 for i, row in enumerate(filas)
                          if i > 0 and nombre and _norm(row[2] if len(row) > 2 else "") == nombre]
            if len(por_nombre) == 1:
                return por_nombre[0]
        return None

    async def _aplicar_cambios(self, solicitud: Solicitud) -> list[str]:
        """Escribe los cambios aprobados en la HOJA DEL MES real (la misma que
        usa el panel) via Apps Script `guardarCelda`, con el NOMBRE del turno.

        1. Ubica a cada participante por DNI/nombre (no confia en la fila).
        2. Verifica que el turno actual de la hoja siga siendo el que se pidio
           cambiar (si alguien lo modifico despues, NO se pisa).
        3. Solo si TODO cuadra, escribe. Si ya estaba aplicado (reintento),
           no vuelve a escribir esa celda.

        Devuelve la lista de errores (vacia si todo se aplico). El llamador
        NO debe marcar la solicitud como APROBADA si hay errores."""
        hoja = _hoja_mes(solicitud.mes, solicitud.anio) or solicitud.hoja
        if not hoja:
            return ["La solicitud no tiene mes/anio para ubicar la hoja del rol"]

        areas = {solicitud.area_solicitante} | {p.area for p in solicitud.participantes if p.area}
        for area in areas:
            if await self._mes_finalizado(area, solicitud.mes, solicitud.anio):
                return [f"El rol de {hoja} para {area} esta FINALIZADO"]

        # Lectura fresca (sin cache): vamos a escribir sobre esta hoja.
        invalidar = getattr(self.sheets, "invalidate_sheet", None)
        if invalidar:
            invalidar(hoja)
        filas = await self.sheets.get_range(hoja, "A:AJ")
        if not filas:
            return [f"No se encontro la hoja {hoja}"]

        errores: list[str] = []
        escrituras: list[tuple] = []
        for participante in solicitud.participantes:
            fila = self._ubicar_fila(filas, participante)
            if not fila:
                errores.append(f"{participante.nombre}: no se encontro en la hoja {hoja}")
                continue
            row = filas[fila - 1]
            for cambio in participante.cambios:
                idx = 4 + cambio.dia  # dia 1 -> columna F (indice 5)
                en_hoja = (row[idx] if len(row) > idx else "").strip()
                nuevo = cambio.turno_nuevo_nombre or _nombre_turno(cambio.turno_nuevo)
                if _norm(en_hoja) == _norm(nuevo):
                    continue  # ya aplicado (p. ej. reintento tras un fallo)
                if cambio.turno_actual_nombre is not None:
                    # Solicitud nueva: se compara con el texto EXACTO que tenia
                    # la celda al pedir el cambio (sirve para cualquier texto).
                    esperado = cambio.turno_actual_nombre.strip()
                    verificable = True
                else:
                    # Solicitud antigua: solo se tiene el codigo.
                    codigo_actual = (cambio.turno_actual or "").strip().upper()
                    esperado = _nombre_turno(cambio.turno_actual)
                    verificable = codigo_actual in _TURNO_NOMBRE or codigo_actual in _SIN_TURNO
                    # El front antiguo mandaba "sin turno" cuando la celda tenia
                    # un texto que no reconocia: eso no se puede verificar.
                    if (codigo_actual in _SIN_TURNO and en_hoja
                            and _norm(en_hoja) not in _NOMBRES_CONOCIDOS):
                        verificable = False
                if verificable and _norm(en_hoja) != _norm(esperado):
                    errores.append(
                        f"{participante.nombre} dia {cambio.dia}: el turno cambio desde que se "
                        f"pidio (ahora '{en_hoja or 'SIN TURNO'}', se esperaba "
                        f"'{esperado or 'SIN TURNO'}'). Rechace y pida una nueva solicitud."
                    )
                    continue
                escrituras.append((participante, cambio.dia, fila, nuevo))

        if errores:
            return errores

        for participante, dia, fila, turno in escrituras:
            columna = _col_letter(5 + dia)  # dia 1 -> columna F
            try:
                result = await self.sheets.guardar_celda(
                    hoja, fila, columna, turno,
                    responsable=solicitud.solicitante_nombre,
                    area=participante.area,
                    origen="solicitudAprobada",
                )
                if isinstance(result, dict) and result.get("error"):
                    errores.append(f"{participante.nombre} dia {dia}: {result['error']}")
                else:
                    logger.info(
                        f"Cambio aplicado: {participante.nombre} dia {dia} "
                        f"({hoja}!{columna}{fila}) -> {turno}"
                    )
            except Exception as e:
                errores.append(f"{participante.nombre} dia {dia}: {e}")
        return errores

    # ------------------------------------------------------------------
    # Sheet persistence helpers
    # ------------------------------------------------------------------

    async def _update_solicitud(self, solicitud: Solicitud) -> None:
        """Actualiza la fila de la solicitud en UNA sola escritura (G:S).

        Antes eran 5 llamadas separadas al Apps Script: lento y, si fallaba a
        la mitad, quedaba el estado nuevo con el historial viejo."""
        row_index = await self.sheets.find_row_index(HOJA_SOLICITUDES, COL_ID, solicitud.id)
        if not row_index:
            # Antes se ignoraba: la API respondia OK y el cambio no quedaba
            # guardado. Ahora el error llega al usuario para que reintente.
            logger.error(f"No se encontró solicitud {solicitud.id} para actualizar")
            raise RuntimeError(
                "No se pudo guardar el cambio de la solicitud (no se encontro su fila). "
                "Intente nuevamente."
            )
        valores = self._solicitud_to_row(solicitud)[COL_ESTADO:COL_ACTUALIZADO_EN + 1]
        await self.sheets.update_range(HOJA_SOLICITUDES, f"G{row_index}:S{row_index}", [valores])

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

    def _row_seguro(self, row: list) -> Optional[Solicitud]:
        """Como _row_to_solicitud, pero una fila danada no tumba el listado.

        Antes, UNA fila con datos invalidos lanzaba excepcion y el endpoint
        devolvia la lista vacia: el usuario creia que no tenia solicitudes."""
        try:
            return self._row_to_solicitud(row)
        except Exception as e:
            logger.warning(f"Fila de SOLICITUDES ignorada ({row[0] if row else '?'}): {e}")
            return None

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
