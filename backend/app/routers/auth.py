from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
import time
import threading

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


# ============================================
# ACTIVE USERS TRACKING (in-memory heartbeat)
# ============================================
_active_users: dict[int, dict] = {}
_active_lock = threading.Lock()

def _cleanup_stale_users():
    """Remove users with heartbeat older than 90 seconds."""
    now = time.time()
    stale = [uid for uid, info in _active_users.items() if now - info["last_seen"] > 90]
    for uid in stale:
        del _active_users[uid]


class AdminKeyRequest(BaseModel):
    clave: str


class AdminKeyResponse(BaseModel):
    valido: bool


class HeartbeatRequest(BaseModel):
    area: str = ""
    hoja: str = ""
    vista: str = ""  # e.g. "rol", "consulta", "admin"


# Colores para indicadores de usuario (estilo Google Sheets)
_COLORS_PALETTE = [
    "#1a73e8", "#e8710a", "#0d652d", "#c5221f", "#9334e6",
    "#185abc", "#b06000", "#137333", "#a50e0e", "#7627bb",
    "#e37400", "#188038", "#d93025", "#7b1fa2", "#0277bd",
    "#388e3c", "#f57c00", "#d32f2f", "#512da8", "#0097a7",
]


def _user_color(user_id: int) -> str:
    return _COLORS_PALETTE[user_id % len(_COLORS_PALETTE)]


class ActiveUserInfo(BaseModel):
    user_id: int
    usuario: str
    nombre: str
    area: str
    hoja: str
    vista: str
    color: str
    rol: int
    last_seen: float
    seconds_ago: int


class ActiveUsersResponse(BaseModel):
    users: list[ActiveUserInfo]
    total: int


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
@limiter.limit("60/minute")
async def login(request: Request, data: LoginRequest):
    """Authenticate user and return JWT token.

    NOTE: 60/min por IP porque el hospital comparte una unica IP publica;
    al arrancar en frio (Render free) los usuarios reintentan varias veces en
    poco tiempo y 10/min provocaba bloqueos 429 falsos.
    """
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


# ============================================
# HEARTBEAT — usuarios avisan que siguen vivos
# ============================================
@router.post("/heartbeat")
async def send_heartbeat(
    data: HeartbeatRequest,
    current_user: User = Depends(get_current_user),
):
    """Send heartbeat to indicate user is active.
    
    Frontend calls this every 30 seconds.
    Backend stores timestamp; admin can query active users.
    """
    with _active_lock:
        _cleanup_stale_users()
        _active_users[current_user.id] = {
            "user_id": current_user.id,
            "usuario": current_user.usuario,
            "nombre": current_user.nombre,
            "area": data.area,
            "hoja": data.hoja,
            "vista": data.vista,
            "color": _user_color(current_user.id),
            "rol": max(current_user.roles) if current_user.roles else 0,
            "last_seen": time.time(),
        }
    return {"ok": True, "color": _user_color(current_user.id)}


# ============================================
# ACTIVE USERS — admin ve quien esta conectado
# ============================================
@router.get("/active-users", response_model=ActiveUsersResponse)
async def get_active_users(current_user: User = Depends(get_current_user)):
    """Get list of currently active users (heartbeat < 90s).

    SECURITY: Solo administradores (rol 4) pueden ver quienes estan
    conectados. Los demas roles no necesitan esta informacion.
    """
    if 4 not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver usuarios activos")
    with _active_lock:
        _cleanup_stale_users()
        now = time.time()
        users = []
        for info in _active_users.values():
            users.append(ActiveUserInfo(
                user_id=info["user_id"],
                usuario=info["usuario"],
                nombre=info["nombre"],
                area=info["area"],
                hoja=info["hoja"],
                vista=info.get("vista", ""),
                color=info.get("color", "#666"),
                rol=info["rol"],
                last_seen=info["last_seen"],
                seconds_ago=int(now - info["last_seen"]),
            ))
    
    users.sort(key=lambda u: u.seconds_ago)
    return ActiveUsersResponse(users=users, total=len(users))
