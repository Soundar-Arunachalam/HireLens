from collections.abc import Generator

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db.models import ProblemORM, UserORM

settings = get_settings()
engine_kwargs: dict = {"pool_pre_ping": True}
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
    """Create all tables and seed initial data on first boot."""
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        # ── Seed default admin ──────────────────────────────────────────────
        has_admin = db.scalar(select(UserORM).where(UserORM.is_admin == True)) is not None  # noqa: E712
        if not has_admin:
            from app.core.security import hash_password
            admin = UserORM(
                username="admin",
                email="admin@codeeditor.local",
                hashed_password=hash_password("admin123"),
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
            db.flush()
            print("=" * 60)
            print("  [ADMIN] Default admin created:")
            print("          username : admin")
            print("          password : admin123")
            print("  [WARN] Change this password immediately!")
            print("=" * 60)

        # ── Seed sample problems ─────────────────────────────────────────────
        has_problem = db.scalar(select(ProblemORM.id).limit(1)) is not None
        if not has_problem:
            sample_problems = [
                ProblemORM(
                    title="Two Sum",
                    slug="two-sum",
                    description=(
                        "Given an array of integers nums and an integer target, "
                        "return indices of the two numbers that add up to target.\n\n"
                        "**Input format:** first line = space-separated array, second line = target.\n"
                        "**Output:** `[i, j]` (the two indices, 0-indexed)."
                    ),
                    difficulty="easy",
                    tags=["array", "hash-table"],
                    examples=[
                        {
                            "input": "2 7 11 15\n9",
                            "output": "[0, 1]",
                            "explanation": "nums[0] + nums[1] = 2 + 7 = 9",
                        }
                    ],
                    hidden_cases=[
                        {"input": "3 2 4\n6", "output": "[1, 2]"},
                        {"input": "3 3\n6", "output": "[0, 1]"},
                    ],
                    constraints=["2 ≤ nums.length ≤ 10⁴", "-10⁹ ≤ nums[i] ≤ 10⁹", "Exactly one solution exists."],
                    time_limit_ms=2000, memory_limit_mb=256,
                ),
                ProblemORM(
                    title="Reverse String",
                    slug="reverse-string",
                    description=(
                        "Read a single line of text from stdin and print it reversed.\n\n"
                        "**Input:** a single string\n**Output:** the string reversed"
                    ),
                    difficulty="easy",
                    tags=["string", "two-pointers"],
                    examples=[{"input": "hello", "output": "olleh"}],
                    hidden_cases=[
                        {"input": "Hannah", "output": "hannaH"},
                        {"input": "abcde", "output": "edcba"},
                    ],
                    constraints=["1 ≤ |s| ≤ 10⁵"],
                    time_limit_ms=1000, memory_limit_mb=256,
                ),
                ProblemORM(
                    title="Valid Parentheses",
                    slug="valid-parentheses",
                    description=(
                        "Given a string containing only `(`, `)`, `{`, `}`, `[`, `]`, "
                        "determine if the input is valid. Print `True` or `False`."
                    ),
                    difficulty="easy",
                    tags=["string", "stack"],
                    examples=[
                        {"input": "()", "output": "True"},
                        {"input": "()[]{}", "output": "True"},
                    ],
                    hidden_cases=[
                        {"input": "(]", "output": "False"},
                        {"input": "([)]", "output": "False"},
                        {"input": "{[]}", "output": "True"},
                    ],
                    constraints=["1 ≤ |s| ≤ 10⁴", "s contains only (){}[]"],
                    time_limit_ms=1000, memory_limit_mb=256,
                ),
                ProblemORM(
                    title="Climbing Stairs",
                    slug="climbing-stairs",
                    description=(
                        "You are climbing a staircase. It takes n steps to reach the top. "
                        "Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\n"
                        "**Input:** a single integer n\n**Output:** number of distinct ways"
                    ),
                    difficulty="easy",
                    tags=["math", "dynamic-programming", "memoization"],
                    examples=[
                        {"input": "2", "output": "2", "explanation": "1+1, 2"},
                        {"input": "3", "output": "3", "explanation": "1+1+1, 1+2, 2+1"},
                    ],
                    hidden_cases=[
                        {"input": "10", "output": "89"},
                        {"input": "45", "output": "1836311903"},
                    ],
                    constraints=["1 ≤ n ≤ 45"],
                    time_limit_ms=1000, memory_limit_mb=256,
                ),
                ProblemORM(
                    title="Maximum Subarray",
                    slug="maximum-subarray",
                    description=(
                        "Find the contiguous subarray with the largest sum and return its sum. (Kadane's Algorithm)\n\n"
                        "**Input:** first line = n, second line = n space-separated integers\n"
                        "**Output:** the maximum subarray sum"
                    ),
                    difficulty="medium",
                    tags=["array", "dynamic-programming", "divide-and-conquer"],
                    examples=[
                        {
                            "input": "9\n-2 1 -3 4 -1 2 1 -5 4",
                            "output": "6",
                            "explanation": "[4, -1, 2, 1] has the largest sum = 6",
                        }
                    ],
                    hidden_cases=[
                        {"input": "1\n1", "output": "1"},
                        {"input": "4\n5 4 -1 7", "output": "15"},
                        {"input": "3\n-1 -2 -3", "output": "-1"},
                    ],
                    constraints=["1 ≤ n ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
                    time_limit_ms=2000, memory_limit_mb=256,
                ),
                ProblemORM(
                    title="Add Two Numbers",
                    slug="add-two-numbers",
                    description=(
                        "Given two integers a and b on a single line separated by space, print their sum.\n\n"
                        "**Input:** `a b`\n**Output:** `a + b`"
                    ),
                    difficulty="easy",
                    tags=["math"],
                    examples=[{"input": "2 3", "output": "5"}],
                    hidden_cases=[
                        {"input": "100 200", "output": "300"},
                        {"input": "-5 10", "output": "5"},
                        {"input": "0 0", "output": "0"},
                    ],
                    constraints=["-10⁹ ≤ a, b ≤ 10⁹"],
                    time_limit_ms=1000, memory_limit_mb=256,
                ),
                ProblemORM(
                    title="Longest Common Prefix",
                    slug="longest-common-prefix",
                    description=(
                        "Find the longest common prefix string amongst an array of strings.\n\n"
                        "**Input:** first line = n, second line = n space-separated words\n"
                        "**Output:** the longest common prefix (or empty string)"
                    ),
                    difficulty="easy",
                    tags=["string"],
                    examples=[
                        {"input": "3\nflower flow flight", "output": "fl"},
                        {"input": "3\ndog racecar car", "output": ""},
                    ],
                    hidden_cases=[
                        {"input": "1\nalone", "output": "alone"},
                        {"input": "2\ninterviewing interview", "output": "interview"},
                    ],
                    constraints=["1 ≤ n ≤ 200", "0 ≤ |strs[i]| ≤ 200"],
                    time_limit_ms=1000, memory_limit_mb=256,
                ),
                ProblemORM(
                    title="Median of Two Sorted Arrays",
                    slug="median-of-two-sorted-arrays",
                    description=(
                        "Given two sorted arrays, return the median of the merged sorted array, "
                        "rounded to 5 decimal places.\n\n"
                        "**Input:**\n"
                        "  Line 1: m (size of first array)\n"
                        "  Line 2: m space-separated integers (or blank if m=0)\n"
                        "  Line 3: n (size of second array)\n"
                        "  Line 4: n space-separated integers\n"
                        "**Output:** median rounded to 5 decimal places"
                    ),
                    difficulty="hard",
                    tags=["array", "binary-search", "divide-and-conquer"],
                    examples=[
                        {"input": "2\n1 3\n1\n2", "output": "2.00000"},
                        {"input": "2\n1 2\n2\n3 4", "output": "2.50000"},
                    ],
                    hidden_cases=[
                        {"input": "0\n\n1\n1", "output": "1.00000"},
                        {"input": "3\n1 2 3\n3\n4 5 6", "output": "3.50000"},
                    ],
                    constraints=["0 ≤ m, n ≤ 1000", "m + n ≥ 1"],
                    time_limit_ms=3000, memory_limit_mb=256,
                ),
            ]
            db.add_all(sample_problems)

        db.commit()
