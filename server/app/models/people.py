"""User accounts and employee records."""
from datetime import date

from sqlalchemy import (
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import Status, UserRole


class Employee(Base):
    """A person in the organization who participates in ESG activities."""

    __tablename__ = "employee"
    __table_args__ = (
        CheckConstraint("xp_balance >= 0", name="ck_employee_xp_non_negative"),
        CheckConstraint("points_balance >= 0", name="ck_employee_points_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("department.id"), nullable=True
    )
    job_title: Mapped[str | None] = mapped_column(String(120))
    gender: Mapped[str | None] = mapped_column(String(30))
    birth_date: Mapped[date | None] = mapped_column(Date)
    join_date: Mapped[date | None] = mapped_column(Date)
    xp_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)

    department = relationship("Department", foreign_keys=[department_id])
    user = relationship("User", back_populates="employee", uselist=False)


class User(Base):
    """Authentication account linked to an employee, carrying a role."""

    __tablename__ = "app_user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False
    )
    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employee.id"), unique=True
    )
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)

    employee = relationship("Employee", back_populates="user")
