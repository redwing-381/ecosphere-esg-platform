"""Schemas for the Governance module."""
from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import IssueSeverity, IssueStatus, Pillar, Status


class PolicyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    pillar: Pillar
    body: str | None = None
    effective_date: date
    requires_ack: bool = True


class PolicyOut(BaseModel):
    id: int
    name: str
    pillar: Pillar
    version: int
    effective_date: date
    requires_ack: bool
    status: Status

    model_config = {"from_attributes": True}


class AuditCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    type: str | None = None
    department_id: int | None = None
    auditor_id: int | None = None
    audit_date: date
    scope: str | None = None
    findings: str | None = None
    passed: bool | None = None


class AuditOut(BaseModel):
    id: int
    name: str
    department_id: int | None
    audit_date: date
    passed: bool | None

    model_config = {"from_attributes": True}


class IssueCreate(BaseModel):
    audit_id: int | None = None
    severity: IssueSeverity = IssueSeverity.MEDIUM
    description: str = Field(min_length=3)
    owner_id: int
    due_date: date


class IssueOut(BaseModel):
    id: int
    audit_id: int | None
    severity: IssueSeverity
    description: str
    owner_id: int
    due_date: date
    status: IssueStatus
    is_overdue: bool

    model_config = {"from_attributes": True}
