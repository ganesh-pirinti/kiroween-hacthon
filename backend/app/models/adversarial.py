"""Adversarial scenario model for explicit edge-case verification."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field

from backend.app.models.status import VerificationStatus


class AdversarialScenario(BaseModel):
    """Explicit adversarial or boundary scenario associated with a requirement.
    
    Tracks:
    - Unique scenario identifier
    - Target requirement
    - Title and descriptive behavior
    - Category (e.g. boundary, negative, invariant, concurrency)
    - Bound executable pytest target
    - Execution audit state (whether executed, last run ID, timestamp, outcome)
    """
    scenario_id: str
    requirement_id: str
    title: str
    description: str
    category: str = Field(default="boundary", description="boundary | negative | invariant | concurrency")
    test_target: str
    executed: bool = False
    outcome: Optional[VerificationStatus] = None
    last_run_id: Optional[str] = None
    executed_at: Optional[str] = None
