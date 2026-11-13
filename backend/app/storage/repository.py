"""Storage repository implementation for Ghost Protocol domain entities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from backend.app.models.evidence import Evidence, IntegrityMetadata
from backend.app.models.finding import Finding
from backend.app.models.requirement import Requirement
from backend.app.models.status import ArtifactType, ExecutionStatus, FindingSeverity, VerificationStatus
from backend.app.models.verification_run import RunSummary, VerificationRun
from backend.app.storage.database import Database


class StorageRepository:
    """Repository providing typed relational storage operations over SQLite."""

    def __init__(self, database: Optional[Database] = None) -> None:
        self.db = database or Database()

    # -------------------------------------------------------------
    # Requirement Operations
    # -------------------------------------------------------------
    def upsert_requirement(self, requirement: Requirement) -> Requirement:
        """Insert or update a requirement specification."""
        with self.db.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO requirements (
                    id, title, description, status, acceptance_criteria,
                    linked_tests, latest_run_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    requirement.id,
                    requirement.title,
                    requirement.description,
                    requirement.status.value,
                    json.dumps([c.model_dump() for c in requirement.acceptance_criteria]),
                    json.dumps(requirement.linked_tests),
                    requirement.latest_run_id,
                    requirement.created_at,
                    requirement.updated_at,
                ),
            )
            conn.commit()
        return requirement

    def get_requirement(self, requirement_id: str) -> Optional[Requirement]:
        """Fetch requirement by ID."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM requirements WHERE id = ?", (requirement_id.upper(),))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_requirement(row)

    def list_requirements(self, status: Optional[VerificationStatus] = None) -> List[Requirement]:
        """List all tracked requirements, optionally filtered by status."""
        query = "SELECT * FROM requirements"
        params = []
        if status:
            query += " WHERE status = ?"
            params.append(status.value)
        query += " ORDER BY id ASC"

        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            return [self._row_to_requirement(r) for r in cursor.fetchall()]

    def sync_catalog(self, catalog_path: Path) -> List[Requirement]:
        """Load and synchronize requirements from a JSON catalog file."""
        if not catalog_path.exists():
            return []
        data = json.loads(catalog_path.read_text(encoding="utf-8"))
        req_list: List[Requirement] = []
        for item in data.get("requirements", []):
            req = Requirement.model_validate(item)
            # If requirement exists in database, preserve its evaluated status
            existing = self.get_requirement(req.id)
            if existing:
                req.status = existing.status
                req.latest_run_id = existing.latest_run_id
                req.created_at = existing.created_at
            self.upsert_requirement(req)
            req_list.append(req)
        return req_list

    # -------------------------------------------------------------
    # VerificationRun Operations
    # -------------------------------------------------------------
    def save_verification_run(self, run: VerificationRun) -> VerificationRun:
        """Persist a verification run record and update the requirement's latest_run_id."""
        with self.db.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO verification_runs (
                    run_id, requirement_id, timestamp, command, execution_status,
                    exit_code, duration_ms, summary, code_fingerprint,
                    test_fingerprint, environment_info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    run.requirement_id,
                    run.timestamp,
                    run.command,
                    run.execution_status.value,
                    run.exit_code,
                    run.duration_ms,
                    run.summary.model_dump_json(),
                    run.code_fingerprint,
                    run.test_fingerprint,
                    json.dumps(run.environment_info),
                ),
            )
            # Update requirement pointer
            conn.execute(
                """
                UPDATE requirements SET latest_run_id = ?, updated_at = ?
                WHERE id = ?
                """,
                (run.run_id, run.timestamp, run.requirement_id),
            )
            conn.commit()
        return run

    def get_verification_run(self, run_id: str) -> Optional[VerificationRun]:
        """Fetch verification run by run ID."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM verification_runs WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_verification_run(row)

    def list_verification_runs(
        self, requirement_id: Optional[str] = None, limit: int = 50
    ) -> List[VerificationRun]:
        """List verification runs with optional requirement filtering."""
        query = "SELECT * FROM verification_runs"
        params = []
        if requirement_id:
            query += " WHERE requirement_id = ?"
            params.append(requirement_id.upper())
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            return [self._row_to_verification_run(r) for r in cursor.fetchall()]

    # -------------------------------------------------------------
    # Evidence Operations
    # -------------------------------------------------------------
    def save_evidence(self, evidence: Evidence) -> Evidence:
        """Persist an immutable evidence artifact."""
        with self.db.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO evidence_artifacts (
                    evidence_id, run_id, requirement_id, artifact_type, source,
                    timestamp, payload, integrity_sha256, exit_code, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evidence.evidence_id,
                    evidence.run_id,
                    evidence.requirement_id,
                    evidence.artifact_type.value,
                    evidence.source,
                    evidence.timestamp,
                    evidence.payload,
                    evidence.integrity_metadata.sha256,
                    evidence.integrity_metadata.exit_code,
                    json.dumps(evidence.integrity_metadata.extra),
                ),
            )
            conn.commit()
        return evidence

    def get_evidence(self, evidence_id: str) -> Optional[Evidence]:
        """Retrieve evidence by ID."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM evidence_artifacts WHERE evidence_id = ?", (evidence_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_evidence(row)

    def list_evidence_for_run(self, run_id: str) -> List[Evidence]:
        """List all evidence artifacts produced by a given run."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM evidence_artifacts WHERE run_id = ? ORDER BY timestamp ASC",
                (run_id,),
            )
            return [self._row_to_evidence(r) for r in cursor.fetchall()]

    # -------------------------------------------------------------
    # Finding Operations
    # -------------------------------------------------------------
    def save_finding(self, finding: Finding) -> Finding:
        """Persist a defect finding."""
        with self.db.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO findings (
                    finding_id, requirement_id, severity, explanation,
                    reproduction_instructions, linked_evidence_ids, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    finding.finding_id,
                    finding.requirement_id,
                    finding.severity.value,
                    finding.explanation,
                    finding.reproduction_instructions,
                    json.dumps(finding.linked_evidence_ids),
                    finding.created_at,
                ),
            )
            conn.commit()
        return finding

    def get_finding(self, finding_id: str) -> Optional[Finding]:
        """Retrieve finding by ID."""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM findings WHERE finding_id = ?", (finding_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_finding(row)

    def list_findings(
        self, requirement_id: Optional[str] = None, severity: Optional[str] = None, limit: int = 50
    ) -> List[Finding]:
        """List findings with optional filtering."""
        query = "SELECT * FROM findings"
        params = []
        conditions = []
        if requirement_id:
            conditions.append("requirement_id = ?")
            params.append(requirement_id.upper())
        if severity:
            conditions.append("severity = ?")
            params.append(severity.upper())
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            return [self._row_to_finding(r) for r in cursor.fetchall()]

    # -------------------------------------------------------------
    # Row Deserialization Helpers
    # -------------------------------------------------------------
    def _row_to_requirement(self, row: sqlite3.Row) -> Requirement:
        return Requirement(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            status=VerificationStatus(row["status"]),
            acceptance_criteria=json.loads(row["acceptance_criteria"]),
            linked_tests=json.loads(row["linked_tests"]),
            latest_run_id=row["latest_run_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _row_to_verification_run(self, row: sqlite3.Row) -> VerificationRun:
        return VerificationRun(
            run_id=row["run_id"],
            requirement_id=row["requirement_id"],
            timestamp=row["timestamp"],
            command=row["command"],
            execution_status=ExecutionStatus(row["execution_status"]),
            exit_code=row["exit_code"],
            duration_ms=row["duration_ms"],
            summary=RunSummary.model_validate_json(row["summary"]),
            code_fingerprint=row["code_fingerprint"],
            test_fingerprint=row["test_fingerprint"],
            environment_info=json.loads(row["environment_info"]),
        )

    def _row_to_evidence(self, row: sqlite3.Row) -> Evidence:
        return Evidence(
            evidence_id=row["evidence_id"],
            run_id=row["run_id"],
            requirement_id=row["requirement_id"],
            artifact_type=ArtifactType(row["artifact_type"]),
            source=row["source"],
            timestamp=row["timestamp"],
            payload=row["payload"],
            integrity_metadata=IntegrityMetadata(
                sha256=row["integrity_sha256"],
                exit_code=row["exit_code"],
                extra=json.loads(row["metadata_json"]),
            ),
        )

    def _row_to_finding(self, row: sqlite3.Row) -> Finding:
        return Finding(
            finding_id=row["finding_id"],
            requirement_id=row["requirement_id"],
            severity=FindingSeverity(row["severity"]),
            explanation=row["explanation"],
            reproduction_instructions=row["reproduction_instructions"],
            linked_evidence_ids=json.loads(row["linked_evidence_ids"]),
            created_at=row["created_at"],
        )
