"""Tests for Failure Classification and Evidence Provenance."""

from pathlib import Path
import pytest

from backend.app.engine.runner import classify_execution
from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.models.status import FailureClassification, VerificationStatus
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository


def test_classify_execution_categories() -> None:
    """Verifies that execution outcomes are correctly classified."""
    # 1. Clean pass
    assert classify_execution(0, "=== 1 passed ===", "", False) == FailureClassification.NONE

    # 2. Timeout
    assert classify_execution(-1, "", "Subprocess timed out", True) == FailureClassification.TIMEOUT

    # 3. Assertion failure
    assert classify_execution(1, "AssertionError: balance mismatch", "", False) == FailureClassification.ASSERTION_FAILURE
    assert classify_execution(1, "Failed: DID NOT RAISE InsufficientFundsError", "", False) == FailureClassification.ASSERTION_FAILURE

    # 4. Infrastructure error
    assert classify_execution(2, "", "pytest: error: unrecognized arguments", False) == FailureClassification.TEST_INFRASTRUCTURE_ERROR
    assert classify_execution(4, "", "pytest usage error", False) == FailureClassification.TEST_INFRASTRUCTURE_ERROR

    # 5. Uncollected tests
    assert classify_execution(5, "collected 0 items", "", False) == FailureClassification.UNCOLLECTED_TESTS

    # 6. Blocked / launch failure
    assert classify_execution(-2, "", "Execution failed to launch", False) == FailureClassification.BLOCKED_EXECUTION


def test_finding_evidence_provenance(tmp_path: Path) -> None:
    """Findings must contain complete provenance linking finding -> run -> test -> requirement -> evidence."""
    db = Database(tmp_path / "prov_test.db")
    repo = StorageRepository(db)
    repo.sync_catalog(Path("requirements/catalog.json"))
    evaluator = VerificationEvaluator(repo)

    # Run vulnerable target to trigger a genuine violation finding
    vuln_target = "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service"
    req, run, finding = evaluator.verify_requirement("PAYMENT-004", target_override=vuln_target)

    assert finding is not None
    assert finding.requirement_id == "PAYMENT-004"
    assert finding.run_id == run.run_id
    assert finding.test_name == vuln_target
    assert finding.failure_classification == FailureClassification.ASSERTION_FAILURE
    assert finding.code_fingerprint != ""
    assert finding.test_fingerprint != ""
    assert len(finding.linked_evidence_ids) >= 1

    # Verify run metadata
    assert run.failure_classification == FailureClassification.ASSERTION_FAILURE
    assert run.exit_code == 1

    # Verify database persistence of provenance fields
    persisted_finding = repo.get_finding(finding.finding_id)
    assert persisted_finding is not None
    assert persisted_finding.run_id == run.run_id
    assert persisted_finding.failure_classification == FailureClassification.ASSERTION_FAILURE
    assert persisted_finding.code_fingerprint == finding.code_fingerprint
