from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=200)
    password: str = Field(..., min_length=6)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class UserStats(BaseModel):
    total_problems: int
    problems_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    total_submissions: int
    accepted_submissions: int
    acceptance_rate: float


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    submission_count: int = 0


class AdminPlatformStats(BaseModel):
    total_users: int
    total_problems: int
    total_submissions: int
    accepted_submissions: int
    languages_used: dict[str, int]


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    problems_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    total_submissions: int
    accepted_submissions: int
    acceptance_rate: float
    avg_runtime_ms: Optional[float]
