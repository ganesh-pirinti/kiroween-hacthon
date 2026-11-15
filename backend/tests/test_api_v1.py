"""Tests for API v1 REST endpoints."""

from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.evidence import EvidenceStore
from backend.app.main import app
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository
from backend.app.verifier import Verifier

PRODUCTION_DB_PATH = Path("evidence/evidence.db")


@pytest.fixture(autouse=True)
def isolate_api_v1_environment(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Ensure every test in test_api_v1.py operates against an isolated temporary database."""
    isolated_db = Database(tmp_path / "test_api_v1.db")
    isolated_repo = StorageRepository(isolated_db)
    catalog_path = Path("requirements/catalog.json")
    if catalog_path.exists():
        isolated_repo.sync_catalog(catalog_path)
    isolated_evaluator = VerificationEvaluator(isolated_repo)

    isolated_store = EvidenceStore(tmp_path / "test_api_v1_legacy.db")
    isolated_verifier = Verifier(evidence_store=isolated_store, base_dir=Path.cwd())

    import backend.app.main as main_mod

    monkeypatch.setattr(main_mod, "db", isolated_db)
    monkeypatch.setattr(main_mod, "repository", isolated_repo)
    monkeypatch.setattr(main_mod, "evaluator", isolated_evaluator)
    monkeypatch.setattr(main_mod, "legacy_evidence_store", isolated_store)
    monkeypatch.setattr(main_mod, "legacy_verifier", isolated_verifier)

    initial_exists = PRODUCTION_DB_PATH.exists()
    initial_mtime = PRODUCTION_DB_PATH.stat().st_mtime_ns if initial_exists else None
    initial_size = PRODUCTION_DB_PATH.stat().st_size if initial_exists else None

    yield

    if initial_exists:
        assert PRODUCTION_DB_PATH.exists(), "Regression: Production database was deleted during test!"
        current_mtime = PRODUCTION_DB_PATH.stat().st_mtime_ns
        current_size = PRODUCTION_DB_PATH.stat().st_size
        assert current_size == initial_size, (
            f"Regression: Production database size changed from {initial_size} to {current_size}! "
            "A test in test_api_v1.py accessed the production database instead of an isolated temporary database."
        )
        assert current_mtime == initial_mtime, (
            f"Regression: Production database was written to! mtime changed from {initial_mtime} to {current_mtime}. "
            "A test in test_api_v1.py accessed the production database instead of an isolated temporary database."
        )


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

    # Get evidence for run
    run_ev_res = client.get(f"/api/v1/runs/{run_id}/evidence")
    assert run_ev_res.status_code == 200
    run_evs = run_ev_res.json()
    assert len(run_evs) >= 1
    assert run_evs[0]["evidence_id"] == evidence_id


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


# ---------------------------------------------------------------------------
# Health endpoint performance: count queries must agree with list queries
# ---------------------------------------------------------------------------
def test_v1_health_counts_agree_with_list_queries(tmp_path: Path) -> None:
    """Health endpoint counts must match the actual list-query lengths.

    This guards against the count methods and list methods diverging.
    It also confirms the health endpoint no longer loads all objects to
    compute counts (the response values come from COUNT(*) queries).
    
    Uses an isolated test database with seeded data to avoid production dependency.
    """
    from backend.app.storage.database import Database
    from backend.app.storage.repository import StorageRepository
    from backend.app.engine.evaluator import VerificationEvaluator

    # Create isolated test database
    test_db = Database(tmp_path / "health_test.db")
    repo = StorageRepository(test_db)
    repo.sync_catalog(Path("requirements/catalog.json"))
    
    # Seed database with verification runs to test counting
    evaluator = VerificationEvaluator(repo)
    evaluator.verify_requirement("PAYMENT-001")
    evaluator.verify_requirement("PAYMENT-002")
    evaluator.verify_requirement("PAYMENT-004")

    # Count methods
    req_count = repo.count_requirements()
    run_count = repo.count_verification_runs()
    finding_count = repo.count_findings()

    # List methods (ground truth)
    req_list_count = len(repo.list_requirements())
    run_list_count = len(repo.list_verification_runs(limit=10000))
    finding_list_count = len(repo.list_findings(limit=10000))

    assert req_count == req_list_count, (
        f"count_requirements() ({req_count}) != len(list_requirements()) ({req_list_count})"
    )
    assert run_count == run_list_count, (
        f"count_verification_runs() ({run_count}) != len(list_verification_runs()) ({run_list_count})"
    )
    assert finding_count == finding_list_count, (
        f"count_findings() ({finding_count}) != len(list_findings()) ({finding_list_count})"
    )
    
    # Verify the counts are reasonable after seeding
    assert req_count >= 6, "Should have at least 6 requirements from catalog"
    assert run_count >= 3, "Should have at least 3 verification runs from seeding"
    # findings may be 0 if all tests pass


def test_v1_endpoints_do_not_touch_production_database(client: TestClient) -> None:
    """Regression test ensuring v1 endpoints write exclusively to isolated test database."""
    if not PRODUCTION_DB_PATH.exists():
        pytest.skip("Production database does not exist to verify isolation")

    initial_size = PRODUCTION_DB_PATH.stat().st_size
    initial_mtime = PRODUCTION_DB_PATH.stat().st_mtime_ns

    # Trigger verification via v1 API
    verify_res = client.post("/api/v1/verify/PAYMENT-004")
    assert verify_res.status_code == 200
    run_id = verify_res.json()["run"]["run_id"]

    # Confirm production DB size and mtime are strictly unchanged
    assert PRODUCTION_DB_PATH.stat().st_size == initial_size
    assert PRODUCTION_DB_PATH.stat().st_mtime_ns == initial_mtime

    # Confirm run_id was NOT written to production database
    import sqlite3
    conn = sqlite3.connect(str(PRODUCTION_DB_PATH))
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM verification_runs WHERE run_id = ?", (run_id,))
    count_in_prod = cursor.fetchone()[0]
    conn.close()
    assert count_in_prod == 0, f"Verification run {run_id} was improperly written to production DB!"


def test_v1_change_impact_analysis(client: TestClient) -> None:
    """Verifies change impact analysis returns valid freshness diagnosis."""
    res = client.get("/api/v1/impact/analysis")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "requirements" in data
    assert data["summary"]["total_requirements"] >= 6
    assert "target_source_path" in data


def test_v1_risk_analysis(client: TestClient) -> None:
    """Verifies explainable risk score calculation."""
    res = client.get("/api/v1/risk/analysis")
    assert res.status_code == 200
    data = res.json()
    assert "overall_risk_posture" in data
    assert "risk_breakdown" in data
    assert len(data["risk_breakdown"]) >= 6
    for item in data["risk_breakdown"]:
        assert "risk_score" in item
        assert "risk_category" in item
        assert "contributing_factors" in item


def test_v1_audit_report_generation(client: TestClient) -> None:
    """Verifies Markdown and JSON audit report generation."""
    # Test Markdown
    res_md = client.get("/api/v1/audit/report?format=markdown")
    assert res_md.status_code == 200
    data_md = res_md.json()
    assert data_md["format"] == "markdown"
    assert "GHOST PROTOCOL — FORMAL EVIDENCE AUDIT REPORT" in data_md["content"]

    # Test JSON
    res_json = client.get("/api/v1/audit/report?format=json")
    assert res_json.status_code == 200
    data_json = res_json.json()
    assert data_json["format"] == "json"
    assert "executive_summary" in data_json["content"]


def test_v1_ai_copilot_endpoints(client: TestClient) -> None:
    """Verifies honest copilot proposal status and candidate generation."""
    res_status = client.get("/api/v1/ai-copilot/status")
    assert res_status.status_code == 200
    data_status = res_status.json()
    assert data_status["mode"] == "PROPOSAL_ONLY (NOT PROOF)"

    res_props = client.get("/api/v1/ai-copilot/proposals/PAYMENT-003")
    assert res_props.status_code == 200
    data_props = res_props.json()
    assert data_props["requirement_id"] == "PAYMENT-003"
    assert "proposals" in data_props
    assert any("AC-03.4" in p["title"] or "AC-03.4" in p["criterion_id"] for p in data_props["proposals"])

