"""Password hashing and JWT token helpers."""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import AuthError

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(raw: str) -> str:
    """Return a bcrypt hash for a plaintext password."""
    return _pwd.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    """Check a plaintext password against its stored hash."""
    return _pwd.verify(raw, hashed)


def _create_token(subject: str, role: str, expires: timedelta, token_type: str) -> str:
    payload = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "exp": datetime.now(timezone.utc) + expires,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str, role: str) -> str:
    """Issue a short-lived access token."""
    return _create_token(
        subject, role, timedelta(minutes=settings.access_token_expire_minutes), "access"
    )


def create_refresh_token(subject: str, role: str) -> str:
    """Issue a long-lived refresh token."""
    return _create_token(
        subject, role, timedelta(days=settings.refresh_token_expire_days), "refresh"
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT, raising AuthError when invalid."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise AuthError("Invalid or expired token") from exc
