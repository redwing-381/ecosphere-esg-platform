"""Notification dispatch honoring per-type channel settings."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import NotificationType
from app.models.notification import Notification, NotificationSetting


def _setting(db: Session, type_: NotificationType) -> NotificationSetting:
    setting = db.scalar(select(NotificationSetting).where(NotificationSetting.type == type_))
    if setting is None:
        setting = NotificationSetting(type=type_, in_app_enabled=True, email_enabled=False)
        db.add(setting)
        db.flush()
    return setting


def dispatch(
    db: Session,
    recipient_id: int,
    type_: NotificationType,
    message: str,
    related_type: str | None = None,
    related_id: int | None = None,
) -> Notification | None:
    """Create an in-app notification when the channel is enabled for its type.

    Email delivery is gated by the same setting; in-app always works so the
    notification is never lost when email is unavailable.
    """
    setting = _setting(db, type_)
    if not setting.in_app_enabled:
        return None
    notification = Notification(
        recipient_id=recipient_id,
        type=type_,
        message=message,
        related_type=related_type,
        related_id=related_id,
    )
    db.add(notification)
    return notification
