"""Notification records and per-type delivery settings."""
from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import NotificationType


class Notification(Base):
    """An in-app message delivered to an employee."""

    __tablename__ = "notification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipient_id: Mapped[int] = mapped_column(
        ForeignKey("employee.id"), nullable=False, index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    related_type: Mapped[str | None] = mapped_column(String(50))
    related_id: Mapped[int | None] = mapped_column(Integer)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class NotificationSetting(Base):
    """Per-type toggle for in-app and email delivery channels."""

    __tablename__ = "notification_setting"
    __table_args__ = (UniqueConstraint("type", name="uq_notification_setting_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
