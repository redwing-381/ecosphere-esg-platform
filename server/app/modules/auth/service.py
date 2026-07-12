"""Authentication business logic: registration, login and token refresh."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AuthError, ConflictError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.enums import UserRole
from app.models.people import Employee, User
from app.modules.auth.schemas import RegisterRequest


def register(db: Session, data: RegisterRequest) -> User:
    """Create a user account; admins are non-participating (no employee record)."""
    exists = db.scalar(select(User).where(User.email == data.email))
    if exists:
        raise ConflictError("An account with this email already exists")

    employee_id = None
    if data.role != UserRole.ADMIN:
        employee = Employee(
            name=data.name, email=data.email, department_id=data.department_id
        )
        db.add(employee)
        db.flush()
        employee_id = employee.id

    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        role=data.role,
        employee_id=employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    """Validate credentials and return the matching user."""
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError("Incorrect email or password")
    return user


def issue_tokens(user: User) -> tuple[str, str]:
    """Return an access/refresh token pair for a user."""
    subject = str(user.id)
    return (
        create_access_token(subject, user.role.value),
        create_refresh_token(subject, user.role.value),
    )


def refresh_access(db: Session, refresh_token: str) -> tuple[str, str]:
    """Exchange a valid refresh token for a fresh token pair."""
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise AuthError("Invalid token type")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise AuthError("User no longer exists")
    return issue_tokens(user)
