"""
Utilidades compartidas entre PanelTrabajo, MobileRolView y PanelOCR.
Elimina codigo duplicado y mejora consistencia.
"""

# ============================================
# CONSTANTES COMPARTIDAS
# ============================================

# Meses del anio
MESES = [
    "", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
]

MESES_CORTOS = [
    "", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
]

# Mapa inverso: nombre mes -> numero
MES_DE_NOMBRE = {nombre: i for i, nombre in enumerate(MESES) if i > 0}
MES_DE_NOMBRE.update({corto: i for i, corto in enumerate(MES_DE_CORTOS) if i > 0})


# ============================================
# FUNCIONES DE FECHA
# ============================================

def columna_a_numero(letra: str) -> int:
    """Convierte columna (A=1, B=2, ..., Z=26, AA=27)."""
    resultado = 0
    for c in letra.upper():
        resultado = resultado * 26 + (ord(c) - ord('A') + 1)
    return resultado


def numero_a_columna(num: int) -> str:
    """Convierte numero a columna (1=A, 2=B, ..., 26=Z, 27=AA)."""
    resultado = ""
    while num > 0:
        num, remainder = divmod(num - 1, 26)
        resultado = chr(65 + remainder) + resultado
    return resultado


def columna_letra(indice: int) -> str:
    """Convierte indice 0-based a letra de columna (0=A, 1=B, ...)."""
    return numero_a_columna(indice + 1)


def formatear_fecha_historial(fecha_str: str) -> str:
    """Formatea una fecha para el historial de cambios."""
    if not fecha_str:
        return ""
    try:
        from datetime import datetime
        # Intentar varios formatos
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M"):
            try:
                dt = datetime.strptime(fecha_str, fmt)
                return dt.strftime("%d/%m %H:%M")
            except ValueError:
                continue
        # Si no se pudo parsear, devolver tal cual (truncado)
        return fecha_str[:16] if len(fecha_str) > 16 else fecha_str
    except Exception:
        return fecha_str[:16] if len(fecha_str) > 16 else fecha_str


def formatear_fecha_corta(fecha_str: str) -> str:
    """Formatea fecha para mostrar en tabla."""
    if not fecha_str:
        return ""
    try:
        from datetime import datetime
        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                dt = datetime.strptime(fecha_str, fmt)
                return dt.strftime("%d/%m/%Y")
            except ValueError:
                continue
        return fecha_str[:10]
    except Exception:
        return fecha_str[:10]


# ============================================
# FUNCIONES DE HOJA
# ============================================

def hoja_a_mes(nombre_hoja: str) -> int:
    """Convierte nombre de hoja a numero de mes (ENERO=1, FEBRERO=2, etc)."""
    nombre = nombre_hoja.upper().strip()
    return MES_DE_NOMBRE.get(nombre, 0)


def mes_a_hoja(mes: int) -> str:
    """Convierte numero de mes a nombre de hoja."""
    if 1 <= mes <= 12:
        return MESES[mes]
    return ""


def es_hoja_de_mes(nombre: str) -> bool:
    """Verifica si un nombre es una hoja de mes."""
    return nombre.upper().strip() in MES_DE_NOMBRE


def solo_hojas_mes(hojas: list[str]) -> list[str]:
    """Filtra solo hojas de meses, excluyendo ones como BD, AREAS, etc."""
    return [h for h in hojas if es_hoja_de_mes(h)]


# ============================================
# FUNCIONES DE PERSONAL
# ============================================

