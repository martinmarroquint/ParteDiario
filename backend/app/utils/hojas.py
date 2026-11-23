"""Nombres de las pestanas mensuales del rol.

Regla unica para todo el sistema (backend, frontend y Apps Script la replican):

- Hasta ANIO_LEGADO (2026) las pestanas se llaman solo con el mes: "NOVIEMBRE".
  Son las que ya existen y se usan a diario; NO se renombran.
- Desde el anio siguiente llevan el anio: "ENERO 2027", "FEBRERO 2027", ...

Asi el libro puede tener varios anios sin ambiguedad y las claves que usan el
nombre de la pestana (ESTADOS, CELDA_MODIFICADA, SOLICITUDES.hoja) quedan
separadas por anio automaticamente.
"""
import re
import unicodedata
from datetime import date, datetime, timedelta, timezone
from typing import Optional

ANIO_LEGADO = 2026

MESES_HOJA = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
]

_LIMA_TZ = timezone(timedelta(hours=-5))
_RE_HOJA = re.compile(r"^\s*([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s*(\d{4})?\s*$")


def _sin_tildes(texto: str) -> str:
    s = unicodedata.normalize("NFKD", str(texto or ""))
    return "".join(c for c in s if not unicodedata.combining(c)).upper()


def nombre_hoja(mes: int, anio: int) -> str:
    """(11, 2026) -> 'NOVIEMBRE'; (1, 2027) -> 'ENERO 2027'. '' si es invalido."""
    try:
        mes, anio = int(mes), int(anio)
    except (TypeError, ValueError):
        return ""
    if not 1 <= mes <= 12:
        return ""
    base = MESES_HOJA[mes - 1]
    return base if anio <= ANIO_LEGADO else f"{base} {anio}"


def parse_hoja(nombre: str) -> Optional[tuple[int, int]]:
    """'ENERO 2027' -> (1, 2027); 'NOVIEMBRE' -> (11, 2026); otra cosa -> None."""
    m = _RE_HOJA.match(str(nombre or ""))
    if not m:
        return None
    mes_txt = _sin_tildes(m.group(1))
    if mes_txt not in MESES_HOJA:
        return None
    mes = MESES_HOJA.index(mes_txt) + 1
    anio = int(m.group(2)) if m.group(2) else ANIO_LEGADO
    # "ENERO 2026" no existe: el anio legado no lleva sufijo.
    if m.group(2) and anio <= ANIO_LEGADO:
        return None
    return mes, anio


def es_hoja_mes(nombre: str) -> bool:
    return parse_hoja(nombre) is not None


def hoy_lima() -> date:
    return datetime.now(_LIMA_TZ).date()


def ahora_lima_iso() -> str:
    """Marca de tiempo con zona horaria explicita (el navegador la interpreta bien)."""
    return datetime.now(_LIMA_TZ).isoformat(timespec="seconds")


def hoja_actual() -> str:
    h = hoy_lima()
    return nombre_hoja(h.month, h.year)
