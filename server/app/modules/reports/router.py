"""Report export endpoints (PDF and Excel)."""
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user
from app.modules.reports import service

router = APIRouter(prefix="/reports", tags=["reports"])

_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/esg.pdf")
def esg_pdf(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Download the ESG summary as a PDF."""
    return Response(
        content=service.esg_pdf(db),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=ecosphere-esg.pdf"},
    )


@router.get("/esg.xlsx")
def esg_excel(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Download the ESG summary as an Excel workbook."""
    return Response(
        content=service.esg_excel(db),
        media_type=_XLSX,
        headers={"Content-Disposition": "attachment; filename=ecosphere-esg.xlsx"},
    )
