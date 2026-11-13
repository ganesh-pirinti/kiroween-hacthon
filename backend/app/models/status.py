"""Verification states, execution outcomes, and severity taxonomies."""

from enum import Enum


class VerificationStatus(str, Enum):
    """The four canonical states of Ghost Protocol requirement verification.
    
    Principles:
    - VERIFIED: required checks have passed with valid execution evidence.
    - VIOLATION: at least one executed check demonstrates a requirement failure.
    - BLOCKED: execution could not complete because of a dependency, environment, or safety restriction.
    - UNVERIFIED: insufficient evidence exists to make a reliable conclusion.
    
    Never convert missing evidence into a pass.
    Never represent a blocked test as a failure of the target feature.
    """
    VERIFIED = "VERIFIED"
    VIOLATION = "VIOLATION"
    BLOCKED = "BLOCKED"
    UNVERIFIED = "UNVERIFIED"


class ExecutionStatus(str, Enum):
    """Process execution status in the isolated runner."""
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    TIMEOUT = "TIMEOUT"


class FindingSeverity(str, Enum):
    """Defect and violation severity classifications."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ArtifactType(str, Enum):
    """Classification of captured evidence artifacts."""
    PROCESS_LOG = "PROCESS_LOG"
    TEST_REPORT = "TEST_REPORT"
    TRACE = "TRACE"
    CODE_DIFF = "CODE_DIFF"
