"""Schemas for notifications."""
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    id: int
    type: NotificationType
    message: str
    related_type: str | None
    related_id: int | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadCount(BaseModel):
    unread: int
