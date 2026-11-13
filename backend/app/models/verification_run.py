"""VerificationRun domain model."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any
from pydantic import BaseModel, Field

from backend.app.models.status import ExecutionStatus


class RunSummary(BaseModel):
    """Aggregate metrics of a verification run."""
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    blocked: int = 0
    unverified: int = 0


class VerificationRun(BaseModel):
    """Record of an isolated verification test execution."""
    run_id: str
    requirement_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    command: str
    execution_status: ExecutionStatus
    exit_code: int
    duration_ms: float
    summary: RunSummary = Field(default_factory=RunSummary)
    code_fingerprint: str
    test_fingerprint: str
    environment_info: Dict[str, Any] = Field(default_factory=dict)
