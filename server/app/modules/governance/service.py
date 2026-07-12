"""Governance logic: policies, acknowledgements, audits and compliance issues."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.engines import notifications
from app.models.enums import IssueStatus, NotificationType
from app.models.governance import Audit, ComplianceIssue, PolicyAcknowledgement
from app.models.master import ESGPolicy
from app.modules.governance.schemas import AuditCreate, IssueCreate, PolicyCreate


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


def list_issues(db: Session) -> list[ComplianceIssue]:
    return list(db.scalars(select(ComplianceIssue).order_by(ComplianceIssue.due_date)))


def create_issue(db: Session, data: IssueCreate) -> ComplianceIssue:
    """Create a compliance issue and notify its owner."""
    issue = ComplianceIssue(**data.model_dump())
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


def resolve_issue(db: Session, issue_id: int) -> ComplianceIssue:
    issue = db.get(ComplianceIssue, issue_id)
    if issue is None:
        raise NotFoundError("Compliance issue not found")
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
