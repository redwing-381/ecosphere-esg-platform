"""Organization settings logic with a singleton row."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.modules.settings.schemas import SettingsUpdate


def get_organization(db: Session) -> Organization:
    """Return the organization row, creating a default one on first use."""
    org = db.scalar(select(Organization).order_by(Organization.id))
    if org is None:
        org = Organization(name="EcoSphere")
        db.add(org)
        db.commit()
        db.refresh(org)
    return org


def update_settings(db: Session, data: SettingsUpdate) -> Organization:
    org = get_organization(db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(org, key, value)
    db.commit()
    db.refresh(org)
    return org
