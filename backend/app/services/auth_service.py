from datetime import datetime
from typing import Optional

from app.services.sheets_service import GoogleSheetsService
from app.services.user_service import UserService
from app.utils.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
    generate_temp_password,
)

from fastapi import HTTPException, status


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
        
        # Get the salt from the sheet (needed for SHA-256 format)
        salt = getattr(user, 'salt', '') or ''
        
        if not verify_password(password, user.password, salt):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales invalidas"
            )
        
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
        
        # Generate new salt and hash (SHA-256 format to stay compatible with Apps Script)
        from app.utils.security import generate_salt, hash_password_sha256
        new_salt = generate_salt()
        new_hash = hash_password_sha256(new_password, new_salt)
        
        await self.user_service.update_user_field(user_id, "password", new_hash)
        await self.user_service.update_user_field(user_id, "salt", new_salt)
        
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
        new_hash = hash_password(temp_password)
        await self.user_service.update_user_field(user_id, "password", new_hash)
        
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
