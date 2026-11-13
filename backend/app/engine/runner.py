"""Isolated subprocess test execution harness."""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Any, List


@dataclass
class ExecutionResult:
    """Raw outcome from an isolated test run."""
    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
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
    - Path confinement: targets must resolve inside project root.
    - Environment sanitization: strips sensitive credentials.
    - Hard process execution timeout.
    """

    def __init__(self, project_root: Path, timeout_seconds: int = 30) -> None:
        self.project_root = project_root.resolve()
        self.timeout_seconds = timeout_seconds
        self.payment_code = self.project_root / "backend" / "app" / "payment.py"
        self.payment_test = self.project_root / "backend" / "tests" / "test_payment.py"

    def execute_target(self, test_target: str) -> ExecutionResult:
        """Run a specific pre-approved test target under pytest."""
        # Sanitize target path: verify it doesn't escape project root
        target_path_part = test_target.split("::")[0]
        resolved_target = (self.project_root / target_path_part).resolve()
        if not str(resolved_target).startswith(str(self.project_root)):
            raise ValueError(f"Path traversal detected in test target: {test_target}")

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
        test_fp = calculate_sha256(self.payment_test)

        start_time = time.perf_counter()
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
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            exit_code = process.returncode
            stdout = process.stdout
            stderr = process.stderr
        except subprocess.TimeoutExpired:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            exit_code = -1
            stdout = ""
            stderr = f"Subprocess timed out after {self.timeout_seconds} seconds."
            is_timeout = True
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            exit_code = -2
            stdout = ""
            stderr = f"Execution failed to launch: {exc}"

        return ExecutionResult(
            command=cmd_str,
            exit_code=exit_code,
            stdout=stdout,
            stderr=stderr,
            duration_ms=round(duration_ms, 2),
            code_fingerprint=code_fp,
            test_fingerprint=test_fp,
            environment_info={
                "python_version": sys.version.split()[0],
                "platform": sys.platform,
            },
            is_timeout=is_timeout,
        )
