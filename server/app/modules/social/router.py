"""Social module endpoints."""
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationError
from app.core.uploads import save_proof
from app.deps.auth import get_current_user, require_roles
from app.models.enums import ApprovalStatus, CategoryType, UserRole
from app.models.people import Employee, User
from app.modules.social import service
from app.modules.social.schemas import (
    AssignmentRequest,
    CategoryCreate,
    CategoryOut,
    CSRActivityCreate,
    CSRActivityOut,
    DiversityRow,
    MyTrainingOut,
    ParticipationDetail,
    ParticipationOut,
    TrainingCreate,
    TrainingOut,
    TrainingUpdate,
)

router = APIRouter(prefix="/social", tags=["social"])
manage = require_roles(UserRole.ADMIN, UserRole.DEPT_HEAD)
admin_only = require_roles(UserRole.ADMIN)


def _employee_id(user: User) -> int:
    if user.employee_id is None:
        raise ValidationError("Your account is not linked to an employee")
    return user.employee_id


def _review_scope(db: Session, user: User) -> int | None:
    """Return the department a reviewer is limited to (None for admins)."""
    if user.role == UserRole.DEPT_HEAD and user.employee_id:
        employee = db.get(Employee, user.employee_id)
        return employee.department_id if employee else None
    return None


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    type: CategoryType | None = None, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    """List categories, optionally filtered by type."""
    return service.list_categories(db, type)


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _=Depends(manage)):
    """Create a category."""
    return service.create_category(db, data)


@router.get("/csr-activities", response_model=list[CSRActivityOut])
def list_csr(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List CSR activities."""
    return service.list_csr(db)


@router.post("/csr-activities", response_model=CSRActivityOut, status_code=201)
def create_csr(data: CSRActivityCreate, db: Session = Depends(get_db), _=Depends(manage)):
    """Create a CSR activity."""
    return service.create_csr(db, data)


@router.post("/csr-activities/{activity_id}/join", response_model=ParticipationOut, status_code=201)
def join_csr(activity_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Join a CSR activity as the current employee."""
    return service.join_csr(db, activity_id, _employee_id(user))


@router.get("/participations", response_model=list[ParticipationDetail])
def list_participations(
    status: ApprovalStatus | None = None,
    mine: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List participations. Employees see their own; managers see their scope."""
    if mine or user.role == UserRole.EMPLOYEE:
        return service.list_participations(db, employee_id=_employee_id(user), status=status)
    return service.list_participations(db, dept_id=_review_scope(db, user), status=status)


@router.post("/participations/{participation_id}/proof", response_model=ParticipationOut)
def upload_proof(
    participation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Attach a proof file to a participation."""
    return service.attach_proof(db, participation_id, save_proof(file))


@router.post("/participations/{participation_id}/approve", response_model=ParticipationOut)
def approve(
    participation_id: int, db: Session = Depends(get_db), user: User = Depends(manage)
):
    """Approve a participation and award XP/points."""
    return service.approve_participation(
        db, participation_id, _employee_id(user), _review_scope(db, user)
    )


@router.post("/participations/{participation_id}/reject", response_model=ParticipationOut)
def reject(
    participation_id: int, db: Session = Depends(get_db), user: User = Depends(manage)
):
    """Reject a participation."""
    return service.reject_participation(
        db, participation_id, _employee_id(user), _review_scope(db, user)
    )


@router.get("/trainings", response_model=list[TrainingOut])
def list_trainings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List all training courses (managers and admins)."""
    return service.list_trainings(db)


@router.get("/my-trainings", response_model=list[MyTrainingOut])
def my_trainings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List only the courses enabled for the current employee."""
    return service.list_my_trainings(db, _employee_id(user))


@router.post("/trainings", response_model=TrainingOut, status_code=201)
def create_training(data: TrainingCreate, db: Session = Depends(get_db), _=Depends(admin_only)):
    """Create a training course (admin only)."""
    return service.create_training(db, data)


@router.patch("/trainings/{training_id}", response_model=TrainingOut)
def update_training(
    training_id: int, data: TrainingUpdate, db: Session = Depends(get_db), _=Depends(admin_only)
):
    """Modify a training course (admin only)."""
    return service.update_training(db, training_id, data)


@router.delete("/trainings/{training_id}", status_code=204)
def delete_training(training_id: int, db: Session = Depends(get_db), _=Depends(admin_only)):
    """Delete a training course (admin only)."""
    service.delete_training(db, training_id)


@router.get("/trainings/{training_id}/assignments", response_model=list[int])
def training_assignments(training_id: int, db: Session = Depends(get_db), _=Depends(manage)):
    """List the employee ids a course is enabled for."""
    return service.list_assigned_employees(db, training_id)


@router.post("/trainings/{training_id}/assign")
def assign_training(
    training_id: int,
    data: AssignmentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(manage),
):
    """Enable a course for employees (dept heads limited to their department)."""
    scope = _review_scope(db, user)
    if scope is not None:
        allowed = {e.id for e in db.query(Employee).filter(Employee.department_id == scope)}
        invalid = [e for e in data.employee_ids if e not in allowed]
        if invalid:
            raise ValidationError("You can only assign courses to your own department")
    return {"assigned": service.assign_training(db, training_id, data.employee_ids, _employee_id(user))}


@router.post("/trainings/{training_id}/complete", status_code=201)
def complete_training(
    training_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Mark a training as completed by the current employee."""
    service.complete_training(db, training_id, _employee_id(user))
    return {"message": "Training marked as completed"}


@router.get("/diversity", response_model=list[DiversityRow])
def diversity(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return diversity breakdown by department and gender."""
    return service.diversity_breakdown(db)
