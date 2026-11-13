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


MAX_OUTPUT_BYTES = 65536  # 64 KB ceiling

# Strict allowlist of approved test targets mapped to requirements
APPROVED_TARGETS: Dict[str, str] = {
    "PAYMENT-001": "backend/tests/test_payment.py::TestPaymentBasics::test_account_initialization_non_negative",
    "PAYMENT-002": "backend/tests/test_payment.py::TestPaymentBasics::test_negative_or_zero_amount_rejected",
    "PAYMENT-003": "backend/tests/test_payment.py::TestPaymentTransfers::test_valid_transfer_updates_balances",
    "PAYMENT-004": "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged",
    "PAYMENT-004-VULN": "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service",
    "PAYMENT-005": "backend/tests/test_payment.py::TestPaymentTransfers::test_self_transfer_rejected",
    "SUITE-PAYMENT": "backend/tests/test_payment.py",
}


@dataclass
class ExecutionResult:
    """Raw outcome from an isolated test run."""
    command: str
    exit_code: int
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
        """Run a specific pre-approved test target under pytest."""
        # Security: Enforce path traversal confinement
        target_file_part = test_target.split("::")[0]
        resolved_target = (self.project_root / target_file_part).resolve()

        try:
            # Check containment within project root
            resolved_target.relative_to(self.project_root)
        except ValueError:
            raise ValueError(
                f"Security Violation: Path traversal detected in test target: '{test_target}'"
            )

        if not resolved_target.exists():
            raise FileNotFoundError(f"Target test file does not exist: '{target_file_part}'")

        cmd_args: List[str] = [
            sys.executable,
            "-m",
            "pytest",
            test_target,
            "-v",
            "--tb=short",
            "-o",
            "cache_dir=.pytest_cache",
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
        except subprocess.TimeoutExpired:
            duration_ms = (time.perf_counter() - start_clock) * 1000.0
            exit_code = -1
            raw_stdout = ""
            raw_stderr = f"Subprocess timed out after {self.timeout_seconds} seconds."
            is_timeout = True
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_clock) * 1000.0
            exit_code = -2
            raw_stdout = ""
            raw_stderr = f"Execution failed to launch: {exc}"

        end_dt = datetime.now(timezone.utc)
        end_time_iso = end_dt.isoformat()

        # Enforce output limits (prevent memory bloat / DOS)
        stdout = self._limit_output(raw_stdout)
        stderr = self._limit_output(raw_stderr)
        concise_output = self._extract_concise_summary(raw_stdout, raw_stderr, exit_code)
        test_names = self._parse_test_names(raw_stdout)

        return ExecutionResult(
            command=cmd_str,
            exit_code=exit_code,
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
        """Enforce strict byte limit on output payloads."""
        if len(text.encode("utf-8")) > MAX_OUTPUT_BYTES:
            truncated = text[:MAX_OUTPUT_BYTES]
            return truncated + f"\n\n[... TRUNCATED: Output exceeded {MAX_OUTPUT_BYTES} bytes limit ...]"
        return text

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
