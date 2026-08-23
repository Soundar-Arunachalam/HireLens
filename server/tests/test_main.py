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
    assert response.json() == {"message": "server for codeeditor is running"}


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_problems_returns_seeded_problem(client: TestClient) -> None:
    response = client.get("/problems")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 1
    assert payload[0]["title"] == "Two Sum"
    assert payload[0]["slug"] == "two-sum"


def test_get_problem_by_id_returns_seeded_problem(client: TestClient) -> None:
    response = client.get("/problems/1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == 1
    assert payload["title"] == "Two Sum"
    assert payload["difficulty"] == "easy"


def test_get_problem_by_id_returns_404_for_missing_problem(client: TestClient) -> None:
    response = client.get("/problems/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "problem not found"}
