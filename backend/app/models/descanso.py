from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DescansoMedicoCreate(BaseModel):
    usuario_id: int
    fecha_inicio: str  # YYYY-MM-DD
    fecha_fin: str  # YYYY-MM-DD
    codigo_cie10: str = Field(..., min_length=3, max_length=10)
    diagnostico: str = Field(..., min_length=5, max_length=500)
    medico_tratante: str = Field(..., min_length=3, max_length=150)
    registro: str = Field(..., min_length=3, max_length=50)


class DescansoMedico(BaseModel):
    id: str
    usuario_id: int
    usuario_nombre: str
    fecha_inicio: str
    fecha_fin: str
    codigo_cie10: str
    diagnostico: str
    medico_tratante: str
    registro: str
    registrado_por: int
    registrado_por_nombre: Optional[str] = ""
    fecha_registro: str


class DescansoMedicoResponse(BaseModel):
    descanso: DescansoMedico


class DescansoMedicoListResponse(BaseModel):
    descansos: list[DescansoMedico]
    total: int
