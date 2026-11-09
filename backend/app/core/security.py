"""Security utilities for JWT token handling, password hashing, and API keys."""

import datetime
import hashlib
import secrets
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from backend.app.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash, truncating to 72 bytes."""
    password_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """Generate bcrypt hash from plain password, truncating to 72 bytes."""
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_raw_api_key() -> tuple[str, str, str]:
    """
    Generate an API key tuple: (full_key, key_prefix, hashed_key).
    Format: sk_live_<40_random_hex>
    """
    random_part = secrets.token_hex(20)
    full_key = f"sk_live_{random_part}"
    key_prefix = full_key[:12]
    hashed_key = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_prefix, hashed_key


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()
