from pydantic import BaseModel, Field
from typing import Optional


class NivelJerarquico(BaseModel):
    nivel: int = Field(..., ge=1, le=3)  # 1=area, 2=departamento, 3=division
    area: Optional[str] = None
    departamento: Optional[str] = None
    division: Optional[str] = None
    jefe_user_id: int
    jefe_nombre: Optional[str] = ""
    es_directo: bool = True


class EstructuraJerarquica(BaseModel):
    user_id: int
    niveles: list[NivelJerarquico]


class EstructuraJerarquicaResponse(BaseModel):
    user_id: int
    cadena: list[NivelJerarquico]


class CadenaAprobacion:
    """Helper class for approval chain logic."""

    @staticmethod
    def get_estado_inicial(primer_nivel: int) -> str:
        """Determine initial state based on first hierarchy level."""
        from app.utils.constants import ESTADO_INICIAL_POR_NIVEL
        return ESTADO_INICIAL_POR_NIVEL.get(primer_nivel, "ENVIADA")

    @staticmethod
    def get_siguiente_estado(estado_actual: str, cadena: list, nivel_actual: int) -> str:
        """Determine next state in the approval chain."""
        from app.utils.constants import TRANSICIONES_ESTADO

        siguiente_nivel = nivel_actual + 1
        tiene_siguiente = any(nivel.nivel == siguiente_nivel for nivel in cadena)

        if tiene_siguiente:
            return TRANSICIONES_ESTADO.get(estado_actual, "APROBADA")
        else:
            return "APROBADA"

    @staticmethod
    def get_siguiente_nivel(nivel_actual: int, cadena: list) -> int:
        """Get the next level in the chain."""
        niveles_disponibles = sorted([n.nivel for n in cadena])
        for nivel in niveles_disponibles:
            if nivel > nivel_actual:
                return nivel
        return nivel_actual  # Already at the highest

    @staticmethod
    def nivel_coincide_con_estado(nivel: int, estado: str) -> bool:
        """Check if a level corresponds to an approval state."""
        from app.utils.constants import ESTADO_POR_NIVEL
        return estado in ESTADO_POR_NIVEL.get(nivel, [])
