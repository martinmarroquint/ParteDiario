import hashlib
import hmac
import os
import secrets
import string
from datetime import datetime, timedelta
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


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
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
