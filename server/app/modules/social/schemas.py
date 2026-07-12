"""Schemas for the Social module."""
from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import ApprovalStatus, CategoryType, Status


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    type: CategoryType


class CategoryOut(BaseModel):
    id: int
    name: str
    type: CategoryType
    status: Status

    model_config = {"from_attributes": True}


class CSRActivityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    category_id: int | None = None
    department_id: int | None = None
    description: str | None = None
    location: str | None = None
    activity_date: date
    xp_reward: int = Field(default=0, ge=0)
    points_reward: int = Field(default=0, ge=0)
    capacity: int | None = Field(default=None, ge=1)


class CSRActivityOut(BaseModel):
    id: int
    name: str
    category_id: int | None
    department_id: int | None
    activity_date: date
    xp_reward: int
    points_reward: int
    capacity: int | None
    status: Status

    model_config = {"from_attributes": True}


class ParticipationOut(BaseModel):
    id: int
    employee_id: int
    csr_activity_id: int
    proof_url: str | None
    approval_status: ApprovalStatus
    points_earned: int
    xp_earned: int

    model_config = {"from_attributes": True}


class TrainingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    mandatory: bool = False


class TrainingOut(BaseModel):
    id: int
    name: str
    mandatory: bool

    model_config = {"from_attributes": True}


class DiversityRow(BaseModel):
    department_id: int | None
    gender: str | None
    count: int
