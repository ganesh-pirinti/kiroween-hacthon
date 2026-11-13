"""Tests for the Before-and-After Comparison Engine."""

from pathlib import Path
import pytest

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.models.status import FailureClassification, VerificationStatus
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository


def test_compare_scenario_payment_004(tmp_path: Path) -> None:
    """Verifies that compare_scenario accurately captures before (violation) vs after (verified)."""
    db = Database(tmp_path / "cmp_test.db")
    repo = StorageRepository(db)
    repo.sync_catalog(Path("requirements/catalog.json"))
    evaluator = VerificationEvaluator(repo)

    result = evaluator.compare_scenario("PAYMENT-004")

    assert result["scenario_id"] == "SCENARIO-PAYMENT-004"
    assert result["requirement_id"] == "PAYMENT-004"
    assert result["defect_analysis"]["resolved"] is True

    # Before run checks
    before = result["before_run"]
    assert before["exit_code"] == 1
    assert before["status"] == VerificationStatus.VIOLATION.value
    assert before["failure_classification"] == FailureClassification.ASSERTION_FAILURE.value
    assert before["evidence_sha256"] is not None
    assert before["finding"] is not None

    # After run checks
    after = result["after_run"]
    assert after["exit_code"] == 0
    assert after["status"] == VerificationStatus.VERIFIED.value
    assert after["failure_classification"] == FailureClassification.NONE.value
    assert after["evidence_sha256"] is not None
    assert after["finding"] is None


def test_compare_unknown_scenario_raises_404(tmp_path: Path) -> None:
    """Attempting to compare an unknown scenario must raise ValueError."""
    db = Database(tmp_path / "cmp_test2.db")
    repo = StorageRepository(db)
    evaluator = VerificationEvaluator(repo)

    with pytest.raises(ValueError, match="Unknown scenario ID"):
        evaluator.compare_scenario("UNKNOWN-999")
