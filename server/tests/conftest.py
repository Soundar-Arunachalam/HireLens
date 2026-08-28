"""
Test configuration.

Uses a file-based SQLite database (test.db) so all sessions share the same DB.
The file is deleted before each test to ensure a clean slate.
"""
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

TEST_DB_PATH = ROOT / "test.db"
TEST_DB_URL  = f"sqlite+pysqlite:///{TEST_DB_PATH}"

# Set before any app module is imported so create_engine picks up the override.
os.environ["DATABASE_URL"] = TEST_DB_URL

import pytest
from fastapi.testclient import TestClient

# Import models so Base.metadata knows about all tables.
import app.db.models  # noqa: F401
from app.db.base import Base
from app.core.database import engine, SessionLocal
from app.main import app


@pytest.fixture(autouse=True)
def reset_db():
    """Drop and recreate the schema before every test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup handled by next test's drop_all.


@pytest.fixture()
def client(reset_db):  # noqa: F811
    # startup event will run init_db() which seeds problems into the fresh DB.
    with TestClient(app, raise_server_exceptions=True) as tc:
        yield tc