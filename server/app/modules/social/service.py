"""Social logic: categories, CSR activities, participation and training."""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.engines import gamification
from app.models.enums import (
    ApprovalStatus,
    CategoryType,
    LedgerReason,
    NotificationType,
    Status,
)
from app.models.master import Category, Training
from app.models.notification import Notification
from app.models.people import Employee
from app.models.social import CSRActivity, EmployeeParticipation, TrainingCompletion
from app.modules.settings.service import get_organization
from app.modules.social.schemas import (
    CategoryCreate,
    CSRActivityCreate,
    TrainingCreate,
)


def list_categories(db: Session, type_: CategoryType | None = None) -> list[Category]:
    stmt = select(Category).order_by(Category.name)
    if type_ is not None:
        stmt = stmt.where(Category.type == type_)
    return list(db.scalars(stmt))


def create_category(db: Session, data: CategoryCreate) -> Category:
    exists = db.scalar(
        select(Category).where(Category.name == data.name, Category.type == data.type)
    )
    if exists:
        raise ConflictError("This category already exists")
    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def list_csr(db: Session) -> list[CSRActivity]:
    return list(db.scalars(select(CSRActivity).order_by(CSRActivity.activity_date.desc())))


def create_csr(db: Session, data: CSRActivityCreate) -> CSRActivity:
    activity = CSRActivity(**data.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def join_csr(db: Session, activity_id: int, employee_id: int) -> EmployeeParticipation:
    """Register an employee for a CSR activity, respecting capacity."""
    activity = db.get(CSRActivity, activity_id)
    if activity is None:
        raise NotFoundError("CSR activity not found")

    already = db.scalar(
        select(EmployeeParticipation).where(
            EmployeeParticipation.employee_id == employee_id,
            EmployeeParticipation.csr_activity_id == activity_id,
        )
    )
    if already:
        raise ConflictError("You have already joined this activity")

    if activity.capacity is not None:
        count = db.scalar(
            select(func.count())
            .select_from(EmployeeParticipation)
            .where(EmployeeParticipation.csr_activity_id == activity_id)
        )
        if count >= activity.capacity:
            raise ConflictError("This activity is already at full capacity")

    participation = EmployeeParticipation(
        employee_id=employee_id, csr_activity_id=activity_id
    )
    db.add(participation)
    db.commit()
    db.refresh(participation)
    return participation


def attach_proof(db: Session, participation_id: int, proof_url: str) -> EmployeeParticipation:
    participation = _get_participation(db, participation_id)
    participation.proof_url = proof_url
    db.commit()
    db.refresh(participation)
    return participation


def _get_participation(db: Session, participation_id: int) -> EmployeeParticipation:
    participation = db.get(EmployeeParticipation, participation_id)
    if participation is None:
        raise NotFoundError("Participation not found")
    return participation


def approve_participation(
    db: Session, participation_id: int, reviewer_id: int
) -> EmployeeParticipation:
    """Approve a participation, enforcing evidence and awarding XP/points."""
    participation = _get_participation(db, participation_id)
    if participation.approval_status != ApprovalStatus.PENDING:
        raise ConflictError("This participation has already been reviewed")

    org = get_organization(db)
    if org.evidence_required and not participation.proof_url:
        raise ValidationError("A proof file is required before approval")

    activity = db.get(CSRActivity, participation.csr_activity_id)
    employee = db.get(Employee, participation.employee_id)

    participation.approval_status = ApprovalStatus.APPROVED
    participation.reviewed_by = reviewer_id
    participation.completion_date = date.today()
    participation.xp_earned = activity.xp_reward
    participation.points_earned = activity.points_reward

    gamification.award(
        db, employee, activity.xp_reward, activity.points_reward,
        LedgerReason.CSR_APPROVED, "csr_participation", participation.id,
    )
    _notify_decision(db, employee.id, "CSR participation", True)
    db.commit()
    db.refresh(participation)
    return participation


def reject_participation(
    db: Session, participation_id: int, reviewer_id: int
) -> EmployeeParticipation:
    participation = _get_participation(db, participation_id)
    if participation.approval_status != ApprovalStatus.PENDING:
        raise ConflictError("This participation has already been reviewed")
    participation.approval_status = ApprovalStatus.REJECTED
    participation.reviewed_by = reviewer_id
    _notify_decision(db, participation.employee_id, "CSR participation", False)
    db.commit()
    db.refresh(participation)
    return participation


def _notify_decision(db: Session, employee_id: int, subject: str, approved: bool) -> None:
    verb = "approved" if approved else "rejected"
    db.add(
        Notification(
            recipient_id=employee_id,
            type=NotificationType.APPROVAL_DECISION,
            message=f"Your {subject} was {verb}.",
        )
    )


def list_trainings(db: Session) -> list[Training]:
    return list(db.scalars(select(Training).order_by(Training.name)))


def create_training(db: Session, data: TrainingCreate) -> Training:
    training = Training(**data.model_dump())
    db.add(training)
    db.commit()
    db.refresh(training)
    return training


def complete_training(db: Session, training_id: int, employee_id: int) -> TrainingCompletion:
    if db.get(Training, training_id) is None:
        raise NotFoundError("Training not found")
    exists = db.scalar(
        select(TrainingCompletion).where(
            TrainingCompletion.training_id == training_id,
            TrainingCompletion.employee_id == employee_id,
        )
    )
    if exists:
        raise ConflictError("Training already completed")
    completion = TrainingCompletion(
        training_id=training_id, employee_id=employee_id, completed_at=date.today()
    )
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


def diversity_breakdown(db: Session) -> list[dict]:
    """Count active employees grouped by department and gender."""
    rows = db.execute(
        select(Employee.department_id, Employee.gender, func.count())
        .where(Employee.status == Status.ACTIVE)
        .group_by(Employee.department_id, Employee.gender)
    ).all()
    return [{"department_id": d, "gender": g, "count": c} for d, g, c in rows]
