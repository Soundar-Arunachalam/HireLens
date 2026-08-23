# FastAPI Server

Minimal FastAPI backend scaffold for a LeetCode-like application.

## Run locally

1. Sync dependencies with uv:

   ```bash
   uv sync
   ```

2. Start the API:

   ```bash
   uv run uvicorn app.main:app --reload
   ```

## PostgreSQL and Docker

1. Start the app and PostgreSQL together:

   ```bash
   docker compose up --build
   ```

2. The app reads `DATABASE_URL` from the environment. For local development, copy `.env.example` to `.env` and point it at your PostgreSQL instance.

3. The database health check is available at `GET /health/db`.

## Endpoints

- `GET /` returns a simple status message.
- `GET /health` returns a lightweight health check.
