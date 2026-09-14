from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.auth import (
    LoginRequest, LoginResponse, ChangePasswordRequest,
    ForgotPasswordRequest, ResetPasswordRequest, MessageResponse,
    RefreshTokenRequest
)
from app.services.auth_service import AuthService
from app.services.sheets_service import GoogleSheetsService
from app.middleware.auth import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Autenticación"])
limiter = Limiter(key_func=get_remote_address)

sheets_service = GoogleSheetsService()
auth_service = AuthService(sheets_service)


class AdminKeyRequest(BaseModel):
    clave: str


class AdminKeyResponse(BaseModel):
    valido: bool


@router.post("/validate-admin-key", response_model=AdminKeyResponse)
@limiter.limit("10/minute")
async def validate_admin_key(request: Request, data: AdminKeyRequest):
    """Validate admin access key — server-side only.
    
    The frontend calls this instead of comparing CLAVE_SECRETA client-side.
    The key is never exposed in the JS bundle.
    """
    is_valid = data.clave == settings.CLAVE_SECRETA and bool(settings.CLAVE_SECRETA)
    return AdminKeyResponse(valido=is_valid)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest):
    """Authenticate user and return JWT token."""
    result = await auth_service.login(data.usuario, data.password)
    return LoginResponse(**result)


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """Logout (token will expire naturally)."""
    return MessageResponse(message="Sesion cerrada correctamente")


@router.post("/logout-public")
async def logout_public():
    """Public logout — clears frontend state without requiring a valid token."""
    return MessageResponse(message="Sesion cerrada correctamente")


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    data: RefreshTokenRequest,
    current_user: User = Depends(get_current_user)
):
    """Refresh JWT token."""
    result = await auth_service.refresh_token(data.token)
    return result


@router.post("/change-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user)
):
    """Change current user's password."""
    result = await auth_service.change_password(
        current_user.id, data.current_password, data.new_password
    )
    return MessageResponse(**result)


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """Request password reset (sends email in production)."""
    # In production, this would send an email
    return MessageResponse(message="Si el correo existe, se enviará un enlace de recuperación")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest):
    """Reset password with token — DESHABILITADO: pendiente implementación segura."""
    # SECURITY FIX: This endpoint was a stub that always returned success.
    # An attacker could probe it. Disabled until proper token-based reset is implemented.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Función no implementada. Use 'Cambiar Contraseña' desde su perfil."
    )
