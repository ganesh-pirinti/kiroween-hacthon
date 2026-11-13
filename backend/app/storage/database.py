"""SQLite connection manager and schema migrations."""

from __future__ import annotations

import sqlite3
from pathlib import Path


class Database:
    """Manages SQLite connection lifecycle and schema integrity."""

    def __init__(self, db_path: Path | str = Path("evidence/evidence.db")) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_schema()

    def get_connection(self) -> sqlite3.Connection:
        """Create a connection with row factory and foreign key enforcement."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_schema(self) -> None:
        """Initialize the relational schema for requirements, runs, evidence, and findings."""
        with self.get_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS requirements (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    acceptance_criteria TEXT NOT NULL,
                    linked_tests TEXT NOT NULL,
                    latest_run_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS verification_runs (
                    run_id TEXT PRIMARY KEY,
                    requirement_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    command TEXT NOT NULL,
                    execution_status TEXT NOT NULL,
                    exit_code INTEGER NOT NULL,
                    duration_ms REAL NOT NULL,
                    start_time TEXT,
                    end_time TEXT,
                    test_names TEXT,
                    concise_output TEXT,
                    finding_ids TEXT,
                    summary TEXT NOT NULL,
                    code_fingerprint TEXT NOT NULL,
                    test_fingerprint TEXT NOT NULL,
                    environment_info TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS evidence_artifacts (
                    evidence_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    requirement_id TEXT NOT NULL,
                    artifact_type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    integrity_sha256 TEXT NOT NULL,
                    exit_code INTEGER NOT NULL,
                    metadata_json TEXT NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES verification_runs(run_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS findings (
                    finding_id TEXT PRIMARY KEY,
                    requirement_id TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    explanation TEXT NOT NULL,
                    reproduction_instructions TEXT NOT NULL,
                    linked_evidence_ids TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_req_status ON requirements(status);
                CREATE INDEX IF NOT EXISTS idx_runs_req_time ON verification_runs(requirement_id, timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_evidence_artifact_run ON evidence_artifacts(run_id);
                CREATE INDEX IF NOT EXISTS idx_findings_req ON findings(requirement_id);
                """
            )

            # Defensive migration for verification_runs columns
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(verification_runs);")
            existing_cols = {row["name"] for row in cursor.fetchall()}
            for col in ["start_time", "end_time", "test_names", "concise_output", "finding_ids"]:
                if col not in existing_cols:
                    conn.execute(f"ALTER TABLE verification_runs ADD COLUMN {col} TEXT DEFAULT '';")
            conn.commit()
