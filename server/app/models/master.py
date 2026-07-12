"""Master (configuration) data models shared across modules."""
from datetime import date

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import (
    ActivityType,
    BadgeMetric,
    CategoryType,
    Pillar,
    Status,
)


class Department(Base):
    """Organizational unit that owns ESG performance; forms a tree."""

    __tablename__ = "department"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    head_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employee.id", use_alter=True, name="fk_department_head_employee")
    )
    parent_department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"))
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)

    parent = relationship("Department", remote_side=[id])
    head = relationship("Employee", foreign_keys=[head_employee_id])


class Category(Base):
    """Typed lookup values reused by CSR and Challenge modules."""

    __tablename__ = "category"
    __table_args__ = (UniqueConstraint("name", "type", name="uq_category_name_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    type: Mapped[CategoryType] = mapped_column(Enum(CategoryType), nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)


class EmissionFactor(Base):
    """Carbon coefficient used to convert an activity quantity into CO2e."""

    __tablename__ = "emission_factor"
    __table_args__ = (
        CheckConstraint("factor_value >= 0", name="ck_factor_non_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(ActivityType), nullable=False
    )
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    factor_value: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    ghg_scope: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)


class Product(Base):
    """Product with an attached ESG profile."""

    __tablename__ = "product"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    emission_factor_id: Mapped[int | None] = mapped_column(
        ForeignKey("emission_factor.id")
    )
    co2e_per_unit: Mapped[float | None] = mapped_column(Numeric(14, 4))
    recyclable_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    rating: Mapped[str | None] = mapped_column(String(10))


class EnvironmentalGoal(Base):
    """A measurable sustainability target for the org or a department."""

    __tablename__ = "environmental_goal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"))
    metric: Mapped[str] = mapped_column(String(120), nullable=False)
    baseline: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    target: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)


class ESGPolicy(Base):
    """A governance policy employees may be required to acknowledge."""

    __tablename__ = "esg_policy"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    pillar: Mapped[Pillar] = mapped_column(Enum(Pillar), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    requires_ack: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)


class Badge(Base):
    """Achievement auto-awarded when a structured unlock rule is satisfied."""

    __tablename__ = "badge"
    __table_args__ = (CheckConstraint("threshold >= 0", name="ck_badge_threshold"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    icon: Mapped[str | None] = mapped_column(String(80))
    metric: Mapped[BadgeMetric] = mapped_column(Enum(BadgeMetric), nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Reward(Base):
    """Catalog item redeemable with points."""

    __tablename__ = "reward"
    __table_args__ = (
        CheckConstraint("points_required >= 0", name="ck_reward_points"),
        CheckConstraint("stock >= 0", name="ck_reward_stock"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    points_required: Mapped[int] = mapped_column(Integer, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[Status] = mapped_column(Enum(Status), default=Status.ACTIVE)


class Training(Base):
    """A training course whose completion feeds the Social score."""

    __tablename__ = "training"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    pillar: Mapped[Pillar] = mapped_column(Enum(Pillar), default=Pillar.SOCIAL)
    mandatory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
