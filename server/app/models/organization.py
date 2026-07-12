"""Organization-level configuration and ESG weighting."""
from sqlalchemy import Boolean, CheckConstraint, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Organization(Base):
    """Single-tenant organization settings, weights and feature toggles."""

    __tablename__ = "organization"
    __table_args__ = (
        CheckConstraint(
            "weight_env + weight_social + weight_gov = 100", name="ck_weights_sum_100"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    weight_env: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    weight_social: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    weight_gov: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    auto_carbon: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    evidence_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    badge_auto_award: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_alerts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
