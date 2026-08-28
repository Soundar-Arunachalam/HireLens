from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.db.models import ProblemORM, SubmissionORM, UserORM
from app.models.problem import AdminProblem, ProblemCreate, ProblemUpdate
from app.models.user import AdminPlatformStats, AdminUserItem

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Dependency shorthand ──────────────────────────────────────────────────────

AdminUser = Depends(require_admin)


# ─── Platform Stats ────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminPlatformStats)
def admin_stats(db: Session = Depends(get_db), _=AdminUser) -> AdminPlatformStats:
    total_users       = db.scalar(select(func.count(UserORM.id))) or 0
    total_problems    = db.scalar(select(func.count(ProblemORM.id))) or 0
    total_submissions = db.scalar(select(func.count(SubmissionORM.id))) or 0
    accepted          = db.scalar(
        select(func.count(SubmissionORM.id)).where(SubmissionORM.status == "accepted")
    ) or 0

    # Language breakdown
    rows = db.execute(
        select(SubmissionORM.language, func.count(SubmissionORM.id))
        .group_by(SubmissionORM.language)
    ).all()
    languages_used = {lang: cnt for lang, cnt in rows}

    return AdminPlatformStats(
        total_users=total_users,
        total_problems=total_problems,
        total_submissions=total_submissions,
        accepted_submissions=accepted,
        languages_used=languages_used,
    )


# ─── Problems CRUD ─────────────────────────────────────────────────────────────

@router.get("/problems", response_model=list[AdminProblem])
def admin_list_problems(
    db: Session = Depends(get_db),
    _=AdminUser,
    include_unpublished: bool = Query(default=True),
) -> list[ProblemORM]:
    stmt = select(ProblemORM).order_by(ProblemORM.id)
    if not include_unpublished:
        stmt = stmt.where(ProblemORM.is_published == True)  # noqa: E712
    return list(db.scalars(stmt).all())


@router.get("/problems/{problem_id}", response_model=AdminProblem)
def admin_get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    _=AdminUser,
) -> ProblemORM:
    p = db.get(ProblemORM, problem_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")
    return p


@router.post("/problems", response_model=AdminProblem, status_code=status.HTTP_201_CREATED)
def admin_create_problem(
    payload: ProblemCreate,
    db: Session = Depends(get_db),
    _=AdminUser,
) -> ProblemORM:
    if db.scalar(select(ProblemORM).where(ProblemORM.slug == payload.slug)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="slug already exists")
    problem = ProblemORM(**payload.model_dump())
    db.add(problem)
    db.commit()
    db.refresh(problem)
    return problem


@router.put("/problems/{problem_id}", response_model=AdminProblem)
def admin_update_problem(
    problem_id: int,
    payload: ProblemUpdate,
    db: Session = Depends(get_db),
    _=AdminUser,
) -> ProblemORM:
    problem = db.get(ProblemORM, problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")

    # If slug changes, check uniqueness
    if payload.slug and payload.slug != problem.slug:
        if db.scalar(select(ProblemORM).where(ProblemORM.slug == payload.slug)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="slug already exists")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(problem, field, value)

    db.commit()
    db.refresh(problem)
    return problem


@router.delete("/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    _=AdminUser,
) -> None:
    problem = db.get(ProblemORM, problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")
    db.delete(problem)
    db.commit()


# ─── Users Management ──────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserItem])
def admin_list_users(db: Session = Depends(get_db), _=AdminUser) -> list[AdminUserItem]:
    users = list(db.scalars(select(UserORM).order_by(UserORM.id)).all())

    # Batch count submissions per user
    counts = dict(
        db.execute(
            select(SubmissionORM.user_id, func.count(SubmissionORM.id))
            .group_by(SubmissionORM.user_id)
        ).all()
    )

    result = []
    for u in users:
        item = AdminUserItem.model_validate(u)
        item.submission_count = counts.get(u.id, 0)
        result.append(item)
    return result


@router.put("/users/{user_id}/toggle-admin", response_model=AdminUserItem)
def admin_toggle_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
) -> AdminUserItem:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own admin status",
        )
    user = db.get(UserORM, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    counts = dict(
        db.execute(
            select(SubmissionORM.user_id, func.count(SubmissionORM.id))
            .where(SubmissionORM.user_id == user_id)
            .group_by(SubmissionORM.user_id)
        ).all()
    )
    item = AdminUserItem.model_validate(user)
    item.submission_count = counts.get(user_id, 0)
    return item


@router.put("/users/{user_id}/toggle-active", response_model=AdminUserItem)
def admin_toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
) -> AdminUserItem:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate yourself",
        )
    user = db.get(UserORM, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    counts = dict(
        db.execute(
            select(SubmissionORM.user_id, func.count(SubmissionORM.id))
            .where(SubmissionORM.user_id == user_id)
            .group_by(SubmissionORM.user_id)
        ).all()
    )
    item = AdminUserItem.model_validate(user)
    item.submission_count = counts.get(user_id, 0)
    return item


@router.get("/submissions", response_model=list[dict])
def admin_list_submissions(
    db: Session = Depends(get_db),
    _=AdminUser,
    limit: int = Query(default=100, le=500),
) -> list[dict]:
    """View all submissions across all users (no editor events included for perf)."""
    rows = db.execute(
        select(
            SubmissionORM.id,
            SubmissionORM.user_id,
            SubmissionORM.problem_id,
            SubmissionORM.language,
            SubmissionORM.status,
            SubmissionORM.runtime_ms,
            SubmissionORM.created_at,
            UserORM.username,
            ProblemORM.title.label("problem_title"),
        )
        .join(UserORM, UserORM.id == SubmissionORM.user_id)
        .join(ProblemORM, ProblemORM.id == SubmissionORM.problem_id)
        .order_by(SubmissionORM.created_at.desc())
        .limit(limit)
    ).mappings().all()
    return [dict(r) for r in rows]
