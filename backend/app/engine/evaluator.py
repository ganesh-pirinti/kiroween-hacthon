"""Evaluates test execution outcomes against requirements and produces findings."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

from backend.app.engine.runner import ExecutionResult, SubprocessRunner
from backend.app.models.evidence import Evidence
from backend.app.models.finding import Finding
from backend.app.models.requirement import Requirement
from backend.app.models.status import (
    ArtifactType,
    ExecutionStatus,
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

    def verify_requirement(self, requirement_id: str) -> Tuple[Requirement, VerificationRun, Optional[Finding]]:
        """Run verification for a single requirement ID.
        
        Strict truth rules:
        - If requirement does not exist -> ValueError.
        - If no linked tests exist -> status is UNVERIFIED (Never VERIFIED).
        - If tests exit 0 -> status is VERIFIED.
        - If tests exit 1 -> status is VIOLATION + generates actionable Finding.
        - If execution is aborted/timeout/runtime error -> status is BLOCKED.
        """
        req = self.repo.get_requirement(requirement_id)
        if not req:
            raise ValueError(f"Requirement '{requirement_id}' not found in registry.")

        run_id = f"run-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"

        # Unbound requirement check
        if not req.linked_tests:
            run = VerificationRun(
                run_id=run_id,
                requirement_id=req.id,
                command="(none - requirement has no executable test suite bound)",
                execution_status=ExecutionStatus.COMPLETED,
                exit_code=5,
                duration_ms=0.0,
                summary=RunSummary(total_tests=0, unverified=1),
                code_fingerprint="NONE",
                test_fingerprint="NONE",
            )
            self.repo.save_verification_run(run)
            req.status = VerificationStatus.UNVERIFIED
            req.latest_run_id = run_id
            req.updated_at = datetime.now(timezone.utc).isoformat()
            self.repo.upsert_requirement(req)
            return req, run, None

        # Execute the first bound target (or composite target)
        primary_target = req.linked_tests[0]
        exec_res: ExecutionResult = self.runner.execute_target(primary_target)

        # Interpret execution state
        finding: Optional[Finding] = None
        evidence_id = f"ev-{uuid.uuid4().hex[:10]}"

        if exec_res.is_timeout:
            exec_status = ExecutionStatus.TIMEOUT
            verdict = VerificationStatus.BLOCKED
            summary = RunSummary(total_tests=1, blocked=1)
            finding = Finding(
                finding_id=f"fnd-{uuid.uuid4().hex[:8]}",
                requirement_id=req.id,
                severity=FindingSeverity.HIGH,
                explanation=f"Execution of bound test suite timed out after {self.runner.timeout_seconds}s.",
                reproduction_instructions=exec_res.command,
                linked_evidence_ids=[evidence_id],
            )
        elif exec_res.exit_code == 0:
            exec_status = ExecutionStatus.COMPLETED
            verdict = VerificationStatus.VERIFIED
            summary = RunSummary(total_tests=1, passed=1)
        elif exec_res.exit_code == 1:
            exec_status = ExecutionStatus.FAILED
            verdict = VerificationStatus.VIOLATION
            summary = RunSummary(total_tests=1, failed=1)
            # Generate actionable defect finding
            finding = Finding(
                finding_id=f"fnd-{uuid.uuid4().hex[:8]}",
                requirement_id=req.id,
                severity=FindingSeverity.CRITICAL if "PAYMENT-004" in req.id else FindingSeverity.HIGH,
                explanation=self._extract_failure_reason(exec_res.stdout, req),
                reproduction_instructions=exec_res.command,
                linked_evidence_ids=[evidence_id],
            )
        elif exec_res.exit_code == 5:
            # Pytest exit 5: 0 tests collected
            exec_status = ExecutionStatus.COMPLETED
            verdict = VerificationStatus.UNVERIFIED
            summary = RunSummary(total_tests=0, unverified=1)
        else:
            exec_status = ExecutionStatus.BLOCKED
            verdict = VerificationStatus.BLOCKED
            summary = RunSummary(total_tests=1, blocked=1)
            finding = Finding(
                finding_id=f"fnd-{uuid.uuid4().hex[:8]}",
                requirement_id=req.id,
                severity=FindingSeverity.HIGH,
                explanation=f"Execution was blocked by runner environment error (exit code {exec_res.exit_code}).",
                reproduction_instructions=exec_res.command,
                linked_evidence_ids=[evidence_id],
            )

        # Persist Run
        run = VerificationRun(
            run_id=run_id,
            requirement_id=req.id,
            command=exec_res.command,
            execution_status=exec_status,
            exit_code=exec_res.exit_code,
            duration_ms=exec_res.duration_ms,
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
            extra={"code_fingerprint": exec_res.code_fingerprint},
        )
        self.repo.save_evidence(evidence)

        # Persist Finding if any
        if finding:
            self.repo.save_finding(finding)

        # Update Requirement state
        req.status = verdict
        req.latest_run_id = run_id
        req.updated_at = datetime.now(timezone.utc).isoformat()
        self.repo.upsert_requirement(req)

        return req, run, finding

    def _extract_failure_reason(self, stdout: str, req: Requirement) -> str:
        """Parse clean failure summary from pytest traceback."""
        for line in stdout.splitlines():
            if "Failed: DID NOT RAISE" in line:
                return f"Specification Violation on {req.id}: Expected exception was not raised ({line.strip()})."
            if "AssertionError:" in line or "assert " in line:
                return f"Assertion Violation on {req.id}: {line.strip()}"
        return f"Requirement check failed for {req.id}. See linked evidence log for complete trace."
