"""Transactional models for the Governance module."""
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import IssueSeverity, IssueStatus


class PolicyAcknowledgement(Base):
    """An employee's acknowledgement of a specific policy version."""

    __tablename__ = "policy_acknowledgement"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "policy_id", "policy_version", name="uq_ack_per_version"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    policy_id: Mapped[int] = mapped_column(ForeignKey("esg_policy.id"), nullable=False)
    policy_version: Mapped[int] = mapped_column(Integer, nullable=False)
    acknowledged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Audit(Base):
    """A governance audit performed against a department."""

    __tablename__ = "audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    type: Mapped[str | None] = mapped_column(String(60))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"))
    auditor_id: Mapped[int | None] = mapped_column(ForeignKey("employee.id"))
    audit_date: Mapped[date] = mapped_column(Date, nullable=False)
    scope: Mapped[str | None] = mapped_column(Text)
    findings: Mapped[str | None] = mapped_column(Text)
    passed: Mapped[bool | None] = mapped_column(Boolean)

    department = relationship("Department")


class ComplianceIssue(Base):
    """A governance violation; must have an owner and a due date."""

    __tablename__ = "compliance_issue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    audit_id: Mapped[int | None] = mapped_column(ForeignKey("audit.id"))
    severity: Mapped[IssueSeverity] = mapped_column(
        Enum(IssueSeverity), default=IssueSeverity.MEDIUM, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus), default=IssueStatus.OPEN, nullable=False
    )
    is_overdue: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    owner = relationship("Employee", foreign_keys=[owner_id])
