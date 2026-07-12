"""Department endpoints (admin-managed master data)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.modules.departments import service
from app.modules.departments.schemas import (
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
)

router = APIRouter(prefix="/departments", tags=["departments"])
admin_only = require_roles(UserRole.ADMIN)


@router.get("", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List all departments."""
    return service.list_departments(db)


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(
    data: DepartmentCreate, db: Session = Depends(get_db), _=Depends(admin_only)
):
    """Create a department (admin only)."""
    return service.create_department(db, data)


@router.get("/{dept_id}", response_model=DepartmentOut)
def get_department(dept_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Fetch a single department."""
    return service.get_department(db, dept_id)


@router.patch("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    _=Depends(admin_only),
):
    """Update a department (admin only)."""
    return service.update_department(db, dept_id, data)


@router.delete("/{dept_id}", status_code=204)
def delete_department(dept_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    """Delete a department with no sub-departments (admin only)."""
    service.delete_department(db, dept_id)
