"""Padron de personal (hoja PERSONAL) y generacion de las pestanas de mes.

El padron es la unica fuente de quien trabaja y en que area. Las pestanas de
mes guardan una copia (A:E) para conservar el historico: cada alta, baja o
traslado se aplica al padron y a la pestana del mes desde el que rige y a las
siguientes que ya existan. Los meses anteriores no se tocan.

Las escrituras las hace el Apps Script (acciones padron* y generarMes), que
trabaja con bloqueo y conserva formato, colores y formulas de las pestanas.
"""
import logging
import re
from typing import Optional

from app.services.sheets_service import GoogleSheetsService
from app.utils.hojas import (
    ANIO_LEGADO, MESES_HOJA, es_hoja_mes, hoja_actual, nombre_hoja, parse_hoja,
)

logger = logging.getLogger(__name__)

HOJA_PADRON = "PERSONAL"
_RE_DNI = re.compile(r"^[0-9A-Za-z]{6,12}$")


def _txt(v) -> str:
    return " ".join(str(v or "").strip().upper().split())


def _orden_hoja(nombre: str) -> tuple[int, int]:
    p = parse_hoja(nombre)
    return (p[1], p[0]) if p else (0, 0)


def validar_persona(dni: str, grado: str, nombre: str, area: str, exigir_dni: bool) -> Optional[str]:
    """Mensaje de error o None."""
    dni = (dni or "").strip()
    if exigir_dni and not dni:
        return "El DNI es obligatorio"
    if dni and not _RE_DNI.match(dni):
        return "El DNI solo puede tener letras y numeros (6 a 12 caracteres)"
    if len(_txt(nombre)) < 5:
        return "Escriba apellidos y nombres completos"
    if not _txt(grado):
        return "El grado es obligatorio"
    if not _txt(area) or _txt(area) == "SIN_SERVICIO":
        return "Seleccione un area valida"
    return None


