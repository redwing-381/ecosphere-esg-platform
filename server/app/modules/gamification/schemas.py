"""Schemas for the Gamification module."""
from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import ApprovalStatus, BadgeMetric, ChallengeStatus


class ChallengeCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    category_id: int | None = None
    description: str | None = None
    xp_reward: int = Field(default=0, ge=0)
    points_reward: int = Field(default=0, ge=0)
    difficulty: str | None = None
    evidence_required: bool = False
    deadline: date | None = None


class ChallengeOut(BaseModel):
    id: int
    title: str
    category_id: int | None
    xp_reward: int
    points_reward: int
    difficulty: str | None
    evidence_required: bool
    deadline: date | None
    status: ChallengeStatus

    model_config = {"from_attributes": True}


class TransitionRequest(BaseModel):
    status: ChallengeStatus


class ChallengeParticipationOut(BaseModel):
    id: int
    challenge_id: int
    employee_id: int
    progress: int
    proof_url: str | None
    approval_status: ApprovalStatus
    xp_awarded: int
    points_awarded: int

    model_config = {"from_attributes": True}


class BadgeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = None
    icon: str | None = None
    metric: BadgeMetric
    threshold: int = Field(ge=0)


class BadgeOut(BaseModel):
    id: int
    name: str
    description: str | None
    icon: str | None
    metric: BadgeMetric
    threshold: int
    active: bool

    model_config = {"from_attributes": True}


class LeaderboardRow(BaseModel):
    employee_id: int
    name: str
    xp_balance: int
