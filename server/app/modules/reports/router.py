"""Report export endpoints (PDF, Excel and CSV)."""
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user
from app.modules.reports import service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/generate")
def generate(
    module: str,
    format: str = "pdf",
    start: date | None = None,
    end: date | None = None,
    department_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Generate a module report in the requested format with optional filters."""
    content, filename = service.generate(db, module, format, start, end, department_id)
    return Response(
        content=content,
        media_type=service.MEDIA_TYPES[format],
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
