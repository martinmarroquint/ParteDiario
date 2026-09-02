from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class SolicitudCreate(BaseModel):
    persona_turno: str = Field(..., min_length=2, max_length=100)
    dia: int = Field(..., ge=1, le=31)
    turno_actual: str = Field(..., min_length=1, max_length=3)
    turno_nuevo: str = Field(..., min_length=1, max_length=3)
    persona_suplente: str = Field(..., min_length=2, max_length=100)
    motivo: str = Field(..., min_length=5, max_length=500)
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020)
    area: str


class Solicitud(BaseModel):
    id: str
    solicitante_id: int
    solicitante_nombre: str
    fecha_solicitud: str
    estado: str
    nivel_actual: int
    area_solicitante: str
    persona_turno: str
    dia: int
    turno_actual: str
    turno_nuevo: str
    persona_suplente: str
    motivo: str
    mes: int
    anio: int
    aprobaciones: list[dict] = []
    observaciones: str = ""
    actualizado_en: Optional[str] = None


class SolicitudApprove(BaseModel):
    observaciones: Optional[str] = ""


class SolicitudReject(BaseModel):
    motivo_rechazo: str = Field(..., min_length=3, max_length=500)


class SolicitudResponse(BaseModel):
    solicitud: Solicitud


class SolicitudListResponse(BaseModel):
    solicitudes: list[Solicitud]
    total: int
