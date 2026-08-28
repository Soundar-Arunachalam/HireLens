from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class SubmissionLanguage(str, Enum):
    python = "python"
    javascript = "javascript"
    cpp = "cpp"
    java = "java"
    design = "design"   # pseudo-language for whiteboard submissions


class SubmissionStatus(str, Enum):
    accepted = "accepted"
    wrong_answer = "wrong_answer"
    time_limit_exceeded = "time_limit_exceeded"
    runtime_error = "runtime_error"
    compilation_error = "compilation_error"
    submitted = "submitted"  # design problems: no auto-grading


class EditorEvent(BaseModel):
    """A single snapshot in the editor replay log."""
    t: int    # milliseconds since the user opened the problem
    v: str    # full editor content at this moment


class SubmissionCreate(BaseModel):
    code: str = Field(default="", description="Source code (empty for design submissions)")
    language: SubmissionLanguage = SubmissionLanguage.python
    editor_events: list[EditorEvent] = Field(default_factory=list)
    whiteboard_data: Optional[dict[str, Any]] = Field(
        default=None,
        description="Excalidraw scene JSON — populated for design problems"
    )


class RunCreate(BaseModel):
    code: str = Field(..., min_length=1)
    language: SubmissionLanguage = SubmissionLanguage.python


class ExecutionCaseResult(BaseModel):
    case_index: int
    stdin: str
    expected_output: str
    stdout: str
    stderr: str
    compile_stderr: str = ""
    exit_code: int | None = None
    timed_out: bool = False
    compilation_failed: bool = False
    passed: bool = False
    duration_ms: float


class RunResponse(BaseModel):
    status: SubmissionStatus
    summary: str
    cases: list[ExecutionCaseResult]


class SubmissionResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    language: str
    code: str
    status: str
    summary: str
    runtime_ms: float | None
    cases: list[ExecutionCaseResult]
    editor_events: list[EditorEvent]
    whiteboard_data: Optional[dict[str, Any]] = None
    created_at: datetime


class SubmissionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    problem_id: int
    language: str
    status: str
    runtime_ms: float | None
    created_at: datetime
