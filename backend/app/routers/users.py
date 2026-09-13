from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.models.user import User, UserCreate, UserUpdate, UserListResponse
from app.models.auth import TempPasswordResponse, MessageResponse
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Usuarios"])

sheets_service = GoogleSheetsService()
user_service = UserService(sheets_service)
auth_service = AuthService(sheets_service)


# ============================================
# MODELS FOR PERSONAL (employee directory)
# ============================================

class PersonalItem(BaseModel):
    id: str
    fila: int
    dni: str
    grado: str
    nombre: str
    area: str
    es_medico: bool


class PersonalListResponse(BaseModel):
    personal: List[PersonalItem]
    total: int


# ============================================
# PERSONAL ENDPOINT (employee directory from OCR sheet)
# ============================================

@router.get("/personal", response_model=PersonalListResponse)
async def get_personal(
    current_user: User = Depends(require_admin)
):
    """Get employee directory from OCR sheet (admin only).
    
    This replaces direct Google Sheets API calls from the frontend,
    keeping the API key server-side only.
    """
    rows = await sheets_service.get_range("OCR")
    personal = []
    for idx, row in enumerate(rows[1:] if len(rows) > 0 else []):  # Skip header
        if len(row) >= 4:
            personal.append(PersonalItem(
                id=f"p-{idx + 1}",
                fila=idx + 2,
                dni=(row[0] if len(row) > 0 else '').strip(),
                grado=(row[1] if len(row) > 1 else '').strip(),
                nombre=(row[2] if len(row) > 2 else '').strip(),
                area=(row[3] if len(row) > 3 else '').strip(),
                es_medico=(row[4] if len(row) > 4 else '').strip().upper() == 'TRUE'
            ))
    return PersonalListResponse(personal=personal, total=len(personal))


@router.get("", response_model=UserListResponse)
async def get_users(
    activo: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(require_admin)
):
    """Get all users (admin only)."""
    users = await user_service.get_all_users(activo=activo)
    # Remove sensitive fields from response
    for user in users:
        user.__dict__.pop('password', None)
        user.__dict__.pop('salt', None)
    return UserListResponse(users=users, total=len(users))


@router.get("/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile."""
    user_dict = current_user.__dict__.copy()
    user_dict.pop('password', None)
    user_dict.pop('salt', None)
    return User(**user_dict)


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_admin)
):
    """Get user by ID (admin only)."""
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user_dict = user.__dict__.copy()
    user_dict.pop('password', None)
    user_dict.pop('salt', None)
    return User(**user_dict)


@router.post("", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_admin)
):
    """Create a new user (admin only)."""
    try:
        user = await user_service.create_user(data)
        user_dict = user.__dict__.copy()
        user_dict.pop('password', None)
        user_dict.pop('salt', None)
        return User(**user_dict)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Error de sheets creando usuario: {e}")
        raise HTTPException(status_code=502, detail="Error al guardar en el servidor. Intente nuevamente.")
    except Exception as e:
        logger.error(f"Error inesperado creando usuario: {type(e).__name__}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_admin)
):
    """Update a user (admin only)."""
    try:
        user = await user_service.update_user(user_id, data)
        user_dict = user.__dict__.copy()
        user_dict.pop('password', None)
        user_dict.pop('salt', None)
        return User(**user_dict)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Error de sheets actualizando usuario: {e}")
        raise HTTPException(status_code=502, detail="Error al guardar en el servidor. Intente nuevamente.")
    except Exception as e:
        logger.error(f"Error inesperado actualizando usuario {user_id}: {type(e).__name__}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin)
):
    """Deactivate a user (admin only)."""
    result = await user_service.delete_user(user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return MessageResponse(message="Usuario desactivado correctamente")


@router.patch("/{user_id}/toggle")
async def toggle_user(
    user_id: int,
    current_user: User = Depends(require_admin)
):
    """Toggle user active status (admin only)."""
    result = await user_service.toggle_user_active(user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"user_id": user_id, "activo": result}


@router.post("/{user_id}/reset-password", response_model=TempPasswordResponse)
async def reset_user_password(
    user_id: int,
    current_user: User = Depends(require_admin)
):
    """Reset user password (admin only)."""
    try:
        result = await auth_service.reset_password_admin(user_id)
        return TempPasswordResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
