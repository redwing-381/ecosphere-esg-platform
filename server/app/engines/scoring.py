"""ESG scoring engine: pure per-department E/S/G math and org rollup.

Scores are 0-100. A pillar returns None when there is not enough data, so
empty departments are excluded rather than being penalised with a zero.
"""
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import ApprovalStatus, IssueStatus, Status
from app.models.environmental import CarbonTransaction
from app.models.governance import Audit, ComplianceIssue, PolicyAcknowledgement
from app.models.master import Department, ESGPolicy, EnvironmentalGoal, Training
from app.models.people import Employee
from app.models.social import EmployeeParticipation, TrainingCompletion
from app.modules.settings.service import get_organization


@dataclass
class DeptScores:
    department_id: int
    environmental: float | None
    social: float | None
    governance: float | None
    total: float | None


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def _mean(values: list[float]) -> float | None:
    present = [v for v in values if v is not None]
    return sum(present) / len(present) if present else None


def _environmental(db: Session, dept_id: int) -> float | None:
    target = db.scalar(
        select(func.sum(EnvironmentalGoal.target)).where(
            EnvironmentalGoal.department_id == dept_id
        )
    )
    if not target:
        return None
    actual = db.scalar(
        select(func.coalesce(func.sum(CarbonTransaction.co2e), 0)).where(
            CarbonTransaction.department_id == dept_id
        )
    ) or 0
    if actual <= target:
        return 100.0
    return _clamp(100.0 - (float(actual - target) / float(target)) * 100.0)


def _employee_count(db: Session, dept_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(Employee).where(
            Employee.department_id == dept_id, Employee.status == Status.ACTIVE
        )
    )


def _social(db: Session, dept_id: int, emp_count: int) -> float | None:
    if emp_count == 0:
        return None
    approved_csr = db.scalar(
        select(func.count())
        .select_from(EmployeeParticipation)
        .join(Employee, Employee.id == EmployeeParticipation.employee_id)
        .where(
            Employee.department_id == dept_id,
            EmployeeParticipation.approval_status == ApprovalStatus.APPROVED,
        )
    )
    csr_score = _clamp((approved_csr / emp_count) * 100.0)

    training_total = db.scalar(select(func.count()).select_from(Training))
    training_score = None
    if training_total:
        completions = db.scalar(
            select(func.count())
            .select_from(TrainingCompletion)
            .join(Employee, Employee.id == TrainingCompletion.employee_id)
            .where(Employee.department_id == dept_id)
        )
        training_score = _clamp((completions / (emp_count * training_total)) * 100.0)
    return _mean([csr_score, training_score])


def _governance(db: Session, dept_id: int, emp_count: int) -> float | None:
    components: list[float] = []

    req_policies = db.scalar(
        select(func.count()).select_from(ESGPolicy).where(
            ESGPolicy.requires_ack.is_(True), ESGPolicy.status == Status.ACTIVE
        )
    )
    if req_policies and emp_count:
        acks = db.scalar(
            select(func.count())
            .select_from(PolicyAcknowledgement)
            .join(Employee, Employee.id == PolicyAcknowledgement.employee_id)
            .where(Employee.department_id == dept_id)
        )
        components.append(_clamp((acks / (req_policies * emp_count)) * 100.0))

    total_audits = db.scalar(
        select(func.count()).select_from(Audit).where(Audit.department_id == dept_id)
    )
    if total_audits:
        passed = db.scalar(
            select(func.count()).select_from(Audit).where(
                Audit.department_id == dept_id, Audit.passed.is_(True)
            )
        )
        components.append((passed / total_audits) * 100.0)

    base = _mean(components)
    if base is None:
        return None

    open_issues = db.scalar(
        select(func.count())
        .select_from(ComplianceIssue)
        .join(Audit, Audit.id == ComplianceIssue.audit_id)
        .where(Audit.department_id == dept_id, ComplianceIssue.status != IssueStatus.RESOLVED)
    )
    return _clamp(base - min(40.0, open_issues * 10.0))


def score_department(db: Session, dept_id: int) -> DeptScores:
    """Compute the three pillar scores and the weighted total for a department."""
    org = get_organization(db)
    emp_count = _employee_count(db, dept_id)
    env = _environmental(db, dept_id)
    social = _social(db, dept_id, emp_count)
    gov = _governance(db, dept_id, emp_count)

    weighted, weight_sum = 0.0, 0.0
    for score, weight in (
        (env, org.weight_env),
        (social, org.weight_social),
        (gov, org.weight_gov),
    ):
        if score is not None:
            weighted += score * weight
            weight_sum += weight
    total = round(weighted / weight_sum, 2) if weight_sum else None
    return DeptScores(dept_id, env, social, gov, total)


def score_all(db: Session) -> list[DeptScores]:
    depts = db.scalars(select(Department).where(Department.status == Status.ACTIVE))
    return [score_department(db, d.id) for d in depts]


def overall_score(db: Session) -> float | None:
    """Return the average of department totals that have data."""
    totals = [s.total for s in score_all(db) if s.total is not None]
    return round(sum(totals) / len(totals), 2) if totals else None


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 1)


def overall_pillars(db: Session) -> dict:
    """Org-wide E/S/G scores as the mean of department pillar scores."""
    depts = score_all(db)
    return {
        "environmental": _round(_mean([s.environmental for s in depts])),
        "social": _round(_mean([s.social for s in depts])),
        "governance": _round(_mean([s.governance for s in depts])),
    }
