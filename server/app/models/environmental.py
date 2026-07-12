"""Transactional models for the Environmental module."""
from datetime import date

from sqlalchemy import (
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ActivityType, CarbonOrigin


class OperationalActivity(Base):
    """A business operation (purchase/manufacturing/expense/fleet) that emits carbon."""

    __tablename__ = "operational_activity"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_activity_quantity_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType), nullable=False)
    department_id: Mapped[int] = mapped_column(
        ForeignKey("department.id"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(255))
    quantity: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    emission_factor_id: Mapped[int | None] = mapped_column(
        ForeignKey("emission_factor.id")
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"))

    department = relationship("Department")
    emission_factor = relationship("EmissionFactor")


class CarbonTransaction(Base):
    """A calculated emission record; factor value is frozen for history integrity."""

    __tablename__ = "carbon_transaction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operational_activity_id: Mapped[int | None] = mapped_column(
        ForeignKey("operational_activity.id")
    )
    department_id: Mapped[int] = mapped_column(
        ForeignKey("department.id"), nullable=False
    )
    emission_factor_id: Mapped[int | None] = mapped_column(
        ForeignKey("emission_factor.id")
    )
    quantity: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    factor_value_snapshot: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    co2e: Mapped[float] = mapped_column(Numeric(16, 4), nullable=False)
    origin: Mapped[CarbonOrigin] = mapped_column(
        Enum(CarbonOrigin), default=CarbonOrigin.MANUAL, nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    department = relationship("Department")
