import os
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/codeeditor")
engine = create_engine(DB_URL)

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE problems ADD COLUMN problem_type VARCHAR(20) NOT NULL DEFAULT 'coding';"))
        print("Added problem_type to problems")
    except Exception as e:
        print("problem_type:", e)

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE submissions ADD COLUMN whiteboard_data JSON;"))
        print("Added whiteboard_data to submissions")
    except Exception as e:
        print("whiteboard_data:", e)

print("Migration done.")
