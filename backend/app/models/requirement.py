"""Requirement domain model."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from backend.app.models.status import VerificationStatus
from backend.app.models.adversarial import AdversarialScenario

REQUIREMENT_ID_REGEX = re.compile(r"^[A-Z0-9]+-[A-Z0-9]+$")


class AcceptanceCriterion(BaseModel):
    """Explicit acceptance criterion item under a requirement.
    
    Tracks whether this specific criterion has an executable test bound to it
    and its verified status. Unbound criteria are marked UNVERIFIED.
    """
    id: str
    description: str
    linked_test: Optional[str] = None
    status: VerificationStatus = VerificationStatus.UNVERIFIED


class CriteriaCoverage(BaseModel):
    """Summary of requirement criteria coverage."""
    total_criteria: int = 0
    covered_criteria: int = 0
    uncovered_criteria: int = 0
    coverage_percentage: float = 0.0
    all_covered: bool = False


class Requirement(BaseModel):
    """Formal specification requirement tracked by Ghost Protocol."""
    id: str
    title: str
    description: str
    acceptance_criteria: List[AcceptanceCriterion] = Field(default_factory=list)
    status: VerificationStatus = VerificationStatus.UNVERIFIED
    linked_tests: List[str] = Field(default_factory=list)
    adversarial_scenarios: List[AdversarialScenario] = Field(default_factory=list)
    latest_run_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def get_coverage(self) -> CriteriaCoverage:
        """Compute executable test coverage over acceptance criteria."""
        total = len(self.acceptance_criteria)
        if total == 0:
            return CriteriaCoverage(
                total_criteria=0,
                covered_criteria=0,
                uncovered_criteria=0,
                coverage_percentage=0.0,
                all_covered=False,
            )
        covered = sum(1 for ac in self.acceptance_criteria if ac.linked_test and ac.linked_test.strip())
        uncovered = total - covered
        pct = round((covered / total) * 100.0, 1)
        return CriteriaCoverage(
            total_criteria=total,
            covered_criteria=covered,
            uncovered_criteria=uncovered,
            coverage_percentage=pct,
            all_covered=(uncovered == 0),
        )

    @field_validator("id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        """Enforce strict ID naming (e.g. PAYMENT-004) preventing script injection."""
        v = v.strip().upper()
        if not REQUIREMENT_ID_REGEX.match(v):
            raise ValueError(f"Requirement ID '{v}' does not match pattern '^[A-Z0-9]+-[A-Z0-9]+$'")
        return v
