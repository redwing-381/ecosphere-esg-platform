"""Analytics logic: live scores, snapshots, trends and dashboard summary."""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.engines import scoring
from app.models.enums import IssueStatus, Status
from app.models.environmental import CarbonTransaction
from app.models.governance import ComplianceIssue
from app.models.notification import Notification
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
    pillars = scoring.overall_pillars(db)
    return {
        "overall_score": scoring.overall_score(db),
        "env_score": pillars["environmental"],
        "social_score": pillars["social"],
        "gov_score": pillars["governance"],
        "total_co2e": total_co2e,
        "open_issues": open_issues,
        "employee_count": employee_count,
    }


def emissions_trend(db: Session, months: int = 12) -> list[dict]:
    """Return total CO2e grouped by calendar month for the last N months."""
    today = date.today()
    start_index = (today.year * 12 + today.month - 1) - (months - 1)
    start = date(start_index // 12, start_index % 12 + 1, 1)
    month_col = func.date_trunc("month", CarbonTransaction.date)
    rows = db.execute(
        select(month_col.label("m"), func.coalesce(func.sum(CarbonTransaction.co2e), 0))
        .where(CarbonTransaction.date >= start)
        .group_by(month_col)
        .order_by(month_col)
    ).all()
    return [{"month": m.strftime("%b %Y"), "co2e": round(float(total), 1)} for m, total in rows]


def recent_activity(db: Session, limit: int = 8) -> list[dict]:
    """Return the most recent notifications as an organization activity feed."""
    rows = db.scalars(
        select(Notification).order_by(Notification.created_at.desc()).limit(limit)
    )
    return [
        {"message": n.message, "type": n.type.value, "created_at": n.created_at}
        for n in rows
    ]
