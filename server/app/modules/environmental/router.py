"""Environmental module endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.modules.environmental import service
from app.modules.environmental.schemas import (
    CarbonTransactionOut,
    DepartmentCarbon,
    EmissionFactorCreate,
    EmissionFactorOut,
    GoalCreate,
    GoalOut,
    OperationalActivityCreate,
    OperationalActivityOut,
)

router = APIRouter(prefix="/environmental", tags=["environmental"])
admin_only = require_roles(UserRole.ADMIN)
manage = require_roles(UserRole.ADMIN, UserRole.DEPT_HEAD)


@router.get("/emission-factors", response_model=list[EmissionFactorOut])
def list_factors(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List configured emission factors."""
    return service.list_factors(db)


@router.post("/emission-factors", response_model=EmissionFactorOut, status_code=201)
def create_factor(data: EmissionFactorCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    """Create an emission factor (admin only)."""
    return service.create_factor(db, data)


@router.get("/operational-activities", response_model=list[OperationalActivityOut])
def list_activities(
    department_id: int | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    """List operational activities."""
    return service.list_activities(db, department_id)


@router.post("/operational-activities", response_model=OperationalActivityOut, status_code=201)
def create_activity(
    data: OperationalActivityCreate, db: Session = Depends(get_db), _=Depends(manage)
):
    """Record an operation; auto-creates its carbon transaction when enabled."""
    return service.create_activity(db, data)


@router.get("/carbon-transactions", response_model=list[CarbonTransactionOut])
def list_carbon(
    department_id: int | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    """List calculated carbon transactions."""
    return service.list_carbon(db, department_id)


@router.get("/carbon-by-department", response_model=list[DepartmentCarbon])
def carbon_by_department(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Aggregate total emissions per department."""
    return service.carbon_by_department(db)


@router.get("/goals", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List sustainability goals."""
    return service.list_goals(db)


@router.post("/goals", response_model=GoalOut, status_code=201)
def create_goal(data: GoalCreate, db: Session = Depends(get_db), _=Depends(manage)):
    """Create a sustainability goal."""
    return service.create_goal(db, data)
