from datetime import datetime, timedelta
from typing import Optional
import logging

from app.services.sheets_service import GoogleSheetsService
from app.services.user_service import UserService
from app.utils.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_password_bcrypt,
    hash_password_sha256,
    verify_password,
    generate_temp_password,
    generate_salt,
)

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Account lockout settings
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 30


class AuthService:
    
    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
        self.user_service = UserService(sheets_service)
    
    async def login(self, usuario: str, password: str) -> dict:
        """Authenticate user and return JWT token."""
        user = await self.user_service.get_user_by_usuario(usuario)
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales invalidas"
            )
        
        if not user.activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario desactivado. Contacte al administrador."
            )
        
        # CHECK ACCOUNT LOCKOUT
        intentos_fallidos = int(getattr(user, 'intentos_fallidos', 0) or 0)
        bloqueado_hasta = getattr(user, 'bloqueado_hasta', '') or ''
        
        if bloqueado_hasta:
            try:
                lockout_time = datetime.fromisoformat(bloqueado_hasta.replace('Z', '+00:00'))
                if datetime.now(lockout_time.tzinfo) < lockout_time:
                    remaining = (lockout_time - datetime.now(lockout_time.tzinfo)).seconds // 60 + 1
                    raise HTTPException(
                        status_code=status.HTTP_423_LOCKED,
                        detail=f"Cuenta bloqueada por multiples intentos fallidos. Intente nuevamente en {remaining} minutos."
                    )
                else:
                    # Lockout expired — reset counters
                    await self.user_service.update_user_field(user.id, "intentos_fallidos", "0")
                    await self.user_service.update_user_field(user.id, "bloqueado_hasta", "")
                    intentos_fallidos = 0
            except (ValueError, TypeError):
                # Invalid date format — clear it
                await self.user_service.update_user_field(user.id, "bloqueado_hasta", "")
                intentos_fallidos = 0
        
        # Get the salt from the sheet (needed for SHA-256 format)
        salt = getattr(user, 'salt', '') or ''
        
        if not verify_password(password, user.password, salt):
            # INCREMENT FAILED ATTEMPTS
            intentos_fallidos += 1
            await self.user_service.update_user_field(user.id, "intentos_fallidos", str(intentos_fallidos))
            
            if intentos_fallidos >= MAX_FAILED_ATTEMPTS:
                lockout_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
                await self.user_service.update_user_field(user.id, "bloqueado_hasta", lockout_until.isoformat())
                logger.warning(f"Account locked for {user.usuario} after {MAX_FAILED_ATTEMPTS} failed attempts")
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Cuenta bloqueada por multiples intentos fallidos. Intente nuevamente en {LOCKOUT_MINUTES} minutos."
                )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales invalidas"
            )
        
        # SUCCESS — reset failed attempts
        if intentos_fallidos > 0:
            await self.user_service.update_user_field(user.id, "intentos_fallidos", "0")
            await self.user_service.update_user_field(user.id, "bloqueado_hasta", "")
        
        # TRANSPARENT MIGRATION: If password is SHA-256, re-hash with bcrypt
        # This migrates existing users without requiring a password reset
        if not user.password.startswith('$2'):
            try:
                new_bcrypt_hash = hash_password_bcrypt(password)
                await self.user_service.update_user_field(user.id, "password", new_bcrypt_hash)
                await self.user_service.update_user_field(user.id, "salt", "")
                logger.info(f"Password migrated to bcrypt for user {user.usuario}")
            except Exception as e:
                logger.warning(f"Failed to migrate password for {user.usuario}: {e}")
                # Don't fail login if migration fails — just log it
        
        # Determine primary role (highest role)
        rol_principal = max(user.roles) if user.roles else 0
        
        token_data = {
            "sub": str(user.id),
            "usuario": user.usuario,
            "rol_principal": rol_principal,
            "roles": user.roles,
            "areas": user.areas,
        }
        
        token = create_access_token(token_data)
        
        return {
            "token": token,
            "user": {
                "id": user.id,
                "nombre": user.nombre,
                "usuario": user.usuario,
                "correo": user.correo,
                "rol_principal": rol_principal,
                "roles": user.roles,
                "areas": user.areas,
                "requiere_cambio_password": user.requiere_cambio_password,
            }
        }
    
    async def change_password(self, user_id: int, current_password: str, new_password: str) -> dict:
        """Change user password."""
        user = await self.user_service.get_user_by_id(user_id)
        
        if user is None:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Get the salt from the sheet
        salt = getattr(user, 'salt', '') or ''
        
        if not verify_password(current_password, user.password, salt):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contrasena actual incorrecta"
            )
        
        # bcrypt — secure password hashing
        new_hash = hash_password_bcrypt(new_password)
        
        await self.user_service.update_user_field(user_id, "password", new_hash)
        # Clear salt field since bcrypt stores it in the hash
        await self.user_service.update_user_field(user_id, "salt", "")
        
        # Clear the "must change password" flag
        if user.requiere_cambio_password:
            await self.user_service.update_user_field(user_id, "requiere_cambio_password", "FALSE")
        
        return {"message": "Contrasena actualizada correctamente"}
    
    async def reset_password_admin(self, user_id: int) -> dict:
        """Admin resets a user's password."""
        user = await self.user_service.get_user_by_id(user_id)
        
        if user is None:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        temp_password = generate_temp_password()
        
        # bcrypt — secure password hashing
        new_hash = hash_password_bcrypt(temp_password)
        
        await self.user_service.update_user_field(user_id, "password", new_hash)
        # Clear salt field since bcrypt stores it in the hash
        await self.user_service.update_user_field(user_id, "salt", "")
        
        # Marcar que debe cambiar password en el próximo login
        await self.user_service.update_user_field(user_id, "requiere_cambio_password", "TRUE")
        
        return {
            "message": f"Contraseña reseteada para {user.usuario}",
            "temp_password": temp_password
        }
    
    async def refresh_token(self, token: str) -> dict:
        """Refresh a JWT token."""
        payload = decode_access_token(token)
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado"
            )
        
        user_id = payload.get("sub")
        user = await self.user_service.get_user_by_id(int(user_id))
        
        if user is None or not user.activo:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no válido"
            )
        
        rol_principal = max(user.roles) if user.roles else 0
        
        new_token_data = {
            "sub": str(user.id),
            "usuario": user.usuario,
            "rol_principal": rol_principal,
            "roles": user.roles,
            "areas": user.areas,
        }
        
        new_token = create_access_token(new_token_data)
        
        return {"token": new_token}
