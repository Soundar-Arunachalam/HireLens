from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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

    submissions: Mapped[list["SubmissionORM"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class ProblemORM(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(240), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    problem_type: Mapped[str] = mapped_column(String(20), nullable=False, default="coding")  # coding | design
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="easy")
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    examples: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    hidden_cases: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    constraints: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    time_limit_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, nullable=False, default=256)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
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

    submissions: Mapped[list["SubmissionORM"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan"
    )


class SubmissionORM(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    runtime_ms: Mapped[float | None] = mapped_column(nullable=True)
    cases: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    # Editor replay: list of {t: ms_since_start, v: editor_content_snapshot}
    editor_events: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    # Design whiteboard submission: Excalidraw scene JSON
    whiteboard_data: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["UserORM"] = relationship(back_populates="submissions")
    problem: Mapped["ProblemORM"] = relationship(back_populates="submissions")
