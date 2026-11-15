"""Tests for Ghost Protocol Foundation: Storage, Evaluator, Security, and Invariants."""

from pathlib import Path
import pytest

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.engine.runner import SubprocessRunner, MAX_OUTPUT_BYTES
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

    def test_evaluator_vulnerable_target_creates_violation_finding(self, temp_repo: StorageRepository) -> None:
        """Evaluating the vulnerable target must produce VIOLATION and an actionable Finding."""
        temp_repo.sync_catalog(Path("requirements/catalog.json"))
        evaluator = VerificationEvaluator(temp_repo)

        vuln_target = "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service"
        req, run, finding = evaluator.verify_requirement("PAYMENT-004", target_override=vuln_target)

        assert req.status == VerificationStatus.VIOLATION
        assert run.execution_status == ExecutionStatus.FAILED
        assert run.exit_code == 1
        assert finding is not None
        assert finding.severity == FindingSeverity.CRITICAL
        assert "InsufficientFundsError" in finding.explanation
        assert "pytest" in finding.reproduction_instructions
        assert len(run.finding_ids) == 1


class TestSecurityBoundaries:
    """Tests for sandbox security, path traversal, and output ceiling."""

    def test_path_traversal_detection(self) -> None:
        runner = SubprocessRunner(Path.cwd())
        with pytest.raises(ValueError, match="Path traversal detected"):
            runner.execute_target("../../windows/system32/cmd.exe")

    def test_output_limiting(self) -> None:
        runner = SubprocessRunner(Path.cwd())
        huge_text = "A" * (MAX_OUTPUT_BYTES + 5000)
        limited = runner._limit_output(huge_text)
        assert "TRUNCATED: Output exceeded" in limited
        assert len(limited) < len(huge_text)


# ---------------------------------------------------------------------------
# Requirements consistency: REQUIREMENTS_REGISTRY must stay in sync with catalog.json
# ---------------------------------------------------------------------------
class TestRequirementsConsistency:
    """Guards against REQUIREMENTS_REGISTRY (legacy verifier) drifting from catalog.json.

    These tests document that both sources currently agree and will fail immediately
    if someone adds a requirement to one without updating the other.  They are the
    documented safeguard referenced in the PROJECT_HEALTH_REPORT.md under
    'Requirements Consistency'.

    Migration policy: catalog.json + SQLite is the authoritative V1 source.
    REQUIREMENTS_REGISTRY is legacy-only.  New requirements MUST be added to
    catalog.json first, then mirrored in REQUIREMENTS_REGISTRY if the legacy
    API must serve them.  Removing this test before completing a full migration
    of the legacy API to the V1 storage layer is not permitted.
    """

    def test_registry_ids_match_catalog(self) -> None:
        """Every ID in REQUIREMENTS_REGISTRY must exist in catalog.json and vice-versa."""
        import json
        from backend.app.verifier import REQUIREMENTS_REGISTRY

        catalog_path = Path("requirements/catalog.json")
        assert catalog_path.exists(), "catalog.json is missing"
        catalog_data = json.loads(catalog_path.read_text(encoding="utf-8"))
        catalog_ids = {r["id"] for r in catalog_data["requirements"]}
        registry_ids = set(REQUIREMENTS_REGISTRY.keys())

        missing_from_catalog = registry_ids - catalog_ids
        missing_from_registry = catalog_ids - registry_ids

        assert not missing_from_catalog, (
            f"IDs in REQUIREMENTS_REGISTRY but NOT in catalog.json: {missing_from_catalog}. "
            "Add them to catalog.json or remove them from REQUIREMENTS_REGISTRY."
        )
        assert not missing_from_registry, (
            f"IDs in catalog.json but NOT in REQUIREMENTS_REGISTRY: {missing_from_registry}. "
            "Add them to REQUIREMENTS_REGISTRY or complete the legacy API migration."
        )

    def test_registry_test_targets_match_catalog(self) -> None:
        """Test targets in REQUIREMENTS_REGISTRY must match linked_tests[0] in catalog.json."""
        import json
        from backend.app.verifier import REQUIREMENTS_REGISTRY

        catalog_path = Path("requirements/catalog.json")
        catalog_data = json.loads(catalog_path.read_text(encoding="utf-8"))
        catalog_map = {r["id"]: r for r in catalog_data["requirements"]}

        mismatches = []
        for req_id, reg_def in REQUIREMENTS_REGISTRY.items():
            cat_req = catalog_map.get(req_id)
            if not cat_req:
                continue  # covered by the ID check above
            cat_primary_target = cat_req["linked_tests"][0] if cat_req["linked_tests"] else None
            reg_target = reg_def.test_target

            if cat_primary_target != reg_target:
                mismatches.append(
                    f"{req_id}: registry='{reg_target}' vs catalog='{cat_primary_target}'"
                )

        assert not mismatches, (
            "Test target mismatches between REQUIREMENTS_REGISTRY and catalog.json:\n"
            + "\n".join(mismatches)
        )

    def test_catalog_loads_correctly_into_sqlite(self, temp_repo: StorageRepository) -> None:
        """catalog.json must load cleanly into SQLite with all IDs present."""
        from backend.app.verifier import REQUIREMENTS_REGISTRY

        catalog_path = Path("requirements/catalog.json")
        reqs = temp_repo.sync_catalog(catalog_path)
        loaded_ids = {r.id for r in reqs}

        # Every registry ID must be loadable from catalog
        for req_id in REQUIREMENTS_REGISTRY.keys():
            assert req_id in loaded_ids, (
                f"Requirement '{req_id}' is in REQUIREMENTS_REGISTRY but failed to load from catalog.json into SQLite."
            )
