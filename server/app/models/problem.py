from datetime import datetime, timezone
from enum import Enum

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
    difficulty: Difficulty = Difficulty.easy
    tags: list[str] = Field(default_factory=list)
    examples: list[ProblemExample] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    time_limit_ms: int = Field(default=1000, ge=1)
    memory_limit_mb: int = Field(default=256, ge=1)


class ProblemCreate(ProblemBase):
    pass


class ProblemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = Field(default=None, min_length=1)
    difficulty: Difficulty | None = None
    tags: list[str] | None = None
    examples: list[ProblemExample] | None = None
    constraints: list[str] | None = None
    time_limit_ms: int | None = Field(default=None, ge=1)
    memory_limit_mb: int | None = Field(default=None, ge=1)


class Problem(ProblemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))