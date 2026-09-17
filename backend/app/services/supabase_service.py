"""
Servicio Supabase: reemplaza sheets_service.py
Todas las lecturas/escrituras van directo a PostgreSQL.
"""
import json
import logging
from datetime import datetime
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)

_supabase = None


def _get_sb():
    """Lazy init del cliente Supabase."""
    global _supabase
    if _supabase is None:
        from supabase import create_client
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase


# ============================================
# AREAS
# ============================================
async def get_areas() -> list[dict]:
    sb = _get_sb()
    resp = sb.table("areas").select("*").eq("eliminado", False).execute()
    return resp.data


async def get_area_by_codigo(codigo: str) -> Optional[dict]:
    sb = _get_sb()
    resp = sb.table("areas").select("*").eq("codigo", codigo).eq("eliminado", False).execute()
    return resp.data[0] if resp.data else None


async def lock_area(codigo: str, mes: int, anio: int):
    sb = _get_sb()
    sb.table("areas").update({
        "bloqueado": True,
        "mes_bloqueado": mes,
        "anio_bloqueado": anio,
    }).eq("codigo", codigo).execute()


async def unlock_area(codigo: str):
    sb = _get_sb()
    sb.table("areas").update({
        "bloqueado": False,
        "mes_bloqueado": None,
        "anio_bloqueado": None,
    }).eq("codigo", codigo).execute()


# ============================================
# USUARIOS
# ============================================
async def get_user_by_usuario(usuario: str) -> Optional[dict]:
    sb = _get_sb()
    resp = sb.table("usuarios").select("*").eq("usuario", usuario).execute()
    return resp.data[0] if resp.data else None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    sb = _get_sb()
    resp = sb.table("usuarios").select("*").eq("id_usuario", user_id).execute()
    return resp.data[0] if resp.data else None


async def get_all_users() -> list[dict]:
    sb = _get_sb()
    resp = sb.table("usuarios").select("*").execute()
    return resp.data


async def create_user(data: dict) -> dict:
    sb = _get_sb()
    resp = sb.table("usuarios").insert(data).execute()
    return resp.data[0]


async def update_user(user_id: str, data: dict):
    sb = _get_sb()
    sb.table("usuarios").update(data).eq("id_usuario", user_id).execute()


async def update_user_field(user_id: str, field: str, value: Any):
    sb = _get_sb()
    sb.table("usuarios").update({field: value}).eq("id_usuario", user_id).execute()


# ============================================
# PERSONAL
# ============================================
async def get_personal() -> list[dict]:
    sb = _get_sb()
    resp = sb.table("personal").select("*").execute()
    return resp.data


# ============================================
# TURNOS
# ============================================
async def get_turnos() -> list[dict]:
    sb = _get_sb()
    resp = sb.table("turnos").select("*").execute()
    return resp.data


# ============================================
# HOJAS MENSLUES (roles de turno)
# ============================================
async def get_hojas_mensuales(mes: int, anio: int, area: str = None) -> list[dict]:
    sb = _get_sb()
    query = sb.table("hojas_mensuales").select("*").eq("mes", mes).eq("anio", anio)
    if area:
        query = query.eq("area", area)
    resp = query.execute()
    return resp.data


async def get_hoja_by_dni(mes: int, anio: int, dni: str) -> Optional[dict]:
    sb = _get_sb()
    resp = sb.table("hojas_mensuales").select("*").eq("mes", mes).eq("anio", anio).eq("persona_dni", dni).execute()
    return resp.data[0] if resp.data else None


async def save_hoja_mensual(data: dict):
    """Inserta o actualiza una fila de rol."""
    sb = _get_sb()
    sb.table("hojas_mensuales").upsert(data, on_conflict="mes,anio,persona_dni").execute()


async def save_hojas_batch(rows: list[dict]):
    """Inserta/actualiza multiples filas de rol."""
    sb = _get_sb()
    if rows:
        sb.table("hojas_mensuales").upsert(rows, on_conflict="mes,anio,persona_dni").execute()


async def update_celda(mes: int, anio: int, dni: str, dia: int, valor: str):
    """Actualiza un dia especifico para una persona."""
    sb = _get_sb()
    # Primero obtener la fila actual
    resp = sb.table("hojas_mensuales").select("dias").eq("mes", mes).eq("anio", anio).eq("persona_dni", dni).execute()
    if resp.data:
        dias = resp.data[0].get("dias", {})
        dias[str(dia)] = valor
        sb.table("hojas_mensuales").update({"dias": dias}).eq("mes", mes).eq("anio", anio).eq("persona_dni", dni).execute()


