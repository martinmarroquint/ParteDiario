from fastapi import APIRouter, Depends, HTTPException, status, Request
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

router = APIRouter(prefix="/auth", tags=["Autenticación"])
limiter = Limiter(key_func=get_remote_address)

sheets_service = GoogleSheetsService()
auth_service = AuthService(sheets_service)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest):
    """Authenticate user and return JWT token."""
    result = await auth_service.login(data.usuario, data.password)
    return LoginResponse(**result)


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """Logout (token will expire naturally)."""
    return MessageResponse(message="Sesión cerrada correctamente")


@router.post("/refresh")
async def refresh_token(
    data: RefreshTokenRequest,
    current_user: User = Depends(get_current_user)
):
    """Refresh JWT token."""
    result = await auth_service.refresh_token(data.token)
    return result


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
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
    """Reset password with token."""
    # In production, this would validate the reset token
    return MessageResponse(message="Contraseña actualizada correctamente")
