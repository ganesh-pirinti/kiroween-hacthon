"""VerificationRun domain model."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any, List
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
    """Record of an isolated verification test execution.
    
    Stores full audit metadata:
    - run ID, requirement ID, test names
    - executed command
    - precise start/end timestamps (UTC)
    - exit status and exit code
    - concise output summary
    - finding references
    - cryptographic code and test fingerprints
    """
    run_id: str
    requirement_id: str
    command: str
    execution_status: ExecutionStatus
    exit_code: int
    duration_ms: float
    start_time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    end_time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    test_names: List[str] = Field(default_factory=list)
    concise_output: str = ""
    finding_ids: List[str] = Field(default_factory=list)
    summary: RunSummary = Field(default_factory=RunSummary)
    code_fingerprint: str = ""
    test_fingerprint: str = ""
    environment_info: Dict[str, Any] = Field(default_factory=dict)