async def finalizar_hoja(mes: int, anio: int, area: str, usuario_id: str):
    sb = _get_sb()
    sb.table("hojas_mensuales").update({
        "finalizado": True,
        "finalizado_por": usuario_id,
        "finalizado_en": datetime.now().isoformat(),
    }).eq("mes", mes).eq("anio", anio).eq("area", area).execute()


async def desfinalizar_hoja(mes: int, anio: int, area: str):
    sb = _get_sb()
    sb.table("hojas_mensuales").update({
        "finalizado": False,
        "finalizado_por": None,
        "finalizado_en": None,
    }).eq("mes", mes).eq("anio", anio).eq("area", area).execute()


# ============================================
# CELDA MODIFICADA
# ============================================
async def get_celdas_modificadas(hoja: str) -> list[dict]:
    sb = _get_sb()
    resp = sb.table("celda_modificada").select("*").eq("hoja", hoja).execute()
    return resp.data


async def registrar_celda_modificada(data: dict):
    sb = _get_sb()
    sb.table("celda_modificada").insert(data).execute()


async def limpiar_celdas_modificadas(hoja: str):
    sb = _get_sb()
    sb.table("celda_modificada").delete().eq("hoja", hoja).execute()


# ============================================
# CAMBIOS (audit log)
# ============================================
async def get_cambios(hoja: str = None, limit: int = 100) -> list[dict]:
    sb = _get_sb()
    query = sb.table("cambios").select("*").order("fecha", desc=True).limit(limit)
    if hoja:
        query = query.eq("area", hoja)
    resp = query.execute()
    return resp.data


async def registrar_cambio(data: dict):
    sb = _get_sb()
    sb.table("cambios").insert(data).execute()


# ============================================
# ESTADOS
# ============================================
async def get_estado(mes: int, area: str) -> Optional[dict]:
    sb = _get_sb()
    resp = sb.table("estados").select("*").eq("mes", mes).eq("area", area).execute()
    return resp.data[0] if resp.data else None


async def marcar_finalizado(mes: int, area: str):
    sb = _get_sb()
    sb.table("estados").upsert({
        "mes": mes,
        "area": area,
        "estado": "FINALIZADO",
    }, on_conflict="mes,area").execute()


async def desmarcar_finalizado(mes: int, area: str):
    sb = _get_sb()
    sb.table("estados").upsert({
        "mes": mes,
        "area": area,
        "estado": "DISPONIBLE",
    }, on_conflict="mes,area").execute()


# ============================================
# SOLICITUDES
# ============================================
async def get_solicitud(solicitud_id: str) -> Optional[dict]:
    sb = _get_sb()
    resp = sb.table("solicitudes").select("*").eq("id", solicitud_id).execute()
    return resp.data[0] if resp.data else None


async def get_solicitudes_propias(solicitante_id: str) -> list[dict]:
    sb = _get_sb()
    resp = sb.table("solicitudes").select("*").eq("solicitante_id", solicitante_id).order("creado_en", desc=True).execute()
    return resp.data


async def get_bandeja(area: str = None, estado: str = None) -> list[dict]:
    sb = _get_sb()
    query = sb.table("solicitudes").select("*")
    if area:
        query = query.eq("area_solicitante", area)
    if estado:
        query = query.eq("estado", estado)
    resp = query.order("creado_en", desc=True).execute()
    return resp.data


async def crear_solicitud(data: dict):
    sb = _get_sb()
    sb.table("solicitudes").insert(data).execute()


async def update_solicitud(solicitud_id: str, data: dict):
    sb = _get_sb()
    sb.table("solicitudes").update(data).eq("id", solicitud_id).execute()


async def get_estadisticas() -> dict:
    sb = _get_sb()
    all_s = sb.table("solicitudes").select("estado").execute()
    total = len(all_s.data)
    pendientes = sum(1 for s in all_s.data if s["estado"] == "PENDIENTE")
    aprobadas = sum(1 for s in all_s.data if s["estado"] == "APROBADA")
    rechazadas = sum(1 for s in all_s.data if s["estado"] == "RECHAZADA")
    return {
        "total": total,
        "pendientes": pendientes,
        "aprobadas": aprobadas,
        "rechazadas": rechazadas,
    }


# ============================================
# DESCANSOS MEDICOS
# ============================================
async def get_descansos(usuario_id: str = None) -> list[dict]:
    sb = _get_sb()
    query = sb.table("descansos_medicos").select("*")
    if usuario_id:
        query = query.eq("usuario_id", usuario_id)
    resp = query.order("fecha_registro", desc=True).execute()
    return resp.data


