# Hirelens

Hirelens is a LeetCode-style code editor and evaluation application. It provides an intuitive environment for users to solve programming challenges, execute code securely, and view statistics.

## Architecture

The application is split into a frontend client and a backend server:

- **Frontend (Client)**: A React application built with Vite, utilizing `@monaco-editor/react` for the code editing experience and `@excalidraw/excalidraw` for collaborative drawing/notes.
- **Backend (Server)**: A FastAPI Python server handling user authentication, problem fetching, and code execution. It uses PostgreSQL for data persistence.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.13+) and `uv` package manager
- Docker (optional, for running PostgreSQL and the backend via `docker-compose`)

### Running the Backend

The backend is located in the `server` directory.

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies using `uv`:
   ```bash
   uv sync
   ```
4. Start the development server:
   ```bash
   uv run uvicorn app.main:app --reload
   ```

*Alternatively, run the database and backend using Docker Compose:*
```bash
docker compose up --build
```

### Running the Frontend

The frontend is located in the `client` directory.

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Testing

Both the client and server include test suites.

### Client E2E Tests (Playwright)
```bash
cd client
npm run test:e2e
```

### Server Tests (Pytest)
```bash
cd server
uv run pytest tests
```
