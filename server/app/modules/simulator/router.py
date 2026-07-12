"""What-If simulator endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user
from app.engines import simulator
from app.modules.simulator.schemas import (
    Recommendation,
    SimulationRequest,
    SimulationResult,
)

router = APIRouter(prefix="/simulator", tags=["simulator"])


@router.post("/run", response_model=SimulationResult)
def run(data: SimulationRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Project a department's scores under hypothetical improvements."""
    return simulator.simulate(
        db,
        data.department_id,
        carbon_reduction_pct=data.carbon_reduction_pct,
        add_csr=data.add_csr,
        add_training_completions=data.add_training_completions,
        resolve_issues=data.resolve_issues,
    )


@router.get("/recommendations/{department_id}", response_model=list[Recommendation])
def recommendations(
    department_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    """Rank improvement actions by projected score gain for a department."""
    return simulator.recommendations(db, department_id)
