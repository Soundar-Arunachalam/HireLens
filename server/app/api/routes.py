from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.core.security import get_current_user, get_current_user_optional
from app.db.models import ProblemORM, SubmissionORM, UserORM
from app.models.problem import Problem
from app.models.submission import (
    ExecutionCaseResult,
    RunCreate,
    RunResponse,
    SubmissionCreate,
    SubmissionListItem,
    SubmissionResponse,
    SubmissionStatus,
)
from app.models.user import LeaderboardEntry, UserStats
from app.services.code_runner import run_code

router = APIRouter()


# ─── Health ───────────────────────────────────────────────────────────────────


@router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db", tags=["health"])
def database_health_check() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database unavailable",
        ) from exc
    return {"database": "ok"}


# ─── Problems ─────────────────────────────────────────────────────────────────


@router.get("/problems", response_model=list[Problem], tags=["problems"])
def list_problems(
    q: str | None = Query(default=None, description="Search by title"),
    difficulty: str | None = Query(default=None, description="Filter: easy | medium | hard"),
    tag: str | None = Query(default=None, description="Filter by tag"),
    db: Session = Depends(get_db),
    _current_user: UserORM | None = Depends(get_current_user_optional),
) -> list[ProblemORM]:
    stmt = select(ProblemORM).where(ProblemORM.is_published == True).order_by(ProblemORM.id)  # noqa: E712
    if difficulty and difficulty != "all":
        stmt = stmt.where(ProblemORM.difficulty == difficulty.lower())
    if q:
        stmt = stmt.where(ProblemORM.title.ilike(f"%{q}%"))
    problems = list(db.scalars(stmt).all())
    if tag:
        problems = [p for p in problems if tag.lower() in [t.lower() for t in p.tags]]
    return problems


