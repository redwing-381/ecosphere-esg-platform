"""Schemas for analytics, scores and dashboard."""
from datetime import date, datetime

from pydantic import BaseModel


class DeptScoreOut(BaseModel):
    department_id: int
    environmental: float | None
    social: float | None
    governance: float | None
    total: float | None


class ScoresResponse(BaseModel):
    overall: float | None
    departments: list[DeptScoreOut]


class TrendPoint(BaseModel):
    snapshot_date: date
    total_score: float


class DashboardOut(BaseModel):
    overall_score: float | None
    env_score: float | None
    social_score: float | None
    gov_score: float | None
    total_co2e: float
    open_issues: int
    employee_count: int


class MonthlyEmission(BaseModel):
    month: str
    co2e: float


class ActivityItem(BaseModel):
    message: str
    type: str
    created_at: datetime
