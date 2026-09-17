"""
Servicio de migracion: Google Sheets → Supabase
Ejecutar una sola vez para migrar datos existentes.
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Any

from app.config import settings
from app.services.sheets_service import get_range

logger = logging.getLogger(__name__)

# Supabase client (se importa lazy para no romper si no esta configurado)
_supabase = None


def _get_supabase():
    """Obtiene cliente Supabase con service_role key."""
    global _supabase
    if _supabase is None:
        try:
            from supabase import create_client
            if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
                raise ValueError("SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados")
            _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        except ImportError:
            raise ImportError("pip install supabase")
    return _supabase


# ============================================
# Migracion de Areas
# ============================================
async def migrate_areas():
    """Migra la hoja 'Areas' a la tabla 'areas'."""
    sb = _get_supabase()
    rows = await get_range("Areas")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    headers = rows[0]
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            record = {}
            for i, h in enumerate(headers):
                if i < len(row):
                    record[h.lower()] = row[i]

            sb.table("areas").upsert({
                "id": record.get("id", ""),
                "nombre": record.get("nombre", ""),
                "codigo": record.get("codigo", ""),
                "tipo": record.get("tipo", "area"),
                "padre_id": record.get("padre_id"),
                "bloqueado": record.get("bloqueado", "FALSE") == "TRUE",
                "mes_bloqueado": _safe_int(record.get("mes_bloqueado")),
                "anio_bloqueado": _safe_int(record.get("anio_bloqueado")),
                "eliminado": record.get("eliminado", "FALSE") == "TRUE",
            }).execute()
            count += 1
        except Exception as e:
            errors.append(f"Area {row}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Usuarios
# ============================================
async def migrate_usuarios():
    """Migra la hoja 'USUARIOS_OCR' a la tabla 'usuarios'."""
    sb = _get_supabase()
    rows = await get_range("USUARIOS_OCR")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    headers = rows[0]
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            record = {}
            for i, h in enumerate(headers):
                if i < len(row):
                    record[h.lower()] = row[i]

            sb.table("usuarios").upsert({
                "id_usuario": record.get("id_usuario", ""),
                "nombre": record.get("nombre", ""),
                "email": record.get("email", ""),
                "usuario": record.get("usuario", ""),
                "password_hash": record.get("password_hash", ""),
                "salt": record.get("salt", ""),
                "rol": _safe_int(record.get("rol"), 0),
                "areas_json": _safe_json(record.get("areas_json"), []),
                "intentos_fallidos": _safe_int(record.get("intentos_fallidos"), 0),
                "bloqueado_hasta": _safe_datetime(record.get("bloqueado_hasta")),
                "activo": str(record.get("activo", "TRUE")).upper() == "TRUE",
                "requiere_cambio": str(record.get("requiere_cambio", "FALSE")).upper() == "TRUE",
            }).execute()
            count += 1
        except Exception as e:
            errors.append(f"Usuario {row[:3]}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Personal
# ============================================
async def migrate_personal():
    """Migra la hoja 'OCR' a la tabla 'personal'."""
    sb = _get_supabase()
    rows = await get_range("OCR")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    headers = rows[0]
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            record = {}
            for i, h in enumerate(headers):
                if i < len(row):
                    record[h.lower()] = row[i]

            sb.table("personal").upsert({
                "dni": record.get("dni", ""),
                "grado": record.get("grado", ""),
                "nombre": record.get("nombre", ""),
                "area": record.get("area", ""),
                "es_medico": str(record.get("es_medico", "FALSE")).upper() == "TRUE",
            }).execute()
            count += 1
        except Exception as e:
            errors.append(f"Personal {row[:3]}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Turnos
# ============================================
async def migrate_turnos():
    """Migra la hoja 'BD' a la tabla 'turnos'."""
    sb = _get_supabase()
    rows = await get_range("BD")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    headers = rows[0]
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            nombre = row[0] if len(row) > 0 else ""
            horas = row[1] if len(row) > 1 else None
            if nombre:
                sb.table("turnos").upsert({
                    "nombre": nombre,
                    "horas": _safe_float(horas),
                }).execute()
                count += 1
        except Exception as e:
            errors.append(f"Turno {row}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Hojas Mensuales
# ============================================
async def migrate_hojas_mensuales(mes: int, anio: int):
    """Migra una hoja mensual (ENERO, FEBRERO, etc.) a 'hojas_mensuales'."""
    sb = _get_supabase()
    meses = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
             "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
    sheet_name = meses[mes]

    rows = await get_range(sheet_name)
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    # Columnas del encabezado (A=indice, B=DNI, C=Grado, D=Nombre, E=Area, F-AF=Dias)
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            if len(row) < 5:
                continue

            persona_dni = row[1] if len(row) > 1 else ""
            persona_grado = row[2] if len(row) > 2 else ""
            persona_nombre = row[3] if len(row) > 3 else ""
            area = row[4] if len(row) > 4 else ""

            # Dias: columnas F (indice 5) en adelante
            dias = {}
            for dia in range(1, 32):
                idx = 4 + dia  # columna F=5 es dia 1
                if idx < len(row) and row[idx]:
                    dias[str(dia)] = row[idx]

            sb.table("hojas_mensuales").upsert({
                "mes": mes,
                "anio": anio,
                "area": area,
                "persona_nombre": persona_nombre,
                "persona_grado": persona_grado,
                "persona_dni": persona_dni,
                "dias": dias,
            }, on_conflict="mes,anio,persona_dni").execute()
            count += 1
        except Exception as e:
            errors.append(f"Row {row[:4]}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Solicitudes
# ============================================
async def migrate_solicitudes():
    """Migra la hoja 'SOLICITUDES' a la tabla 'solicitudes'."""
    sb = _get_supabase()
    rows = await get_range("SOLICITUDES")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    headers = rows[0]
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            record = {}
            for i, h in enumerate(headers):
                if i < len(row):
                    record[h.lower()] = row[i]

            sb.table("solicitudes").upsert({
                "id": record.get("id", ""),
                "solicitante_id": record.get("solicitante_id", ""),
                "solicitante_nombre": record.get("solicitante_nombre", ""),
                "solicitante_grado": record.get("solicitante_grado", ""),
                "solicitante_dni": record.get("solicitante_dni", ""),
                "area_solicitante": record.get("area_solicitante", ""),
                "estado": record.get("estado", "PENDIENTE"),
                "nivel_actual": _safe_int(record.get("nivel_actual"), 1),
                "tipo_cambio": record.get("tipo_cambio", ""),
                "participantes": _safe_json(record.get("participantes"), []),
                "motivo": record.get("motivo", ""),
                "pormenores": record.get("pormenores", ""),
                "hoja": record.get("hoja", ""),
                "mes": _safe_int(record.get("mes")),
                "anio": _safe_int(record.get("anio")),
                "cadena": _safe_json(record.get("cadena"), []),
                "historial": _safe_json(record.get("historial"), []),
            }).execute()
            count += 1
        except Exception as e:
            errors.append(f"Solicitud {row[:2]}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Estados
# ============================================
async def migrate_estados():
    """Migra la hoja 'ESTADOS' a la tabla 'estados'."""
    sb = _get_supabase()
    rows = await get_range("ESTADOS")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            if len(row) < 3:
                continue
            sb.table("estados").upsert({
                "mes": _safe_int(row[0]),
                "area": row[1],
                "estado": row[2],
            }, on_conflict="mes,area").execute()
            count += 1
        except Exception as e:
            errors.append(f"Estado {row}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Descansos Medicos
# ============================================
async def migrate_descansos():
    """Migra la hoja 'DescansosMedicos' a la tabla 'descansos_medicos'."""
    sb = _get_supabase()
    rows = await get_range("DescansosMedicos")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    headers = rows[0]
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            record = {}
            for i, h in enumerate(headers):
                if i < len(row):
                    record[h.lower()] = row[i]

            sb.table("descansos_medicos").upsert({
                "id": record.get("id", str(__import__("uuid").uuid4())),
                "usuario_id": record.get("usuario_id", ""),
                "usuario_nombre": record.get("usuario_nombre", ""),
                "fecha_inicio": record.get("fecha_inicio"),
                "fecha_fin": record.get("fecha_fin"),
                "codigo_cie10": record.get("codigo_cie10", ""),
                "diagnostico": record.get("diagnostico", ""),
                "medico_tratante": record.get("medico_tratante", ""),
                "registro": record.get("registro", ""),
                "registrado_por": record.get("registrado_por", ""),
                "registrado_por_nombre": record.get("registrado_por_nombre", ""),
            }).execute()
            count += 1
        except Exception as e:
            errors.append(f"Descanso {row[:3]}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Vacaciones
# ============================================
async def migrate_vacaciones():
    """Migra la hoja 'Vacaciones' a la tabla 'vacaciones'."""
    sb = _get_supabase()
    rows = await get_range("Vacaciones")
    if not rows or len(rows) < 2:
        return {"migrated": 0, "errors": []}

    headers = rows[0]
    data = rows[1:]
    count = 0
    errors = []

    for row in data:
        try:
            record = {}
            for i, h in enumerate(headers):
                if i < len(row):
                    record[h.lower()] = row[i]

            sb.table("vacaciones").upsert({
                "id": record.get("id", str(__import__("uuid").uuid4())),
                "usuario_id": record.get("usuario_id", ""),
                "usuario_nombre": record.get("usuario_nombre", ""),
                "fecha_inicio": record.get("fecha_inicio"),
                "fecha_fin": record.get("fecha_fin"),
                "tipo": record.get("tipo", "VACACIONES"),
                "registrado_por": record.get("registrado_por", ""),
                "registrado_por_nombre": record.get("registrado_por_nombre", ""),
            }).execute()
            count += 1
        except Exception as e:
            errors.append(f"Vacacion {row[:3]}: {str(e)}")

    return {"migrated": count, "errors": errors}


# ============================================
# Migracion de Mesa de Partes
# ============================================
async def migrate_mesa_de_partes():
    """Migra todas las hojas de Mesa de Partes."""
    sb = _get_supabase()
    results = {}

    # Documentos
    rows = await get_range("DOCUMENTOS")
    if rows and len(rows) > 1:
        headers = rows[0]
        count = 0
        for row in rows[1:]:
            try:
                record = {}
                for i, h in enumerate(headers):
                    if i < len(row):
                        record[h.lower()] = row[i]
                sb.table("documentos").upsert({
                    "id": record.get("id", ""),
                    "numero": record.get("numero", ""),
                    "tipo_doc": record.get("tipo_doc", ""),
                    "n_doc_origen": record.get("n_doc_origen", ""),
                    "fecha_doc": record.get("fecha_doc"),
                    "procedencia": record.get("procedencia", ""),
                    "asunto": record.get("asunto", ""),
                    "contenido": record.get("contenido", ""),
                    "fuente": record.get("fuente", ""),
                    "creado_por": record.get("creado_por", ""),
                    "estado": record.get("estado", "REGISTRADO"),
                }).execute()
                count += 1
            except Exception as e:
                pass
        results["documentos"] = count

    # Movimientos
    rows = await get_range("MOVIMIENTOS")
    if rows and len(rows) > 1:
        headers = rows[0]
        count = 0
        for row in rows[1:]:
            try:
                record = {}
                for i, h in enumerate(headers):
                    if i < len(row):
                        record[h.lower()] = row[i]
                sb.table("movimientos").upsert({
                    "id": record.get("id", ""),
                    "documento_id": record.get("documento_id", ""),
                    "tipo_mov": record.get("tipo_mov", ""),
                    "numero": record.get("numero", ""),
                    "contenido": record.get("contenido", ""),
                    "area_destino": record.get("area_destino", ""),
                    "creado_por": record.get("creado_por", ""),
                    "n_doc_ref": record.get("n_doc_ref", ""),
                }).execute()
                count += 1
            except Exception as e:
                pass
        results["movimientos"] = count

    # Derivaciones
    rows = await get_range("DERIVACIONES")
    if rows and len(rows) > 1:
        headers = rows[0]
        count = 0
        for row in rows[1:]:
            try:
                record = {}
                for i, h in enumerate(headers):
                    if i < len(row):
                        record[h.lower()] = row[i]
                sb.table("derivaciones").upsert({
                    "id": record.get("id", ""),
                    "documento_id": record.get("documento_id", ""),
                    "movimiento_id": record.get("movimiento_id"),
                    "area_destino": record.get("area_destino", ""),
                    "recibido_por": record.get("recibido_por"),
                    "fecha_recepcion": record.get("fecha_recepcion"),
                    "devuelto_por": record.get("devuelto_por"),
                    "fecha_devolucion": record.get("fecha_devolucion"),
                    "estado": record.get("estado", "PENDIENTE"),
                }).execute()
                count += 1
            except Exception as e:
                pass
        results["derivaciones"] = count

    # Historial
    rows = await get_range("HISTORIAL")
    if rows and len(rows) > 1:
        headers = rows[0]
        count = 0
        for row in rows[1:]:
            try:
                record = {}
                for i, h in enumerate(headers):
                    if i < len(row):
                        record[h.lower()] = row[i]
                sb.table("historial").upsert({
                    "documento_id": record.get("documento_id", ""),
                    "movimiento_id": record.get("movimiento_id"),
                    "accion": record.get("accion", ""),
                    "detalles": record.get("detalles", ""),
                    "realizado_por": record.get("realizado_por", ""),
                }).execute()
                count += 1
            except Exception as e:
                pass
        results["historial"] = count

    return results


# ============================================
# Helpers
# ============================================
def _safe_int(val, default=None):
    if val is None or val == "":
        return default
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=None):
    if val is None or val == "":
        return default
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return default


def _safe_json(val, default=None):
    if val is None or val == "":
        return default or []
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(str(val))
    except (json.JSONDecodeError, TypeError):
        return default or []


def _safe_datetime(val):
    if val is None or val == "":
        return None
    try:
        return str(val)
    except Exception:
        return None


# ============================================
# Run all migrations
# ============================================
async def run_full_migration():
    """Ejecuta todas las migraciones."""
    results = {}

    logger.info("Migrando Areas...")
    results["areas"] = await migrate_areas()

    logger.info("Migrando Usuarios...")
    results["usuarios"] = await migrate_usuarios()

    logger.info("Migrando Personal...")
    results["personal"] = await migrate_personal()

    logger.info("Migrando Turnos...")
    results["turnos"] = await migrate_turnos()

    logger.info("Migrando Estados...")
    results["estados"] = await migrate_estados()

    logger.info("Migrando Solicitudes...")
    results["solicitudes"] = await migrate_solicitudes()

    logger.info("Migrando Descansos...")
    results["descansos"] = await migrate_descansos()

    logger.info("Migrando Vacaciones...")
    results["vacaciones"] = await migrate_vacaciones()

    logger.info("Migrando Mesa de Partes...")
    results["mesa_de_partes"] = await migrate_mesa_de_partes()

    # Hojas mensuales (enero a diciembre del anio actual)
    anio = datetime.now().year
    for mes in range(1, 13):
        logger.info(f"Migrando hoja mes {mes}/{anio}...")
        results[f"hoja_{mes}_{anio}"] = await migrate_hojas_mensuales(mes, anio)

    return results
