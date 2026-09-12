from pydantic import BaseModel, Field
from typing import Optional


class ParticipanteCambio(BaseModel):
    dia: int = Field(..., ge=1, le=31)
    turno_actual: str = Field(..., min_length=1, max_length=5)
    turno_nuevo: str = Field(..., min_length=1, max_length=5)


class Participante(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    dni: str = Field("", max_length=20)
    area: str = Field("", max_length=100)
    fila: int = Field(0, ge=0)
    cambios: list[ParticipanteCambio] = []


class SolicitudCreate(BaseModel):
    tipo_cambio: str = Field(..., min_length=2, max_length=50)
    participantes: list[Participante] = Field(..., min_length=1, max_length=2)
    motivo: str = Field(..., min_length=10, max_length=500)
    pormenores: str = Field("", max_length=500)
    hoja: str = Field(..., min_length=3, max_length=50)
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020)


class Solicitud(BaseModel):
    id: str
    solicitante_id: int
    solicitante_nombre: str
    solicitante_grado: str = ""
    fecha_solicitud: str
    estado: str
    nivel_actual: int
    area_solicitante: str
    tipo_cambio: str
    participantes: list[Participante] = []
    motivo: str
    pormenores: str = ""
    hoja: str
    mes: int
    anio: int
    cadena: list[dict] = []
    historial: list[dict] = []
    creado_en: str = ""
    actualizado_en: str = ""


class SolicitudApprove(BaseModel):
    observaciones: Optional[str] = ""


class SolicitudReject(BaseModel):
    motivo_rechazo: str = Field(..., min_length=3, max_length=500)


class SolicitudCancel(BaseModel):
    motivo: Optional[str] = ""


class SolicitudResponse(BaseModel):
    solicitud: Solicitud


class SolicitudListResponse(BaseModel):
    solicitudes: list[Solicitud]
    total: int


class SolicitudStats(BaseModel):
    total_solicitudes: int
    pendientes: int
    aprobadas: int
    desaprobadas: int
    canceladas: int
