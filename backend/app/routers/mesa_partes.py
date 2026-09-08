import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.models.documento_mesa_partes import (
    DocumentoMesaPartes, DocumentoCreate, DocumentoUpdate,
    DocumentoEntregar, DocumentoDescargar,
    DocumentoResponse, DocumentoListResponse, OpcionesMesaPartes
)
from app.services.mesa_partes_service import MesaPartesService
from app.middleware.auth import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mesa-partes", tags=["Mesa de Partes"])

mesa_partes_service = MesaPartesService()

# Role IDs
ROL_TRAMITE_DOCUMENTARIO = 5
ROL_ADMIN = 4


def _user_is_tramite(user: User) -> bool:
    """Check if user has Trámite Documentario role."""
    if hasattr(user, 'roles') and user.roles:
        return ROL_TRAMITE_DOCUMENTARIO in user.roles
    # Fallback: check numeric role
    if hasattr(user, 'rol') and isinstance(user.rol, int):
        return user.rol == ROL_TRAMITE_DOCUMENTARIO
    return False


def _user_is_admin(user: User) -> bool:
    """Check if user is admin."""
    if hasattr(user, 'roles') and user.roles:
        return ROL_ADMIN in user.roles
    if hasattr(user, 'rol') and isinstance(user.rol, int):
        return user.rol == ROL_ADMIN
    return False


def _user_is_jefe(user: User) -> bool:
    """Check if user is any jefe level (1, 2, or 3)."""
    if hasattr(user, 'roles') and user.roles:
        return any(r in user.roles for r in [1, 2, 3])
    if hasattr(user, 'rol') and isinstance(user.rol, int):
        return user.rol in [1, 2, 3]
    return False


def _get_user_areas(user: User) -> list[str]:
    """Get list of areas assigned to the user."""
    if hasattr(user, 'areas') and user.areas:
        return user.areas
    return []


@router.get("", response_model=DocumentoListResponse)
async def get_documentos(
    estado: Optional[str] = Query(None, description="PENDIENTE, ENTREGADO, RESUELTO"),
    busqueda: Optional[str] = Query(None),
    area: Optional[str] = Query(None, description="Filter by area_entregada"),
    current_user: User = Depends(get_current_user)
):
    """Get documents based on user role:
    
    - Trámite Documentario: sees ALL documents (they manage the flow)
    - Admin: sees ALL documents
    - Jefe (area/depto/division): sees documents delivered TO their areas
    - Usuario: sees documents delivered TO their areas (read-only)
    """
    user_areas = _get_user_areas(current_user)
    is_tramite = _user_is_tramite(current_user)
    is_admin = _user_is_admin(current_user)
    
    # Trámite Documentario and Admin see everything
    if is_tramite or is_admin:
        documentos = await mesa_partes_service.get_documentos(
            estado=estado, busqueda=busqueda, area=area
        )
    else:
        # Jefes and users: filter by their assigned areas
        if user_areas:
            # Get documents for each area the user manages
            all_docs = []
            for user_area in user_areas:
                docs = await mesa_partes_service.get_documentos(
                    estado=estado, busqueda=busqueda, area=user_area
                )
                all_docs.extend(docs)
            # Deduplicate by id
            seen = set()
            documentos = []
            for doc in all_docs:
                if doc["id"] not in seen:
                    seen.add(doc["id"])
                    documentos.append(doc)
        else:
            documentos = []
    
    return DocumentoListResponse(documentos=documentos, total=len(documentos))


@router.get("/opciones", response_model=OpcionesMesaPartes)
async def get_opciones(
    current_user: User = Depends(get_current_user)
):
    """Get dropdown options (tipos de doc, areas, docs trámite)."""
    opciones = await mesa_partes_service.get_opciones()
    return OpcionesMesaPartes(**opciones)


@router.get("/{doc_id}", response_model=DocumentoResponse)
async def get_documento(
    doc_id: int,
    current_user: User = Depends(get_current_user)
):
    """Get document by ID. Access control applied."""
    documento = await mesa_partes_service.get_documento(doc_id)
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Access control: jefes can only see documents delivered to their areas
    is_tramite = _user_is_tramite(current_user)
    is_admin = _user_is_admin(current_user)
    
    if not is_tramite and not is_admin:
        user_areas = _get_user_areas(current_user)
        if documento["area_entregada"] and documento["area_entregada"] not in user_areas:
            raise HTTPException(status_code=403, detail="No tiene acceso a este documento")
    
    return DocumentoResponse(documento=DocumentoMesaPartes(**documento))


