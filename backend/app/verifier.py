"""Ghost Protocol Test Verifier.

Executes approved test targets in isolated subprocesses, parses raw outputs,
and maps exit statuses to formal verification verdicts (PASS, FAIL, BLOCKED, UNVERIFIED).
"""

from __future__ import annotations

import re
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel

from backend.app.evidence import (
    EvidenceRecord,
    EvidenceStore,
    TestCaseResult,
    VerificationStatus,
    calculate_file_hash,
)


class RequirementDefinition(BaseModel):
    """Specification of an approved requirement in the system registry."""
    requirement_id: str
    title: str
    description: str
    acceptance_criteria: List[str]
    test_target: Optional[str]  # e.g., "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged"


# Approved requirements registry
REQUIREMENTS_REGISTRY: Dict[str, RequirementDefinition] = {
    "PAYMENT-001": RequirementDefinition(
        requirement_id="PAYMENT-001",
        title="Account Initialization and Non-Negative Balance Enforcement",
        description="An account must be created with non-negative initial balance; negative balances raise InvalidAmountError.",
        acceptance_criteria=[
            "AC-01.1: Initial balance >= 0 succeeds.",
            "AC-01.2: Initial balance < 0 raises InvalidAmountError.",
        ],
        test_target="backend/tests/test_payment.py::TestPaymentBasics::test_account_initialization_non_negative",
    ),
    "PAYMENT-002": RequirementDefinition(
        requirement_id="PAYMENT-002",
        title="Positive Transfer Amount Validation",
        description="Transfer amounts <= 0 must be rejected with InvalidAmountError without mutating balances.",
        acceptance_criteria=[
            "AC-02.1: Transfer amount of 0 raises InvalidAmountError.",
            "AC-02.2: Negative transfer amounts raise InvalidAmountError.",
            "AC-02.3: Both account balances remain unchanged.",
        ],
        test_target="backend/tests/test_payment.py::TestPaymentBasics::test_negative_or_zero_amount_rejected",
    ),
    "PAYMENT-003": RequirementDefinition(
        requirement_id="PAYMENT-003",
        title="Successful Balance Transfer",
        description="When transfer amount <= sender balance, sender is debited, recipient is credited, and total funds are conserved.",
        acceptance_criteria=[
            "AC-03.1: Sender debited by amount, recipient credited by exact amount.",
            "AC-03.2: Conservation of total balances across accounts.",
            "AC-03.3: TransferResult status is SUCCESS.",
        ],
        test_target="backend/tests/test_payment.py::TestPaymentTransfers::test_valid_transfer_updates_balances",
    ),
    "PAYMENT-004": RequirementDefinition(
        requirement_id="PAYMENT-004",
        title="Overdraft Prevention and Atomic Balance Preservation",
        description="When a transfer amount exceeds sender available balance, transfer must be rejected and neither balance may change.",
        acceptance_criteria=[
            "AC-04.1: Transfer attempt exceeding available balance raises InsufficientFundsError.",
            "AC-04.2: Sender balance strictly remains at initial level (₹10,000 in test).",
            "AC-04.3: Recipient balance strictly remains at initial level (₹0 in test).",
            "AC-04.4: Operation is atomic; zero partial mutation allowed.",
        ],
        test_target="backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged",
    ),
    "PAYMENT-005": RequirementDefinition(
        requirement_id="PAYMENT-005",
        title="Prohibition of Self-Transfers",
        description="An account cannot initiate a transfer to itself; raises SelfTransferError.",
        acceptance_criteria=[
            "AC-05.1: sender_id == recipient_id raises SelfTransferError.",
            "AC-05.2: Account balance remains unchanged.",
        ],
        test_target="backend/tests/test_payment.py::TestPaymentTransfers::test_self_transfer_rejected",
    ),
    "PAYMENT-006": RequirementDefinition(
        requirement_id="PAYMENT-006",
        title="Dual-Authorization for High-Value Corporate Transfers",
        description="Transfers exceeding ₹1,000,000 require secondary managerial authorization.",
        acceptance_criteria=[
            "AC-06.1: Transfers > ₹1,000,000 enter PENDING_APPROVAL status.",
        ],
        test_target=None,  # Deliberately unbound to demonstrate UNVERIFIED state detection
    ),
}


