"""What-If simulator: project ESG scores under hypothetical changes.

Reuses the same scoring formula as the live engine but runs on an in-memory
metrics snapshot, so it never writes to the database.
"""
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.engines.scoring import _clamp, _mean
from app.models.enums import ApprovalStatus, IssueStatus, Status
from app.models.environmental import CarbonTransaction
from app.models.governance import Audit, ComplianceIssue, PolicyAcknowledgement
from app.models.master import ESGPolicy, EnvironmentalGoal, Training
from app.models.people import Employee
from app.models.social import EmployeeParticipation, TrainingCompletion
from app.modules.settings.service import get_organization


@dataclass
class Metrics:
    co2e_actual: float
    co2e_target: float
    emp_count: int
    approved_csr: int
    training_total: int
    training_completions: int
    req_policies: int
    acks: int
    audits_total: int
    audits_passed: int
    open_issues: int


def gather_metrics(db: Session, dept_id: int) -> Metrics:
    """Collect the raw inputs the scoring formula needs for a department."""
    return Metrics(
        co2e_actual=float(
            db.scalar(
                select(func.coalesce(func.sum(CarbonTransaction.co2e), 0)).where(
                    CarbonTransaction.department_id == dept_id
                )
            )
        ),
        co2e_target=float(
            db.scalar(
                select(func.coalesce(func.sum(EnvironmentalGoal.target), 0)).where(
                    EnvironmentalGoal.department_id == dept_id
                )
            )
        ),
        emp_count=db.scalar(
            select(func.count()).select_from(Employee).where(
                Employee.department_id == dept_id, Employee.status == Status.ACTIVE
            )
        ),
        approved_csr=db.scalar(
            select(func.count())
            .select_from(EmployeeParticipation)
            .join(Employee, Employee.id == EmployeeParticipation.employee_id)
            .where(
                Employee.department_id == dept_id,
                EmployeeParticipation.approval_status == ApprovalStatus.APPROVED,
            )
        ),
        training_total=db.scalar(select(func.count()).select_from(Training)),
        training_completions=db.scalar(
            select(func.count())
            .select_from(TrainingCompletion)
            .join(Employee, Employee.id == TrainingCompletion.employee_id)
            .where(Employee.department_id == dept_id)
        ),
        req_policies=db.scalar(
            select(func.count()).select_from(ESGPolicy).where(
                ESGPolicy.requires_ack.is_(True), ESGPolicy.status == Status.ACTIVE
            )
        ),
        acks=db.scalar(
            select(func.count())
            .select_from(PolicyAcknowledgement)
            .join(Employee, Employee.id == PolicyAcknowledgement.employee_id)
            .where(Employee.department_id == dept_id)
        ),
        audits_total=db.scalar(
            select(func.count()).select_from(Audit).where(Audit.department_id == dept_id)
        ),
        audits_passed=db.scalar(
            select(func.count()).select_from(Audit).where(
                Audit.department_id == dept_id, Audit.passed.is_(True)
            )
        ),
        open_issues=db.scalar(
            select(func.count())
            .select_from(ComplianceIssue)
            .join(Audit, Audit.id == ComplianceIssue.audit_id)
            .where(
                Audit.department_id == dept_id,
                ComplianceIssue.status != IssueStatus.RESOLVED,
            )
        ),
    )


def compute(m: Metrics, weights: tuple[int, int, int]) -> dict:
    """Return env/social/gov/total from a metrics snapshot."""
    env = None
    if m.co2e_target:
        env = (
            100.0
            if m.co2e_actual <= m.co2e_target
            else _clamp(100.0 - (m.co2e_actual - m.co2e_target) / m.co2e_target * 100.0)
        )

    social = None
    if m.emp_count:
        csr = _clamp(m.approved_csr / m.emp_count * 100.0)
        training = (
            _clamp(m.training_completions / (m.emp_count * m.training_total) * 100.0)
            if m.training_total
            else None
        )
        social = _mean([csr, training])

    gov = None
    components = []
    if m.req_policies and m.emp_count:
        components.append(_clamp(m.acks / (m.req_policies * m.emp_count) * 100.0))
    if m.audits_total:
        components.append(m.audits_passed / m.audits_total * 100.0)
    base = _mean(components)
    if base is not None:
        gov = _clamp(base - min(40.0, m.open_issues * 10.0))

    w_env, w_social, w_gov = weights
    weighted, wsum = 0.0, 0.0
    for score, weight in ((env, w_env), (social, w_social), (gov, w_gov)):
        if score is not None:
            weighted += score * weight
            wsum += weight
    total = round(weighted / wsum, 2) if wsum else None
    return {"environmental": env, "social": social, "governance": gov, "total": total}


def simulate(
    db: Session,
    dept_id: int,
    carbon_reduction_pct: float = 0.0,
    add_csr: int = 0,
    add_training_completions: int = 0,
    resolve_issues: int = 0,
) -> dict:
    """Project scores after applying hypothetical improvements to a department."""
    org = get_organization(db)
    weights = (org.weight_env, org.weight_social, org.weight_gov)
    base = gather_metrics(db, dept_id)

    projected = Metrics(**vars(base))
    projected.co2e_actual = base.co2e_actual * (1 - carbon_reduction_pct / 100.0)
    projected.approved_csr = base.approved_csr + add_csr
    projected.training_completions = base.training_completions + add_training_completions
    projected.open_issues = max(0, base.open_issues - resolve_issues)

    return {
        "baseline": compute(base, weights),
        "projected": compute(projected, weights),
    }


def recommendations(db: Session, dept_id: int) -> list[dict]:
    """Rank standard levers by their projected gain to the department total."""
    org = get_organization(db)
    weights = (org.weight_env, org.weight_social, org.weight_gov)
    base_total = compute(gather_metrics(db, dept_id), weights)["total"] or 0.0

    levers = {
        "Reduce emissions by 20%": dict(carbon_reduction_pct=20),
        "Run 3 more approved CSR activities": dict(add_csr=3),
        "Complete 5 more trainings": dict(add_training_completions=5),
        "Resolve 1 open compliance issue": dict(resolve_issues=1),
    }
    ranked = []
    for label, kwargs in levers.items():
        projected = simulate(db, dept_id, **kwargs)["projected"]["total"] or 0.0
        ranked.append({"action": label, "projected_total": projected,
                       "gain": round(projected - base_total, 2)})
    ranked.sort(key=lambda r: r["gain"], reverse=True)
    return ranked
