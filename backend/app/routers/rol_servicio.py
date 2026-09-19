"""
Rol de Servicio - espejo publico de la plantilla `ROL DE SERVICIO INSP`.

La plantilla es 100% formula-driven: su celda D22 contiene un QUERY gigante que
reconstruye la tabla principal (GRADO, APELLIDOS, AREA, turno del dia) leyendo
la hoja del mes indicado en A1 y la columna del dia indicada en A2, ordenando
por las columnas Col41, Col39, Col40, Col37, Col38, Col36 (codigos SWITCH).

Este router replica esa logica en Python para poder servir CUALQUIER mes/dia
sin tocar la hoja real:

    GET /api/v1/rol-servicio            -> dia actual (A1/A2 de la plantilla)
    GET /api/v1/rol-servicio?mes=SEPTIEMBRE&dia=18
    GET /api/v1/rol-servicio?mes=OCTUBRE&dia=1

Sin autenticacion (lectura publica, la API key nunca sale del backend).

PERFORMANCE: el endpoint hace 3 lecturas a Google Sheets (plantilla A1:J20,
mes A1:AJ300, BD X1:AC500) en paralelo, en vez de las 9 serializadas
originales. GoogleSheetsService cachea lecturas por rango (TTL 30s), asi al
cambiar de dia dentro del mismo mes la respuesta es practicamente instantanea.
"""
import asyncio
import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.sheets_service import GoogleSheetsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rol-servicio", tags=["Rol de Servicio"])

sheets_service = GoogleSheetsService()

PLANTILLA = "ROL DE SERVICIO INSP"
BD_SHEET = "BD"