class Verifier:
    """Rigorous execution engine that executes approved tests and generates tamper-evident evidence."""

    def __init__(
        self,
        evidence_store: Optional[EvidenceStore] = None,
        base_dir: Optional[Path] = None,
    ) -> None:
        self.base_dir = base_dir or Path.cwd()
        self.evidence_store = evidence_store or EvidenceStore(
            self.base_dir / "evidence" / "evidence.db"
        )
        self.payment_code_path = self.base_dir / "backend" / "app" / "payment.py"
        self.payment_test_path = self.base_dir / "backend" / "tests" / "test_payment.py"

    def parse_test_results(self, stdout: str) -> List[TestCaseResult]:
        """Extract individual test case results and statuses from pytest stdout."""
        results: List[TestCaseResult] = []
        # Pattern for verbose pytest output e.g.:
        # backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer FAILED [100%]
        pattern = re.compile(r"([\w/\.]+::\w+::\w+)\s+(PASSED|FAILED|ERROR|SKIPPED)")
        for line in stdout.splitlines():
            match = pattern.search(line)
            if match:
                test_name, status = match.groups()
                results.append(
                    TestCaseResult(
                        test_name=test_name,
                        status=status.lower(),
                        duration_seconds=0.0,
                    )
                )
        return results

    def verify_requirement(
        self,
        requirement_id: str,
        export_json_path: Optional[Path] = None,
        custom_metadata: Optional[dict] = None,
    ) -> EvidenceRecord:
        """Execute the approved test target for a given requirement ID.
        
        Strict rules:
        - Unknown requirement or missing test target => UNVERIFIED.
        - Arbitrary commands are NEVER accepted or executed.
        - Actual subprocess exit code and stdout/stderr are captured.
        """
        evidence_id = f"ev-{uuid.uuid4().hex[:12]}"
        code_fingerprint = calculate_file_hash(self.payment_code_path)
        test_fingerprint = calculate_file_hash(self.payment_test_path)

        metadata = {
            "python_version": sys.version,
            "platform": sys.platform,
            **(custom_metadata or {}),
        }

        # Check registry
        req_def = REQUIREMENTS_REGISTRY.get(requirement_id)
        if not req_def or not req_def.test_target:
            # Missing or unbound requirement => UNVERIFIED (Never PASS)
            record = EvidenceRecord(
                evidence_id=evidence_id,
                requirement_id=requirement_id,
                verdict=VerificationStatus.UNVERIFIED,
                command="(none - requirement has no executable test suite bound)",
                exit_code=5,
                stdout="UNVERIFIED: Requirement is either unknown or has no approved test target registered.",
                stderr="",
                duration_ms=0.0,
                test_results=[],
                code_fingerprint=code_fingerprint,
                test_fingerprint=test_fingerprint,
                metadata=metadata,
            )
            record.seal()
            self.evidence_store.save_record(record, export_json_path=export_json_path)
            return record

        # Safe pre-constructed command using sys.executable
        # Strict isolation: only approved test targets are executed
        cmd_args = [
            sys.executable,
            "-m",
            "pytest",
            req_def.test_target,
            "-v",
            "--tb=short",
            "-o",
            "cache_dir=.pytest_cache",
        ]
        cmd_str = " ".join(cmd_args)

        start_time = time.perf_counter()
        try:
            process = subprocess.run(
                cmd_args,
                cwd=str(self.base_dir),
                capture_output=True,
                text=True,
                timeout=30,
            )
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            stdout = process.stdout
            stderr = process.stderr
            exit_code = process.returncode

            # Map exit codes according to rigorous verification state machine
            if exit_code == 0:
                verdict = VerificationStatus.PASS
            elif exit_code == 1:
                verdict = VerificationStatus.FAIL
            elif exit_code == 5:
                # Pytest exit code 5: no tests were collected
                verdict = VerificationStatus.UNVERIFIED
            else:
                # 2 = Interrupted, 3 = Internal Error, 4 = Usage Error
                verdict = VerificationStatus.BLOCKED

        except subprocess.TimeoutExpired:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            stdout = ""
            stderr = "Execution timed out after 30 seconds."
            exit_code = -1
            verdict = VerificationStatus.BLOCKED
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            stdout = ""
            stderr = f"Subprocess invocation error: {exc}"
            exit_code = -2
            verdict = VerificationStatus.BLOCKED

        test_results = self.parse_test_results(stdout)

        record = EvidenceRecord(
            evidence_id=evidence_id,
            requirement_id=requirement_id,
            verdict=verdict,
            command=cmd_str,
            exit_code=exit_code,
            stdout=stdout,
            stderr=stderr,
            duration_ms=round(duration_ms, 2),
            test_results=test_results,
            code_fingerprint=code_fingerprint,
            test_fingerprint=test_fingerprint,
            metadata=metadata,
        )
        record.seal()
        self.evidence_store.save_record(record, export_json_path=export_json_path)
        return record

    def run_entire_test_suite(
        self, export_json_path: Optional[Path] = None
    ) -> EvidenceRecord:
        """Run the entire test suite and capture composite evidence."""
        evidence_id = f"ev-suite-{uuid.uuid4().hex[:10]}"
        code_fingerprint = calculate_file_hash(self.payment_code_path)
        test_fingerprint = calculate_file_hash(self.payment_test_path)

        cmd_args = [
            sys.executable,
            "-m",
            "pytest",
            "backend/tests/test_payment.py",
            "-v",
            "--tb=short",
        ]
        cmd_str = " ".join(cmd_args)

        start_time = time.perf_counter()
        process = subprocess.run(
            cmd_args,
            cwd=str(self.base_dir),
            capture_output=True,
            text=True,
            timeout=45,
        )
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        exit_code = process.returncode
        stdout = process.stdout
        stderr = process.stderr

        verdict = (
            VerificationStatus.PASS if exit_code == 0
            else VerificationStatus.FAIL if exit_code == 1
            else VerificationStatus.BLOCKED
        )

        test_results = self.parse_test_results(stdout)

        record = EvidenceRecord(
            evidence_id=evidence_id,
            requirement_id="SUITE-ALL",
            verdict=verdict,
            command=cmd_str,
            exit_code=exit_code,
            stdout=stdout,
            stderr=stderr,
            duration_ms=round(duration_ms, 2),
            test_results=test_results,
            code_fingerprint=code_fingerprint,
            test_fingerprint=test_fingerprint,
            metadata={"scope": "full_test_suite"},
        )
        record.seal()
        self.evidence_store.save_record(record, export_json_path=export_json_path)
        return record
