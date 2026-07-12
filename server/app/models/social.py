"""Transactional models for the Social module."""
from datetime import date

from sqlalchemy import (
    Date,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ApprovalStatus, Status


class CSRActivity(Base):
    """A company-organized social initiative employees can join."""

    __tablename__ = "csr_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("category.id"))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"))
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(150))
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)

    category = relationship("Category")


class EmployeeParticipation(Base):
    """An employee's involvement in a CSR activity, subject to approval."""

    __tablename__ = "employee_participation"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "csr_activity_id", name="uq_participation_once"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    csr_activity_id: Mapped[int] = mapped_column(
        ForeignKey("csr_activity.id"), nullable=False
    )
    proof_url: Mapped[str | None] = mapped_column(String(255))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False
    )
    points_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_date: Mapped[date | None] = mapped_column(Date)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"))

    employee = relationship("Employee", foreign_keys=[employee_id])
    activity = relationship("CSRActivity")


class TrainingCompletion(Base):
    """Record of an employee completing a training course."""

    __tablename__ = "training_completion"
    __table_args__ = (
        UniqueConstraint("training_id", "employee_id", name="uq_training_once"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    training_id: Mapped[int] = mapped_column(ForeignKey("training.id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    completed_at: Mapped[date] = mapped_column(Date, nullable=False)
