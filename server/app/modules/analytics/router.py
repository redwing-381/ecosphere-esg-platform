"""Analytics, scoring and dashboard endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.people import Employee, User
from app.modules.analytics import service
from app.modules.analytics.schemas import (
    ActivityItem,
    DashboardOut,
    MonthlyEmission,
    ScoresResponse,
    TrendPoint,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/scores", response_model=ScoresResponse)
def scores(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return live per-department and overall ESG scores."""
    return service.scores(db)


@router.post("/snapshot")
def snapshot(db: Session = Depends(get_db), _=Depends(require_roles(UserRole.ADMIN))):
    """Store a dated snapshot of current scores for trend analysis."""
    return {"snapshotted": service.snapshot(db)}


@router.get("/trends/{department_id}", response_model=list[TrendPoint])
def trends(department_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return a department's score history."""
    return service.trends(db, department_id)


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return headline dashboard metrics including the E/S/G/ESG split."""
    return service.dashboard(db)


@router.get("/emissions-trend", response_model=list[MonthlyEmission])
def emissions_trend(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return monthly CO2e totals for the last 12 months."""
    return service.emissions_trend(db)


@router.get("/recent-activity", response_model=list[ActivityItem])
def recent_activity(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return a recent-activity feed scoped to the caller's role."""
    if user.role == UserRole.ADMIN:
        return service.recent_activity(db, org_wide=True)
    if user.role == UserRole.DEPT_HEAD:
        dept_id = None
        if user.employee_id:
            employee = db.get(Employee, user.employee_id)
            dept_id = employee.department_id if employee else None
        return service.recent_activity(db, dept_id=dept_id)
    return service.recent_activity(db, employee_id=user.employee_id)
