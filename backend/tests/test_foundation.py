"""Tests for Ghost Protocol Foundation: Storage, Evaluator, and Invariants."""

from pathlib import Path
import pytest

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.models.requirement import Requirement
from backend.app.models.status import ExecutionStatus, FindingSeverity, VerificationStatus
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository


@pytest.fixture
def temp_repo(tmp_path: Path) -> StorageRepository:
    """Fixture providing an isolated SQLite repository."""
    db = Database(tmp_path / "test_foundation.db")
    return StorageRepository(db)


class TestStorageAndCatalogSync:
    """Tests for SQLite persistence and catalog ingestion."""

    def test_sync_catalog_from_file(self, temp_repo: StorageRepository) -> None:
        """Catalog sync must load all requirements from requirements/catalog.json."""
        catalog_path = Path("requirements/catalog.json")
        reqs = temp_repo.sync_catalog(catalog_path)

        assert len(reqs) >= 6
        req_ids = [r.id for r in reqs]
        assert "PAYMENT-001" in req_ids
        assert "PAYMENT-004" in req_ids
        assert "PAYMENT-006" in req_ids

        # Fetch PAYMENT-004
        p4 = temp_repo.get_requirement("PAYMENT-004")
        assert p4 is not None
        assert p4.title == "Overdraft Prevention and Atomic Balance Preservation"
        assert len(p4.acceptance_criteria) >= 4
        assert len(p4.linked_tests) >= 1

    def test_invalid_requirement_id_format_rejected(self) -> None:
        """Requirement model must reject invalid ID formats."""
        with pytest.raises(ValueError, match="does not match pattern"):
            Requirement(
                id="invalid_id_format; rm -rf",
                title="Bad",
                description="Bad",
            )


class TestEvaluatorExecution:
    """Tests for the VerificationEvaluator state machine."""

    def test_evaluator_payment_004_verified(self, temp_repo: StorageRepository) -> None:
        """Evaluating corrected code on PAYMENT-004 must result in VERIFIED."""
        temp_repo.sync_catalog(Path("requirements/catalog.json"))
        evaluator = VerificationEvaluator(temp_repo)

        req, run, finding = evaluator.verify_requirement("PAYMENT-004")

        assert req.status == VerificationStatus.VERIFIED
        assert run.execution_status == ExecutionStatus.COMPLETED
        assert run.exit_code == 0
        assert finding is None

        # Verify evidence was persisted
        ev_list = temp_repo.list_evidence_for_run(run.run_id)
        assert len(ev_list) == 1
        assert ev_list[0].integrity_metadata.exit_code == 0
        assert len(ev_list[0].integrity_metadata.sha256) == 64

    def test_evaluator_unbound_requirement_unverified(self, temp_repo: StorageRepository) -> None:
        """Unbound requirement PAYMENT-006 must evaluate to UNVERIFIED, never VERIFIED."""
        temp_repo.sync_catalog(Path("requirements/catalog.json"))
        evaluator = VerificationEvaluator(temp_repo)

        req, run, finding = evaluator.verify_requirement("PAYMENT-006")

        assert req.status == VerificationStatus.UNVERIFIED
        assert run.exit_code == 5
        assert finding is None
        # Must never be marked verified without evidence
        assert req.status != VerificationStatus.VERIFIED
