from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RoleCelda(BaseModel):
    persona: str
    dia: int = Field(..., ge=1, le=31)
    turno: str


class RolePersona(BaseModel):
    persona: str
    grado: str
    turnos: dict[int, str]  # dia -> turno


class RolServicio(BaseModel):
    id: Optional[int] = None
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020)
    area: str
    personas: list[RolePersona] = []
    finalizado: bool = False
    creado_por: Optional[int] = None
    creado_en: Optional[str] = None


class RolServicioResponse(BaseModel):
    mes: int
    anio: int
    area: str
    personas: list[RolePersona]
    finalizado: bool


class RolSyncRequest(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020)
    area: str
    datos: list[RolePersona]


class RolFinalizarRequest(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020)
    area: str


class RolCeldaRequest(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020)
    area: str
    persona: str
    dia: int = Field(..., ge=1, le=31)
    turno: str
