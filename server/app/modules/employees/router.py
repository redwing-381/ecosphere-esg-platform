"""Employee endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.modules.employees import service
from app.modules.employees.schemas import EmployeeCreate, EmployeeOut, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])
manage = require_roles(UserRole.ADMIN, UserRole.DEPT_HEAD)


@router.get("", response_model=list[EmployeeOut])
def list_employees(
    department_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """List employees, optionally filtered by department."""
    return service.list_employees(db, department_id)


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db), _=Depends(manage)):
    """Create an employee record."""
    return service.create_employee(db, data)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Fetch a single employee."""
    return service.get_employee(db, employee_id)


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int, data: EmployeeUpdate, db: Session = Depends(get_db), _=Depends(manage)
):
    """Update an employee record."""
    return service.update_employee(db, employee_id, data)
