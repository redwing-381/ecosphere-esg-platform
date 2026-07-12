"""Employee business logic."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.people import Employee
from app.modules.employees.schemas import EmployeeCreate, EmployeeUpdate


def _get(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise NotFoundError("Employee not found")
    return employee


def list_employees(db: Session, department_id: int | None = None) -> list[Employee]:
    stmt = select(Employee).order_by(Employee.name)
    if department_id is not None:
        stmt = stmt.where(Employee.department_id == department_id)
    return list(db.scalars(stmt))


def get_employee(db: Session, employee_id: int) -> Employee:
    return _get(db, employee_id)


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    if db.scalar(select(Employee).where(Employee.email == data.email)):
        raise ConflictError("An employee with this email already exists")
    employee = Employee(**data.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee:
    employee = _get(db, employee_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(employee, key, value)
    db.commit()
    db.refresh(employee)
    return employee
