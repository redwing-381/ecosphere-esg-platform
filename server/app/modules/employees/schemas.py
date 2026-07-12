"""Schemas for the Employee resource."""
from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import Status


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    department_id: int | None = None
    job_title: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    join_date: date | None = None


class EmployeeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    department_id: int | None = None
    job_title: str | None = None
    gender: str | None = None
    status: Status | None = None


class EmployeeOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    department_id: int | None
    job_title: str | None
    gender: str | None
    xp_balance: int
    points_balance: int
    status: Status

    model_config = {"from_attributes": True}
