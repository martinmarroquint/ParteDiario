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


# ----------------------------------------------------------------------
# Registro de descanso medico sobre el ROL (personal de la hoja del mes).
# El personal del rol no son usuarios del sistema: se identifica por DNI y
# nombre, igual que en las solicitudes de cambio.
# ----------------------------------------------------------------------

class DescansoRolCreate(BaseModel):
    personal_dni: str = Field("", max_length=20)
    personal_nombre: str = Field(..., min_length=2, max_length=150)
    personal_grado: str = Field("", max_length=50)
    personal_area: str = Field("", max_length=100)
    medico_nombre: str = Field("", max_length=150)
    medico_especialidad: str = Field("", max_length=100)
    fecha_inicio: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    # Dia en que se REINCORPORA: no se marca como descanso.
    fecha_retorno: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    diagnostico: str = Field("", max_length=1000)
    observaciones: str = Field("", max_length=500)


class DescansoRolHoja(BaseModel):
    hoja: str
    fila: int
    dias: list[int]


class DescansoRolResponse(BaseModel):
    success: bool = True
    mensaje: str
    dias_marcados: int
    hojas: list[DescansoRolHoja] = []
    # Dias cuyo mes todavia no tiene pestana: hay que marcarlos cuando exista.
    dias_sin_hoja: list[str] = []
    advertencias: list[str] = []
