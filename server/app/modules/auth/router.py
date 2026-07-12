"""Authentication endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user
from app.models.master import Department
from app.models.people import Employee, User
from app.modules.auth import service
from app.modules.auth.schemas import (
    LoginRequest,
    ProfileOut,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)) -> User:
    """Register a new account (admins are non-participating, without an employee)."""
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


@router.get("/me/profile", response_model=ProfileOut)
def profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ProfileOut:
    """Return the current user's account joined with employee and department."""
    employee = db.get(Employee, user.employee_id) if user.employee_id else None
    department = (
        db.get(Department, employee.department_id)
        if employee and employee.department_id
        else None
    )
    return ProfileOut(
        id=user.id,
        email=user.email,
        role=user.role,
        employee_id=user.employee_id,
        name=employee.name if employee else user.name,
        department_id=employee.department_id if employee else None,
        department_name=department.name if department else None,
        job_title=employee.job_title if employee else None,
        xp_balance=employee.xp_balance if employee else 0,
        points_balance=employee.points_balance if employee else 0,
    )
