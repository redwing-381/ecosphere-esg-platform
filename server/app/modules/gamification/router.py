"""Gamification module endpoints."""
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationError
from app.core.uploads import save_proof
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.people import User
from app.modules.gamification import service
from app.modules.gamification.schemas import (
    BadgeCreate,
    BadgeOut,
    ChallengeCreate,
    ChallengeOut,
    ChallengeParticipationOut,
    LeaderboardRow,
    TransitionRequest,
)

router = APIRouter(prefix="/gamification", tags=["gamification"])
manage = require_roles(UserRole.ADMIN, UserRole.DEPT_HEAD)
admin_only = require_roles(UserRole.ADMIN)


def _employee_id(user: User) -> int:
    if user.employee_id is None:
        raise ValidationError("Your account is not linked to an employee")
    return user.employee_id


@router.get("/challenges", response_model=list[ChallengeOut])
def list_challenges(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List challenges."""
    return service.list_challenges(db)


@router.post("/challenges", response_model=ChallengeOut, status_code=201)
def create_challenge(data: ChallengeCreate, db: Session = Depends(get_db), _=Depends(manage)):
    """Create a challenge (starts in draft)."""
    return service.create_challenge(db, data)


@router.post("/challenges/{challenge_id}/transition", response_model=ChallengeOut)
def transition(
    challenge_id: int, data: TransitionRequest, db: Session = Depends(get_db), _=Depends(manage)
):
    """Move a challenge along its lifecycle."""
    return service.transition(db, challenge_id, data.status)


@router.post("/challenges/{challenge_id}/join", response_model=ChallengeParticipationOut, status_code=201)
def join(challenge_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Join an active challenge."""
    return service.join_challenge(db, challenge_id, _employee_id(user))


@router.post("/participations/{participation_id}/proof", response_model=ChallengeParticipationOut)
def submit_proof(
    participation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Submit proof for a challenge participation."""
    return service.submit_proof(db, participation_id, save_proof(file))


@router.post("/participations/{participation_id}/approve", response_model=ChallengeParticipationOut)
def approve(participation_id: int, db: Session = Depends(get_db), user: User = Depends(manage)):
    """Approve a challenge submission and award XP/points."""
    return service.approve_challenge(db, participation_id, _employee_id(user))


@router.post("/participations/{participation_id}/reject", response_model=ChallengeParticipationOut)
def reject(participation_id: int, db: Session = Depends(get_db), user: User = Depends(manage)):
    """Reject a challenge submission."""
    return service.reject_challenge(db, participation_id, _employee_id(user))


@router.get("/badges", response_model=list[BadgeOut])
def list_badges(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List badges and their unlock rules."""
    return service.list_badges(db)


@router.post("/badges", response_model=BadgeOut, status_code=201)
def create_badge(data: BadgeCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    """Create a badge with a structured unlock rule."""
    return service.create_badge(db, data)


@router.get("/employees/{employee_id}/badges", response_model=list[BadgeOut])
def employee_badges(employee_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List badges earned by an employee."""
    return service.employee_badges(db, employee_id)


@router.get("/leaderboard", response_model=list[LeaderboardRow])
def leaderboard(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return the XP leaderboard."""
    return service.leaderboard(db)
