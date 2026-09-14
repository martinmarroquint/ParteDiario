import logging
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.user import User
from app.services.user_service import UserService
from app.services.sheets_service import GoogleSheetsService
from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Singleton instances — shared across ALL routers (auth, roles, solicitudes, mesa_partes).
# Creating separate instances in each router module caused Google Sheets API connection
# pool exhaustion on Render free tier, leading to timeouts and 401 errors.
_sheets_service = GoogleSheetsService()
_user_service = UserService(_sheets_service)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Extract and validate the current user from JWT token."""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        logger.warning("Auth: JWT decode failed (token invalid or expired)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        logger.warning("Auth: JWT payload missing 'sub' claim")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    
    try:
        user = await _user_service.get_user_by_id(int(user_id))
    except Exception as e:
        logger.error(f"Auth: Failed to look up user_id={user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error al validar usuario",
        )
    
    if user is None:
        logger.warning(f"Auth: user_id={user_id} not found in USUARIOS_OCR")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o usuario no válido",
        )
    
    if not user.activo:
        logger.warning(f"Auth: user_id={user_id} is inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido o usuario no válido",
        )
    
    return user


def require_roles(allowed_roles: List[int]):
    """Dependency that checks if the user has one of the allowed roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if not any(role in current_user.roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes permisos. Roles requeridos: {allowed_roles}",
            )
        return current_user
    return role_checker


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin role. Demo role (6) has read-only admin access."""
    if 4 not in current_user.roles and 6 not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user


async def require_admin_write(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin role for WRITE operations. Demo role excluded."""
    if 4 not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador para escritura",
        )
    return current_user


async def require_jefe_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires jefe (area, depto, division) or admin role. Demo has read access."""
    jefe_roles = [1, 2, 3, 4, 6]
    if not any(role in current_user.roles for role in jefe_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de jefe o administrador",
        )
    return current_user


async def require_jefe_or_admin_write(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires jefe/admin for WRITE. Demo role excluded."""
    jefe_roles = [1, 2, 3, 4]
    if not any(role in current_user.roles for role in jefe_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de jefe o administrador para escritura",
        )
    return current_user
