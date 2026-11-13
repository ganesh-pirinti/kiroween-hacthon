"""Tests for Requirement Coverage and Adversarial Scenario Tracking."""

from pathlib import Path
import pytest

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.models.status import VerificationStatus
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository


@pytest.fixture
def test_repo(tmp_path: Path) -> StorageRepository:
    db = Database(tmp_path / "test_evidence.db")
    repo = StorageRepository(db)
    catalog = Path("requirements/catalog.json")
    repo.sync_catalog(catalog)
    return repo


def test_coverage_detects_unverified_criteria_gaps(test_repo: StorageRepository) -> None:
    """Requirement coverage must identify criteria with NO linked test and mark them UNVERIFIED."""
    evaluator = VerificationEvaluator(test_repo)
    report = evaluator.analyze_coverage()

    assert report["total_requirements"] == 6
    assert report["total_criteria"] > 0
    assert report["uncovered_criteria"] >= 2  # AC-03.4 and AC-06.1
    assert report["has_unverified_gaps"] is True

    # Check specific gap items
    uncovered_ids = [item["criterion_id"] for item in report["uncovered_items"]]
    assert "AC-06.1" in uncovered_ids
    assert "AC-03.4" in uncovered_ids

    # Uncovered criteria must have UNVERIFIED status
    for item in report["uncovered_items"]:
        assert item["status"] == VerificationStatus.UNVERIFIED.value


def test_single_requirement_coverage(test_repo: StorageRepository) -> None:
    """Coverage analysis on a specific requirement reports its exact criteria breakdown."""
    evaluator = VerificationEvaluator(test_repo)
    p3_report = evaluator.analyze_coverage(requirement_id="PAYMENT-003")

    req_details = p3_report["requirements"][0]
    assert req_details["requirement_id"] == "PAYMENT-003"
    assert req_details["total_criteria"] == 4
    assert req_details["covered_criteria"] == 3
    assert req_details["uncovered_criteria"] == 1
    assert req_details["has_coverage_gaps"] is True


def test_adversarial_scenario_execution_audit(test_repo: StorageRepository) -> None:
    """Running verification must record executed adversarial scenarios."""
    evaluator = VerificationEvaluator(test_repo)
    req, run, finding = evaluator.verify_requirement("PAYMENT-004")

    # Re-fetch requirement to verify state persistence
    updated_req = test_repo.get_requirement("PAYMENT-004")
    assert updated_req is not None

    # Find the executed scenario
    executed_scenarios = [s for s in updated_req.adversarial_scenarios if s.executed]
    assert len(executed_scenarios) >= 1

    first_executed = executed_scenarios[0]
    assert first_executed.outcome == VerificationStatus.VERIFIED
    assert first_executed.last_run_id == run.run_id
    assert first_executed.executed_at is not None
