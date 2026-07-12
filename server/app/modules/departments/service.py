"""Department business logic including hierarchy safety checks."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.master import Department
from app.modules.departments.schemas import DepartmentCreate, DepartmentUpdate


def _get(db: Session, dept_id: int) -> Department:
    dept = db.get(Department, dept_id)
    if dept is None:
        raise NotFoundError("Department not found")
    return dept


def _assert_no_cycle(db: Session, dept_id: int, parent_id: int) -> None:
    """Walk the parent chain to ensure the new link creates no loop."""
    current = parent_id
    while current is not None:
        if current == dept_id:
            raise ValidationError("Department hierarchy cannot contain a cycle")
        current = db.get(Department, current).parent_department_id


def list_departments(db: Session) -> list[Department]:
    return list(db.scalars(select(Department).order_by(Department.name)))


def get_department(db: Session, dept_id: int) -> Department:
    return _get(db, dept_id)


def create_department(db: Session, data: DepartmentCreate) -> Department:
    if db.scalar(select(Department).where(Department.code == data.code)):
        raise ConflictError("A department with this code already exists")
    if data.parent_department_id is not None:
        _get(db, data.parent_department_id)
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def update_department(db: Session, dept_id: int, data: DepartmentUpdate) -> Department:
    dept = _get(db, dept_id)
    payload = data.model_dump(exclude_unset=True)
    if payload.get("parent_department_id") is not None:
        _get(db, payload["parent_department_id"])
        _assert_no_cycle(db, dept_id, payload["parent_department_id"])
    for key, value in payload.items():
        setattr(dept, key, value)
    db.commit()
    db.refresh(dept)
    return dept


def delete_department(db: Session, dept_id: int) -> None:
    dept = _get(db, dept_id)
    children = db.scalar(
        select(Department).where(Department.parent_department_id == dept_id)
    )
    if children:
        raise ConflictError("Cannot delete a department that has sub-departments")
    db.delete(dept)
    db.commit()
