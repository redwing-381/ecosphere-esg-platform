"""Organization settings endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.auth import get_current_user, require_roles
from app.models.enums import UserRole
from app.modules.settings import service
from app.modules.settings.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return the current organization configuration."""
    return service.get_organization(db)


@router.patch("", response_model=SettingsOut)
def update_settings(
    data: SettingsUpdate, db: Session = Depends(get_db), _=Depends(require_roles(UserRole.ADMIN))
):
    """Update weights and feature toggles (admin only)."""
    return service.update_settings(db, data)
