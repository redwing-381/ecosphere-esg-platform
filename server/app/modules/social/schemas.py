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
    joined_count: int = 0
    spots_left: int | None = None
    my_status: str | None = None

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


class ParticipationDetail(BaseModel):
    """Participation enriched with employee and activity names for review queues."""

    id: int
    employee_id: int
    employee_name: str
    csr_activity_id: int
    activity_name: str
    proof_url: str | None
    approval_status: ApprovalStatus
    xp_earned: int
    points_earned: int


class TrainingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    mandatory: bool = False


class TrainingUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    mandatory: bool | None = None


class TrainingOut(BaseModel):
    id: int
    name: str
    description: str | None
    mandatory: bool

    model_config = {"from_attributes": True}


class AssignmentRequest(BaseModel):
    """Employees a course is being enabled for."""

    employee_ids: list[int] = Field(min_length=1)


class MyTrainingOut(BaseModel):
    """A course enabled for the current employee, with completion state."""

    id: int
    name: str
    description: str | None
    mandatory: bool
    completed: bool


class DiversityRow(BaseModel):
    department_id: int | None
    gender: str | None
    count: int
