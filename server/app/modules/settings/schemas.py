"""Schemas for organization settings."""
from pydantic import BaseModel, Field, model_validator


class SettingsOut(BaseModel):
    id: int
    name: str
    weight_env: int
    weight_social: int
    weight_gov: int
    auto_carbon: bool
    evidence_required: bool
    badge_auto_award: bool
    email_alerts: bool

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    weight_env: int | None = Field(default=None, ge=0, le=100)
    weight_social: int | None = Field(default=None, ge=0, le=100)
    weight_gov: int | None = Field(default=None, ge=0, le=100)
    auto_carbon: bool | None = None
    evidence_required: bool | None = None
    badge_auto_award: bool | None = None
    email_alerts: bool | None = None

    @model_validator(mode="after")
    def _weights_sum_to_100(self) -> "SettingsUpdate":
        weights = [self.weight_env, self.weight_social, self.weight_gov]
        if any(w is not None for w in weights):
            if any(w is None for w in weights):
                raise ValueError("Provide all three weights together")
            if sum(weights) != 100:
                raise ValueError("ESG weights must sum to 100")
        return self
