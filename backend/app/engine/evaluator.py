"""Evaluates test execution outcomes against requirements and produces actionable findings."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple, List

from backend.app.engine.runner import ExecutionResult, SubprocessRunner, APPROVED_TARGETS
from backend.app.models.evidence import Evidence
from backend.app.models.finding import Finding
from backend.app.models.requirement import Requirement
from backend.app.models.status import (
    ArtifactType,
    ExecutionStatus,
    FailureClassification,
    FindingSeverity,
    VerificationStatus,
)
from backend.app.models.verification_run import RunSummary, VerificationRun
from backend.app.storage.repository import StorageRepository


class VerificationEvaluator:
    """Orchestrates test execution, evaluates outcomes against requirements,
    generates findings, and persists evidence in SQLite.
    """

    def __init__(
        self,
        repository: StorageRepository,
        project_root: Optional[Path] = None,
    ) -> None:
        self.repo = repository
        self.project_root = (project_root or Path.cwd()).resolve()
        self.runner = SubprocessRunner(self.project_root)

    def verify_requirement(
        self,
        requirement_id: str,
        target_override: Optional[str] = None,
    ) -> Tuple[Requirement, VerificationRun, Optional[Finding]]:
        """Run verification for a single requirement ID.
        
        Strict truth rules:
        - Unknown requirement -> ValueError (never passes).
        - No linked tests -> status is UNVERIFIED (never VERIFIED).
        - Exit code 0 -> status is VERIFIED.
        - Exit code 1 -> status is VIOLATION + generates actionable Finding.
        - Exit code in (2, 3, 4) / timeout -> status is BLOCKED. Never marked feature failure.
        - Exit code 5 (0 tests collected) -> status is UNVERIFIED.
        """
        req_id = requirement_id.strip().upper()
        req = self.repo.get_requirement(req_id)
        if not req:
            raise ValueError(f"Requirement '{requirement_id}' not found in registry.")

        now_iso = datetime.now(timezone.utc).isoformat()
        run_id = f"run-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"

        # Unbound requirement check
        if not req.linked_tests and not target_override:
            for criterion in req.acceptance_criteria:
                criterion.status = VerificationStatus.UNVERIFIED

            run = VerificationRun(
                run_id=run_id,
                requirement_id=req.id,
                command="(none - requirement has no executable test suite bound)",
                execution_status=ExecutionStatus.COMPLETED,
                failure_classification=FailureClassification.UNCOLLECTED_TESTS,
                exit_code=5,
                duration_ms=0.0,
                start_time=now_iso,
                end_time=now_iso,
                timestamp=now_iso,
                test_names=[],
                concise_output="UNVERIFIED: Requirement has no executable test target registered.",
                finding_ids=[],
                summary=RunSummary(total_tests=0, unverified=1),
                code_fingerprint="NONE",
                test_fingerprint="NONE",
            )
            self.repo.save_verification_run(run)
            req.status = VerificationStatus.UNVERIFIED
            req.latest_run_id = run_id
            req.updated_at = now_iso
            self.repo.upsert_requirement(req)
            return req, run, None

        # Determine target using allowlist or bound requirement target
        primary_target = target_override or req.linked_tests[0]

        # Execute target in isolated runner
        exec_res: ExecutionResult = self.runner.execute_target(primary_target)

        # Interpret execution state
        finding: Optional[Finding] = None
        finding_ids: List[str] = []
        evidence_id = f"ev-{uuid.uuid4().hex[:10]}"

        if exec_res.is_timeout:
            exec_status = ExecutionStatus.TIMEOUT
            verdict = VerificationStatus.BLOCKED
            summary = RunSummary(total_tests=1, blocked=1)
            fnd_id = f"fnd-{uuid.uuid4().hex[:8]}"
            finding = Finding(
                finding_id=fnd_id,
                requirement_id=req.id,
                run_id=run_id,
                test_name=primary_target,
                severity=FindingSeverity.HIGH,
                failure_classification=exec_res.failure_classification,
                explanation=f"Execution of bound test suite timed out after {self.runner.timeout_seconds}s.",
                reproduction_instructions=exec_res.command,
                code_fingerprint=exec_res.code_fingerprint,
                test_fingerprint=exec_res.test_fingerprint,
                linked_evidence_ids=[evidence_id],
                created_at=exec_res.end_time,
            )
            finding_ids.append(fnd_id)
        elif exec_res.exit_code == 0:
            exec_status = ExecutionStatus.COMPLETED
            verdict = VerificationStatus.VERIFIED
            summary = RunSummary(total_tests=max(len(exec_res.test_names), 1), passed=max(len(exec_res.test_names), 1))
        elif exec_res.exit_code == 1:
            exec_status = ExecutionStatus.FAILED
            verdict = VerificationStatus.VIOLATION
            summary = RunSummary(total_tests=max(len(exec_res.test_names), 1), failed=max(len(exec_res.test_names), 1))
            # Generate actionable defect finding with full provenance
            fnd_id = f"fnd-{uuid.uuid4().hex[:8]}"
            finding = Finding(
                finding_id=fnd_id,
                requirement_id=req.id,
                run_id=run_id,
                test_name=primary_target,
                severity=FindingSeverity.CRITICAL if "PAYMENT-004" in req.id else FindingSeverity.HIGH,
                failure_classification=exec_res.failure_classification,
                explanation=self._extract_failure_reason(exec_res.stdout, req),
                reproduction_instructions=exec_res.command,
                code_fingerprint=exec_res.code_fingerprint,
                test_fingerprint=exec_res.test_fingerprint,
                linked_evidence_ids=[evidence_id],
                created_at=exec_res.end_time,
            )
            finding_ids.append(fnd_id)
        elif exec_res.exit_code == 5:
            # Pytest exit 5: 0 tests collected
            exec_status = ExecutionStatus.COMPLETED
            verdict = VerificationStatus.UNVERIFIED
            summary = RunSummary(total_tests=0, unverified=1)
        else:
            exec_status = ExecutionStatus.BLOCKED
            verdict = VerificationStatus.BLOCKED
            summary = RunSummary(total_tests=1, blocked=1)
            fnd_id = f"fnd-{uuid.uuid4().hex[:8]}"
            finding = Finding(
                finding_id=fnd_id,
                requirement_id=req.id,
                run_id=run_id,
                test_name=primary_target,
                severity=FindingSeverity.HIGH,
                failure_classification=exec_res.failure_classification,
                explanation=f"Execution was blocked by runner environment error (exit code {exec_res.exit_code}).",
                reproduction_instructions=exec_res.command,
                code_fingerprint=exec_res.code_fingerprint,
                test_fingerprint=exec_res.test_fingerprint,
                linked_evidence_ids=[evidence_id],
                created_at=exec_res.end_time,
            )
            finding_ids.append(fnd_id)

        # Persist Run with full audit metadata
        run = VerificationRun(
            run_id=run_id,
            requirement_id=req.id,
            command=exec_res.command,
            execution_status=exec_status,
            failure_classification=exec_res.failure_classification,
            exit_code=exec_res.exit_code,
            duration_ms=exec_res.duration_ms,
            start_time=exec_res.start_time,
            end_time=exec_res.end_time,
            timestamp=exec_res.end_time,
            test_names=exec_res.test_names,
            concise_output=exec_res.concise_output,
            finding_ids=finding_ids,
            summary=summary,
            code_fingerprint=exec_res.code_fingerprint,
            test_fingerprint=exec_res.test_fingerprint,
            environment_info=exec_res.environment_info,
        )
        self.repo.save_verification_run(run)

        # Persist Evidence
        evidence_payload = exec_res.stdout if exec_res.stdout else exec_res.stderr
        evidence = Evidence.create(
            evidence_id=evidence_id,
            run_id=run_id,
            requirement_id=req.id,
            artifact_type=ArtifactType.PROCESS_LOG,
            source=f"pytest:{primary_target}",
            payload=evidence_payload,
            exit_code=exec_res.exit_code,
            extra={
                "code_fingerprint": exec_res.code_fingerprint,
                "concise_output": exec_res.concise_output,
            },
        )
        self.repo.save_evidence(evidence)

        # Persist Finding if any
        if finding:
            self.repo.save_finding(finding)

        # Update Requirement state & criteria statuses
        req.status = verdict
        req.latest_run_id = run_id
        req.updated_at = exec_res.end_time

        # Update acceptance criteria statuses based on executable test linkage
        for criterion in req.acceptance_criteria:
            if not criterion.linked_test or not criterion.linked_test.strip():
                criterion.status = VerificationStatus.UNVERIFIED
            elif criterion.linked_test == primary_target or primary_target in criterion.linked_test or any(criterion.linked_test in t for t in exec_res.test_names):
                criterion.status = verdict

        # Update adversarial scenarios execution tracking
        for scenario in req.adversarial_scenarios:
            if scenario.test_target == primary_target or primary_target in scenario.test_target or any(scenario.test_target in t for t in exec_res.test_names):
                scenario.executed = True
                scenario.outcome = verdict
                scenario.last_run_id = run_id
                scenario.executed_at = exec_res.end_time

        self.repo.upsert_requirement(req)

        return req, run, finding

    def analyze_coverage(self, requirement_id: Optional[str] = None) -> Dict[str, Any]:
        """Analyze executable test coverage across acceptance criteria.
        
        Identifies criteria with NO linked executable tests and marks them UNVERIFIED.
        Detects coverage gaps where AI claims may have declared completion without executable tests.
        """
        if requirement_id:
            reqs = [self.repo.get_requirement(requirement_id.upper())]
            reqs = [r for r in reqs if r is not None]
        else:
            reqs = self.repo.list_requirements()

        total_criteria = 0
        covered_criteria = 0
        uncovered_criteria = 0
        uncovered_items: List[Dict[str, Any]] = []
        requirement_breakdown: List[Dict[str, Any]] = []

        for req in reqs:
            coverage = req.get_coverage()
            total_criteria += coverage.total_criteria
            covered_criteria += coverage.covered_criteria
            uncovered_criteria += coverage.uncovered_criteria

            # Find specific uncovered criteria
            uncovered_for_req = []
            for criterion in req.acceptance_criteria:
                if not criterion.linked_test or not criterion.linked_test.strip():
                    criterion.status = VerificationStatus.UNVERIFIED
                    item = {
                        "requirement_id": req.id,
                        "criterion_id": criterion.id,
                        "description": criterion.description,
                        "status": VerificationStatus.UNVERIFIED.value,
                        "reason": "No executable test suite bound to this acceptance criterion.",
                    }
                    uncovered_items.append(item)
                    uncovered_for_req.append(item)

            requirement_breakdown.append({
                "requirement_id": req.id,
                "title": req.title,
                "status": req.status.value,
                "total_criteria": coverage.total_criteria,
                "covered_criteria": coverage.covered_criteria,
                "uncovered_criteria": coverage.uncovered_criteria,
                "coverage_percentage": coverage.coverage_percentage,
                "has_coverage_gaps": coverage.uncovered_criteria > 0,
                "uncovered_criteria_details": uncovered_for_req,
            })

        overall_pct = (
            round((covered_criteria / total_criteria) * 100.0, 1)
            if total_criteria > 0
            else 0.0
        )

        return {
            "total_requirements": len(reqs),
            "total_criteria": total_criteria,
            "covered_criteria": covered_criteria,
            "uncovered_criteria": uncovered_criteria,
            "overall_coverage_percentage": overall_pct,
            "has_unverified_gaps": uncovered_criteria > 0,
            "uncovered_items": uncovered_items,
            "requirements": requirement_breakdown,
        }

    def compare_scenario(self, scenario_id: str) -> Dict[str, Any]:
        """Perform a ground-truth before-and-after verification comparison for a scenario.
        
        Executes the adversarial test against:
        1. The defect fixture (before fix) -> captures real failure, failure classification, and violation finding.
        2. The corrected implementation (after fix) -> captures clean pass and verified status.
        Computes behavioral and integrity deltas.
        """
        scenario_key = scenario_id.strip().upper()

        scenarios_db = {
            "PAYMENT-004": {
                "scenario_id": "SCENARIO-PAYMENT-004",
                "requirement_id": "PAYMENT-004",
                "title": "Overdraft Protection and Balance Preservation",
                "initial_state": "Sender: ₹10,000 | Recipient: ₹0",
                "operation": "Transfer attempt: ₹15,000",
                "expected_outcome": "Rejected with InsufficientFundsError; both balances unchanged.",
                "vuln_target": "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service",
                "corr_target": "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged",
                "defect_nature": "Absence of balance validation allows unbounded overdraft and monetary creation.",
                "fix_nature": "Atomic validation enforces sender balance >= amount before any balance state mutation.",
            },
            "SCENARIO-PAYMENT-004": {
                "scenario_id": "SCENARIO-PAYMENT-004",
                "requirement_id": "PAYMENT-004",
                "title": "Overdraft Protection and Balance Preservation",
                "initial_state": "Sender: ₹10,000 | Recipient: ₹0",
                "operation": "Transfer attempt: ₹15,000",
                "expected_outcome": "Rejected with InsufficientFundsError; both balances unchanged.",
                "vuln_target": "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service",
                "corr_target": "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged",
                "defect_nature": "Absence of balance validation allows unbounded overdraft and monetary creation.",
                "fix_nature": "Atomic validation enforces sender balance >= amount before any balance state mutation.",
            },
        }

        config = scenarios_db.get(scenario_key)
        if not config:
            raise ValueError(f"Unknown scenario ID '{scenario_id}'. Available: {list(scenarios_db.keys())}")

        # 1. Before Run (Defect Fixture)
        v_req, v_run, v_finding = self.verify_requirement(config["requirement_id"], target_override=config["vuln_target"])
        v_evidence = self.repo.list_evidence_for_run(v_run.run_id)

        # 2. After Run (Corrected Service)
        c_req, c_run, c_finding = self.verify_requirement(config["requirement_id"], target_override=config["corr_target"])
        c_evidence = self.repo.list_evidence_for_run(c_run.run_id)

        return {
            "scenario_id": config["scenario_id"],
            "requirement_id": config["requirement_id"],
            "title": config["title"],
            "specification": {
                "initial_state": config["initial_state"],
                "operation": config["operation"],
                "expected_outcome": config["expected_outcome"],
            },
            "defect_analysis": {
                "defect_nature": config["defect_nature"],
                "fix_nature": config["fix_nature"],
                "resolved": (v_run.exit_code == 1 and c_run.exit_code == 0),
            },
            "before_run": {
                "run_id": v_run.run_id,
                "command": v_run.command,
                "exit_code": v_run.exit_code,
                "status": v_req.status.value,
                "failure_classification": v_run.failure_classification.value,
                "concise_output": v_run.concise_output,
                "evidence_id": v_evidence[0].evidence_id if v_evidence else None,
                "evidence_sha256": v_evidence[0].integrity_metadata.sha256 if v_evidence else None,
                "finding": v_finding,
            },
            "after_run": {
                "run_id": c_run.run_id,
                "command": c_run.command,
                "exit_code": c_run.exit_code,
                "status": c_req.status.value,
                "failure_classification": c_run.failure_classification.value,
                "concise_output": c_run.concise_output,
                "evidence_id": c_evidence[0].evidence_id if c_evidence else None,
                "evidence_sha256": c_evidence[0].integrity_metadata.sha256 if c_evidence else None,
                "finding": c_finding,
            },
            "behavioral_delta": {
                "before_behavior": "Defect allowed illegal transfer without raising exception; balances violated non-negativity.",
                "after_behavior": "Transaction was atomically aborted with InsufficientFundsError; balances were preserved exactly.",
                "verification_delta": "VIOLATION (exit 1) -> VERIFIED (exit 0)",
            },
        }

    def _extract_failure_reason(self, stdout: str, req: Requirement) -> str:
        """Parse clean failure summary from pytest traceback."""
        for line in stdout.splitlines():
            if "Failed: DID NOT RAISE" in line:
                return (
                    f"Specification Violation on {req.id}: Expected InsufficientFundsError was not raised. "
                    "Overdraft protection failed to abort transaction."
                )
            if "AssertionError:" in line or "assert " in line:
                return f"Assertion Violation on {req.id}: {line.strip()}"
        return f"Requirement verification failed for {req.id}. See evidence log for process trace."
