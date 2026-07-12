"""Gamification logic: challenge lifecycle, participation, badges, leaderboard."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.engines import gamification
from app.models.enums import ApprovalStatus, ChallengeStatus, LedgerReason
from app.models.gamification import BadgeAward, Challenge, ChallengeParticipation
from app.models.master import Badge
from app.models.people import Employee
from app.modules.gamification.schemas import BadgeCreate, ChallengeCreate

# Allowed forward transitions; Archived is reachable from any state.
_TRANSITIONS = {
    ChallengeStatus.DRAFT: {ChallengeStatus.ACTIVE, ChallengeStatus.ARCHIVED},
    ChallengeStatus.ACTIVE: {ChallengeStatus.UNDER_REVIEW, ChallengeStatus.ARCHIVED},
    ChallengeStatus.UNDER_REVIEW: {ChallengeStatus.COMPLETED, ChallengeStatus.ARCHIVED},
    ChallengeStatus.COMPLETED: {ChallengeStatus.ARCHIVED},
    ChallengeStatus.ARCHIVED: set(),
}


def list_challenges(db: Session) -> list[Challenge]:
    return list(db.scalars(select(Challenge).order_by(Challenge.id.desc())))


def create_challenge(db: Session, data: ChallengeCreate) -> Challenge:
    challenge = Challenge(**data.model_dump())
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


def transition(db: Session, challenge_id: int, target: ChallengeStatus) -> Challenge:
    """Move a challenge to a new lifecycle state if the transition is allowed."""
    challenge = db.get(Challenge, challenge_id)
    if challenge is None:
        raise NotFoundError("Challenge not found")
    if target not in _TRANSITIONS[challenge.status]:
        raise ValidationError(
            f"Cannot move a challenge from {challenge.status.value} to {target.value}"
        )
    challenge.status = target
    db.commit()
    db.refresh(challenge)
    return challenge


def join_challenge(db: Session, challenge_id: int, employee_id: int) -> ChallengeParticipation:
    challenge = db.get(Challenge, challenge_id)
    if challenge is None:
        raise NotFoundError("Challenge not found")
    if challenge.status != ChallengeStatus.ACTIVE:
        raise ConflictError("This challenge is not open for participation")
    if db.scalar(
        select(ChallengeParticipation).where(
            ChallengeParticipation.challenge_id == challenge_id,
            ChallengeParticipation.employee_id == employee_id,
        )
    ):
        raise ConflictError("You have already joined this challenge")
    participation = ChallengeParticipation(
        challenge_id=challenge_id, employee_id=employee_id
    )
    db.add(participation)
    db.commit()
    db.refresh(participation)
    return participation


def _get_participation(db: Session, participation_id: int) -> ChallengeParticipation:
    participation = db.get(ChallengeParticipation, participation_id)
    if participation is None:
        raise NotFoundError("Participation not found")
    return participation


def submit_proof(db: Session, participation_id: int, proof_url: str) -> ChallengeParticipation:
    participation = _get_participation(db, participation_id)
    participation.proof_url = proof_url
    participation.progress = 100
    db.commit()
    db.refresh(participation)
    return participation


def approve_challenge(
    db: Session, participation_id: int, reviewer_id: int
) -> ChallengeParticipation:
    """Approve challenge completion, enforcing evidence and awarding XP/points."""
    participation = _get_participation(db, participation_id)
    if participation.approval_status != ApprovalStatus.PENDING:
        raise ConflictError("This submission has already been reviewed")

    challenge = db.get(Challenge, participation.challenge_id)
    if challenge.evidence_required and not participation.proof_url:
        raise ValidationError("A proof file is required before approval")

    employee = db.get(Employee, participation.employee_id)
    participation.approval_status = ApprovalStatus.APPROVED
    participation.reviewed_by = reviewer_id
    participation.xp_awarded = challenge.xp_reward
    participation.points_awarded = challenge.points_reward

    gamification.award(
        db, employee, challenge.xp_reward, challenge.points_reward,
        LedgerReason.CHALLENGE_APPROVED, "challenge_participation", participation.id,
    )
    db.commit()
    db.refresh(participation)
    return participation


def reject_challenge(
    db: Session, participation_id: int, reviewer_id: int
) -> ChallengeParticipation:
    participation = _get_participation(db, participation_id)
    if participation.approval_status != ApprovalStatus.PENDING:
        raise ConflictError("This submission has already been reviewed")
    participation.approval_status = ApprovalStatus.REJECTED
    participation.reviewed_by = reviewer_id
    db.commit()
    db.refresh(participation)
    return participation


def list_badges(db: Session) -> list[Badge]:
    return list(db.scalars(select(Badge).order_by(Badge.threshold)))


def create_badge(db: Session, data: BadgeCreate) -> Badge:
    badge = Badge(**data.model_dump())
    db.add(badge)
    db.commit()
    db.refresh(badge)
    return badge


def employee_badges(db: Session, employee_id: int) -> list[Badge]:
    return list(
        db.scalars(
            select(Badge)
            .join(BadgeAward, BadgeAward.badge_id == Badge.id)
            .where(BadgeAward.employee_id == employee_id)
        )
    )


def leaderboard(db: Session) -> list[dict]:
    rows = gamification.leaderboard(db)
    return [
        {"employee_id": e.id, "name": e.name, "xp_balance": e.xp_balance} for e in rows
    ]
