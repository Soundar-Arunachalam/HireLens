from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class ProblemExample(BaseModel):
    input: str = Field(..., examples=['"nums = [2,7,11,15], target = 9"'])
    output: str = Field(..., examples=['"[0,1]"'])
    explanation: str | None = None


class ProblemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=240)
    description: str = Field(..., min_length=1)
    problem_type: str = Field(default="coding", pattern="^(coding|design)$")
    difficulty: Difficulty = Difficulty.easy
    tags: list[str] = Field(default_factory=list)
    examples: list[dict] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    time_limit_ms: int = Field(default=2000, ge=1)
    memory_limit_mb: int = Field(default=256, ge=1)
    is_published: bool = True


class ProblemCreate(ProblemBase):
    hidden_cases: list[dict] = Field(default_factory=list)


class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    slug: Optional[str] = Field(default=None, min_length=1, max_length=240)
    description: Optional[str] = Field(default=None, min_length=1)
    problem_type: Optional[str] = Field(default=None, pattern="^(coding|design)$")
    difficulty: Optional[Difficulty] = None
    tags: Optional[list[str]] = None
    examples: Optional[list[dict]] = None
    hidden_cases: Optional[list[dict]] = None
    constraints: Optional[list[str]] = None
    time_limit_ms: Optional[int] = Field(default=None, ge=1)
    memory_limit_mb: Optional[int] = Field(default=None, ge=1)
    is_published: Optional[bool] = None


class Problem(ProblemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_published: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdminProblem(Problem):
    """Problem with hidden_cases — for admin eyes only."""
    hidden_cases: list[dict] = Field(default_factory=list)