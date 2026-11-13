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
    run_id = verify_res.json()["run"]["run_id"]

    # List runs
    runs_res = client.get("/api/v1/runs?requirement_id=PAYMENT-004")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) >= 1

    # Get single run
    single_run_res = client.get(f"/api/v1/runs/{run_id}")
    assert single_run_res.status_code == 200
    run_data = single_run_res.json()
    assert run_data["run_id"] == run_id
    assert run_data["exit_code"] == 0
    assert "start_time" in run_data
    assert "end_time" in run_data

    # Get evidence
    ev_res = client.get(f"/api/v1/evidence/{evidence_id}")
    assert ev_res.status_code == 200
    ev = ev_res.json()
    assert ev["evidence_id"] == evidence_id
    assert ev["artifact_type"] == "PROCESS_LOG"


def test_v1_demonstration_vulnerable_vs_corrected(client: TestClient) -> None:
    """Tests the full comparative demonstration endpoint for PAYMENT-004."""
    res = client.post("/api/v1/demonstrate/vulnerable-vs-corrected")
    assert res.status_code == 200
    data = res.json()

    assert data["requirement_id"] == "PAYMENT-004"

    # Vulnerable run must demonstrate violation
    vuln = data["vulnerable_run"]
    assert vuln["exit_code"] == 1
    assert vuln["status"] == "VIOLATION"
    assert "DID NOT RAISE InsufficientFundsError" in vuln["concise_output"]
    assert vuln["finding"] is not None
    assert vuln["finding"]["severity"] == "CRITICAL"

    # Corrected run must demonstrate verified pass
    corr = data["corrected_run"]
    assert corr["exit_code"] == 0
    assert corr["status"] == "VERIFIED"
    assert corr["finding"] is None


def test_v1_run_not_found(client: TestClient) -> None:
    res = client.get("/api/v1/runs/run-nonexistent-id-999")
    assert res.status_code == 404
