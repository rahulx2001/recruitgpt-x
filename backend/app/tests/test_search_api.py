"""POST /api/search request schema tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
HEADERS = {"X-User-Id": "dev-user"}


def test_search_accepts_query_and_top_k():
    res = client.post(
        "/api/search",
        headers=HEADERS,
        json={"query": "ML engineer with PyTorch", "top_k": 5},
    )
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)


def test_search_rejects_empty_query():
    res = client.post(
        "/api/search",
        headers=HEADERS,
        json={"query": ""},
    )
    assert res.status_code == 422


def test_search_rejects_wrong_field_name():
    res = client.post(
        "/api/search",
        headers=HEADERS,
        json={"q": "ML engineer"},
    )
    assert res.status_code == 422
    assert "query" in res.text.lower()