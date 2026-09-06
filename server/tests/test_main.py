import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_root_returns_status_message(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hirelens API is running"
    assert "version" in data


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_problems_returns_seeded_problems(client: TestClient) -> None:
    response = client.get("/problems")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 1
    titles = [p["title"] for p in payload]
    assert "Two Sum" in titles


def test_get_problem_by_id_returns_seeded_problem(client: TestClient) -> None:
    response = client.get("/problems/1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == 1
    assert payload["title"] == "Two Sum"
    assert payload["difficulty"] == "easy"
    # hidden_cases should NOT be in the response
    assert "hidden_cases" not in payload


def test_get_problem_by_id_returns_404_for_missing_problem(client: TestClient) -> None:
    response = client.get("/problems/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "problem not found"}


def test_problem_list_filter_by_difficulty(client: TestClient) -> None:
    response = client.get("/problems?difficulty=hard")

    assert response.status_code == 200
    payload = response.json()
    assert all(p["difficulty"] == "hard" for p in payload)


def test_problem_list_search(client: TestClient) -> None:
    response = client.get("/problems?q=Two")

    assert response.status_code == 200
    payload = response.json()
    assert any(p["title"] == "Two Sum" for p in payload)


def test_register_creates_user(client: TestClient) -> None:
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "testuser"


def test_register_duplicate_username_returns_409(client: TestClient) -> None:
    client.post("/auth/register", json={"username": "dup", "email": "dup@x.com", "password": "pass123"})
    response = client.post("/auth/register", json={"username": "dup", "email": "dup2@x.com", "password": "pass123"})
    assert response.status_code == 409


def test_login_returns_token(client: TestClient) -> None:
    client.post("/auth/register", json={"username": "loginuser", "email": "login@x.com", "password": "mypassword"})
    response = client.post(
        "/auth/login",
        data={"username": "loginuser", "password": "mypassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_auth_me_returns_user(client: TestClient) -> None:
    reg = client.post("/auth/register", json={"username": "meuser", "email": "me@x.com", "password": "pass123"})
    token = reg.json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "meuser"


def test_run_returns_result_without_auth(client: TestClient) -> None:
    """The /run endpoint does not require authentication."""
    # Minimal Python that outputs what's expected in the Two Sum example
    code = "print('[0, 1]')"
    response = client.post(
        "/problems/1/run",
        json={"code": code, "language": "python"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "cases" in data
    assert len(data["cases"]) == 1


def test_submit_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/problems/1/submit",
        json={"code": "print('hello')", "language": "python"},
    )
    assert response.status_code == 401


def test_submit_saves_and_returns_result(client: TestClient) -> None:
    reg = client.post("/auth/register", json={"username": "solver", "email": "solver@x.com", "password": "pass123"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/problems/1/submit",
        json={"code": "print('hello')", "language": "python"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("accepted", "wrong_answer", "time_limit_exceeded", "runtime_error")
    assert "id" in data


def test_stats_endpoint(client: TestClient) -> None:
    reg = client.post("/auth/register", json={"username": "statuser", "email": "stat@x.com", "password": "pass123"})
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/users/me/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "problems_solved" in data
    assert "acceptance_rate" in data
