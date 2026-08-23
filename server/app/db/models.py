from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProblemORM(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(240), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="easy")
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    examples: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    constraints: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    time_limit_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=1000)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, nullable=False, default=256)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
