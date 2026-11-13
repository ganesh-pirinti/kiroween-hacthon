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


class FailureClassification(str, Enum):
    """Fine-grained classification of test and runner failures.
    
    Distinguishes genuine requirement violations from environmental,
    collection, or test harness anomalies.
    """
    NONE = "NONE"                                      # Clean pass (exit code 0)
    ASSERTION_FAILURE = "ASSERTION_FAILURE"            # Genuine spec violation / failed assertion (exit code 1)
    TEST_INFRASTRUCTURE_ERROR = "TEST_INFRASTRUCTURE_ERROR"  # Pytest usage/plugin/syntax error (exit codes 2, 4)
    TIMEOUT = "TIMEOUT"                                # Subprocess deadline exceeded
    BLOCKED_EXECUTION = "BLOCKED_EXECUTION"            # Launch failure, OS permission, environment block
    UNCOLLECTED_TESTS = "UNCOLLECTED_TESTS"            # 0 tests matched/collected (exit code 5)

