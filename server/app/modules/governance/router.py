"""Governance module endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationError
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.people import Employee, User
from app.modules.governance import service
from app.modules.governance.schemas import (
    AuditCreate,
    AuditOut,
    AuditUpdate,
    IssueCreate,
    IssueOut,
    PolicyCreate,
    PolicyOut,
)

router = APIRouter(prefix="/governance", tags=["governance"])
manage = require_roles(UserRole.ADMIN, UserRole.DEPT_HEAD)
admin_only = require_roles(UserRole.ADMIN)


def _employee_id(user: User) -> int:
    if user.employee_id is None:
        raise ValidationError("Your account is not linked to an employee")
    return user.employee_id


def _dept_scope(db: Session, user: User) -> int | None:
    """Department a dept-head is limited to (None for admins)."""
    if user.role == UserRole.DEPT_HEAD and user.employee_id:
        employee = db.get(Employee, user.employee_id)
        return employee.department_id if employee else None
    return None


@router.get("/policies", response_model=list[PolicyOut])
def list_policies(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List ESG policies."""
    return service.list_policies(db)


@router.post("/policies", response_model=PolicyOut, status_code=201)
def create_policy(data: PolicyCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    """Create an ESG policy."""
    return service.create_policy(db, data)


@router.post("/policies/{policy_id}/acknowledge", status_code=201)
def acknowledge(policy_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Acknowledge the current version of a policy."""
    service.acknowledge_policy(db, policy_id, _employee_id(user))
    return {"message": "Policy acknowledged"}


@router.get("/audits", response_model=list[AuditOut])
def list_audits(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List governance audits."""
    return service.list_audits(db)


@router.post("/audits", response_model=AuditOut, status_code=201)
def create_audit(data: AuditCreate, db: Session = Depends(get_db), _=Depends(manage)):
    """Create a governance audit."""
    return service.create_audit(db, data)


@router.patch("/audits/{audit_id}", response_model=AuditOut)
def update_audit(
    audit_id: int, data: AuditUpdate, db: Session = Depends(get_db), _=Depends(manage)
):
    """Update an audit's result or findings."""
    return service.update_audit(db, audit_id, data)


@router.get("/compliance-issues", response_model=list[IssueOut])
def list_issues(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List compliance issues scoped to the caller's role."""
    if user.role == UserRole.ADMIN:
        return service.list_issues(db)
    if user.role == UserRole.DEPT_HEAD:
        return service.list_issues(db, dept_id=_dept_scope(db, user))
    return service.list_issues(db, employee_id=_employee_id(user))


@router.post("/compliance-issues", response_model=IssueOut, status_code=201)
def create_issue(data: IssueCreate, db: Session = Depends(get_db), user: User = Depends(manage)):
    """Raise a compliance issue (records the creator and assignee)."""
    return service.create_issue(db, data, _employee_id(user))


@router.post("/compliance-issues/{issue_id}/resolve", response_model=IssueOut)
def resolve_issue(issue_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Resolve an issue (managers, or the employee it is assigned to)."""
    is_manager = user.role in (UserRole.ADMIN, UserRole.DEPT_HEAD)
    return service.resolve_issue(db, issue_id, _employee_id(user), is_manager)


@router.post("/compliance-issues/flag-overdue")
def flag_overdue(db: Session = Depends(get_db), _=Depends(admin_only)):
    """Flag open issues past their due date (also run on a schedule)."""
    return {"flagged": service.flag_overdue(db)}
