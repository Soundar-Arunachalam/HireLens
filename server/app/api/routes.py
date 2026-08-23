from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.db.models import ProblemORM
from app.models.problem import Problem

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db", tags=["health"])
def database_health_check() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - depends on external postgres service
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database unavailable",
        ) from exc

    return {"database": "ok"}


@router.get("/problems", response_model=list[Problem], tags=["problems"])
def list_problems(db: Session = Depends(get_db)) -> list[ProblemORM]:
    return list(db.scalars(select(ProblemORM).order_by(ProblemORM.id)).all())


@router.get("/problems/{problem_id}", response_model=Problem, tags=["problems"])
def get_problem(problem_id: int, db: Session = Depends(get_db)) -> ProblemORM:
    problem = db.get(ProblemORM, problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="problem not found")

    return problem
