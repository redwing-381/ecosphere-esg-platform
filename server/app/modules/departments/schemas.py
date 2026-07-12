"""Schemas for the Department resource."""
from pydantic import BaseModel, Field

from app.models.enums import Status


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=1, max_length=30)
    head_employee_id: int | None = None
    parent_department_id: int | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    head_employee_id: int | None = None
    parent_department_id: int | None = None
    status: Status | None = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str
    head_employee_id: int | None
    parent_department_id: int | None
    status: Status

    model_config = {"from_attributes": True}
