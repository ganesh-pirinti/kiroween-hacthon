"""Comprehensive security, correctness, and reliability regression test suite for Ghost Protocol."""

import concurrent.futures
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.engine.runner import SubprocessRunner
from backend.app.engine.sanitizer import sanitize_text
from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository
from backend.app.models.status import VerificationStatus


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestSecurityAccessAndInputValidation:
    """Tests for API boundary input validation and access controls."""

    def test_malformed_requirement_id_rejected_with_400(self, client: TestClient) -> None:
        """Requirement IDs must match strict pattern; malformed strings rejected with 400."""
        malformed_ids = [
            "PAYMENT;DROP TABLE requirements;",
            "payment-004",  # lowercase rejected
            "PAYMENT 004",  # space rejected
            "script_alert_1",
            "A" * 1000,
            "INVALID_NAME",
        ]
        for bad_id in malformed_ids:
            res = client.get(f"/api/v1/requirements/{bad_id}")
            assert res.status_code == 400, f"Expected 400 for '{bad_id}', got {res.status_code}"
            assert "Malformed requirement ID" in res.json()["detail"]

    def test_path_traversal_in_url_rejected(self, client: TestClient) -> None:
        """Path traversal sequences in URL return 400 or 404 router normalization rejection."""
        res = client.get("/api/v1/requirements/%2E%2E%2Fetc%2Fpasswd")
        assert res.status_code in (400, 404)

    def test_malformed_run_id_rejected_with_400(self, client: TestClient) -> None:
        """Run IDs must match pattern ^run-[a-zA-Z0-9_-]+$."""
        bad_run_ids = ["evil_run", "run-123;DROP", "run-123%20bad"]
        for bad_id in bad_run_ids:
            res = client.get(f"/api/v1/runs/{bad_id}")
            assert res.status_code == 400

    def test_malformed_evidence_id_rejected_with_400(self, client: TestClient) -> None:
        """Evidence IDs must match pattern ^ev-[a-zA-Z0-9_-]+$."""
        bad_ev_ids = ["artifact-123", "ev-!@#$", "ev-123%20bad"]
        for bad_id in bad_ev_ids:
            res = client.get(f"/api/v1/evidence/{bad_id}")
            assert res.status_code == 400

    def test_malformed_scenario_id_rejected_with_400(self, client: TestClient) -> None:
        """Scenario slugs must contain only safe alphanumeric/hyphen characters."""
        res = client.post("/api/v1/compare/evil%20scenario;drop")
        assert res.status_code == 400


class TestSubprocessAndPathIsolation:
    """Tests for command execution, flag injection, and path traversal restrictions."""

    def test_runner_rejects_flag_injection(self) -> None:
        """Test targets starting with flags or options are rejected immediately."""
        runner = SubprocessRunner(Path.cwd())
        with pytest.raises(ValueError, match="Options/flags injection prohibited"):
            runner.execute_target("-o custom_option")

        with pytest.raises(ValueError, match="Options/flags injection prohibited"):
            runner.execute_target("--capture=no")

    def test_runner_rejects_arbitrary_files_outside_tests(self) -> None:
        """Test targets cannot point to files outside 'backend/tests/'."""
        runner = SubprocessRunner(Path.cwd())
        # Attempting to target production application code
        with pytest.raises(ValueError, match="Security Violation"):
            runner.execute_target("backend/app/main.py")

        # Attempting path traversal
        with pytest.raises(ValueError, match="Security Violation"):
            runner.execute_target("backend/tests/../../backend/app/payment.py")

    def test_runner_rejects_non_python_files(self) -> None:
        """Test target must strictly end with .py."""
        runner = SubprocessRunner(Path.cwd())
        with pytest.raises(ValueError, match="must be a Python test file"):
            runner.execute_target("backend/tests/conftest.txt")

    def test_runner_rejects_metacharacters(self) -> None:
        """Test targets containing quotes, backticks, or semicolons are rejected."""
        runner = SubprocessRunner(Path.cwd())
        with pytest.raises(ValueError, match="Target contains invalid or metacharacters"):
            runner.execute_target("backend/tests/test_payment.py; rm -rf")


