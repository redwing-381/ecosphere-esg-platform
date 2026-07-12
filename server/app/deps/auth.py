"""Authentication and role-based access dependencies."""
from collections.abc import Callable

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import AuthError, ForbiddenError
from app.core.security import decode_token
from app.models.enums import UserRole
from app.models.people import User


def get_current_user(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Bearer access token."""
    if not authorization.lower().startswith("bearer "):
        raise AuthError("Missing bearer token")

    payload = decode_token(authorization.split(" ", 1)[1])
    if payload.get("type") != "access":
        raise AuthError("Invalid token type")

    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise AuthError("User no longer exists")
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Build a dependency that allows only the given roles."""

    def guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenError("You do not have access to this resource")
        return user

    return guard
