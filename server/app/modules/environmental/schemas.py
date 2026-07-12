"""Schemas for the Environmental module."""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import ActivityType, CarbonOrigin, Status


class EmissionFactorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    activity_type: ActivityType
    unit: str = Field(min_length=1, max_length=30)
    factor_value: Decimal = Field(ge=0)
    ghg_scope: int = Field(default=1, ge=1, le=3)
    effective_date: date


class EmissionFactorOut(BaseModel):
    id: int
    name: str
    activity_type: ActivityType
    unit: str
    factor_value: Decimal
    ghg_scope: int
    effective_date: date
    status: Status

    model_config = {"from_attributes": True}


class OperationalActivityCreate(BaseModel):
    type: ActivityType
    department_id: int
    description: str | None = None
    quantity: Decimal = Field(ge=0)
    unit: str = Field(min_length=1, max_length=30)
    emission_factor_id: int | None = None
    activity_date: date


class OperationalActivityOut(BaseModel):
    id: int
    type: ActivityType
    department_id: int
    quantity: Decimal
    unit: str
    emission_factor_id: int | None
    activity_date: date

    model_config = {"from_attributes": True}


class CarbonTransactionOut(BaseModel):
    id: int
    department_id: int
    quantity: Decimal
    factor_value_snapshot: Decimal
    co2e: Decimal
    origin: CarbonOrigin
    date: date

    model_config = {"from_attributes": True}


class DepartmentCarbon(BaseModel):
    department_id: int
    total_co2e: Decimal


class GoalCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    department_id: int | None = None
    metric: str = Field(min_length=1, max_length=120)
    baseline: Decimal = 0
    target: Decimal
    unit: str = Field(min_length=1, max_length=30)
    start_date: date
    end_date: date


class GoalOut(BaseModel):
    id: int
    name: str
    department_id: int | None
    metric: str
    baseline: Decimal
    target: Decimal
    unit: str
    start_date: date
    end_date: date
    status: Status

    model_config = {"from_attributes": True}