class TestSecretSanitizationAndLogScrubbing:
    """Tests for redacting secrets, credentials, and tokens from logs."""

    def test_secret_sanitization_masks_credentials(self) -> None:
        """Log sanitizer must mask API keys, Bearer tokens, and connection strings."""
        dirty_log = (
            "Connecting with api_key='sk-1234567890abcdef1234567890' and password='SuperSecretPassword123'\n"
            "Authorization: Bearer my_secret_token_1234567890\n"
            "Database: postgresql://admin:DatabasePassword999@localhost:5432/db\n"
            "AWS Key: AKIAIOSFODNN7EXAMPLE"
        )
        clean = sanitize_text(dirty_log)

        assert "sk-1234567890" not in clean
        assert "SuperSecretPassword123" not in clean
        assert "my_secret_token_1234567890" not in clean
        assert "DatabasePassword999" not in clean
        assert "AKIAIOSFODNN7EXAMPLE" not in clean

        assert "[REDACTED_SECRET]" in clean
        assert "[REDACTED_AWS_KEY]" in clean


class TestStatusTransitionAndEvidenceIntegrity:
    """Tests for zero-trust status transitions and cryptographic evidence verification."""

    def test_uncovered_criteria_prevent_verified_status(self, tmp_path: Path) -> None:
        """A requirement with uncovered criteria (like PAYMENT-003) cannot transition to VERIFIED."""
        db = Database(tmp_path / "integrity_test.db")
        repo = StorageRepository(db)
        repo.sync_catalog(Path("requirements/catalog.json"))
        evaluator = VerificationEvaluator(repo)

        # PAYMENT-003 has AC-03.4 which is UNBOUND (linked_test is None)
        req, run, finding = evaluator.verify_requirement("PAYMENT-003")

        # Even though the executed test passed (exit 0), requirement MUST NOT be VERIFIED
        assert run.exit_code == 0
        assert req.status == VerificationStatus.UNVERIFIED, (
            "Requirement with unverified criteria gaps was improperly marked VERIFIED!"
        )

    def test_cryptographic_evidence_tamper_detection(self, client: TestClient) -> None:
        """Evidence integrity endpoint detects if stored payload has been tampered with."""
        # 1. Run a real verification to generate evidence
        v_res = client.post("/api/v1/verify/PAYMENT-004")
        assert v_res.status_code == 200
        ev_id = v_res.json()["evidence"]["evidence_id"]

        # 2. Check integrity on untampered evidence
        int_res = client.get(f"/api/v1/evidence/{ev_id}/verify")
        assert int_res.status_code == 200
        int_data = int_res.json()
        assert int_data["sha256_valid"] is True
        assert int_data["run_traced_in_database"] is True
        assert int_data["integrity_sealed"] is True

        # 3. Simulate database tampering on the payload
        with Database().get_connection() as conn:
            conn.execute(
                "UPDATE evidence_artifacts SET payload = ? WHERE evidence_id = ?",
                ("TAMPERED PAYLOAD CONTENT", ev_id),
            )
            conn.commit()

        # 4. Verify tampering is caught
        tamper_res = client.get(f"/api/v1/evidence/{ev_id}/verify")
        assert tamper_res.status_code == 200
        tamper_data = tamper_res.json()
        assert tamper_data["sha256_valid"] is False
        assert tamper_data["integrity_sealed"] is False
        assert tamper_data["stored_digest"] != tamper_data["computed_digest"]


class TestConcurrencySafety:
    """Tests for thread safety and concurrent execution without deadlock."""

    def test_concurrent_verification_runs(self) -> None:
        """Simultaneous verification runs across threads execute safely without SQLite locking errors."""
        db = Database(Path("evidence/evidence.db"))
        repo = StorageRepository(db)
        evaluator = VerificationEvaluator(repo)

        def run_single(req_id: str):
            return evaluator.verify_requirement(req_id)

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(run_single, "PAYMENT-001"),
                executor.submit(run_single, "PAYMENT-002"),
                executor.submit(run_single, "PAYMENT-004"),
            ]
            results = [f.result() for f in futures]

        assert len(results) == 3
        for req, run, finding in results:
            assert run.execution_status.value in ("COMPLETED", "FAILED")
