"""Snapshot model storing computed ESG scores over time."""
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DepartmentScore(Base):
    """A dated snapshot of a department's ESG scores for trend analysis."""

    __tablename__ = "department_score"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_id: Mapped[int] = mapped_column(
        ForeignKey("department.id"), nullable=False, index=True
    )
    env_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    social_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    gov_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    total_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    department = relationship("Department")
