"""Tests for the Ghost Protocol Evidence Engine, Verifier, and API.

Validates state transitions (PASS, FAIL, BLOCKED, UNVERIFIED),
tamper-evident hashing, storage operations, and REST endpoints.
"""

from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from backend.app.evidence import (
    EvidenceRecord,
    EvidenceStore,
    VerificationStatus,
)
from backend.app.main import app
from backend.app.verifier import Verifier


@pytest.fixture
def test_client() -> TestClient:
    """Fixture providing a FastAPI TestClient."""
    return TestClient(app)


@pytest.fixture
def temp_evidence_store(tmp_path: Path) -> EvidenceStore:
    """Fixture providing an isolated SQLite store in a temporary folder."""
    db_file = tmp_path / "test_evidence.db"
    return EvidenceStore(db_file)


class TestEvidenceEngine:
    """Tests for tamper-evident hashing and persistence."""

    def test_evidence_hash_sealing(self) -> None:
        """Test that seal() generates a valid deterministic SHA-256 digest."""
        rec = EvidenceRecord(
            evidence_id="ev-test-1",
            requirement_id="PAYMENT-004",
            verdict=VerificationStatus.PASS,
            command="pytest test",
            exit_code=0,
            stdout="OK",
            stderr="",
            duration_ms=12.5,
            code_fingerprint="abc123code",
            test_fingerprint="def456test",
        )
        assert rec.evidence_hash == ""
        rec.seal()
        assert len(rec.evidence_hash) == 64
        # Hash should be idempotent
        assert rec.evidence_hash == rec.compute_hash()

    def test_evidence_store_sqlite_persistence(self, temp_evidence_store: EvidenceStore) -> None:
        """Test saving, retrieving, and querying records from SQLite."""
        rec = EvidenceRecord(
            evidence_id="ev-persist-1",
            requirement_id="PAYMENT-004",
            verdict=VerificationStatus.PASS,
            command="pytest backend/tests/test_payment.py",
            exit_code=0,
            stdout="1 passed",
            stderr="",
            duration_ms=15.0,
            code_fingerprint="fakecode",
            test_fingerprint="faketest",
        ).seal()

        temp_evidence_store.save_record(rec)

        fetched = temp_evidence_store.get_by_id("ev-persist-1")
        assert fetched is not None
        assert fetched.evidence_id == "ev-persist-1"
        assert fetched.verdict == VerificationStatus.PASS
        assert fetched.evidence_hash == rec.evidence_hash

        latest = temp_evidence_store.get_latest_for_requirement("PAYMENT-004")
        assert latest is not None
        assert latest.evidence_id == "ev-persist-1"


class TestVerifierLogic:
    """Tests for exit code mapping and execution policies."""

    def test_unbound_requirement_yields_unverified(self, tmp_path: Path) -> None:
        """A requirement with no bound test target must return UNVERIFIED, never PASS."""
        verifier = Verifier(
            evidence_store=EvidenceStore(tmp_path / "v.db"),
            base_dir=Path.cwd(),
        )
        record = verifier.verify_requirement("PAYMENT-006")
        assert record.verdict == VerificationStatus.UNVERIFIED
        assert record.exit_code == 5
        assert "UNVERIFIED" in record.stdout

    def test_unknown_requirement_yields_unverified(self, tmp_path: Path) -> None:
        """Unknown requirement ID must return UNVERIFIED."""
        verifier = Verifier(
            evidence_store=EvidenceStore(tmp_path / "v.db"),
            base_dir=Path.cwd(),
        )
        record = verifier.verify_requirement("NONEXISTENT-999")
        assert record.verdict == VerificationStatus.UNVERIFIED
        assert record.exit_code == 5

    def test_verified_payment_004_passes_on_corrected_code(self, tmp_path: Path) -> None:
        """Verification of PAYMENT-004 on corrected implementation must yield PASS."""
        verifier = Verifier(
            evidence_store=EvidenceStore(tmp_path / "v.db"),
            base_dir=Path.cwd(),
        )
        record = verifier.verify_requirement("PAYMENT-004")
        assert record.verdict == VerificationStatus.PASS
        assert record.exit_code == 0
        assert len(record.code_fingerprint) == 64


class TestApiEndpoints:
    """Tests for the REST API endpoints."""

    def test_health_endpoint(self, test_client: TestClient) -> None:
        res = test_client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["registered_requirements"] >= 6

    def test_list_requirements(self, test_client: TestClient) -> None:
        res = test_client.get("/api/requirements")
        assert res.status_code == 200
        items = res.json()
        req_ids = [item["requirement_id"] for item in items]
        assert "PAYMENT-004" in req_ids
        assert "PAYMENT-006" in req_ids

    def test_get_single_requirement(self, test_client: TestClient) -> None:
        res = test_client.get("/api/requirements/PAYMENT-004")
        assert res.status_code == 200
        data = res.json()
        assert data["definition"]["requirement_id"] == "PAYMENT-004"

    def test_verify_known_requirement(self, test_client: TestClient) -> None:
        res = test_client.post("/api/verify/PAYMENT-004")
        assert res.status_code == 200
        data = res.json()
        assert data["requirement_id"] == "PAYMENT-004"
        assert data["verdict"] == "PASS"
        assert data["exit_code"] == 0
        assert len(data["evidence_hash"]) == 64

    def test_verify_unknown_requirement_returns_404(self, test_client: TestClient) -> None:
        res = test_client.post("/api/verify/DOESNOTEXIST")
        assert res.status_code == 404
        assert "Cannot verify unknown requirement" in res.json()["detail"]

    def test_evidence_query_and_detail(self, test_client: TestClient) -> None:
        # Trigger verification to ensure at least one record exists
        verify_res = test_client.post("/api/verify/PAYMENT-004")
        evidence_id = verify_res.json()["evidence_id"]

        # Fetch list
        list_res = test_client.get("/api/evidence?requirement_id=PAYMENT-004")
        assert list_res.status_code == 200
        records = list_res.json()
        assert len(records) >= 1

        # Fetch by ID
        detail_res = test_client.get(f"/api/evidence/{evidence_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["evidence_id"] == evidence_id
        assert detail["verdict"] == "PASS"
