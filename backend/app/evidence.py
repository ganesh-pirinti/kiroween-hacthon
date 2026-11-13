"""Ghost Protocol Evidence Engine.

Records, validates, and stores tamper-evident verification evidence.
Guarantees requirement states are bound to real, reproducible execution records.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    """Rigorous verification states for requirements."""
    PASS = "PASS"
    FAIL = "FAIL"
    BLOCKED = "BLOCKED"
    UNVERIFIED = "UNVERIFIED"


class TestCaseResult(BaseModel):
    """Individual test case outcome parsed from test runner output."""
    test_name: str
    status: str  # "passed", "failed", "error", "skipped"
    duration_seconds: float = 0.0
    message: Optional[str] = None


class EvidenceRecord(BaseModel):
    """Tamper-evident record of a test execution run linked to a requirement."""
    evidence_id: str
    requirement_id: str
    verdict: VerificationStatus
    command: str
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
    timestamp_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    test_results: List[TestCaseResult] = Field(default_factory=list)
    code_fingerprint: str
    test_fingerprint: str
    evidence_hash: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def compute_hash(self) -> str:
        """Compute deterministic SHA-256 digest over the evidence contents."""
        payload = {
            "evidence_id": self.evidence_id,
            "requirement_id": self.requirement_id,
            "verdict": self.verdict.value,
            "command": self.command,
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "timestamp_utc": self.timestamp_utc,
            "code_fingerprint": self.code_fingerprint,
            "test_fingerprint": self.test_fingerprint,
        }
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def seal(self) -> EvidenceRecord:
        """Seal this record with its cryptographic hash."""
        self.evidence_hash = self.compute_hash()
        return self


def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA-256 hash of a file on disk."""
    if not file_path.exists():
        return "FILE_NOT_FOUND"
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


class EvidenceStore:
    """Persistent SQLite and JSON storage for verification evidence."""

    def __init__(self, db_path: Path | str = Path("evidence/evidence.db")) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initialize the evidence SQLite schema."""
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS evidence_records (
                    evidence_id TEXT PRIMARY KEY,
                    requirement_id TEXT NOT NULL,
                    verdict TEXT NOT NULL,
                    command TEXT NOT NULL,
                    exit_code INTEGER NOT NULL,
                    duration_ms REAL NOT NULL,
                    timestamp_utc TEXT NOT NULL,
                    code_fingerprint TEXT NOT NULL,
                    test_fingerprint TEXT NOT NULL,
                    evidence_hash TEXT NOT NULL,
                    stdout TEXT,
                    stderr TEXT,
                    payload_json TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_req_timestamp 
                ON evidence_records(requirement_id, timestamp_utc DESC)
                """
            )
            conn.commit()

    def save_record(self, record: EvidenceRecord, export_json_path: Optional[Path] = None) -> EvidenceRecord:
        """Persist an evidence record to SQLite and optionally to a JSON file."""
        if not record.evidence_hash:
            record.seal()

        payload_json = record.model_dump_json(indent=2)

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO evidence_records (
                    evidence_id, requirement_id, verdict, command, exit_code,
                    duration_ms, timestamp_utc, code_fingerprint, test_fingerprint,
                    evidence_hash, stdout, stderr, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.evidence_id,
                    record.requirement_id,
                    record.verdict.value,
                    record.command,
                    record.exit_code,
                    record.duration_ms,
                    record.timestamp_utc,
                    record.code_fingerprint,
                    record.test_fingerprint,
                    record.evidence_hash,
                    record.stdout,
                    record.stderr,
                    payload_json,
                ),
            )
            conn.commit()

        if export_json_path:
            export_json_path.parent.mkdir(parents=True, exist_ok=True)
            export_json_path.write_text(payload_json, encoding="utf-8")

        return record

    def get_by_id(self, evidence_id: str) -> Optional[EvidenceRecord]:
        """Fetch an evidence record by its primary key ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT payload_json FROM evidence_records WHERE evidence_id = ?",
                (evidence_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return EvidenceRecord.model_validate_json(row["payload_json"])

    def get_latest_for_requirement(self, requirement_id: str) -> Optional[EvidenceRecord]:
        """Fetch the most recent evidence record for a given requirement ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT payload_json FROM evidence_records 
                WHERE requirement_id = ? 
                ORDER BY timestamp_utc DESC LIMIT 1
                """,
                (requirement_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return EvidenceRecord.model_validate_json(row["payload_json"])

    def list_records(
        self,
        requirement_id: Optional[str] = None,
        verdict: Optional[str] = None,
        limit: int = 50,
    ) -> List[EvidenceRecord]:
        """List stored evidence records with optional filtering."""
        query = "SELECT payload_json FROM evidence_records"
        params: List[Any] = []
        conditions: List[str] = []

        if requirement_id:
            conditions.append("requirement_id = ?")
            params.append(requirement_id)
        if verdict:
            conditions.append("verdict = ?")
            params.append(verdict)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp_utc DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            return [EvidenceRecord.model_validate_json(r["payload_json"]) for r in rows]
