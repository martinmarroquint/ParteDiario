import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel, Field

from app.services.mesa_partes_service import MesaPartesService
from app.middleware.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mesa-partes", tags=["Mesa de Partes"])
mesa_partes_service = MesaPartesService()

# Role IDs
ROL_TRAMITE_DOCUMENTARIO = 5
ROL_ADMIN = 4


# ============================================
# MODELS
# ============================================

class RegistrarDoc(BaseModel):
    tipo_doc: str = Field(..., min_length=1)
    n_doc_origen: Optional[str] = ""
    fecha_doc: Optional[str] = ""
    procedencia: Optional[str] = ""
    asunto: Optional[str] = ""
    contenido: str = Field(..., min_length=1)
    fuente: Optional[str] = "fisico"

class DerivarDoc(BaseModel):
    documento_id: int
    areas: list[str] = Field(..., min_length=1)
    tipo_mov: Optional[str] = "PASE"
    contenido: Optional[str] = ""

class RecibirDoc(BaseModel):
    derivacion_id: int

class DevolverDoc(BaseModel):
    derivacion_id: int
    contenido: str = Field(..., min_length=1)
    n_descargo: Optional[str] = ""

class CerrarDoc(BaseModel):
    documento_id: int
    contenido: Optional[str] = ""
    estado_final: Optional[str] = "RESUELTO"


# ============================================
# HELPERS
# ============================================

def _user_is_tramite(user: User) -> bool:
    if hasattr(user, 'roles') and user.roles:
        return ROL_TRAMITE_DOCUMENTARIO in user.roles
    if hasattr(user, 'rol') and isinstance(user.rol, int):
        return user.rol == ROL_TRAMITE_DOCUMENTARIO
    return False

def _user_is_admin(user: User) -> bool:
    if hasattr(user, 'roles') and user.roles:
        return ROL_ADMIN in user.roles
    if hasattr(user, 'rol') and isinstance(user.rol, int):
        return user.rol == ROL_ADMIN
    return False

def _user_is_jefe(user: User) -> bool:
    """Jefe de área, departamento o división."""
    if hasattr(user, 'roles') and user.roles:
        return any(r in user.roles for r in [1, 2, 3])
    if hasattr(user, 'rol') and isinstance(user.rol, int):
        return user.rol in [1, 2, 3]
    return False

def _user_areas(user: User) -> list[str]:
    if hasattr(user, 'areas') and user.areas:
        return user.areas
    return []


# ============================================
# ENDPOINTS
# ============================================

@router.get("")
async def get_documentos(
    estado: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get documents. Trámite/Admin see all. Jefes see docs for their areas."""
    is_tramite = _user_is_tramite(current_user)
    is_admin = _user_is_admin(current_user)
    
    if is_tramite or is_admin:
        documentos = await mesa_partes_service.get_documentos(
            estado=estado, busqueda=busqueda, area=area
        )
    else:
        user_areas = _user_areas(current_user)
        if user_areas:
            documentos = []
            for ua in user_areas:
                docs = await mesa_partes_service.get_documentos(area=ua)
                documentos.extend(docs)
            # Deduplicate
            seen = set()
            unique = []
            for d in documentos:
                if d["id"] not in seen:
                    seen.add(d["id"])
                    unique.append(d)
            documentos = unique
        else:
            documentos = []
    
    return {"documentos": documentos, "total": len(documentos)}


@router.get("/bandeja")
async def get_bandeja(
    area: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user)
):
    """Get documents in bandeja (inbox) for a specific area."""
    documentos = await mesa_partes_service.get_bandeja(area)
    return {"documentos": documentos, "total": len(documentos)}


@router.get("/opciones")
async def get_opciones(current_user: User = Depends(get_current_user)):
    """Get dropdown options from BD sheet."""
    return await mesa_partes_service.get_opciones()


@router.get("/{doc_id}")
async def get_documento(doc_id: int, current_user: User = Depends(get_current_user)):
    """Get a single document with movements and derivations."""
    documento = await mesa_partes_service.get_documento(doc_id)
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return {"documento": documento}


@router.get("/{doc_id}/historial")
async def get_historial(doc_id: int, current_user: User = Depends(get_current_user)):
    """Get history for a document."""
    historial = await mesa_partes_service.get_historial(doc_id)
    return {"historial": historial}


@router.post("", status_code=201)
async def registrar_documento(
    data: RegistrarDoc,
    current_user: User = Depends(get_current_user)
):
    """Register a new document. Only Trámite/Admin."""
    if not _user_is_tramite(current_user) and not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo Trámite Documentario puede registrar")
    
    result = await mesa_partes_service.registrar(
        data.model_dump(),
        user_name=current_user.nombre
    )
    
    if result and result.get("error"):
        raise HTTPException(status_code=502, detail=f"Error: {result['error']}")
    
    return result


@router.post("/derivar")
async def derivar_documento(
    data: DerivarDoc,
    current_user: User = Depends(get_current_user)
):
    """Derive a document to one or more areas. Only Trámite/Admin."""
    if not _user_is_tramite(current_user) and not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo Trámite Documentario puede derivar")
    
    result = await mesa_partes_service.derivar(
        data.documento_id,
        data.areas,
        tipo_mov=data.tipo_mov,
        contenido=data.contenido,
        user_name=current_user.nombre
    )
    
    if result and result.get("error"):
        raise HTTPException(status_code=502, detail=f"Error: {result['error']}")
    
    return result


@router.post("/recibir")
async def recibir_documento(
    data: RecibirDoc,
    current_user: User = Depends(get_current_user)
):
    """Area confirms receipt. Jefes of the area can receive."""
    result = await mesa_partes_service.recibir(
        data.derivacion_id,
        user_name=current_user.nombre
    )
    
    if result and result.get("error"):
        raise HTTPException(status_code=502, detail=f"Error: {result['error']}")
    
    return result


@router.post("/devolver")
async def devolver_documento(
    data: DevolverDoc,
    current_user: User = Depends(get_current_user)
):
    """Area returns document with devolution document."""
    result = await mesa_partes_service.devolver(
        data.derivacion_id,
        data.model_dump(),
        user_name=current_user.nombre
    )
    
    if result and result.get("error"):
        raise HTTPException(status_code=502, detail=f"Error: {result['error']}")
    
    return result


@router.post("/cerrar")
async def cerrar_documento(
    data: CerrarDoc,
    current_user: User = Depends(get_current_user)
):
    """Mesa closes document with resolution. Only Trámite/Admin."""
    if not _user_is_tramite(current_user) and not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo Trámite Documentario puede cerrar")
    
    result = await mesa_partes_service.cerrar(
        data.documento_id,
        data.model_dump(),
        user_name=current_user.nombre
    )
    
    if result and result.get("error"):
        raise HTTPException(status_code=502, detail=f"Error: {result['error']}")
    
    return result


@router.delete("/{doc_id}")
async def eliminar_documento(doc_id: int, current_user: User = Depends(get_current_user)):
    """Delete document. Only Admin."""
    if not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar")
    
    result = await mesa_partes_service.eliminar(doc_id)
    if result and result.get("error"):
        logger.warning(f"Apps Script warning on eliminar: {result['error']}")
    
    return {"message": "Documento eliminado"}
