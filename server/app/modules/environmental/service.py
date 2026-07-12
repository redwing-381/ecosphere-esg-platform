"""Environmental logic: factors, operations, carbon tracking and goals."""
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.engines.carbon import carbon_from_activity
from app.models.enums import CarbonOrigin
from app.models.environmental import CarbonTransaction, OperationalActivity
from app.models.master import EmissionFactor, EnvironmentalGoal
from app.modules.environmental.schemas import (
    EmissionFactorCreate,
    GoalCreate,
    OperationalActivityCreate,
)
from app.modules.settings.service import get_organization


def list_factors(db: Session) -> list[EmissionFactor]:
    return list(db.scalars(select(EmissionFactor).order_by(EmissionFactor.name)))


def create_factor(db: Session, data: EmissionFactorCreate) -> EmissionFactor:
    factor = EmissionFactor(**data.model_dump())
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return factor


def create_activity(db: Session, data: OperationalActivityCreate) -> OperationalActivity:
    """Create an operation and auto-generate its carbon transaction when enabled."""
    activity = OperationalActivity(**data.model_dump())
    db.add(activity)
    db.flush()

    org = get_organization(db)
    if org.auto_carbon:
        db.add(carbon_from_activity(db, activity, CarbonOrigin.AUTO))

    db.commit()
    db.refresh(activity)
    return activity


def list_activities(db: Session, department_id: int | None = None) -> list[OperationalActivity]:
    stmt = select(OperationalActivity).order_by(OperationalActivity.activity_date.desc())
    if department_id is not None:
        stmt = stmt.where(OperationalActivity.department_id == department_id)
    return list(db.scalars(stmt))


def list_carbon(db: Session, department_id: int | None = None) -> list[CarbonTransaction]:
    stmt = select(CarbonTransaction).order_by(CarbonTransaction.date.desc())
    if department_id is not None:
        stmt = stmt.where(CarbonTransaction.department_id == department_id)
    return list(db.scalars(stmt))


def carbon_by_department(db: Session) -> list[dict]:
    """Aggregate total emissions per department."""
    rows = db.execute(
        select(
            CarbonTransaction.department_id,
            func.coalesce(func.sum(CarbonTransaction.co2e), 0),
        ).group_by(CarbonTransaction.department_id)
    ).all()
    return [{"department_id": dept, "total_co2e": total} for dept, total in rows]


def list_goals(db: Session) -> list[EnvironmentalGoal]:
    return list(db.scalars(select(EnvironmentalGoal).order_by(EnvironmentalGoal.end_date)))


def create_goal(db: Session, data: GoalCreate) -> EnvironmentalGoal:
    if data.end_date < data.start_date:
        raise ValidationError("End date cannot be before start date")
    if data.target <= 0:
        raise ValidationError("Target must be greater than zero")
    goal = EnvironmentalGoal(**data.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal
