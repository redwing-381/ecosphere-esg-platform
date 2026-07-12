"""Rewards logic including atomic point-and-stock redemption."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.enums import LedgerReason
from app.models.gamification import PointsLedger, RewardRedemption
from app.models.master import Reward
from app.models.people import Employee


def list_rewards(db: Session) -> list[Reward]:
    return list(db.scalars(select(Reward).order_by(Reward.points_required)))


def create_reward(db: Session, data) -> Reward:
    reward = Reward(**data.model_dump())
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


def redeem(db: Session, reward_id: int, employee_id: int) -> RewardRedemption:
    """Redeem a reward atomically: lock the row, verify, deduct points and stock."""
    reward = db.execute(
        select(Reward).where(Reward.id == reward_id).with_for_update()
    ).scalar_one_or_none()
    if reward is None:
        raise NotFoundError("Reward not found")

    employee = db.get(Employee, employee_id)
    if employee is None:
        raise NotFoundError("Employee not found")

    if reward.stock <= 0:
        raise ConflictError("This reward is out of stock")
    if employee.points_balance < reward.points_required:
        raise ValidationError("You do not have enough points for this reward")

    reward.stock -= 1
    employee.points_balance -= reward.points_required
    db.add(
        PointsLedger(
            employee_id=employee_id,
            delta=-reward.points_required,
            reason=LedgerReason.REWARD_REDEEMED,
            source_type="reward",
            source_id=reward.id,
        )
    )
    redemption = RewardRedemption(
        employee_id=employee_id, reward_id=reward.id, points_spent=reward.points_required
    )
    db.add(redemption)
    db.commit()
    db.refresh(redemption)
    return redemption
