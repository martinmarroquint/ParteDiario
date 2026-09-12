# Constants for the OCR Roles Servicio backend

# Role definitions
ROLES = {
    0: "usuario",
    1: "jefe_area",
    2: "jefe_departamento",
    3: "jefe_division",
    4: "admin"
}

# Turn codes
TURNOS = {
    "M": "Mañana (07:00 - 13:00)",
    "T": "Tarde (13:00 - 19:00)",
    "F": "Fin de semana (19:00 - 07:00)",
    "N": "Noche (19:00 - 07:00)",
    "FE": "Franco por enfermedad",
    "V": "Vacaciones",
    "DM": "Descanso médico",
    "L": "Libre",
    "CP": "Capitación",
    "FR": "Franco por rol",
}

TURNOS_VALIDOS = list(TURNOS.keys())

# Solicitudes de cambio de turno — states
ESTADO_PENDIENTE = "PENDIENTE"
ESTADO_APROBADO = "APROBADO"
ESTADO_DESAPROBADO = "DESAPROBADO"
ESTADO_CANCELADO = "CANCELADO"

# Valid state transitions
TRANSICIONES_VALIDAS = {
    "PENDIENTE": ["APROBADO", "DESAPROBADO", "CANCELADO"],
    # APROBADO, DESAPROBADO, CANCELADO are terminal
}

# Months
MESES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

# Google Sheets tab names
SHEETS_TABS = {
    "usuarios": "USUARIOS_OCR",
    "user_roles": "UserRoles",
    "estructura_jerarquica": "EstructuraJerarquica",
    "solicitudes": "SOLICITUDES",
    "descansos": "DescansosMedicos",
    "vacaciones": "Vacaciones",
    "areas": "Areas",
    "config": "Config",
}
