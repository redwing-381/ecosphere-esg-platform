"""Transactional models for the Gamification module and XP/points ledgers."""
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
from app.models.enums import ApprovalStatus, ChallengeStatus, LedgerReason


class Challenge(Base):
    """A sustainability challenge with a full draft-to-completed lifecycle."""

    __tablename__ = "challenge"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("category.id"))
    description: Mapped[str | None] = mapped_column(Text)
    xp_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    difficulty: Mapped[str | None] = mapped_column(String(20))
    evidence_required: Mapped[bool] = mapped_column(Boolean, default=False)
    deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[ChallengeStatus] = mapped_column(
        Enum(ChallengeStatus), default=ChallengeStatus.DRAFT, nullable=False
    )

    category = relationship("Category")


class ChallengeParticipation(Base):
    """Tracks an employee's progress within a challenge."""

    __tablename__ = "challenge_participation"
    __table_args__ = (
        UniqueConstraint(
            "challenge_id", "employee_id", name="uq_challenge_participation_once"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    challenge_id: Mapped[int] = mapped_column(ForeignKey("challenge.id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    proof_url: Mapped[str | None] = mapped_column(String(255))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False
    )
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("employee.id"))

    challenge = relationship("Challenge")
    employee = relationship("Employee", foreign_keys=[employee_id])


class BadgeAward(Base):
    """Join record ensuring a badge is granted to an employee at most once."""

    __tablename__ = "badge_award"
    __table_args__ = (
        UniqueConstraint("badge_id", "employee_id", name="uq_badge_award_once"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    badge_id: Mapped[int] = mapped_column(ForeignKey("badge.id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    badge = relationship("Badge")


class RewardRedemption(Base):
    """Record of an employee spending points to redeem a reward."""

    __tablename__ = "reward_redemption"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    reward_id: Mapped[int] = mapped_column(ForeignKey("reward.id"), nullable=False)
    points_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    redeemed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    reward = relationship("Reward")


class XpLedger(Base):
    """Append-only log of XP changes; balance is the sum of deltas."""

    __tablename__ = "xp_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[LedgerReason] = mapped_column(Enum(LedgerReason), nullable=False)
    source_type: Mapped[str | None] = mapped_column(String(50))
    source_id: Mapped[int | None] = mapped_column(Integer)


class PointsLedger(Base):
    """Append-only log of point changes; balance is the sum of deltas."""

    __tablename__ = "points_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employee.id"), nullable=False)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[LedgerReason] = mapped_column(Enum(LedgerReason), nullable=False)
    source_type: Mapped[str | None] = mapped_column(String(50))
    source_id: Mapped[int | None] = mapped_column(Integer)
