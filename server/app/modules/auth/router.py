"""Authentication endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user
from app.models.people import User
from app.modules.auth import service
from app.modules.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)) -> User:
    """Register a new account and its linked employee."""
    return service.register(db, data)


@router.post("/login", response_model=TokenPair)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    """Authenticate and return an access/refresh token pair."""
    user = service.authenticate(db, data.email, data.password)
    access, refresh = service.issue_tokens(user)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    """Exchange a refresh token for a new token pair."""
    access, refresh = service.refresh_access(db, data.refresh_token)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    """Return the currently authenticated user."""
    return user
