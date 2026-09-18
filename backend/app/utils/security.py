import hashlib
import hmac
import os
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import settings

# ============================================
# PASSWORD HASHING - Support both bcrypt and SHA-256+salt
# SHA-256+salt is used by the existing Apps Script
# bcrypt is used for new passwords in FastAPI
# ============================================

def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt (new format)."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


def hash_password_sha256(password: str, salt: str) -> str:
    """Hash password using SHA-256+salt (Apps Script format)."""
    import binascii
    digest = hashlib.sha256((password + salt).encode('utf-8')).digest()
    return binascii.hexlify(digest).decode('utf-8')


def verify_password_bcrypt(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def verify_password_sha256(plain_password: str, hashed_password: str, salt: str) -> bool:
    """Verify password against SHA-256+salt hash (Apps Script format)."""
    computed = hash_password_sha256(plain_password, salt)
    return hmac.compare_digest(computed, hashed_password)


def hash_password(password: str) -> str:
    """Hash password using bcrypt (default for new users)."""
    return hash_password_bcrypt(password)


def verify_password(plain_password: str, hashed_password: str, salt: str = "") -> bool:
    """Verify password - supports both bcrypt and SHA-256+salt formats.
    
    Args:
        plain_password: The plaintext password to verify
        hashed_password: The stored hash (bcrypt or SHA-256)
        salt: The salt (used only for SHA-256 format, ignored for bcrypt)
    """
    # Try bcrypt first
    if hashed_password.startswith('$2'):
        return verify_password_bcrypt(plain_password, hashed_password)
    
    # Fall back to SHA-256+salt (Apps Script format)
    if salt:
        return verify_password_sha256(plain_password, hashed_password, salt)
    
    return False


def generate_salt() -> str:
    """Generate a random salt (UUID format, matching Apps Script)."""
    return str(secrets.token_hex(16))


# Zona horaria de Peru (UTC-5). Las sesiones expiran a la medianoche LOCAL,
# de modo que duran todo el dia y se reinician a las 00:00 si no se cerro.
_LIMA_TZ = timezone(timedelta(hours=-5))


def _segundos_hasta_medianoche_lima() -> int:
    """Segundos que faltan hasta la proxima medianoche en Peru (minimo 1h)."""
    ahora_lima = datetime.now(_LIMA_TZ)
    manana = (ahora_lima + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    segundos = int((manana - ahora_lima).total_seconds())
    return max(segundos, 3600)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token.

    Por defecto el token expira a las 00:00 (hora de Peru): la sesion se
    mantiene activa todo el dia y se reinicia a medianoche si no se cerro.
    El refresh tambien apunta a la misma medianoche, asi el reinicio diario
    se cumple incluso con renovacion automatica del token.
    """
    to_encode = data.copy()
    ahora_utc = datetime.now(timezone.utc)
    try:
        if expires_delta:
            expire = ahora_utc + expires_delta
        else:
            expire = ahora_utc + timedelta(seconds=_segundos_hasta_medianoche_lima())
    except Exception:
        expire = ahora_utc + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": ahora_utc})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_temp_password(length: int = 12) -> str:
    """Generate a random temporary password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))
