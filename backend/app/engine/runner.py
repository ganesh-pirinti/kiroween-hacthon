"""Isolated subprocess test execution harness with strict security boundaries.

Enforces:
1. Explicit allowlist of pre-approved test targets (no arbitrary execution).
2. Path traversal prevention (all targets confined to project root).
3. Output limits (64KB ceiling to prevent denial-of-service / memory exhaustion).
4. Subprocess timeouts and environment sanitization.
5. Deterministic start/end timestamps and code fingerprinting.
"""

from __future__ import annotations

import hashlib
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional


from backend.app.models.status import FailureClassification
from backend.app.engine.sanitizer import sanitize_text

MAX_OUTPUT_BYTES = 65536  # 64 KB ceiling
SAFE_TARGET_REGEX = re.compile(r"^[a-zA-Z0-9_\-\./:]+$")

# Strict allowlist of approved test targets mapped to requirements
APPROVED_TARGETS: Dict[str, str] = {
    "PAYMENT-001": "backend/tests/test_payment.py::TestPaymentBasics::test_account_initialization_non_negative",
    "PAYMENT-002": "backend/tests/test_payment.py::TestPaymentBasics::test_negative_or_zero_amount_rejected",
    "PAYMENT-003": "backend/tests/test_payment.py::TestPaymentTransfers::test_valid_transfer_updates_balances",
    "PAYMENT-004": "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged",
    "PAYMENT-004-BOUNDARY": "backend/tests/test_payment.py::TestPaymentAdversarial::test_boundary_overdraft_rejected",
    "PAYMENT-004-VULN": "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service",
    "PAYMENT-005": "backend/tests/test_payment.py::TestPaymentTransfers::test_self_transfer_rejected",
    "PROP-CONSERVATION": "backend/tests/test_property_payment.py::TestPaymentInvariants::test_monetary_conservation_property",
    "PROP-IDEMPOTENCY": "backend/tests/test_property_payment.py::TestPaymentInvariants::test_idempotency_of_rejected_overdraft_property",
    "PROP-ZERO-NEG": "backend/tests/test_property_payment.py::TestPaymentInvariants::test_boundary_zero_and_negative_rejection_property",
    "PROP-MONO": "backend/tests/test_property_payment.py::TestPaymentInvariants::test_boundary_monotonicity_property",
    "PROP-NONNEG": "backend/tests/test_property_payment.py::TestPaymentInvariants::test_balance_non_negativity_invariants_across_operations",
    "SUITE-PAYMENT": "backend/tests/test_payment.py",
    "SUITE-PROP": "backend/tests/test_property_payment.py",
}


def classify_execution(exit_code: int, stdout: str, stderr: str, is_timeout: bool) -> FailureClassification:
    """Classifies an execution outcome distinguishing assertion failures from environmental or harness issues."""
    if is_timeout:
        return FailureClassification.TIMEOUT
    if exit_code == 0:
        return FailureClassification.NONE
    if exit_code == 5:
        return FailureClassification.UNCOLLECTED_TESTS
    if exit_code in (2, 4):
        return FailureClassification.TEST_INFRASTRUCTURE_ERROR
    if exit_code < 0 or exit_code == 3:
        return FailureClassification.BLOCKED_EXECUTION
    if exit_code == 1:
        # Check if exit code 1 was caused by an assertion/spec failure or a code syntax/import crash
        if "SyntaxError" in stderr or "ImportError" in stderr or "ModuleNotFoundError" in stderr:
            return FailureClassification.TEST_INFRASTRUCTURE_ERROR
        assertion_signals = ["AssertionError", "Failed: DID NOT RAISE", "assert ", "FAILED "]
        if any(s in stdout for s in assertion_signals):
            return FailureClassification.ASSERTION_FAILURE
        return FailureClassification.ASSERTION_FAILURE
    return FailureClassification.BLOCKED_EXECUTION