class PersonalService:

    def __init__(self, sheets: GoogleSheetsService):
        self.sheets = sheets

    # ------------------------------------------------------------------
    # Lectura
    # ------------------------------------------------------------------

    async def hojas_mes(self) -> list[str]:
        """Pestanas de mes existentes, en orden cronologico (lectura fresca)."""
        titulos = await self.sheets._get_sheet_ids()
        if not titulos:
            raise ValueError("No se pudo leer la lista de pestanas. Intente nuevamente.")
        return sorted((t for t in titulos if es_hoja_mes(t)), key=_orden_hoja)

    async def hojas_desde(self, desde: str = "") -> list[str]:
        """Pestanas de mes desde `desde` (incluida) en adelante.

        Por defecto, desde el mes actual: un alta o traslado rige desde hoy y
        para los meses que ya se prepararon; los meses pasados no cambian."""
        desde = desde or hoja_actual()
        limite = _orden_hoja(desde)
        return [h for h in await self.hojas_mes() if _orden_hoja(h) >= limite]

    async def listar(self) -> dict:
        """Padron completo. Si aun no existe, devuelve el personal de la
        pestana del mes actual para que el panel siga funcionando."""
        filas = await self.sheets.get_range(HOJA_PADRON, "A:J")
        if len(filas) > 1:
            personal = []
            for i, r in enumerate(filas[1:], start=2):
                if len(r) < 3 or not str(r[2]).strip():
                    continue
                personal.append(self._fila_a_persona(r, i))
            return {"inicializado": True, "origen": HOJA_PADRON, "personal": personal}

        hojas = await self.hojas_mes()
        actual = hoja_actual()
        origen = actual if actual in hojas else (hojas[-1] if hojas else "")
        personal = []
        if origen:
            filas = await self.sheets.get_range(origen, "A:E")
            for i, r in enumerate(filas[1:], start=2):
                if len(r) < 3 or not str(r[2]).strip():
                    continue
                personal.append(self._fila_a_persona(r, i))
        return {"inicializado": False, "origen": origen, "personal": personal}

    @staticmethod
    def _fila_a_persona(r: list, fila: int) -> dict:
        def c(i):
            return str(r[i]).strip() if len(r) > i else ""
        area = c(3)
        estado = (c(5) or "ACTIVO").upper()
        return {
            "id": f"p-{fila}",
            "fila": fila,
            "dni": c(0),
            "grado": c(1),
            "nombre": c(2),
            "area": area,
            "es_medico": c(4).upper() == "TRUE",
            "estado": estado,
            "fecha_alta": c(6),
            "fecha_baja": c(7),
        }

    async def estado_anio(self, anio: int) -> list[dict]:
        existentes = set(await self.hojas_mes())
        return [
            {"mes": m, "hoja": nombre_hoja(m, anio), "existe": nombre_hoja(m, anio) in existentes}
            for m in range(1, 13)
        ]

    # ------------------------------------------------------------------
    # Escritura (Apps Script)
    # ------------------------------------------------------------------

    async def _accion(self, accion: str, datos: dict) -> dict:
        result = await self.sheets._apps_script_action(accion, datos)
        if isinstance(result, dict) and result.get("success") is False:
            raise ValueError(result.get("error") or "No se pudo completar la operacion")
        if isinstance(result, dict) and result.get("status") == "probablemente_exitoso":
            raise ValueError(
                "No hubo respuesta de Google a tiempo. Recargue la lista y verifique "
                "antes de reintentar."
            )
        return result

    async def inicializar(self, hoja_origen: str, responsable: str) -> dict:
        if not es_hoja_mes(hoja_origen):
            raise ValueError("Seleccione una pestana de mes valida")
        return await self._accion("padronInicializar", {
            "hojaOrigen": hoja_origen, "responsable": responsable,
        })

    async def alta(self, persona: dict, desde: str, responsable: str) -> dict:
        err = validar_persona(persona.get("dni"), persona.get("grado"),
                              persona.get("nombre"), persona.get("area"), exigir_dni=True)
        if err:
            raise ValueError(err)
        hojas = await self.hojas_desde(desde)
        return await self._accion("padronGuardar", {
            "modo": "alta", "persona": persona, "hojas": hojas, "responsable": responsable,
        })

    async def editar(self, clave: dict, persona: dict, desde: str, responsable: str) -> dict:
        err = validar_persona(persona.get("dni"), persona.get("grado"),
                              persona.get("nombre"), persona.get("area"), exigir_dni=False)
        if err:
            raise ValueError(err)
        hojas = await self.hojas_desde(desde)
        return await self._accion("padronGuardar", {
            "modo": "editar", "clave": clave, "persona": persona,
            "hojas": hojas, "responsable": responsable,
        })

    async def baja(self, clave: dict, desde: str, responsable: str) -> dict:
        hojas = await self.hojas_desde(desde)
        return await self._accion("padronBaja", {
            "clave": clave, "hojas": hojas, "responsable": responsable,
        })

    async def reactivar(self, clave: dict, area: str, desde: str, responsable: str) -> dict:
        if not _txt(area) or _txt(area) == "SIN_SERVICIO":
            raise ValueError("Seleccione el area de destino")
        hojas = await self.hojas_desde(desde)
        return await self._accion("padronReactivar", {
            "clave": clave, "area": area, "hojas": hojas, "responsable": responsable,
        })

    async def generar_mes(self, mes: int, anio: int, plantilla: str, responsable: str) -> dict:
        if anio <= ANIO_LEGADO:
            raise ValueError(f"Solo se generan meses desde {ANIO_LEGADO + 1}")
        if not 1 <= mes <= 12:
            raise ValueError("Mes invalido")
        hojas = await self.hojas_mes()
        if not plantilla:
            # Modelo por defecto: la ultima pestana de mes que exista.
            previas = [h for h in hojas if _orden_hoja(h) < (anio, mes)]
            plantilla = previas[-1] if previas else (hojas[-1] if hojas else "")
        if plantilla not in hojas:
            raise ValueError(f"No existe la pestana modelo {plantilla or '(ninguna)'}")
        padron = await self.sheets.get_range(HOJA_PADRON, "A2:C3")
        if not padron:
            raise ValueError("Primero inicialice el padron PERSONAL")
        return await self._accion("generarMes", {
            "mes": mes, "anio": anio, "plantilla": plantilla, "responsable": responsable,
        })


MESES_NOMBRE = [m.capitalize() for m in MESES_HOJA]
