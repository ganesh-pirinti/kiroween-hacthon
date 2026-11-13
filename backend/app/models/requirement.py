"""Requirement domain model."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from backend.app.models.status import VerificationStatus

REQUIREMENT_ID_REGEX = re.compile(r"^[A-Z0-9]+-[A-Z0-9]+$")


class AcceptanceCriterion(BaseModel):
    """Explicit acceptance criterion item under a requirement."""
    id: str
    description: str


class Requirement(BaseModel):
    """Formal specification requirement tracked by Ghost Protocol."""
    id: str
    title: str
    description: str
    acceptance_criteria: List[AcceptanceCriterion] = Field(default_factory=list)
    status: VerificationStatus = VerificationStatus.UNVERIFIED
    linked_tests: List[str] = Field(default_factory=list)
    latest_run_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        """Enforce strict ID naming (e.g. PAYMENT-004) preventing script injection."""
        v = v.strip().upper()
        if not REQUIREMENT_ID_REGEX.match(v):
            raise ValueError(f"Requirement ID '{v}' does not match pattern '^[A-Z0-9]+-[A-Z0-9]+$'")
        return v