def ordenar_personal_por_grado(personal: list[dict]) -> list[dict]:
    """Ordena personal por grado (Jerarquia PNP: General > Coronel > ... > Tercer Clase)."""
    GRADOS_ORDEN = {
        'GENERAL': 1, 'GENERAL DE DIVISION': 1, 'GENERAL DE BRIGADA': 2,
        'CORONEL': 3, 'TENIENTE CORONEL': 4, 'MAYOR': 5,
        'CAPITAN': 6, 'PRIMER TENIENTE': 7, 'TENIENTE': 8, 'SUBTENIENTE': 9,
        'TTE 1RO': 7, 'TTE': 8, 'STTE': 9,
        'SUBOFICIAL PRIMERO': 10, 'SUBOFICIAL SEGUNDO': 11, 'SUBOFICIAL TERCERO': 12,
        'SOF 1RO': 10, 'SOF 2DO': 11, 'SOF 3RO': 12,
        'SARGENTO PRIMERO': 13, 'SARGENTO': 14, 'CABO PRIMERO': 15, 'CABO': 16,
        'SGTE P': 13, 'SGTE': 14, 'CB 1RO': 15, 'CB': 16,
        'POLICIA': 17, 'PNP': 17,
    }
    def clave_grado(emp):
        grado = (emp.get('grado') or '').upper().strip()
        return GRADOS_ORDEN.get(grado, 99)
    return sorted(personal, key=clave_grado)


def filtrar_personal_por_rol(personal: list[dict], es_admin: bool, es_jefe: bool, 
                              es_usuario: bool, user: dict = None, area_asignada: str = "",
                              areas_usuario: list = None) -> list[dict]:
    """Filtra personal segun el rol del usuario."""
    if es_admin:
        return personal
    if es_jefe and areas_usuario:
        return [p for p in personal if p.get('area') in areas_usuario]
    if es_usuario and user:
        nombre_user = (user.get('nombre') or '').lower().strip()
        return [p for p in personal if (p.get('nombre') or '').lower().strip() == nombre_user]
    if area_asignada:
        return [p for p in personal if p.get('area') == area_asignada]
    return personal


# ============================================
# FUNCIONES DE FRANCOS
# ============================================

def calcular_francos_invalidos(personal: list[dict], turnos: dict, total_dias_mes: int) -> dict:
    """
    Calcula francos invalidos (descansos medicos no permitidos en ciertos turnos).
    Retorna dict con {persona_id: [dias_invalidos]}.
    """
    francos_invalidos = {}
    FRANCOS_NO_PERMITIDOS = {'M', 'T', 'N', 'M/T', 'T/N', 'M/T/N'}
    
    for emp in personal:
        emp_id = emp.get('id')
        if not emp_id or emp_id not in turnos:
            continue
        
        turnos_emp = turnos[emp_id]
        dias_invalidos = []
        
        for dia in range(1, total_dias_mes + 1):
            turno = turnos_emp.get(dia, '')
            if turno in FRANCOS_NO_PERMITIDOS:
                dias_invalidos.append(dia)
        
        if dias_invalidos:
            francos_invalidos[emp_id] = dias_invalidos
    
    return francos_invalidos


# ============================================
# FUNCIONES DE GUARDAR SESION
# ============================================

STORAGE_SESION = 'ocr_sesion_actual'

def guardar_sesion(area: str, responsable: str, es_admin: bool):
    """Guarda la sesion actual en sessionStorage."""
    import time
    try:
        import json
        sessionStorage = getattr(__builtins__, 'sessionStorage', None)
        if sessionStorage:
            sessionStorage.setItem(STORAGE_SESION, json.dumps({
                'area': area,
                'responsable': responsable,
                'esAdmin': es_admin,
                'timestamp': int(time.time() * 1000)
            }))
    except Exception:
        pass  # En Python/Node no hay sessionStorage, esto es para JS


def cargar_sesion():
    """Carga la sesion desde sessionStorage."""
    try:
        import json
        sessionStorage = getattr(__builtins__, 'sessionStorage', None)
        if sessionStorage:
            raw = sessionStorage.getItem(STORAGE_SESION)
            if raw:
                return json.loads(raw)
    except Exception:
        pass
    return None


def limpiar_sesion():
    """Limpia la sesion de sessionStorage."""
    try:
        sessionStorage = getattr(__builtins__, 'sessionStorage', None)
        if sessionStorage:
            sessionStorage.removeItem(STORAGE_SESION)
    except Exception:
        pass
