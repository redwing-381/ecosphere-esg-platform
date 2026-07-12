"""Rewards module endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationError
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.people import User
from app.modules.rewards import service
from app.modules.rewards.schemas import RedemptionOut, RewardCreate, RewardOut

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("", response_model=list[RewardOut])
def list_rewards(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List the reward catalog."""
    return service.list_rewards(db)


@router.post("", response_model=RewardOut, status_code=201)
def create_reward(
    data: RewardCreate, db: Session = Depends(get_db), _=Depends(require_roles(UserRole.ADMIN))
):
    """Add a reward to the catalog (admin only)."""
    return service.create_reward(db, data)


@router.post("/{reward_id}/redeem", response_model=RedemptionOut, status_code=201)
def redeem(reward_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Redeem a reward using the current employee's points."""
    if user.employee_id is None:
        raise ValidationError("Your account is not linked to an employee")
    return service.redeem(db, reward_id, user.employee_id)
