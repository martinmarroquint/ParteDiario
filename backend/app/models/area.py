from pydantic import BaseModel, Field
from typing import Optional


class Area(BaseModel):
    id: int
    nombre: str
    codigo: str
    departamento: str
    division: str
    bloqueado: bool = False
    mes_bloqueado: Optional[int] = None
    anio_bloqueado: Optional[int] = None


class AreaLockRequest(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    anio: int = Field(..., ge=2020)


class AreaListResponse(BaseModel):
    areas: list[Area]
    total: int
