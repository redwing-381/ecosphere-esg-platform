"""Build ESG reports (Environmental, Social, Governance, ESG summary).

Each module resolves to a single titled table which is then rendered to
PDF, Excel or CSV. Date-range and department filters are applied where the
underlying data carries a date or department.
"""
import csv
from datetime import date
from io import BytesIO, StringIO

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ValidationError
from app.engines import scoring
from app.models.enums import ApprovalStatus, IssueStatus, Status
from app.models.environmental import CarbonTransaction
from app.models.governance import Audit, ComplianceIssue
from app.models.master import Department, EnvironmentalGoal
from app.models.people import Employee
from app.models.social import EmployeeParticipation, TrainingCompletion

MODULES = ("environmental", "social", "governance", "esg")
_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

MEDIA_TYPES = {
    "pdf": "application/pdf",
    "xlsx": _XLSX,
    "csv": "text/csv",
}


def _fmt(value: float | None) -> str:
    return "-" if value is None else f"{value:.1f}"


def _departments(db: Session, department_id: int | None) -> list[Department]:
    stmt = select(Department).where(Department.status == Status.ACTIVE).order_by(Department.name)
    if department_id is not None:
        stmt = stmt.where(Department.id == department_id)
    return list(db.scalars(stmt))


def _environmental(db: Session, start, end, department_id) -> tuple:
    rows = []
    for d in _departments(db, department_id):
        co2e_stmt = select(func.coalesce(func.sum(CarbonTransaction.co2e), 0)).where(
            CarbonTransaction.department_id == d.id
        )
        if start:
            co2e_stmt = co2e_stmt.where(CarbonTransaction.date >= start)
        if end:
            co2e_stmt = co2e_stmt.where(CarbonTransaction.date <= end)
        co2e = float(db.scalar(co2e_stmt) or 0)
        target = db.scalar(
            select(func.sum(EnvironmentalGoal.target)).where(
                EnvironmentalGoal.department_id == d.id
            )
        )
        within = "-" if not target else ("Yes" if co2e <= float(target) else "No")
        rows.append([d.name, f"{co2e:.1f}", _fmt(float(target) if target else None), within])
    return "Environmental Report", ["Department", "CO2e (kg)", "Goal target", "Within target?"], rows


def _social(db: Session, start, end, department_id) -> tuple:
    rows = []
    for d in _departments(db, department_id):
        employees = db.scalar(
            select(func.count()).select_from(Employee).where(
                Employee.department_id == d.id, Employee.status == Status.ACTIVE
            )
        )
        csr_stmt = (
            select(func.count())
            .select_from(EmployeeParticipation)
            .join(Employee, Employee.id == EmployeeParticipation.employee_id)
            .where(
                Employee.department_id == d.id,
                EmployeeParticipation.approval_status == ApprovalStatus.APPROVED,
            )
        )
        if start:
            csr_stmt = csr_stmt.where(EmployeeParticipation.completion_date >= start)
        if end:
            csr_stmt = csr_stmt.where(EmployeeParticipation.completion_date <= end)
        completions_stmt = (
            select(func.count())
            .select_from(TrainingCompletion)
            .join(Employee, Employee.id == TrainingCompletion.employee_id)
            .where(Employee.department_id == d.id)
        )
        if start:
            completions_stmt = completions_stmt.where(TrainingCompletion.completed_at >= start)
        if end:
            completions_stmt = completions_stmt.where(TrainingCompletion.completed_at <= end)
        rows.append([d.name, employees, db.scalar(csr_stmt), db.scalar(completions_stmt)])
    return "Social Report", ["Department", "Employees", "Approved CSR", "Training completions"], rows


def _governance(db: Session, start, end, department_id) -> tuple:
    rows = []
    for d in _departments(db, department_id):
        audits_stmt = select(func.count()).select_from(Audit).where(Audit.department_id == d.id)
        passed_stmt = audits_stmt.where(Audit.passed.is_(True))
        if start:
            audits_stmt = audits_stmt.where(Audit.audit_date >= start)
            passed_stmt = passed_stmt.where(Audit.audit_date >= start)
        if end:
            audits_stmt = audits_stmt.where(Audit.audit_date <= end)
            passed_stmt = passed_stmt.where(Audit.audit_date <= end)
        open_issues = db.scalar(
            select(func.count())
            .select_from(ComplianceIssue)
            .join(Audit, Audit.id == ComplianceIssue.audit_id)
            .where(Audit.department_id == d.id, ComplianceIssue.status != IssueStatus.RESOLVED)
        )
        rows.append([d.name, db.scalar(passed_stmt), db.scalar(audits_stmt), open_issues])
    return "Governance Report", ["Department", "Audits passed", "Audits total", "Open issues"], rows


def _esg(db: Session, start, end, department_id) -> tuple:
    names = {d.id: d.name for d in db.scalars(select(Department))}
    rows = []
    for s in scoring.score_all(db):
        if department_id is not None and s.department_id != department_id:
            continue
        rows.append(
            [
                names.get(s.department_id, str(s.department_id)),
                _fmt(s.environmental),
                _fmt(s.social),
                _fmt(s.governance),
                _fmt(s.total),
            ]
        )
    return "ESG Summary", ["Department", "Environmental", "Social", "Governance", "Total"], rows


_BUILDERS = {
    "environmental": _environmental,
    "social": _social,
    "governance": _governance,
    "esg": _esg,
}


def build_dataset(
    db: Session, module: str, start: date | None, end: date | None, department_id: int | None
) -> tuple[str, list[str], list[list]]:
    """Resolve a module name to a (title, headers, rows) dataset."""
    if module not in _BUILDERS:
        raise ValidationError(f"Unknown report module: {module}")
    return _BUILDERS[module](db, start, end, department_id)


def _subtitle(start: date | None, end: date | None) -> str:
    if start or end:
        return f"Period: {start or 'start'} to {end or 'today'}"
    return f"Generated {date.today().isoformat()}"


def render_pdf(title: str, headers: list[str], rows: list[list], subtitle: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"EcoSphere {title}")
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"EcoSphere — {title}", styles["Title"]),
        Paragraph(subtitle, styles["Normal"]),
        Spacer(1, 6 * mm),
    ]
    data = [headers] + ([[str(c) for c in r] for r in rows] or [["No data available"]])
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


def render_xlsx(title: str, headers: list[str], rows: list[list]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]
    ws.append(headers)
    for row in rows:
        ws.append(list(row))
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def render_csv(headers: list[str], rows: list[list]) -> bytes:
    sio = StringIO()
    writer = csv.writer(sio)
    writer.writerow(headers)
    writer.writerows(rows)
    return sio.getvalue().encode("utf-8")


def generate(
    db: Session,
    module: str,
    fmt: str,
    start: date | None = None,
    end: date | None = None,
    department_id: int | None = None,
) -> tuple[bytes, str]:
    """Build a report and render it; returns (content, filename)."""
    if fmt not in MEDIA_TYPES:
        raise ValidationError(f"Unsupported format: {fmt}")
    title, headers, rows = build_dataset(db, module, start, end, department_id)
    filename = f"ecosphere-{module}.{fmt}"
    if fmt == "pdf":
        return render_pdf(title, headers, rows, _subtitle(start, end)), filename
    if fmt == "xlsx":
        return render_xlsx(title, headers, rows), filename
    return render_csv(headers, rows), filename
