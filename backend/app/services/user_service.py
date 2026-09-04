import json
import logging
from typing import Optional

from app.models.user import User, UserCreate, UserUpdate
from app.services.sheets_service import GoogleSheetsService
from app.utils.security import hash_password, hash_password_sha256, generate_salt

logger = logging.getLogger(__name__)

# Nombre de la hoja de usuarios en Google Sheets
HOJA_USUARIOS = "USUARIOS_OCR"


class UserService:
    
    def __init__(self, sheets_service: GoogleSheetsService):
        self.sheets = sheets_service
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        rows = await self.sheets.find_rows(HOJA_USUARIOS, 0, str(user_id))
        if not rows:
            return None
        return self._row_to_user(rows[0])
    
    async def get_user_by_usuario(self, usuario: str) -> Optional[User]:
        """Get user by login username (DNI)."""
        row = await self.sheets.find_row(HOJA_USUARIOS, 3, usuario)
        if not row:
            return None
        return self._row_to_user(row)
    
    async def get_all_users(self, activo: Optional[bool] = None) -> list[User]:
        """Get all users with optional filter."""
        rows = await self.sheets.get_range(HOJA_USUARIOS)
        users = []
        for row in rows[1:] if len(rows) > 0 else []:  # Skip header
            if len(row) >= 8:
                user = self._row_to_user(row)
                if activo is None or user.activo == activo:
                    users.append(user)
        return users
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        existing = await self.get_user_by_usuario(user_data.usuario)
        if existing:
            raise ValueError(f"El nombre de usuario '{user_data.usuario}' ya existe")
        
        all_users = await self.get_all_users()
        next_id = max([u.id for u in all_users], default=0) + 1
        
        # SHA-256+salt (compatible con Apps Script en Google Sheets)
        salt = generate_salt()
        hashed_password = hash_password_sha256(user_data.password, salt)
        
        row = [
            next_id,                                # A: id_usuario
            user_data.nombre,                       # B: nombre_completo
            user_data.correo,                       # C: email
            user_data.usuario,                      # D: usuario (DNI)
            hashed_password,                        # E: password_hash
            salt,                                   # F: salt
            ",".join(str(r) for r in user_data.roles),  # G: rol
            json.dumps(user_data.areas),            # H: areas_json
            "",                                     # I: fecha_creacion
            "",                                     # J: ultimo_acceso
            "0",                                    # K: intentos_fallidos
            "",                                     # L: bloqueado_hasta
            "TRUE",                                 # M: activo (nuevo usuario siempre activo)
            "TRUE",                                 # N: requiere_cambio_password
        ]
        
        await self.sheets.append_row(HOJA_USUARIOS, row)
        
        return User(
            id=next_id,
            nombre=user_data.nombre,
            usuario=user_data.usuario,
            correo=user_data.correo,
            grado=user_data.grado,
            dni=user_data.dni,
            activo=user_data.activo,
            roles=user_data.roles,
            areas=user_data.areas,
        )
    
    async def update_user(self, user_id: int, user_data: UserUpdate) -> User:
        """Update user fields."""
        user = await self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")
        
        row_index = await self.sheets.find_row_index(HOJA_USUARIOS, 0, str(user_id))
        if not row_index:
            raise ValueError("Usuario no encontrado en la hoja")
        
        # Update fields (column mapping for USUARIOS_OCR 14 columns A-N)
        if user_data.nombre is not None:
            await self.sheets.update_cell(HOJA_USUARIOS, f"B{row_index}", user_data.nombre)
        if user_data.correo is not None:
            await self.sheets.update_cell(HOJA_USUARIOS, f"C{row_index}", user_data.correo)
        if user_data.dni is not None:
            await self.sheets.update_cell(HOJA_USUARIOS, f"D{row_index}", user_data.dni)
        if user_data.activo is not None:
            await self.sheets.update_cell(HOJA_USUARIOS, f"M{row_index}", "TRUE" if user_data.activo else "FALSE")
        if user_data.roles is not None:
            await self.sheets.update_cell(HOJA_USUARIOS, f"G{row_index}", ",".join(str(r) for r in user_data.roles))
        if user_data.areas is not None:
            await self.sheets.update_cell(HOJA_USUARIOS, f"H{row_index}", json.dumps(user_data.areas))
        
        return await self.get_user_by_id(user_id)
    
    async def update_user_field(self, user_id: int, field: str, value: str) -> bool:
        """Update a single field for a user."""
        row_index = await self.sheets.find_row_index(HOJA_USUARIOS, 0, str(user_id))
        if not row_index:
            return False
        
        # Mapeo de campos a columnas en USUARIOS_OCR (14 columnas)
        field_columns = {
            "nombre": "B",
            "usuario": "D",
            "password": "E",
            "correo": "C",
            "roles": "G",
            "areas": "H",
            "dni": "D",
            "activo": "M",
            "requiere_cambio_password": "N",
            "salt": "F",
            "intentos_fallidos": "K",
            "bloqueado_hasta": "L",
        }
        
        col = field_columns.get(field)
        if not col:
            logger.warning(f"Unknown field: {field}")
            return False
        
        await self.sheets.update_cell(HOJA_USUARIOS, f"{col}{row_index}", value)
        return True
    
    async def delete_user(self, user_id: int) -> bool:
        """Deactivate a user (soft delete)."""
        return await self.update_user_field(user_id, "activo", "FALSE")
    
    async def toggle_user_active(self, user_id: int) -> Optional[bool]:
        """Toggle user active status."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        new_status = "FALSE" if user.activo else "TRUE"
        await self.update_user_field(user_id, "activo", new_status)
        return not user.activo
    
    def _row_to_user(self, row: list) -> User:
        """Convert a USUARIOS_OCR sheet row to a User model.
        
        Column mapping (14 columns):
        A (0): id_usuario
        B (1): nombre_completo
        C (2): email
        D (3): usuario (DNI)
        E (4): password_hash
        F (5): salt
        G (6): rol
        H (7): areas_json
        I (8): fecha_creacion
        J (9): ultimo_acceso
        K (10): intentos_fallidos
        L (11): bloqueado_hasta
        M (12): activo
        N (13): requiere_cambio
        """
        def safe_get(index, default=""):
            return row[index] if len(row) > index else default
        
        # Mapeo de roles string a numerico
        ROL_MAP = {
            "admin": 4, "administrador": 4,
            "jefe_division": 3, "division": 3,
            "jefe_depto": 2, "departamento": 2, "depto": 2,
            "jefe_area": 1, "area": 1,
            "usuario": 0, "user": 0,
        }
        
        # Parse roles from column G
        rol_str = safe_get(6, "0")
        roles = []
        for r in rol_str.split(","):
            r = r.strip()
            if not r:
                continue
            if r.isdigit():
                roles.append(int(r))
            elif r.lower() in ROL_MAP:
                roles.append(ROL_MAP[r.lower()])
        
        # Si no se pudo parsear, usar 0
        if not roles:
            roles = [0]
        
        # Parse areas from column H (JSON array)
        areas_str = safe_get(7, "")
        try:
            areas = json.loads(areas_str) if areas_str.startswith("[") else [a.strip() for a in areas_str.split(",") if a.strip()]
        except (json.JSONDecodeError, TypeError):
            areas = [a.strip() for a in areas_str.split(",") if a.strip()]
        
        # Parse activo from column M
        activo_str = safe_get(12, "TRUE")
        activo = activo_str.upper() not in ("FALSE", "0", "NO")
        
        # Parse requiere_cambio from column N
        requiere_cambio_str = safe_get(13, "FALSE")
        requiere_cambio = requiere_cambio_str.upper() in ("TRUE", "1", "SI")
        
        # DNI is in column D (usuario field)
        dni = safe_get(3, "")
        
        return User(
            id=int(safe_get(0, "0")),
            nombre=safe_get(1, ""),
            usuario=safe_get(3, ""),  # DNI is the username
            password=safe_get(4, ""),
            correo=safe_get(2, ""),
            grado="",  # Grade not stored in USUARIOS_OCR
            dni=dni,
            activo=activo,
            roles=roles if roles else [0],
            areas=areas,
            creado_en=safe_get(8, ""),
            requiere_cambio_password=requiere_cambio,
            salt=safe_get(5, ""),  # Column F: salt
        )