# Hojas de mes del libro (columnas = dias, cabecera en fila 1)
MESES_HOJAS = ["JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]

# ============================================================
# SWITCH de la plantilla (dump de formulas, celda D22 + filas)
# ============================================================

# Col37: codigo de turno (SWITCH del turno del dia) - default 24
CODIGO_TURNO = {
    "SERVICIO CONTINUO": 1,
    "OFICIAL DE PERMANENCIA (DIURNO)": 2,
    "OFICIAL DE PERMANENCIA (NOCTURNO)": 3,
    "OFICIAL DE PERMANENCIA (MAÑANA)": 4,
    "OFICIAL DE PERMANENCIA (TARDE)": 5,
    "SERVICIO": 6,
    "24 X 48": 7,
    "12 HRS M": 8,
    "12 HRS N": 9,
    "ADMINISTRATIVO": 10,
    "MAÑANA": 11,
    "TARDE": 12,
    "FRANCO": 13,
    "VACACIONES": 14,
    "DESCANSO MEDICO": 15,
    "PERMISO A CUENTA DE VACACIONES": 16,
    "REFERIDO A LIMA": 17,
    "ADAPTACION A LA VIDA CIVIL": 18,
    "LICENCIA DE GRAVIDEZ": 19,
    "SOMETIDO A LEY": 20,
    "EXTERNO": 21,
    "RETEN": 22,
    "CUMPLEAÑOS 🥳🥳🥳🥳": 23,
}
DEFAULT_CODIGO_TURNO = 24

# Col36: flag especial (1 si el turno esta en la lista MATCH, si no 0)
TURNOS_ESPECIALES = {
    "FRANCO", "VACACIONES", "DESCANSO MEDICO", "PERMISO A CUENTA DE VACACIONES",
    "REFERIDO A LIMA", "ADAPTACION A LA VIDA CIVIL", "LICENCIA DE GRAVIDEZ",
    "SOMETIDO A LEY", "EXTERNO", "RETEN", "CUMPLEAÑOS 🥳🥳🥳🥳",
}

# Col38: codigo de grado (SWITCH de la columna B del mes) - default 99
CODIGO_GRADO = {
    "CRNL SPNP": 1, "CMDTE SPNP": 2, "MAY SPNP": 3, "CAP SPNP": 4,
    "SS PNP": 5, "SS SPNP": 6, "SB PNP": 7, "SB SPNP": 8,
    "ST1 PNP": 9, "ST1 SPNP": 10, "ST2 PNP": 11, "ST2 SPNP": 12,
    "ST3 PNP": 13, "ST3 SPNP": 14, "S1 PNP": 15, "S1 SPNP": 16,
    "S2 PNP": 17, "S2 SPNP": 18, "S3 PNP": 19, "S3 SPNP": 20,
}
DEFAULT_CODIGO_GRADO = 99

# Col40: codigo de area (SWITCH de la columna D del mes) - default 999
CODIGO_AREA = {
    "DIRECTOR DEL HOSPITAL REGIONAL AREQUIPA": 1,
    "OFICIAL DE PERMANENCIA": 2,
    "SECRETARIA": 3,
    "AREA DE PLANEAMIENTO": 4,
    "AREA DE EDUCACION": 5,
    "OFICINA DE ADMINISTRACION": 6,
    "AREA DE RECURSOS HUMANOS": 7,
    "AREA DE LOGISTICA": 8,
    "AREA DE CONTABILIDAD": 9,
    "UNIDAD DE RELACIONES PUBLICAS Y ATENCION AL USUARIO": 10,
    "UNIDAD DE GESTION DE LA CALIDAD": 11,
    "UNIDAD DE ADMISION Y REGISTROS MEDICOS": 12,
    "AREA DE ESTADISTICA": 13,
    "AREA DE EPIDEMIOLOGIA": 14,
    "AREA DE PROGRAMAS Y ESTRATEGIAS SANITARIAS": 15,
    "UNIDAD DE TECNOLOGIA DE LA INFORMACION Y COMUNICACIONES": 16,
    "DIVISION DE MEDICINA Y ESPECIALIDADES MEDICAS": 17,
    "RECONOCIMIENTO MEDICO": 18,
    "OFICINA DE REFERENCIAS Y CONTRAREFERENCIAS": 19,
    "JUNTA MEDICA": 20,
    "DIVISION DE CIRUGIA Y ESPECIALIDADES QUIRURGICAS": 21,
    "DEPARTAMENTO DE OBSTETRICIA": 22,
    "DEPARTAMENTO DE GINECOLOGIA": 23,
    "DEPARTAMENTO DE MEDICINA PEDIATRICA": 24,
    "DIVISION DE EMERGENCIA Y AREAS CRITICAS": 25,
    "DEPARTAMENTO DE ASISTENCIA SOCIAL": 26,
    "DEPARTAMENTO DE DIAGNOSTICO POR IMAGENES": 27,
    "DEPARTAMENTO DE MEDICINA FISICA Y REHABILITACION": 28,
    "DEPARTAMENTO DE NUTRICION": 29,
    "DEPARTAMENTO DE ODONTOESTOMATOLOGIA": 30,
    "DEPARTAMENTO DE PATOLOGIA CLINICA": 31,
    "DEPARTAMENTO DE PSICOLOGIA": 32,
    "DEPARTAMENTO DE FARMACIA": 33,
    "DIVISION DE ENFERMERIA": 34,
    "ÁREA DE MEDICINA Y ESPECIALIDADES MÉDICAS": 35,
    "ÁREA DE CIRUGÍA Y ESPECIALIDADES QUIRÚRGICAS": 36,
    "ANESTESIOLOGÍA Y CENTRO QUIRÚRGICO": 37,
    "ÁREA MATERNO INFANTIL": 38,
    "ÁREA DE EMERGENCIA Y ÁREAS CRÍTICAS": 39,
    "ÁREA DE ATENCIÓN AMBULATORIA": 40,
    "UNIDAD DE TRAMITE DOCUMENTARIO": 41,
    "DEPARTAMENTO DE ANESTECIOLOGÍA Y CENTRO QUIRURGICO": 42,
    "POSTA MEDICA POLICIAL SAN MARTIN DE PORRES": 43,
    "POSTA MEDICA POLICIAL CAMANA": 44,
    "POSTA MEDICA POLICIAL ISLAY": 45,
    "ESCUELA DE EDUCACION SUPERIOR TECNICO PROFESIONAL": 46,
    "UNIDAD DESCONCENTRADA DE DOSAJE ETILICO": 47,
}
DEFAULT_CODIGO_AREA = 999

# Col41: SWITCH del turno del dia - 0/1/2 (default 2)
def codigo_col41(turno: str) -> int:
    if turno == "SERVICIO CONTINUO":
        return 0
    if turno == "OFICIAL DE PERMANENCIA (DIURNO)":
        return 1
    return 2

# Col39: IF(area == DIRECTOR, 1, 2)
def codigo_col39(area: str) -> int:
    return 1 if area == "DIRECTOR DEL HOSPITAL REGIONAL AREQUIPA" else 2

# Col36: IF turno en especiales -> 1, si no 0
def codigo_col36(turno: str) -> int:
    return 1 if turno in TURNOS_ESPECIALES else 0

# ============================================================
# ENTRADA / SALIDA - SWITCH(TRIM(UPPER(turno))) de cada fila
# ============================================================

_TURNOS_TEXTO = {
    "FRANCO", "SERVICIO CONTINUO", "VACACIONES", "LICENCIA DE GRAVIDEZ",
    "ADAPTACION A LA VIDA CIVIL", "EXTERNO", "DESCANSO MEDICO",
    "REFERIDO A LIMA", "FERIADO", "PERMISO A CUENTA DE VACACIONES",
    "PERMISO DE RADIACION", "LICENCIA POR PATERNIDAD", "MAÑANA - 12 HRS N",
}

# Del dump R23 (bloque 1 = ENTRADA)
ENTRADA_TURNOS = {
    "MAÑANA": "07:30", "TARDE": "13:30", "12 HRS M": "07:30", "12 HRS N": "19:30",
    "RETEN": "07:30", "SERVICIO": "07:30",
    "OFICIAL DE PERMANENCIA (DIURNO)": "07:30",
    "OFICIAL DE PERMANENCIA (NOCTURNO)": "19:30",
    "OFICIAL DE PERMANENCIA (MAÑANA)": "07:30",
    "OFICIAL DE PERMANENCIA (TARDE)": "13:30",
}

# Del dump R23 (bloque 2 = SALIDA)
SALIDA_TURNOS = {
    "MAÑANA": "13:30", "TARDE": "19:30", "12 HRS M": "19:30", "12 HRS N": "07:30",
    "SERVICIO": "07:30", "RETEN": "13:30",
    "OFICIAL DE PERMANENCIA (DIURNO)": "19:30",
    "OFICIAL DE PERMANENCIA (NOCTURNO)": "07:30",
    "OFICIAL DE PERMANENCIA (MAÑANA)": "13:30",
    "OFICIAL DE PERMANENCIA (TARDE)": "19:30",
}


def _switch_entrada(turno: str) -> str:
    t = (turno or "").strip().upper()
    if t in ENTRADA_TURNOS:
        return ENTRADA_TURNOS[t]
    if t in _TURNOS_TEXTO:
        return turno
    return ""


def _switch_salida(turno: str) -> str:
    t = (turno or "").strip().upper()
    if t in SALIDA_TURNOS:
        return SALIDA_TURNOS[t]
    if t in _TURNOS_TEXTO:
        return turno
    return ""


# ============================================================
# Grupos de grado para el resumen PERSONAL (COUNTIFs R13)
# ============================================================

GRUPOS_EFECTIVOS = [
    ("OFICIALES PNP ARMAS", ["CRNL PNP", "CMDTE PNP", "MAY PNP", "CAP PNP"]),
    ("OFICIALES PNP SERVICIOS", ["CRNL SPNP", "CMDTE SPNP", "MAY SPNP", "CAP SPNP"]),
    ("SUBOFICIALES PNP ARMAS", ["SS PNP", "SB PNP", "ST1 PNP", "ST2 PNP", "ST3 PNP", "S1 PNP", "S2 PNP", "S3 PNP"]),
    ("SUBOFICIALES PNP SERVICIOS", ["SS SPNP", "SB SPNP", "ST1 SPNP", "ST2 SPNP", "ST3 SPNP", "S1 SPNP", "S2 SPNP", "S3 SPNP"]),
    ("CIVIL", ["CIVIL", "CAS", "EC. PC."]),
]

# DISPONIBLES = COUNTIFS(grado, turno) SOLO con estos 4 turnos
TURNOS_DISPONIBLES = {"MAÑANA", "TARDE", "12 HRS M", "12 HRS N"}

# ============================================================
# Helpers
# ============================================================

def _norm(t):
    return (t or "").strip()


def _celda(filas, fila, col):
    """Acceso seguro a una celda 0-based; devuelve '' si no existe."""
    try:
        return _norm(filas[fila][col])
    except (IndexError, TypeError):
        return ""


def _parse_header_dia(header: str) -> Optional[int]:
    """'vie-18sep' -> 18 (numero de dia)."""
    h = (header or "").strip()
    if "-" not in h:
        return None
    parte = h.split("-")[-1]  # '18sep'
    dig = ""
    for ch in parte:
        if ch.isdigit():
            dig += ch
        else:
            break
    return int(dig) if dig else None


# ============================================================
# Endpoint
# ============================================================

async def prewarm() -> None:
    """Precarga el cache de GoogleSheetsService al arrancar (plantilla,
    hoja del mes actual segun A1 y BD). Asi la primera peticion de
    /rol-servicio es instantanea en vez de esperar ~7s de lectura fria.
    Nunca lanza: si falla, la siguiente peticion real lo reintenta."""
    try:
        plant = await sheets_service.get_range(PLANTILLA, "A1:J20", ttl=900)
        mes_pre = _celda(plant, 0, 0) or "SEPTIEMBRE"
        if mes_pre not in MESES_HOJAS:
            mes_pre = "SEPTIEMBRE"
        # El gather tambien cachea la BD (compartida por todos los meses)
        await asyncio.gather(
            sheets_service.get_range(mes_pre, "A1:AJ300", ttl=120),
            sheets_service.get_range(BD_SHEET, "X1:AC500", ttl=900),
        )
        logger.info(f"[prewarm] Rol de servicio precargado (mes={mes_pre})")
    except Exception as e:
        logger.warning(f"[prewarm] No se pudo precargar el rol de servicio: {e}")


@router.get("")
async def rol_servicio(
    mes: Optional[str] = Query(None, description="Hoja del mes (SEPTIEMBRE, OCTUBRE...). Default: A1 de la plantilla"),
    dia: Optional[int] = Query(None, description="Dia del mes (1-31). Default: dia actual segun A2 de la plantilla"),
):
    """Reconstruye el ROL DE SERVICIO para un mes/dia, replica de la plantilla."""
    try:
        # ------------------------------------------------------------
        # 1) PLANTILLA completa en UNA lectura (A1:J20):
        #    A1:A2 (mes/dia actual), B4 (titulo), B6:E9 (contactos),
        #    C17:E20 (vehiculos), F18:F20 (etiquetas), H17:J20 (matriz)
        # ------------------------------------------------------------
        plant = await sheets_service.get_range(PLANTILLA, "A1:J20", ttl=900)

        mes_plantilla = _celda(plant, 0, 0)          # A1
        col_raw = _celda(plant, 1, 0)                # A2
        try:
            col_plantilla = int(float(col_raw))
        except (TypeError, ValueError):
            col_plantilla = None

        if mes:
            mes_efectivo = mes.strip().upper()
            if mes_efectivo not in MESES_HOJAS:
                raise HTTPException(status_code=400, detail=f"Mes invalido. Use uno de: {', '.join(MESES_HOJAS)}")
        else:
            mes_efectivo = mes_plantilla or "SEPTIEMBRE"

        # ------------------------------------------------------------
        # 2) MES (A1:AJ300) y BD (X1:AC500) en PARALELO.
        #    Los headers de dia salen de la fila 1 de la hoja del mes.
        # ------------------------------------------------------------
        data_mes, bd_rows = await asyncio.gather(
            sheets_service.get_range(mes_efectivo, "A1:AJ300", ttl=120),
            sheets_service.get_range(BD_SHEET, "X1:AC500", ttl=900),
        )

        headers = data_mes[0] if data_mes else []

        # Determinar la columna (0-based) del dia pedido
        if dia is not None:
            if not (1 <= dia <= 31):
                raise HTTPException(status_code=400, detail="Dia fuera de rango (1-31)")
            col_dia = None
            for idx, h in enumerate(headers):
                if _parse_header_dia(h) == dia:
                    col_dia = idx
                    break
            if col_dia is None:
                raise HTTPException(status_code=404, detail=f"El dia {dia} no existe en la hoja {mes_efectivo}")
        else:
            col_dia = col_plantilla
            if col_dia is None:
                raise HTTPException(status_code=400, detail="No se pudo determinar el dia actual (A2 de la plantilla)")

        if col_dia >= len(headers) or _parse_header_dia(headers[col_dia]) is None:
            raise HTTPException(status_code=404, detail=f"Columna {col_dia} no es una columna de dia en {mes_efectivo}")

        header_dia = headers[col_dia]
        dia_efectivo = _parse_header_dia(header_dia)

        # ------------------------------------------------------------
        # 3) BD: X=GRADO, Y=ESPECIALIDAD, Z=CODIGO, AA=APELLIDOS,
        #    AB=CELULAR, AC=SEXO
        # ------------------------------------------------------------
        bd_por_nombre = {}
        for row in bd_rows[1:]:  # saltar cabecera
            if len(row) < 6:
                continue
            nombre = _norm(row[3])
            if not nombre:
                continue
            bd_por_nombre[nombre] = {
                "codigo": _norm(row[2]),
                "celular": _norm(row[4]),
                "sexo": _norm(row[5]),
            }

        # ------------------------------------------------------------
        # 4) Construir filas con la MISMA logica del QUERY
        # ------------------------------------------------------------
        filas = []
        for row in data_mes[1:]:
            if len(row) < 4:
                continue
            apellidos = _norm(row[2])
            if not apellidos:
                continue
            grado = _norm(row[1])
            area = _norm(row[3])
            turno = _norm(row[col_dia]) if len(row) > col_dia else ""
            bd = bd_por_nombre.get(apellidos, {})
            t_up = turno.upper()
            filas.append({
                "apellidos": apellidos,
                "grado": grado,
                "area": area,
                "turno": turno,
                "codigo": bd.get("codigo", ""),
                "celular": bd.get("celular", ""),
                "sexo": bd.get("sexo", ""),
                "entrada": _switch_entrada(turno),
                "salida": _switch_salida(turno),
                # claves de orden (igual que ORDER BY del QUERY)
                "k41": codigo_col41(t_up),
                "k39": codigo_col39(area),
                "k40": CODIGO_AREA.get(area, DEFAULT_CODIGO_AREA),
                "k37": CODIGO_TURNO.get(t_up, DEFAULT_CODIGO_TURNO),
                "k38": CODIGO_GRADO.get(grado, DEFAULT_CODIGO_GRADO),
                "k36": codigo_col36(t_up),
            })

        filas.sort(key=lambda f: (f["k41"], f["k39"], f["k40"], f["k37"], f["k38"], f["k36"]))

        # N secuencial 1..n
        for i, f in enumerate(filas, start=1):
            f["n"] = i

        # ------------------------------------------------------------
        # 5) Resumen PERSONAL (R13-R15): ef/desc/disp por grupo de grados
        # ------------------------------------------------------------
        ef = [0] * len(GRUPOS_EFECTIVOS)
        dis = [0] * len(GRUPOS_EFECTIVOS)
        for f in filas:
            idx_grupo = None
            for gi, (_, grados) in enumerate(GRUPOS_EFECTIVOS):
                if f["grado"] in grados:
                    idx_grupo = gi
                    break
            if idx_grupo is None:
                continue
            ef[idx_grupo] += 1
            if f["turno"] in TURNOS_DISPONIBLES:
                dis[idx_grupo] += 1
        desc = [ef[i] - dis[i] for i in range(len(GRUPOS_EFECTIVOS))]
        resumen = {
            "grupos": [g[0] for g in GRUPOS_EFECTIVOS],
            "efectivos": {"por_grupo": ef, "total": sum(ef)},
            "descuentos": {"por_grupo": desc, "total": sum(desc)},
            "disponibles": {"por_grupo": dis, "total": sum(dis)},
        }

        # ------------------------------------------------------------
        # 6) Bloques laterales (M15:P20 - COUNTIF sobre la tabla + BD)
        # ------------------------------------------------------------
        codigo_1 = sum(1 for f in filas if f["codigo"] == "1")
        codigo_2 = sum(1 for f in filas if f["codigo"] == "2")
        codigo_0 = sum(1 for f in filas if f["codigo"] == "0")
        vacaciones = sum(1 for f in filas if f["turno"] in ("VACACIONES", "PERMISO A CUENTA DE VACACIONES"))
        descanso_medico = sum(1 for f in filas if f["turno"] == "DESCANSO MEDICO")
        hombres = sum(1 for row in bd_rows[1:] if len(row) > 5 and _norm(row[5]) == "MASCULINO")
        mujeres = sum(1 for row in bd_rows[1:] if len(row) > 5 and _norm(row[5]) == "FEMENINO")
        calculo_vacaciones = 7  # P19 = valor estatico de la plantilla
        dias_por_trabajar = round((31 - calculo_vacaciones) * 24 / 31, 6)

        bloques = {
            "codigo_1": codigo_1,
            "codigo_2": codigo_2,
            "codigo_0": codigo_0,
            "total_pnp": codigo_1 + codigo_2 + codigo_0,
            "vacaciones": vacaciones,
            "descanso_medico": descanso_medico,
            "hombres": hombres,
            "mujeres": mujeres,
            "calculo_vacaciones": calculo_vacaciones,
            "dias_por_trabajar": dias_por_trabajar,
        }

        # ------------------------------------------------------------
        # 7) Vehiculos (derivados de la plantilla A1:J20 leida en el paso 1)
        #    C17:E20 = lista; F18:F20 = etiquetas; H17:J20 = matriz
        # ------------------------------------------------------------
        def _num(v):
            try:
                return int(float(v))
            except (TypeError, ValueError):
                return 0

        lista = []
        for fila in range(16, 20):  # filas 17..20 (0-based 16..19) -> C17:E20
            n = _celda(plant, fila, 2)
            tipo = _celda(plant, fila, 3)
            placa = _celda(plant, fila, 4)
            if n and tipo:
                lista.append({"n": n, "tipo": tipo, "placa": placa})

        etiquetas = [_celda(plant, fila, 5) for fila in range(17, 20)]  # F18:F20
        etiquetas = [e for e in etiquetas if e]

        matriz = []
        for i, fila in enumerate(range(17, 20)):  # filas 18..20 -> H18:J20 (sin cabecera)
            amb = _num(_celda(plant, fila, 7))
            vcom = _num(_celda(plant, fila, 8))
            total = _num(_celda(plant, fila, 9))
            if not total and (amb or vcom):
                total = amb + vcom
            matriz.append({
                "etiqueta": etiquetas[i] if i < len(etiquetas) else "",
                "ambulancia": amb,
                "vcomando": vcom,
                "total": total,
            })

        vehiculos = {"lista": lista, "matriz": matriz}

        # ------------------------------------------------------------
        # 8) Titulo (B4) y contactos (B6:E9) de la plantilla
        # ------------------------------------------------------------
        titulo = _celda(plant, 3, 1) or "HOSPITAL REGIONAL POLICIAL AREQUIPA"
        # El titulo trae la fecha del dia actual ("... - 18SEP26"); se
        # reemplaza por la del dia pedido.
        MESES_ABREV = {"JULIO": "JUL", "AGOSTO": "AGO", "SEPTIEMBRE": "SEP", "OCTUBRE": "OCT", "NOVIEMBRE": "NOV", "DICIEMBRE": "DIC"}
        abrev = MESES_ABREV.get(mes_efectivo, "???")
        fecha_corta = f"{dia_efectivo:02d}{abrev}26"
        titulo = re.sub(r"-\s*\d{2}[A-Z]{3}\d{2}$", f"- {fecha_corta}", titulo)

        contactos = []
        for fila in range(5, 9):  # filas 6..9 (0-based 5..8) -> B6:E9
            label = _celda(plant, fila, 1)
            valor = _celda(plant, fila, 4)
            if label:
                contactos.append({"label": label, "valor": valor})

        # ------------------------------------------------------------
        # 9) Dias disponibles de la hoja del mes (para el selector)
        # ------------------------------------------------------------
        dias_disponibles = []
        for idx, h in enumerate(headers):
            nd = _parse_header_dia(h)
            if nd is not None:
                dias_disponibles.append({"dia": nd, "columna": idx, "header": h})

        filas_out = []
        for f in filas:
            filas_out.append({
                "n": f["n"],
                "codigo": f["codigo"],
                "grado": f["grado"],
                "apellidos": f["apellidos"],
                "area": f["area"],
                "turno": f["turno"],
                "entrada": f["entrada"],
                "salida": f["salida"],
                "celular": f["celular"],
            })

        return {
            "mes": mes_efectivo,
            "dia": dia_efectivo,
            "columna": col_dia,
            "header_dia": header_dia,
            "titulo": titulo,
            "contactos": contactos,
            "resumen": resumen,
            "bloques": bloques,
            "vehiculos": vehiculos,
            "dias_disponibles": dias_disponibles,
            "columnas": ["N°", "CODIGO", "GRADO", "APELLIDOS Y NOMBRES", "AREA", header_dia, "ENTRADA", "SALIDA", "CELULAR"],
            "filas": filas_out,
            "total_personal": len(filas_out),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en /rol-servicio: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail="Error al construir el rol de servicio")