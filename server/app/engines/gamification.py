"""Gamification engine: XP/points ledgers and deterministic badge awards."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import (
    ApprovalStatus,
    BadgeMetric,
    LedgerReason,
    NotificationType,
)
from app.models.gamification import (
    BadgeAward,
    ChallengeParticipation,
    PointsLedger,
    XpLedger,
)
from app.models.master import Badge
from app.models.notification import Notification
from app.models.people import Employee
from app.models.social import EmployeeParticipation
from app.modules.settings.service import get_organization


def _metric_value(db: Session, employee: Employee, metric: BadgeMetric) -> int:
    """Return the employee's current value for a badge metric."""
    if metric == BadgeMetric.TOTAL_XP:
        return employee.xp_balance
    if metric == BadgeMetric.COMPLETED_CHALLENGES:
        return db.scalar(
            select(func.count())
            .select_from(ChallengeParticipation)
            .where(
                ChallengeParticipation.employee_id == employee.id,
                ChallengeParticipation.approval_status == ApprovalStatus.APPROVED,
            )
        )
    return db.scalar(
        select(func.count())
        .select_from(EmployeeParticipation)
        .where(
            EmployeeParticipation.employee_id == employee.id,
            EmployeeParticipation.approval_status == ApprovalStatus.APPROVED,
        )
    )


def evaluate_badges(db: Session, employee: Employee) -> list[Badge]:
    """Award any active badge whose unlock rule the employee now satisfies."""
    if not get_organization(db).badge_auto_award:
        return []

    awarded: list[Badge] = []
    for badge in db.scalars(select(Badge).where(Badge.active.is_(True))):
        if _metric_value(db, employee, badge.metric) < badge.threshold:
            continue
        exists = db.scalar(
            select(BadgeAward).where(
                BadgeAward.badge_id == badge.id, BadgeAward.employee_id == employee.id
            )
        )
        if exists:
            continue
        db.add(BadgeAward(badge_id=badge.id, employee_id=employee.id))
        db.add(
            Notification(
                recipient_id=employee.id,
                type=NotificationType.BADGE_UNLOCK,
                message=f"You unlocked the '{badge.name}' badge!",
                related_type="badge",
                related_id=badge.id,
            )
        )
        awarded.append(badge)
    return awarded


def award(
    db: Session,
    employee: Employee,
    xp: int,
    points: int,
    reason: LedgerReason,
    source_type: str,
    source_id: int,
) -> None:
    """Grant XP and points via the ledgers, then re-check badge unlocks."""
    if xp:
        db.add(
            XpLedger(
                employee_id=employee.id, delta=xp, reason=reason,
                source_type=source_type, source_id=source_id,
            )
        )
        employee.xp_balance += xp
    if points:
        db.add(
            PointsLedger(
                employee_id=employee.id, delta=points, reason=reason,
                source_type=source_type, source_id=source_id,
            )
        )
        employee.points_balance += points
    db.flush()
    evaluate_badges(db, employee)


def reverse(
    db: Session,
    employee: Employee,
    xp: int,
    points: int,
    source_type: str,
    source_id: int,
) -> None:
    """Undo a previous award with compensating ledger entries."""
    if xp:
        db.add(
            XpLedger(
                employee_id=employee.id, delta=-xp,
                reason=LedgerReason.APPROVAL_REVERSED,
                source_type=source_type, source_id=source_id,
            )
        )
        employee.xp_balance = max(0, employee.xp_balance - xp)
    if points:
        db.add(
            PointsLedger(
                employee_id=employee.id, delta=-points,
                reason=LedgerReason.APPROVAL_REVERSED,
                source_type=source_type, source_id=source_id,
            )
        )
        employee.points_balance = max(0, employee.points_balance - points)


def leaderboard(db: Session, limit: int = 20) -> list[Employee]:
    """Return employees ranked by XP for the leaderboard."""
    return list(
        db.scalars(select(Employee).order_by(Employee.xp_balance.desc()).limit(limit))
    )
