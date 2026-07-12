"""Schemas for the Rewards module."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Status


class RewardCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    points_required: int = Field(ge=0)
    stock: int = Field(default=0, ge=0)


class RewardOut(BaseModel):
    id: int
    name: str
    description: str | None
    points_required: int
    stock: int
    status: Status

    model_config = {"from_attributes": True}


class RedemptionOut(BaseModel):
    id: int
    employee_id: int
    reward_id: int
    points_spent: int
    redeemed_at: datetime

    model_config = {"from_attributes": True}
