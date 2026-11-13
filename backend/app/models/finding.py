"""Finding domain model."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel, Field

from backend.app.models.status import FindingSeverity


class Finding(BaseModel):
    """Actionable defect or specification violation discovered during verification."""
    finding_id: str
    requirement_id: str
    severity: FindingSeverity
    explanation: str
    reproduction_instructions: str
    linked_evidence_ids: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