async def registrar_descanso(data: dict):
    sb = _get_sb()
    sb.table("descansos_medicos").insert(data).execute()


async def eliminar_descanso(descanso_id: str):
    sb = _get_sb()
    sb.table("descansos_medicos").delete().eq("id", descanso_id).execute()


# ============================================
# VACACIONES
# ============================================
async def get_vacaciones(usuario_id: str = None) -> list[dict]:
    sb = _get_sb()
    query = sb.table("vacaciones").select("*")
    if usuario_id:
        query = query.eq("usuario_id", usuario_id)
    resp = query.order("fecha_registro", desc=True).execute()
    return resp.data


async def registrar_vacacion(data: dict):
    sb = _get_sb()
    sb.table("vacaciones").insert(data).execute()


async def eliminar_vacacion(vacacion_id: str):
    sb = _get_sb()
    sb.table("vacaciones").delete().eq("id", vacacion_id).execute()


# ============================================
# CONFIG
# ============================================
async def get_config(clave: str) -> Optional[str]:
    sb = _get_sb()
    resp = sb.table("config").select("valor").eq("clave", clave).execute()
    return resp.data[0]["valor"] if resp.data else None


async def set_config(clave: str, valor: str, usuario: str = None):
    sb = _get_sb()
    sb.table("config").upsert({
        "clave": clave,
        "valor": valor,
        "actualizado_por": usuario,
        "actualizado_en": datetime.now().isoformat(),
    }, on_conflict="clave").execute()


# ============================================
# MESA DE PARTES
# ============================================
async def get_documentos(estado: str = None, tipo_doc: str = None) -> list[dict]:
    sb = _get_sb()
    query = sb.table("documentos").select("*")
    if estado:
        query = query.eq("estado", estado)
    if tipo_doc:
        query = query.eq("tipo_doc", tipo_doc)
    resp = query.order("fecha_registro", desc=True).execute()
    return resp.data


async def get_documento(doc_id: str) -> Optional[dict]:
    sb = _get_sb()
    resp = sb.table("documentos").select("*").eq("id", doc_id).execute()
    return resp.data[0] if resp.data else None


async def crear_documento(data: dict) -> dict:
    sb = _get_sb()
    resp = sb.table("documentos").insert(data).execute()
    return resp.data[0]


async def update_documento(doc_id: str, data: dict):
    sb = _get_sb()
    sb.table("documentos").update(data).eq("id", doc_id).execute()


async def get_movimientos(documento_id: str) -> list[dict]:
    sb = _get_sb()
    resp = sb.table("movimientos").select("*").eq("documento_id", documento_id).order("fecha", desc=True).execute()
    return resp.data


async def crear_movimiento(data: dict) -> dict:
    sb = _get_sb()
    resp = sb.table("movimientos").insert(data).execute()
    return resp.data[0]


async def get_derivaciones(documento_id: str) -> list[dict]:
    sb = _get_sb()
    resp = sb.table("derivaciones").select("*").eq("documento_id", documento_id).execute()
    return resp.data


async def get_derivaciones_por_area(area: str, estado: str = None) -> list[dict]:
    sb = _get_sb()
    query = sb.table("derivaciones").select("*").eq("area_destino", area)
    if estado:
        query = query.eq("estado", estado)
    resp = query.execute()
    return resp.data


async def crear_derivacion(data: dict) -> dict:
    sb = _get_sb()
    resp = sb.table("derivaciones").insert(data).execute()
    return resp.data[0]


async def update_derivacion(deriv_id: str, data: dict):
    sb = _get_sb()
    sb.table("derivaciones").update(data).eq("id", deriv_id).execute()


async def get_historial(documento_id: str) -> list[dict]:
    sb = _get_sb()
    resp = sb.table("historial").select("*").eq("documento_id", documento_id).order("fecha", desc=True).execute()
    return resp.data


async def crear_historial(data: dict):
    sb = _get_sb()
    sb.table("historial").insert(data).execute()


async def get_opciones_mesa_partes() -> dict:
    sb = _get_sb()
    resp = sb.table("mesa_partes_bd").select("*").execute()
    tipos_doc = list(set(r["tipo_doc"] for r in resp.data if r.get("tipo_doc")))
    tipos_mov = list(set(r["tipo_mov"] for r in resp.data if r.get("tipo_mov")))
    areas = list(set(r["areas"] for r in resp.data if r.get("areas")))
    return {"tipos_doc": tipos_doc, "tipos_mov": tipos_mov, "areas": areas}
