"""Shared response schemas used across modules."""
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Message(BaseModel):
    """Simple message envelope for actions without a resource body."""

    message: str


class Page(BaseModel, Generic[T]):
    """Paginated list envelope."""

    items: list[T]
    total: int
    page: int
    size: int
