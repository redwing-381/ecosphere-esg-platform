"""Schemas for the What-If simulator."""
from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    department_id: int
    carbon_reduction_pct: float = Field(default=0, ge=0, le=100)
    add_csr: int = Field(default=0, ge=0)
    add_training_completions: int = Field(default=0, ge=0)
    resolve_issues: int = Field(default=0, ge=0)


class ScoreSet(BaseModel):
    environmental: float | None
    social: float | None
    governance: float | None
    total: float | None


class SimulationResult(BaseModel):
    baseline: ScoreSet
    projected: ScoreSet


class Recommendation(BaseModel):
    action: str
    projected_total: float
    gain: float
