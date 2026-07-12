"""Database engine, session factory and declarative base."""
import os
from collections.abc import Generator
from datetime import datetime

from sqlalchemy import DateTime, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# On serverless (Vercel) each invocation is short-lived, so we don't keep a
# connection pool open. Pair this with a pooled Postgres endpoint (e.g. Neon
# pooler) to avoid exhausting database connections.
_engine_kwargs: dict = {"pool_pre_ping": True, "future": True}
if os.getenv("VERCEL"):
    _engine_kwargs["poolclass"] = NullPool

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base with shared audit timestamp columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def get_db() -> Generator:
    """Yield a request-scoped database session and close it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
