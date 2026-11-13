"""Evidence domain model."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Dict, Any
from pydantic import BaseModel, Field

from backend.app.models.status import ArtifactType


class IntegrityMetadata(BaseModel):
    """Cryptographic integrity and provenance metadata."""
    sha256: str
    exit_code: int
    environment_digest: str = ""
    extra: Dict[str, Any] = Field(default_factory=dict)


class Evidence(BaseModel):
    """Immutable audit artifact capturing ground-truth execution output."""
    evidence_id: str
    run_id: str
    requirement_id: str
    artifact_type: ArtifactType
    source: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: str
    integrity_metadata: IntegrityMetadata

    @classmethod
    def create(
        cls,
        evidence_id: str,
        run_id: str,
        requirement_id: str,
        artifact_type: ArtifactType,
        source: str,
        payload: str,
        exit_code: int,
        extra: Dict[str, Any] | None = None,
    ) -> Evidence:
        """Construct an Evidence instance and compute its SHA-256 digest."""
        digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        metadata = IntegrityMetadata(
            sha256=digest,
            exit_code=exit_code,
            extra=extra or {},
        )
        return cls(
            evidence_id=evidence_id,
            run_id=run_id,
            requirement_id=requirement_id,
            artifact_type=artifact_type,
            source=source,
            payload=payload,
            integrity_metadata=metadata,
        )
