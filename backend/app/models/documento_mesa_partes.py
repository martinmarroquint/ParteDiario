from pydantic import BaseModel, Field
from typing import Optional


class DocumentoCreate(BaseModel):
    """Etapa 1: Recepción - Solo Trámite Documentario puede crear"""
    fecha: str = Field(..., description="Fecha de recepción YYYY-MM-DD")
    tipo_doc: str = Field(..., min_length=1, max_length=100)
    n_doc_origen: Optional[str] = Field("", max_length=50)
    fecha_doc: Optional[str] = Field("")
    procedencia: Optional[str] = Field("", max_length=200)
    contenido: str = Field(..., min_length=1, max_length=2000)


class DocumentoUpdate(BaseModel):
    """Editar Etapa 1 - Solo Trámite Documentario"""
    fecha: Optional[str] = None
    tipo_doc: Optional[str] = None
    n_doc_origen: Optional[str] = None
    fecha_doc: Optional[str] = None
    procedencia: Optional[str] = None
    contenido: Optional[str] = None


class DocumentoEntregar(BaseModel):
    """Etapa 2: Derivación - Solo Trámite Documentario puede entregar
    PENDIENTE → ENTREGADO, asigna AREA ENTREGADA
    """
    doc_tramite: Optional[str] = Field("", max_length=100)
    n_doc_tramitado: Optional[str] = Field("", max_length=50)
    area_entregada: str = Field(..., min_length=1, max_length=200)


class DocumentoDescargar(BaseModel):
    """Etapa 3: Resolución - Solo Jefe de Área puede descargar
    ENTREGADO → RESUELTO
    """
    descargo: str = Field(..., min_length=1, max_length=2000)
    n_descargo: Optional[str] = Field("", max_length=50)


class DocumentoMesaPartes(BaseModel):
    """Documento completo - 14 columnas del sheet DOCUMENTOS"""
    id: int                              # Sheet row number (2-indexed)
    numero: str = ""                     # A - N°
    fecha: str = ""                      # B - FECHA
    tipo_doc: str = ""                   # C - TIPO DOC
    n_doc_origen: str = ""               # D - N° DOC ORIGEN
    fecha_doc: str = ""                  # E - FECHA DOC
    procedencia: str = ""                # F - PROCEDENCIA
    contenido: str = ""                  # G - CONTENIDO
    estado: str = "PENDIENTE"            # H - ESTADO
    doc_tramite: str = ""                # I - DOC TRAMITE
    n_doc_tramitado: str = ""            # J - N° DOC TRAMITADO
    area_entregada: str = ""             # K - AREA ENTREGADA
    descargo: str = ""                   # L - DESCARGO
    n_descargo: str = ""                 # M - N° DESCARGO
    ht: str = ""                         # N - HT


class DocumentoResponse(BaseModel):
    documento: DocumentoMesaPartes


class DocumentoListResponse(BaseModel):
    documentos: list[DocumentoMesaPartes]
    total: int


class OpcionesMesaPartes(BaseModel):
    tipos_doc: list[str] = []
    areas: list[str] = []
    docs_tramite: list[str] = []
