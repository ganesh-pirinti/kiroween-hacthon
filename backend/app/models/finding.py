"""Finding domain model."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel, Field

from backend.app.models.status import FindingSeverity, FailureClassification


class Finding(BaseModel):
    """Actionable defect or specification violation discovered during verification.
    
    Provides cryptographic and structural provenance:
    - Exactly which requirement was violated
    - Exactly which test failed
    - Exactly which execution run produced it
    - Fine-grained failure classification (assertion vs infrastructure vs timeout)
    - Code and test fingerprints for reproducible verification
    - Linked immutable evidence artifact IDs
    """
    finding_id: str
    requirement_id: str
    run_id: str = ""
    test_name: str = ""
    severity: FindingSeverity
    failure_classification: FailureClassification = FailureClassification.NONE
    explanation: str
    reproduction_instructions: str
    code_fingerprint: str = ""
    test_fingerprint: str = ""
    linked_evidence_ids: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
