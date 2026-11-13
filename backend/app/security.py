"""Security middleware and access controls for local deployment."""

from __future__ import annotations

import os
import re
from typing import Set
from fastapi import Request, HTTPException, status

# Allowed local dev origins for CORS (no wildcard with credentials)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Additional origins from environment if custom port is used
CUSTOM_ORIGINS = os.environ.get("GHOST_ALLOWED_ORIGINS", "")
if CUSTOM_ORIGINS:
    ALLOWED_ORIGINS.extend([o.strip() for o in CUSTOM_ORIGINS.split(",") if o.strip()])

# Trusted loopback clients
LOOPBACK_HOSTS: Set[str] = {"127.0.0.1", "::1", "localhost", "testclient"}

# Strict input validation patterns
ID_REGEX = re.compile(r"^[A-Z0-9]+-[A-Z0-9]+$")
SAFE_SLUG_REGEX = re.compile(r"^[a-zA-Z0-9_\-]+$")
RUN_ID_REGEX = re.compile(r"^run-[a-zA-Z0-9_\-]+$")
EVIDENCE_ID_REGEX = re.compile(r"^ev-[a-zA-Z0-9_\-]+$")


def validate_requirement_id(requirement_id: str) -> str:
    """Validate requirement ID format preventing path traversal, script injection, and SQL anomalies."""
    if not requirement_id or not ID_REGEX.match(requirement_id.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed requirement ID '{requirement_id}'. Must match pattern '^[A-Z0-9]+-[A-Z0-9]+$'.",
        )
    return requirement_id.strip()


def validate_run_id(run_id: str) -> str:
    """Validate verification run ID."""
    if not run_id or not RUN_ID_REGEX.match(run_id.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed run ID '{run_id}'. Must match pattern '^run-[a-zA-Z0-9_\\-]+$'.",
        )
    return run_id.strip()


def validate_evidence_id(evidence_id: str) -> str:
    """Validate evidence artifact ID."""
    if not evidence_id or not EVIDENCE_ID_REGEX.match(evidence_id.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed evidence ID '{evidence_id}'. Must match pattern '^ev-[a-zA-Z0-9_\\-]+$'.",
        )
    return evidence_id.strip()


def validate_scenario_id(scenario_id: str) -> str:
    """Validate scenario slug ID."""
    if not scenario_id or not SAFE_SLUG_REGEX.match(scenario_id.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed scenario ID '{scenario_id}'. Must contain only alphanumeric characters, underscores, and hyphens.",
        )
    return scenario_id.strip()


async def enforce_local_access_control(request: Request) -> None:
    """Enforce local network confinement and optional API key authentication.
    
    1. Blocks requests originating from remote IP addresses (prevents cross-network probing).
    2. Enforces GHOST_API_KEY if configured in environment.
    """
    client_host = request.client.host if request.client else "unknown"

    # 1. Enforce local loopback confinement
    if client_host not in LOOPBACK_HOSTS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Remote client '{client_host}' is prohibited. Ghost Protocol is configured strictly for local deployment.",
        )

    # 2. Check API key for state-modifying requests if GHOST_API_KEY is configured
    configured_key = os.environ.get("GHOST_API_KEY", "").strip()
    if configured_key and request.method in ("POST", "PUT", "DELETE", "PATCH"):
        provided_token = request.headers.get("X-Ghost-Token") or ""
        auth_header = request.headers.get("Authorization") or ""
        if auth_header.startswith("Bearer "):
            provided_token = auth_header[7:].strip()

        if provided_token != configured_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: Valid X-Ghost-Token or Authorization Bearer token required for execution.",
                headers={"WWW-Authenticate": "Bearer"},
            )