@router.post("", response_model=DocumentoResponse, status_code=201)
async def registrar_documento(
    data: DocumentoCreate,
    current_user: User = Depends(get_current_user)
):
    """Register new document. ONLY Trámite Documentario can create."""
    if not _user_is_tramite(current_user) and not _user_is_admin(current_user):
        raise HTTPException(
            status_code=403, 
            detail="Solo Trámite Documentario puede registrar documentos"
        )
    
    result = await mesa_partes_service.registrar_documento(
        data.model_dump(),
        user_name=current_user.nombre
    )
    
    if result and result.get("error"):
        logger.warning(f"Apps Script error on registrar: {result['error']}")
        raise HTTPException(
            status_code=502,
            detail=f"Error al guardar en Apps Script: {result['error']}"
        )
    
    if result and not result.get("success", True):
        raise HTTPException(
            status_code=502,
            detail=f"Apps Script no confirmó el registro: {result}"
        )
    
    documento = DocumentoMesaPartes(
        id=result.get("fila", 0),
        numero=str(result.get("numero", "")),
        estado="PENDIENTE",
        fecha=data.fecha,
        tipo_doc=data.tipo_doc,
        n_doc_origen=data.n_doc_origen or "",
        fecha_doc=data.fecha_doc or "",
        procedencia=data.procedencia or "",
        contenido=data.contenido,
    )
    return DocumentoResponse(documento=documento)


@router.put("/{doc_id}", response_model=DocumentoResponse)
async def actualizar_documento(
    doc_id: int,
    data: DocumentoUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update Etapa 1 fields. ONLY Trámite Documentario can edit."""
    if not _user_is_tramite(current_user) and not _user_is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Solo Trámite Documentario puede editar documentos"
        )
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await mesa_partes_service.actualizar_documento(doc_id, update_data)
    if result and result.get("error"):
        logger.warning(f"Apps Script error on actualizar: {result['error']}")
        raise HTTPException(status_code=502, detail=f"Error al actualizar: {result['error']}")
    
    documento = await mesa_partes_service.get_documento(doc_id)
    if not documento:
        documento = {"id": doc_id, "estado": "PENDIENTE"}
    
    return DocumentoResponse(documento=DocumentoMesaPartes(**documento))


@router.put("/{doc_id}/entregar", response_model=DocumentoResponse)
async def entregar_documento(
    doc_id: int,
    data: DocumentoEntregar,
    current_user: User = Depends(get_current_user)
):
    """Deliver document (PENDIENTE → ENTREGADO). 
    ONLY Trámite Documentario can deliver.
    """
    if not _user_is_tramite(current_user) and not _user_is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Solo Trámite Documentario puede derivar documentos"
        )
    
    result = await mesa_partes_service.entregar_documento(doc_id, data.model_dump())
    if result and result.get("error"):
        logger.warning(f"Apps Script error on entregar: {result['error']}")
        raise HTTPException(status_code=502, detail=f"Error al entregar: {result['error']}")
    
    documento = await mesa_partes_service.get_documento(doc_id)
    if not documento:
        documento = {"id": doc_id, "estado": "ENTREGADO"}
    
    return DocumentoResponse(documento=DocumentoMesaPartes(**documento))


@router.put("/{doc_id}/descargar", response_model=DocumentoResponse)
async def descargar_documento(
    doc_id: int,
    data: DocumentoDescargar,
    current_user: User = Depends(get_current_user)
):
    """Resolve document (ENTREGADO → RESUELTO).
    Jefe of the assigned area or Admin can resolve.
    """
    is_admin = _user_is_admin(current_user)
    is_tramite = _user_is_tramite(current_user)
    
    if not is_admin and not is_tramite:
        # Check if user is jefe of the assigned area
        documento = await mesa_partes_service.get_documento(doc_id)
        if not documento:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        
        user_areas = _get_user_areas(current_user)
        if documento["area_entregada"] not in user_areas:
            raise HTTPException(
                status_code=403,
                detail="Solo el jefe del área asignada puede registrar el descargo"
            )
    
    result = await mesa_partes_service.descargar_documento(doc_id, data.model_dump())
    if result and result.get("error"):
        logger.warning(f"Apps Script error on descargar: {result['error']}")
        raise HTTPException(status_code=502, detail=f"Error al descargar: {result['error']}")
    
    documento = await mesa_partes_service.get_documento(doc_id)
    if not documento:
        documento = {"id": doc_id, "estado": "RESUELTO"}
    
    return DocumentoResponse(documento=DocumentoMesaPartes(**documento))


@router.delete("/{doc_id}")
async def eliminar_documento(
    doc_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete document. ONLY Admin."""
    if not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar documentos")
    
    result = await mesa_partes_service.eliminar_documento(doc_id)
    if result and result.get("error"):
        logger.warning(f"Apps Script warning on eliminar: {result['error']}")
    
    return {"message": "Documento eliminado correctamente"}
