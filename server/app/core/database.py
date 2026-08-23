from collections.abc import Generator

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db.models import ProblemORM


settings = get_settings()
engine_kwargs = {"pool_pre_ping": True}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ping_database() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        has_problem = db.scalar(select(ProblemORM.id).limit(1)) is not None
        if has_problem:
            return

        sample_problem = ProblemORM(
            title="Two Sum",
            slug="two-sum",
            description=(
                "Given an array of integers nums and an integer target, return indices of the two numbers "
                "such that they add up to target."
            ),
            difficulty="easy",
            tags=["array", "hash-table"],
            examples=[
                {
                    "input": "nums = [2,7,11,15], target = 9",
                    "output": "[0,1]",
                    "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1].",
                }
            ],
            constraints=[
                "2 <= nums.length <= 10^4",
                "-10^9 <= nums[i] <= 10^9",
                "-10^9 <= target <= 10^9",
            ],
            time_limit_ms=1000,
            memory_limit_mb=256,
        )
        db.add(sample_problem)
        db.commit()
