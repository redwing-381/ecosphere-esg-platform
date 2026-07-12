"""Generate ESG summary reports as PDF and Excel byte streams."""
from datetime import date
from io import BytesIO

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.engines import scoring
from app.models.master import Department
from app.modules.analytics.service import dashboard


def _rows(db: Session) -> list[tuple]:
    names = {d.id: d.name for d in db.scalars(select(Department))}
    rows = []
    for s in scoring.score_all(db):
        rows.append(
            (
                names.get(s.department_id, str(s.department_id)),
                _fmt(s.environmental),
                _fmt(s.social),
                _fmt(s.governance),
                _fmt(s.total),
            )
        )
    return rows


def _fmt(value: float | None) -> str:
    return "-" if value is None else f"{value:.1f}"


def esg_pdf(db: Session) -> bytes:
    """Build a one-page ESG summary PDF."""
    metrics = dashboard(db)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title="EcoSphere ESG Report")
    styles = getSampleStyleSheet()
    story = [
        Paragraph("EcoSphere ESG Report", styles["Title"]),
        Paragraph(f"Generated {date.today().isoformat()}", styles["Normal"]),
        Spacer(1, 8 * mm),
        Paragraph(
            f"Overall ESG score: <b>{_fmt(metrics['overall_score'])}</b> &nbsp;|&nbsp; "
            f"Total CO2e: <b>{metrics['total_co2e']:.1f}</b> kg &nbsp;|&nbsp; "
            f"Open issues: <b>{metrics['open_issues']}</b> &nbsp;|&nbsp; "
            f"Employees: <b>{metrics['employee_count']}</b>",
            styles["Normal"],
        ),
        Spacer(1, 6 * mm),
    ]
    data = [["Department", "Env", "Social", "Gov", "Total"]] + _rows(db)
    table = Table(data, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#166534")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdf4")]),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buffer.getvalue()


def esg_excel(db: Session) -> bytes:
    """Build an ESG summary workbook with a scores sheet."""
    wb = Workbook()
    ws = wb.active
    ws.title = "ESG Scores"
    ws.append(["Department", "Environmental", "Social", "Governance", "Total"])
    for row in _rows(db):
        ws.append(list(row))

    summary = wb.create_sheet("Summary")
    metrics = dashboard(db)
    summary.append(["Metric", "Value"])
    summary.append(["Overall ESG score", _fmt(metrics["overall_score"])])
    summary.append(["Total CO2e (kg)", round(metrics["total_co2e"], 1)])
    summary.append(["Open compliance issues", metrics["open_issues"]])
    summary.append(["Active employees", metrics["employee_count"]])

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
