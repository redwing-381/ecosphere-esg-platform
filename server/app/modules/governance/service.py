"""Governance logic: policies, acknowledgements, audits and compliance issues."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.engines import notifications
from app.models.enums import IssueStatus, NotificationType
from app.models.governance import Audit, ComplianceIssue, PolicyAcknowledgement
from app.models.master import ESGPolicy
from app.models.people import Employee
from app.modules.governance.schemas import (
    AuditCreate,
    AuditUpdate,
    IssueCreate,
    PolicyCreate,
)


def list_policies(db: Session) -> list[ESGPolicy]:
    return list(db.scalars(select(ESGPolicy).order_by(ESGPolicy.name)))


def create_policy(db: Session, data: PolicyCreate) -> ESGPolicy:
    policy = ESGPolicy(**data.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def acknowledge_policy(db: Session, policy_id: int, employee_id: int) -> PolicyAcknowledgement:
    """Record an acknowledgement for the policy's current version."""
    policy = db.get(ESGPolicy, policy_id)
    if policy is None:
        raise NotFoundError("Policy not found")
    exists = db.scalar(
        select(PolicyAcknowledgement).where(
            PolicyAcknowledgement.employee_id == employee_id,
            PolicyAcknowledgement.policy_id == policy_id,
            PolicyAcknowledgement.policy_version == policy.version,
        )
    )
    if exists:
        raise ConflictError("You have already acknowledged this policy version")
    ack = PolicyAcknowledgement(
        employee_id=employee_id, policy_id=policy_id, policy_version=policy.version
    )
    db.add(ack)
    db.commit()
    db.refresh(ack)
    return ack


def list_audits(db: Session) -> list[Audit]:
    return list(db.scalars(select(Audit).order_by(Audit.audit_date.desc())))


def create_audit(db: Session, data: AuditCreate) -> Audit:
    audit = Audit(**data.model_dump())
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


def update_audit(db: Session, audit_id: int, data: AuditUpdate) -> Audit:
    """Update an audit's result or findings."""
    audit = db.get(Audit, audit_id)
    if audit is None:
        raise NotFoundError("Audit not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(audit, field, value)
    db.commit()
    db.refresh(audit)
    return audit


def list_issues(
    db: Session, employee_id: int | None = None, dept_id: int | None = None
) -> list[dict]:
    """List compliance issues, enriched with owner/creator names and scoped by role."""
    owner = aliased(Employee)
    creator = aliased(Employee)
    stmt = (
        select(ComplianceIssue, owner.name, creator.name, owner.department_id)
        .join(owner, owner.id == ComplianceIssue.owner_id)
        .join(creator, creator.id == ComplianceIssue.created_by, isouter=True)
        .order_by(ComplianceIssue.due_date)
    )
    if employee_id is not None:
        stmt = stmt.where(ComplianceIssue.owner_id == employee_id)
    if dept_id is not None:
        stmt = stmt.where(owner.department_id == dept_id)
    return [
        {
            "id": i.id,
            "audit_id": i.audit_id,
            "severity": i.severity,
            "description": i.description,
            "owner_id": i.owner_id,
            "owner_name": owner_name,
            "created_by": i.created_by,
            "created_by_name": creator_name,
            "department_id": dept,
            "due_date": i.due_date,
            "status": i.status,
            "is_overdue": i.is_overdue,
        }
        for i, owner_name, creator_name, dept in db.execute(stmt).all()
    ]


def create_issue(db: Session, data: IssueCreate, created_by: int) -> ComplianceIssue:
    """Create a compliance issue, recording its creator and notifying the assignee."""
    issue = ComplianceIssue(**data.model_dump(), created_by=created_by)
    issue.is_overdue = issue.due_date < date.today()
    db.add(issue)
    db.flush()
    notifications.dispatch(
        db, issue.owner_id, NotificationType.COMPLIANCE_ISSUE,
        f"A {issue.severity.value} compliance issue was assigned to you.",
        "compliance_issue", issue.id,
    )
    db.commit()
    db.refresh(issue)
    return issue


def resolve_issue(db: Session, issue_id: int, actor_employee_id: int, is_manager: bool) -> ComplianceIssue:
    """Resolve an issue; allowed for managers or the assignee working on it."""
    issue = db.get(ComplianceIssue, issue_id)
    if issue is None:
        raise NotFoundError("Compliance issue not found")
    if not is_manager and issue.owner_id != actor_employee_id:
        raise ForbiddenError("You can only resolve issues assigned to you")
    issue.status = IssueStatus.RESOLVED
    issue.is_overdue = False
    db.commit()
    db.refresh(issue)
    return issue


def flag_overdue(db: Session) -> int:
    """Flag open issues past their due date and notify owners. Returns count."""
    issues = db.scalars(
        select(ComplianceIssue).where(
            ComplianceIssue.status != IssueStatus.RESOLVED,
            ComplianceIssue.due_date < date.today(),
            ComplianceIssue.is_overdue.is_(False),
        )
    )
    count = 0
    for issue in issues:
        issue.is_overdue = True
        notifications.dispatch(
            db, issue.owner_id, NotificationType.COMPLIANCE_ISSUE,
            "A compliance issue assigned to you is overdue.",
            "compliance_issue", issue.id,
        )
        count += 1
    db.commit()
    return count
