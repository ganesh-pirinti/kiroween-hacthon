"""Tests for API v1 REST endpoints."""

from fastapi.testclient import TestClient
import pytest

from backend.app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_v1_health(client: TestClient) -> None:
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["slogan"] == "AI says Done. We demand proof."
    assert data["active_requirements"] >= 6


def test_v1_requirements_catalog(client: TestClient) -> None:
    res = client.get("/api/v1/requirements")
    assert res.status_code == 200
    reqs = res.json()
    req_ids = [r["id"] for r in reqs]
    assert "PAYMENT-001" in req_ids
    assert "PAYMENT-004" in req_ids
    assert "PAYMENT-006" in req_ids


def test_v1_get_single_requirement(client: TestClient) -> None:
    res = client.get("/api/v1/requirements/PAYMENT-004")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "PAYMENT-004"
    assert len(data["acceptance_criteria"]) >= 4


def test_v1_verify_payment_004(client: TestClient) -> None:
    res = client.post("/api/v1/verify/PAYMENT-004")
    assert res.status_code == 200
    data = res.json()
    assert data["requirement"]["status"] == "VERIFIED"
    assert data["run"]["execution_status"] == "COMPLETED"
    assert data["run"]["exit_code"] == 0
    assert data["evidence"] is not None
    assert len(data["evidence"]["integrity_metadata"]["sha256"]) == 64


def test_v1_verify_unbound_payment_006(client: TestClient) -> None:
    res = client.post("/api/v1/verify/PAYMENT-006")
    assert res.status_code == 200
    data = res.json()
    assert data["requirement"]["status"] == "UNVERIFIED"
    assert data["run"]["exit_code"] == 5


def test_v1_runs_and_evidence(client: TestClient) -> None:
    # Trigger a verify first
    verify_res = client.post("/api/v1/verify/PAYMENT-004")
    evidence_id = verify_res.json()["evidence"]["evidence_id"]

    runs_res = client.get("/api/v1/runs?requirement_id=PAYMENT-004")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) >= 1

    ev_res = client.get(f"/api/v1/evidence/{evidence_id}")
    assert ev_res.status_code == 200
    ev = ev_res.json()
    assert ev["evidence_id"] == evidence_id
    assert ev["artifact_type"] == "PROCESS_LOG"
