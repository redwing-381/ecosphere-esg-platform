"""Notification endpoints for the current employee."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ValidationError
from app.deps.auth import get_current_user
from app.models.people import User
from app.modules.notifications import service
from app.modules.notifications.schemas import NotificationOut, UnreadCount

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _employee_id(user: User) -> int:
    if user.employee_id is None:
        raise ValidationError("Your account is not linked to an employee")
    return user.employee_id


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List the current employee's notifications (empty for non-participating accounts)."""
    if user.employee_id is None:
        return []
    return service.list_for(db, user.employee_id)


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return the current employee's unread notification count."""
    if user.employee_id is None:
        return UnreadCount(unread=0)
    return UnreadCount(unread=service.unread_count(db, user.employee_id))


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Mark all of the current employee's notifications as read."""
    if user.employee_id is None:
        return {"read": 0}
    return {"read": service.mark_all_read(db, user.employee_id)}


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    return service.mark_read(db, notification_id, _employee_id(user))
