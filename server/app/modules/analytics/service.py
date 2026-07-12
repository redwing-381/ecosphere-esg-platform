"""Analytics logic: live scores, snapshots, trends and dashboard summary."""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.engines import scoring
from app.models.enums import IssueStatus, Status
from app.models.environmental import CarbonTransaction
from app.models.governance import ComplianceIssue
from app.models.people import Employee
from app.models.scoring import DepartmentScore


def scores(db: Session) -> dict:
    dept_scores = scoring.score_all(db)
    return {
        "overall": scoring.overall_score(db),
        "departments": [vars(s) for s in dept_scores],
    }


def snapshot(db: Session) -> int:
    """Store today's computed scores per department, replacing same-day rows."""
    today = date.today()
    count = 0
    for s in scoring.score_all(db):
        if s.total is None:
            continue
        existing = db.scalar(
            select(DepartmentScore).where(
                DepartmentScore.department_id == s.department_id,
                DepartmentScore.snapshot_date == today,
            )
        )
        row = existing or DepartmentScore(
            department_id=s.department_id, snapshot_date=today
        )
        row.env_score = s.environmental or 0
        row.social_score = s.social or 0
        row.gov_score = s.governance or 0
        row.total_score = s.total
        if existing is None:
            db.add(row)
        count += 1
    db.commit()
    return count


def trends(db: Session, department_id: int) -> list[dict]:
    rows = db.scalars(
        select(DepartmentScore)
        .where(DepartmentScore.department_id == department_id)
        .order_by(DepartmentScore.snapshot_date)
    )
    return [{"snapshot_date": r.snapshot_date, "total_score": r.total_score} for r in rows]


def dashboard(db: Session) -> dict:
    total_co2e = db.scalar(
        select(func.coalesce(func.sum(CarbonTransaction.co2e), 0))
    )
    open_issues = db.scalar(
        select(func.count()).select_from(ComplianceIssue).where(
            ComplianceIssue.status != IssueStatus.RESOLVED
        )
    )
    employee_count = db.scalar(
        select(func.count()).select_from(Employee).where(Employee.status == Status.ACTIVE)
    )
    return {
        "overall_score": scoring.overall_score(db),
        "total_co2e": total_co2e,
        "open_issues": open_issues,
        "employee_count": employee_count,
    }