@dataclass
class ExecutionResult:
    """Raw outcome from an isolated test run."""
    command: str
    exit_code: int
    failure_classification: FailureClassification
    stdout: str
    stderr: str
    concise_output: str
    duration_ms: float
    start_time: str
    end_time: str
    test_names: List[str]
    code_fingerprint: str
    test_fingerprint: str
    environment_info: Dict[str, Any]
    is_timeout: bool = False


def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA-256 hash of a file on disk."""
    if not file_path.exists():
        return "FILE_NOT_FOUND"
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


class SubprocessRunner:
    """Executes pre-approved pytest test suites in isolated subprocesses.
    
    Security:
    - Never uses shell=True.
    - Explicit allowlist: only known target keys or approved paths can run.
    - Path confinement: targets must resolve strictly inside project root.
    - Environment sanitization: strips sensitive credentials.
    - Output limits: truncates outputs exceeding 64KB.
    - Hard process execution timeout.
    """

    def __init__(self, project_root: Path, timeout_seconds: int = 30) -> None:
        self.project_root = project_root.resolve()
        self.timeout_seconds = timeout_seconds
        self.payment_code = self.project_root / "backend" / "app" / "payment.py"
        self.payment_test = self.project_root / "backend" / "tests" / "test_payment.py"

    def execute_target(self, test_target: str) -> ExecutionResult:
        """Run a specific pre-approved test target under pytest.
        
        Security Controls:
        1. Flag injection prevention: Disallow leading '-' or whitespace/flag injection.
        2. Strict character set: Alphanumeric, underscores, hyphens, colons, dots, slashes.
        3. Confinement: Target files must resolve strictly inside 'backend/tests/'.
        4. Target must be an existing Python file (.py).
        5. Pytest cache isolation to prevent lock collisions.
        6. Secret scrubbing on stdout/stderr before storage.
        7. Strict 64KB byte ceiling on output with UTF-8 boundary preservation.
        """
        if not test_target or not test_target.strip():
            raise ValueError("Security Violation: Test target cannot be empty.")

        target_str = test_target.strip()
        if target_str.startswith("-"):
            raise ValueError(f"Security Violation: Options/flags injection prohibited: '{test_target}'")

        if not SAFE_TARGET_REGEX.match(target_str):
            raise ValueError(f"Security Violation: Target contains invalid or metacharacters: '{test_target}'")

        # Resolve alias if target is a known registered key
        if target_str in APPROVED_TARGETS:
            target_str = APPROVED_TARGETS[target_str]

        # Security: Enforce path traversal confinement to backend/tests/
        target_file_part = target_str.split("::")[0]
        resolved_target = (self.project_root / target_file_part).resolve()
        tests_directory = (self.project_root / "backend" / "tests").resolve()

        try:
            # Check strict containment within backend/tests/
            resolved_target.relative_to(tests_directory)
        except ValueError:
            raise ValueError(
                f"Security Violation: Path traversal detected. Target '{target_file_part}' must reside strictly within 'backend/tests/'."
            )

        if not target_file_part.endswith(".py"):
            raise ValueError(f"Security Violation: Target must be a Python test file (.py): '{target_file_part}'")

        if not resolved_target.is_file():
            raise FileNotFoundError(f"Target test file does not exist: '{target_file_part}'")

        cmd_args: List[str] = [
            sys.executable,
            "-m",
            "pytest",
            target_str,
            "-v",
            "--tb=short",
            "-p",
            "no:cacheprovider",
        ]
        cmd_str = " ".join(cmd_args)

        # Sanitized environment
        clean_env = {
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "PATH": os.environ.get("PATH", ""),
            "PYTHONPATH": str(self.project_root),
            "TEMP": os.environ.get("TEMP", ""),
            "TMP": os.environ.get("TMP", ""),
        }

        code_fp = calculate_sha256(self.payment_code)
        test_fp = calculate_sha256(resolved_target)

        start_dt = datetime.now(timezone.utc)
        start_time_iso = start_dt.isoformat()
        start_clock = time.perf_counter()
        is_timeout = False

        try:
            process = subprocess.run(
                cmd_args,
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                env=clean_env,
            )
            duration_ms = (time.perf_counter() - start_clock) * 1000.0
            exit_code = process.returncode
            raw_stdout = process.stdout
            raw_stderr = process.stderr
        except subprocess.TimeoutExpired as exc:
            duration_ms = (time.perf_counter() - start_clock) * 1000.0
            exit_code = -1
            # Capture partial evidence produced before deadline
            raw_stdout = exc.stdout if isinstance(exc.stdout, str) else (exc.stdout.decode("utf-8", errors="ignore") if exc.stdout else "")
            raw_stderr = exc.stderr if isinstance(exc.stderr, str) else (exc.stderr.decode("utf-8", errors="ignore") if exc.stderr else "")
            if not raw_stderr:
                raw_stderr = f"Subprocess timed out after {self.timeout_seconds} seconds."
            is_timeout = True
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_clock) * 1000.0
            exit_code = -2
            raw_stdout = ""
            raw_stderr = f"Execution failed to launch: {exc}"

        end_dt = datetime.now(timezone.utc)
        end_time_iso = end_dt.isoformat()

        # Enforce output limits and secret scrubbing
        stdout = self._limit_output(raw_stdout)
        stderr = self._limit_output(raw_stderr)
        concise_output = self._extract_concise_summary(raw_stdout, raw_stderr, exit_code)
        test_names = self._parse_test_names(raw_stdout)
        failure_classification = classify_execution(exit_code, stdout, stderr, is_timeout)

        return ExecutionResult(
            command=cmd_str,
            exit_code=exit_code,
            failure_classification=failure_classification,
            stdout=stdout,
            stderr=stderr,
            concise_output=concise_output,
            duration_ms=round(duration_ms, 2),
            start_time=start_time_iso,
            end_time=end_time_iso,
            test_names=test_names,
            code_fingerprint=code_fp,
            test_fingerprint=test_fp,
            environment_info={
                "python_version": sys.version.split()[0],
                "platform": sys.platform,
            },
            is_timeout=is_timeout,
        )

    def _limit_output(self, text: str) -> str:
        """Enforce strict byte limit and scrub sensitive secrets with UTF-8 boundary safety."""
        scrubbed = sanitize_text(text)
        encoded = scrubbed.encode("utf-8")
        if len(encoded) > MAX_OUTPUT_BYTES:
            truncated = encoded[:MAX_OUTPUT_BYTES].decode("utf-8", errors="ignore")
            return truncated + f"\n\n[... TRUNCATED: Output exceeded {MAX_OUTPUT_BYTES} bytes limit ...]"
        return scrubbed

    def _extract_concise_summary(self, stdout: str, stderr: str, exit_code: int) -> str:
        """Generate a concise 1-3 line summary of execution outcome."""
        summary_lines: List[str] = []
        if "=== FAILURES ===" in stdout or "FAILED" in stdout:
            # Extract failed test line and assertion error
            for line in stdout.splitlines():
                if line.startswith("FAILED ") or "Failed: DID NOT RAISE" in line or "AssertionError" in line:
                    summary_lines.append(line.strip())
        elif "=== 1 passed" in stdout or "PASSED" in stdout:
            for line in stdout.splitlines():
                if "passed in" in line:
                    summary_lines.append(line.strip())
        elif stderr:
            summary_lines.append(stderr.strip().splitlines()[0])

        if not summary_lines:
            summary_lines.append(f"Process terminated with exit code {exit_code}")

        return " | ".join(summary_lines[:3])

    def _parse_test_names(self, stdout: str) -> List[str]:
        """Extract executed test case names from pytest output."""
        pattern = re.compile(r"([\w/\.]+::(?:\w+::)?\w+)\s+(?:PASSED|FAILED|ERROR|SKIPPED)")
        return pattern.findall(stdout)
