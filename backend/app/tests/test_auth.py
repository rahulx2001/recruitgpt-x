"""Authorization scoping tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_candidates_scoped_by_owner():
    dev_jobs = client.get("/api/jobs", headers={"X-User-Id": "dev-user"})
    assert dev_jobs.status_code == 200

    other = client.get("/api/candidates", headers={"X-User-Id": "isolated-user"})
    assert other.status_code == 200
    assert other.json() == []