@router.get("/problems/{problem_id}", response_model=Problem, tags=["problems"])
def get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM | None = Depends(get_current_user_optional),
) -> ProblemORM:
    problem = db.get(ProblemORM, problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")
    
    # Non-admins cannot see unpublished problems
    if not problem.is_published and (not current_user or not current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")
        
    return problem


@router.post("/problems/{problem_id}/run", response_model=RunResponse, tags=["problems"])
def run_problem(
    problem_id: int,
    payload: RunCreate,
    db: Session = Depends(get_db),
) -> RunResponse:
    """Quick run against the first visible example only. No auth required, never saved to DB."""
    problem = db.get(ProblemORM, problem_id)
    if problem is None or not problem.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")
    if not problem.examples:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no examples available")

    case = problem.examples[0]
    result = run_code(
        payload.code,
        case["input"],
        language=payload.language.value,
        timeout_ms=problem.time_limit_ms,
    )

    if result.compilation_failed:
        case_result = ExecutionCaseResult(
            case_index=0,
            stdin=case["input"],
            expected_output=case["output"],
            stdout="",
            stderr="",
            compile_stderr=result.compile_stderr,
            exit_code=result.exit_code,
            timed_out=False,
            compilation_failed=True,
            passed=False,
            duration_ms=result.duration_ms,
        )
        return RunResponse(
            status=SubmissionStatus.compilation_error,
            summary="Compilation failed. Check your code for syntax errors.",
            cases=[case_result],
        )

    passed = (
        not result.timed_out
        and result.exit_code == 0
        and result.stdout.strip() == case["output"].strip()
    )
    case_result = ExecutionCaseResult(
        case_index=0,
        stdin=case["input"],
        expected_output=case["output"],
        stdout=result.stdout,
        stderr=result.stderr,
        exit_code=result.exit_code,
        timed_out=result.timed_out,
        compilation_failed=False,
        passed=passed,
        duration_ms=result.duration_ms,
    )
    verdict = _determine_status(result, passed)
    return RunResponse(
        status=verdict,
        summary=_status_summary(verdict, 1, 1 if passed else 0),
        cases=[case_result],
    )


@router.post("/problems/{problem_id}/submit", response_model=SubmissionResponse, tags=["problems"])
def submit_problem(
    problem_id: int,
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
) -> SubmissionResponse:
    """Submit against ALL test cases (examples + hidden). Requires auth. Saved to DB."""
    problem = db.get(ProblemORM, problem_id)
    if problem is None or not problem.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")

    # ── Design problems: skip execution, just store the whiteboard snapshot ──
    if problem.problem_type == "design":
        sub = SubmissionORM(
            user_id=current_user.id,
            problem_id=problem_id,
            language="design",
            code="",
            status=SubmissionStatus.submitted.value,
            runtime_ms=None,
            cases=[],
            editor_events=[],
            whiteboard_data=payload.whiteboard_data,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        return SubmissionResponse(
            id=sub.id,
            problem_id=problem_id,
            user_id=current_user.id,
            language="design",
            code="",
            status=SubmissionStatus.submitted.value,
            summary="Design submitted successfully. Your instructor will review it.",
            runtime_ms=None,
            cases=[],
            editor_events=[],
            whiteboard_data=payload.whiteboard_data,
            created_at=sub.created_at,
        )

    all_cases = list(problem.examples) + list(problem.hidden_cases)
    if not all_cases:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no test cases available")

    execution_results: list[ExecutionCaseResult] = []
    overall_status = SubmissionStatus.accepted
    total_runtime_ms = 0.0

    for case_index, case in enumerate(all_cases):
        result = run_code(
            payload.code,
            case["input"],
            language=payload.language.value,
            timeout_ms=problem.time_limit_ms,
        )
        total_runtime_ms += result.duration_ms

        if result.compilation_failed:
            overall_status = SubmissionStatus.compilation_error
            execution_results.append(ExecutionCaseResult(
                case_index=case_index,
                stdin=case["input"],
                expected_output=case["output"],
                stdout="",
                stderr="",
                compile_stderr=result.compile_stderr,
                exit_code=result.exit_code,
                timed_out=False,
                compilation_failed=True,
                passed=False,
                duration_ms=result.duration_ms,
            ))
            break  # no need to run more cases if compilation failed

        passed = (
            not result.timed_out
            and result.exit_code == 0
            and result.stdout.strip() == case["output"].strip()
        )
        case_verdict = _determine_status(result, passed)
        if case_verdict != SubmissionStatus.accepted and overall_status == SubmissionStatus.accepted:
            overall_status = case_verdict

        execution_results.append(ExecutionCaseResult(
            case_index=case_index,
            stdin=case["input"],
            expected_output=case["output"],
            stdout=result.stdout,
            stderr=result.stderr,
            exit_code=result.exit_code,
            timed_out=result.timed_out,
            compilation_failed=False,
            passed=passed,
            duration_ms=result.duration_ms,
        ))

    passed_count = sum(1 for r in execution_results if r.passed)
    total_count = len(all_cases)
    summary = _status_summary(overall_status, total_count, passed_count)
    avg_runtime_ms = total_runtime_ms / len(execution_results) if execution_results else None

    # Persist the submission
    sub = SubmissionORM(
        user_id=current_user.id,
        problem_id=problem_id,
        language=payload.language.value,
        code=payload.code,
        status=overall_status.value,
        runtime_ms=avg_runtime_ms,
        cases=[r.model_dump() for r in execution_results],
        editor_events=[e.model_dump() for e in payload.editor_events],
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    return SubmissionResponse(
        id=sub.id,
        problem_id=problem_id,
        user_id=current_user.id,
        language=payload.language.value,
        code=payload.code,
        status=overall_status.value,
        summary=summary,
        runtime_ms=avg_runtime_ms,
        cases=execution_results,
        editor_events=payload.editor_events,
        created_at=sub.created_at,
    )


# ─── Submissions ──────────────────────────────────────────────────────────────


@router.get("/submissions", response_model=list[SubmissionListItem], tags=["submissions"])
def list_submissions(
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
) -> list[SubmissionORM]:
    """Return the current user's full submission history (most recent first)."""
    return list(
        db.scalars(
            select(SubmissionORM)
            .where(SubmissionORM.user_id == current_user.id)
            .order_by(SubmissionORM.created_at.desc())
            .limit(200)
        ).all()
    )


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse, tags=["submissions"])
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
) -> SubmissionResponse:
    """Return a single submission with full per-case details and editor replay events."""
    sub = db.get(SubmissionORM, submission_id)
    # Allow admins to view any submission for replay grading
    if sub is None or (sub.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="submission not found")

    cases = [ExecutionCaseResult(**c) for c in sub.cases]
    passed_count = sum(1 for c in cases if c.passed)
    return SubmissionResponse(
        id=sub.id,
        problem_id=sub.problem_id,
        user_id=sub.user_id,
        language=sub.language,
        code=sub.code,
        status=sub.status,
        summary=_status_summary(SubmissionStatus(sub.status), len(cases), passed_count),
        runtime_ms=sub.runtime_ms,
        cases=cases,
        editor_events=sub.editor_events,
        whiteboard_data=sub.whiteboard_data,
        created_at=sub.created_at,
    )


@router.get(
    "/problems/{problem_id}/submissions",
    response_model=list[SubmissionListItem],
    tags=["submissions"],
)
def list_problem_submissions(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
) -> list[SubmissionORM]:
    """Return the current user's submissions for a specific problem."""
    return list(
        db.scalars(
            select(SubmissionORM)
            .where(
                SubmissionORM.user_id == current_user.id,
                SubmissionORM.problem_id == problem_id,
            )
            .order_by(SubmissionORM.created_at.desc())
        ).all()
    )


# ─── User Stats & Leaderboard ─────────────────────────────────────────────────


@router.get("/users/me/stats", response_model=UserStats, tags=["users"])
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: UserORM = Depends(get_current_user),
) -> UserStats:
    accepted_problem_ids = list(
        db.scalars(
            select(SubmissionORM.problem_id)
            .where(
                SubmissionORM.user_id == current_user.id,
                SubmissionORM.status == "accepted",
            )
            .distinct()
        ).all()
    )

    solved_problems = (
        list(db.scalars(select(ProblemORM).where(ProblemORM.id.in_(accepted_problem_ids))).all())
        if accepted_problem_ids
        else []
    )

    total_submissions = db.scalar(
        select(func.count(SubmissionORM.id)).where(SubmissionORM.user_id == current_user.id)
    ) or 0
    accepted_submissions = db.scalar(
        select(func.count(SubmissionORM.id)).where(
            SubmissionORM.user_id == current_user.id,
            SubmissionORM.status == "accepted",
        )
    ) or 0
    total_problems = db.scalar(select(func.count(ProblemORM.id)).where(ProblemORM.is_published == True)) or 0  # noqa: E712

    return UserStats(
        total_problems=total_problems,
        problems_solved=len(accepted_problem_ids),
        easy_solved=sum(1 for p in solved_problems if p.difficulty == "easy"),
        medium_solved=sum(1 for p in solved_problems if p.difficulty == "medium"),
        hard_solved=sum(1 for p in solved_problems if p.difficulty == "hard"),
        total_submissions=total_submissions,
        accepted_submissions=accepted_submissions,
        acceptance_rate=round(
            accepted_submissions / total_submissions * 100 if total_submissions else 0.0, 1
        ),
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry], tags=["users"])
def get_leaderboard(db: Session = Depends(get_db)) -> list[LeaderboardEntry]:
    """
    Returns global leaderboard ranked by:
    1. Distinct accepted problems (desc)
    2. Total accepted submissions (desc) as tiebreaker
    3. Average runtime_ms on accepted submissions (asc) as second tiebreaker
    """
    users = list(db.scalars(select(UserORM).where(UserORM.is_active == True)).all())  # noqa: E712

    # Fetch all accepted submissions to calculate stats
    accepted_subs = db.execute(
        select(
            SubmissionORM.user_id,
            SubmissionORM.problem_id,
            SubmissionORM.runtime_ms,
        )
        .where(SubmissionORM.status == "accepted")
    ).all()
    
    # Also fetch total submissions per user for acceptance rate
    total_subs = dict(
        db.execute(
            select(SubmissionORM.user_id, func.count(SubmissionORM.id))
            .group_by(SubmissionORM.user_id)
        ).all()
    )
    
    # Fetch all problems to know difficulty
    problems = {p.id: p.difficulty for p in db.scalars(select(ProblemORM)).all()}

    # Aggregate stats per user
    user_stats = {}
    for u in users:
        user_stats[u.id] = {
            "username": u.username,
            "solved_set": set(),
            "easy": 0, "medium": 0, "hard": 0,
            "accepted_count": 0,
            "total_count": total_subs.get(u.id, 0),
            "runtime_sum": 0.0,
        }
        
    for sub in accepted_subs:
        uid = sub.user_id
        pid = sub.problem_id
        if uid not in user_stats:
            continue
            
        st = user_stats[uid]
        st["accepted_count"] += 1
        if sub.runtime_ms is not None:
            st["runtime_sum"] += sub.runtime_ms
            
        if pid not in st["solved_set"]:
            st["solved_set"].add(pid)
            diff = problems.get(pid, "easy")
            st[diff] += 1

    # Format entries
    entries = []
    for uid, st in user_stats.items():
        if st["total_count"] == 0:
            continue # hide users with 0 submissions
            
        acc_rate = round(st["accepted_count"] / st["total_count"] * 100, 1)
        avg_runtime = st["runtime_sum"] / st["accepted_count"] if st["accepted_count"] > 0 else None
        
        entries.append({
            "user_id": uid,
            "username": st["username"],
            "problems_solved": len(st["solved_set"]),
            "easy_solved": st["easy"],
            "medium_solved": st["medium"],
            "hard_solved": st["hard"],
            "total_submissions": st["total_count"],
            "accepted_submissions": st["accepted_count"],
            "acceptance_rate": acc_rate,
            "avg_runtime_ms": avg_runtime,
        })
        
    # Sort
    entries.sort(key=lambda x: (
        -x["problems_solved"],
        -x["accepted_submissions"],
        x["avg_runtime_ms"] if x["avg_runtime_ms"] is not None else float('inf')
    ))
    
    # Assign ranks
    result = []
    for i, entry in enumerate(entries):
        result.append(LeaderboardEntry(rank=i + 1, **entry))
        
    return result


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _determine_status(result, passed: bool) -> SubmissionStatus:
    if result.timed_out:
        return SubmissionStatus.time_limit_exceeded
    if result.exit_code != 0:
        return SubmissionStatus.runtime_error
    if not passed:
        return SubmissionStatus.wrong_answer
    return SubmissionStatus.accepted


def _status_summary(verdict: SubmissionStatus, total: int, passed: int) -> str:
    match verdict:
        case SubmissionStatus.accepted:
            return f"All {total} test case{'s' if total != 1 else ''} passed."
        case SubmissionStatus.compilation_error:
            return "Compilation failed. Please check your code for syntax errors."
        case SubmissionStatus.time_limit_exceeded:
            return f"Time limit exceeded on test case {passed + 1}. Optimise your algorithm."
        case SubmissionStatus.runtime_error:
            return f"Runtime error on test case {passed + 1}. Check for crashes or invalid input handling."
        case SubmissionStatus.submitted:
            return "Design submitted successfully. Your instructor will review it."
        case _:
            return f"{passed}/{total} test case{'s' if total != 1 else ''} passed."
