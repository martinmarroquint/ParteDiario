from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class VacacionCreate(BaseModel):
    usuario_id: int
    fecha_inicio: str  # YYYY-MM-DD
    fecha_fin: str  # YYYY-MM-DD
    tipo: str = Field(..., pattern=r"^(V|PCV)$")


class Vacacion(BaseModel):
    id: str
    usuario_id: int
    usuario_nombre: str
    fecha_inicio: str
    fecha_fin: str
    tipo: str
    registrado_por: int
    registrado_por_nombre: Optional[str] = ""
    fecha_registro: str


class VacacionResponse(BaseModel):
    vacacion: Vacacion


class VacacionListResponse(BaseModel):
    vacaciones: list[Vacacion]
    total: int
