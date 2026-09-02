import re
from typing import List, Optional

from app.utils.constants import TURNOS_VALIDOS


def validate_dni(dni: str) -> bool:
    """Validate DNI format (8 digits)."""
    return bool(re.match(r'^\d{8}$', dni))


def validate_email(email: str) -> bool:
    """Validate email format."""
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email))


def validate_turno(turno: str) -> bool:
    """Validate turn code."""
    return turno.upper() in TURNOS_VALIDOS


def validate_dia(dia: int) -> bool:
    """Validate day of month (1-31)."""
    return 1 <= dia <= 31


def validate_mes(mes: int) -> bool:
    """Validate month (1-12)."""
    return 1 <= mes <= 12


def validate_anio(anio: int) -> bool:
    """Validate year."""
    return 2020 <= anio <= 2099


def validate_rol(rol: int) -> bool:
    """Validate role value (0-4)."""
    return rol in [0, 1, 2, 3, 4]


def validate_grado(grado: str) -> bool:
    """Validate grade format."""
    valid_grades = [
        "ASC", "S1T", "S2T", "S3T",
        "TEC I", "TEC II", "TEC III",
        "SUBT I", "SUBT II", "SUBT III",
        "INT", "CPT", "MY", "TC"
    ]
    return grado.upper() in [g.upper() for g in valid_grades]
