"""Notification read/query logic for the current employee."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.notification import Notification


def list_for(db: Session, employee_id: int) -> list[Notification]:
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.recipient_id == employee_id)
            .order_by(Notification.created_at.desc())
        )
    )


def unread_count(db: Session, employee_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_id == employee_id, Notification.is_read.is_(False))
    )


def mark_read(db: Session, notification_id: int, employee_id: int) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise NotFoundError("Notification not found")
    if notification.recipient_id != employee_id:
        raise ForbiddenError("You cannot modify another user's notification")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
