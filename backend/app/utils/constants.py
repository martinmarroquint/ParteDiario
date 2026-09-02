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

# Solicitud states
ESTADOS_SOLICITUD = {
    "ENVIADA": "Solicitud creada, esperando revisión de área",
    "REVISION_DEPARTAMENTO": "Esperando revisión de departamento",
    "REVISION_DIVISION": "Esperando revisión de división",
    "APROBADA": "Solicitud aprobada completamente",
    "RECHAZADA": "Solicitud rechazada",
}

# Hierarchical levels
NIVEL_AREA = 1
NIVEL_DEPARTAMENTO = 2
NIVEL_DIVISION = 3

# State transitions by level
TRANSICIONES_ESTADO = {
    "ENVIADA": "REVISION_DEPARTAMENTO",
    "REVISION_DEPARTAMENTO": "REVISION_DIVISION",
    "REVISION_DIVISION": "APROBADA",
}

# Map level to initial state
ESTADO_INICIAL_POR_NIVEL = {
    1: "ENVIADA",
    2: "REVISION_DEPARTAMENTO",
    3: "REVISION_DIVISION",
}

# Map level to approval state
ESTADO_POR_NIVEL = {
    1: ["ENVIADA"],
    2: ["REVISION_DEPARTAMENTO"],
    3: ["REVISION_DIVISION"],
}

# Months
MESES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

# Google Sheets tab names
SHEETS_TABS = {
    "usuarios": "Usuarios",
    "user_roles": "UserRoles",
    "estructura_jerarquica": "EstructuraJerarquica",
    "solicitudes": "Solicitudes",
    "descansos": "DescansosMedicos",
    "vacaciones": "Vacaciones",
    "areas": "Areas",
    "config": "Config",
}
