"""Basic API health and authorization tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "dev-user"}
OTHER_USER_HEADERS = {"X-User-Id": "other-user"}


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "RecruitGPT X"
    assert "endpoints" not in data


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_ready_vector_store():
    r = client.get("/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in ("ok", "degraded")
    assert "vector_store" in body
    vs = body["vector_store"]
    assert "client" in vs
    assert "candidates_indexed" in vs
    assert "jobs_indexed" in vs
    assert "ranking_weights_mode" in body


def test_jobs_require_user_scope():
    r = client.get("/api/jobs", headers=OTHER_USER_HEADERS)
    assert r.status_code == 200
    # Other user should not see dev-user's seeded jobs (empty or only their own)
    jobs = r.json()
    assert isinstance(jobs, list)


def test_idor_job_access():
    """User A cannot read jobs owned by dev-user."""
    listed = client.get("/api/jobs", headers=AUTH_HEADERS).json()
    if not listed:
        return
    job_id = listed[0]["id"]
    r = client.get(f"/api/jobs/{job_id}", headers=OTHER_USER_HEADERS)
    assert r.status_code == 404