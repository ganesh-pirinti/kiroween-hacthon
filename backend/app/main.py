"""Ghost Protocol Verification API.

FastAPI backend serving verification execution, requirement specifications,
and tamper-evident evidence queries.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.evidence import (
    EvidenceRecord,
    EvidenceStore,
    VerificationStatus as LegacyVerificationStatus,
)
from backend.app.models.evidence import Evidence
from backend.app.models.finding import Finding
from backend.app.models.requirement import Requirement
from backend.app.models.status import VerificationStatus
from backend.app.models.verification_run import VerificationRun
from backend.app.storage.database import Database
from backend.app.storage.repository import StorageRepository
from backend.app.verifier import (
    REQUIREMENTS_REGISTRY,
    Verifier,
)

app = FastAPI(
    title="Ghost Protocol — Evidence & Verification Engine",
    description=(
        "Cryptographically anchored requirement verification engine. "
        "Replaces agent completion claims with reproducible test execution evidence."
    ),
    version="1.0.0",
)

# Enable CORS for the React + Vite dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Foundation Storage & Evaluator Engine
db = Database(Path("evidence/evidence.db"))
repository = StorageRepository(db)
evaluator = VerificationEvaluator(repository)

# Initialize catalog on startup
catalog_path = Path("requirements/catalog.json")
if catalog_path.exists():
    repository.sync_catalog(catalog_path)

# Legacy compatibility adapters
legacy_evidence_store = EvidenceStore()
legacy_verifier = Verifier(evidence_store=legacy_evidence_store)


# -----------------------------------------------------------------
# API v1 Canonical Endpoints
# -----------------------------------------------------------------
@app.get("/api/v1/health", tags=["V1 System"])
def health_v1() -> Dict[str, Any]:
    """Operational health and catalog statistics."""
    reqs = repository.list_requirements()
    runs = repository.list_verification_runs(limit=500)
    findings = repository.list_findings(limit=500)
    return {
        "status": "healthy",
        "service": "Ghost Protocol Verification Engine",
        "slogan": "AI says Done. We demand proof.",
        "version": "1.0.0-foundation",
        "active_requirements": len(reqs),
        "total_verification_runs": len(runs),
        "total_findings": len(findings),
    }


@app.get("/api/v1/requirements", response_model=List[Requirement], tags=["V1 Requirements"])
def list_requirements_v1(
    status: Optional[VerificationStatus] = Query(None, description="Filter by status")
) -> List[Requirement]:
    """List all tracked requirements with current verified status."""
    return repository.list_requirements(status=status)


@app.get("/api/v1/requirements/{id}", response_model=Requirement, tags=["V1 Requirements"])
def get_requirement_v1(id: str) -> Requirement:
    """Retrieve requirement details and acceptance criteria by ID."""
    req = repository.get_requirement(id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{id}' not found in registry.",
        )
    return req


@app.post("/api/v1/verify/{id}", tags=["V1 Verification"])
def verify_requirement_v1(id: str) -> Dict[str, Any]:
    """Execute the approved test target for a requirement and capture evidence."""
    try:
        req, run, finding = evaluator.verify_requirement(id)
        evidence_list = repository.list_evidence_for_run(run.run_id)
        return {
            "requirement": req,
            "run": run,
            "finding": finding,
            "evidence": evidence_list[0] if evidence_list else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@app.post("/api/v1/verify-all", tags=["V1 Verification"])
def verify_all_v1() -> Dict[str, Any]:
    """Run sequential verification across all registered requirements."""
    reqs = repository.list_requirements()
    results = []
    counts = {"VERIFIED": 0, "VIOLATION": 0, "BLOCKED": 0, "UNVERIFIED": 0}

    for req in reqs:
        updated_req, run, finding = evaluator.verify_requirement(req.id)
        counts[updated_req.status.value] += 1
        results.append({
            "requirement_id": req.id,
            "status": updated_req.status.value,
            "run_id": run.run_id,
            "has_finding": finding is not None,
        })

    return {
        "total": len(reqs),
        "scorecard": counts,
        "details": results,
    }


@app.get("/api/v1/runs", response_model=List[VerificationRun], tags=["V1 Runs"])
def list_runs_v1(
    requirement_id: Optional[str] = Query(None, description="Filter by requirement ID"),
    limit: int = Query(50, ge=1, le=200),
) -> List[VerificationRun]:
    """Query verification run history."""
    return repository.list_verification_runs(requirement_id=requirement_id, limit=limit)


@app.get("/api/v1/runs/{run_id}", response_model=VerificationRun, tags=["V1 Runs"])
def get_run_v1(run_id: str) -> VerificationRun:
    """Retrieve details and execution status of a specific verification run."""
    run = repository.get_verification_run(run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification run '{run_id}' not found.",
        )
    return run


@app.post("/api/v1/demonstrate/vulnerable-vs-corrected", tags=["V1 Demonstration"])
def demonstrate_vulnerable_vs_corrected() -> Dict[str, Any]:
    """Executes the ground-truth comparative demonstration for PAYMENT-004.
    
    1. Runs the adversarial test against the intentionally vulnerable test fixture:
       - Captures real failure: 'DID NOT RAISE InsufficientFundsError'
       - Maps exit code 1 to VIOLATION state
       - Generates a CRITICAL finding with reproduction commands
    2. Runs the adversarial test against the corrected implementation:
       - Captures real pass: '1 passed'
       - Maps exit code 0 to VERIFIED state
    3. Preserves both runs and evidence records in SQLite.
    """
    # 1. Vulnerable run
    vuln_target = "backend/tests/test_adversarial_vulnerable.py::test_adversarial_overdraft_on_vulnerable_service"
    v_req, v_run, v_finding = evaluator.verify_requirement("PAYMENT-004", target_override=vuln_target)
    v_evidence = repository.list_evidence_for_run(v_run.run_id)

    # 2. Corrected run
    corr_target = "backend/tests/test_payment.py::TestPaymentAdversarial::test_overdraft_transfer_rejected_and_balances_unchanged"
    c_req, c_run, c_finding = evaluator.verify_requirement("PAYMENT-004", target_override=corr_target)
    c_evidence = repository.list_evidence_for_run(c_run.run_id)

    return {
        "requirement_id": "PAYMENT-004",
        "scenario": {
            "initial_sender_balance": 10000,
            "attempted_transfer": 15000,
            "expected_outcome": "Rejected with InsufficientFundsError; both balances unchanged",
        },
        "vulnerable_run": {
            "run_id": v_run.run_id,
            "exit_code": v_run.exit_code,
            "status": v_req.status.value,
            "concise_output": v_run.concise_output,
            "finding": v_finding,
            "evidence_id": v_evidence[0].evidence_id if v_evidence else None,
        },
        "corrected_run": {
            "run_id": c_run.run_id,
            "exit_code": c_run.exit_code,
            "status": c_req.status.value,
            "concise_output": c_run.concise_output,
            "finding": c_finding,
            "evidence_id": c_evidence[0].evidence_id if c_evidence else None,
        },
    }


@app.get("/api/v1/evidence/{evidence_id}", response_model=Evidence, tags=["V1 Evidence"])
def get_evidence_v1(evidence_id: str) -> Evidence:
    """Retrieve an immutable evidence artifact."""
    ev = repository.get_evidence(evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence artifact '{evidence_id}' not found.",
        )
    return ev


@app.get("/api/v1/findings", response_model=List[Finding], tags=["V1 Findings"])
def list_findings_v1(
    requirement_id: Optional[str] = Query(None, description="Filter by requirement ID"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(50, ge=1, le=200),
) -> List[Finding]:
    """Query discovered specification violations and defects."""
    return repository.list_findings(requirement_id=requirement_id, severity=severity, limit=limit)


# -----------------------------------------------------------------
# Legacy Milestone 1 Endpoints (Preserved for compatibility)
# -----------------------------------------------------------------
class RequirementStatusResponse(BaseModel):
    requirement_id: str
    title: str
    description: str
    acceptance_criteria: List[str]
    test_target: Optional[str]
    latest_verdict: LegacyVerificationStatus
    latest_evidence_id: Optional[str] = None
    latest_verified_at: Optional[str] = None
    code_fingerprint: Optional[str] = None


class VerifyAllResponse(BaseModel):
    total_requirements: int
    passed: int
    failed: int
    blocked: int
    unverified: int
    records: List[EvidenceRecord]


@app.get("/api/health", tags=["Legacy Compatibility"])
def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "Ghost Protocol Verification Engine",
        "version": "1.0.0",
        "registered_requirements": len(REQUIREMENTS_REGISTRY),
    }


@app.get("/api/requirements", response_model=List[RequirementStatusResponse], tags=["Legacy Compatibility"])
def list_requirements() -> List[RequirementStatusResponse]:
    response: List[RequirementStatusResponse] = []
    for req_id, req_def in REQUIREMENTS_REGISTRY.items():
        latest = legacy_evidence_store.get_latest_for_requirement(req_id)
        if latest:
            verdict = latest.verdict
            evidence_id = latest.evidence_id
            verified_at = latest.timestamp_utc
            code_fingerprint = latest.code_fingerprint
        else:
            verdict = LegacyVerificationStatus.UNVERIFIED
            evidence_id = None
            verified_at = None
            code_fingerprint = None

        response.append(
            RequirementStatusResponse(
                requirement_id=req_def.requirement_id,
                title=req_def.title,
                description=req_def.description,
                acceptance_criteria=req_def.acceptance_criteria,
                test_target=req_def.test_target,
                latest_verdict=verdict,
                latest_evidence_id=evidence_id,
                latest_verified_at=verified_at,
                code_fingerprint=code_fingerprint,
            )
        )
    return response


@app.get("/api/requirements/{requirement_id}", tags=["Legacy Compatibility"])
def get_requirement(requirement_id: str) -> Dict[str, Any]:
    req_def = REQUIREMENTS_REGISTRY.get(requirement_id.upper())
    if not req_def:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{requirement_id}' not found in registry.",
        )
    history = legacy_evidence_store.list_records(requirement_id=req_def.requirement_id, limit=20)
    latest = history[0] if history else None
    return {
        "definition": req_def,
        "latest_verdict": latest.verdict if latest else LegacyVerificationStatus.UNVERIFIED,
        "latest_evidence": latest,
        "history": history,
    }


@app.post("/api/verify/{requirement_id}", response_model=EvidenceRecord, tags=["Legacy Compatibility"])
def verify_requirement_endpoint(requirement_id: str) -> EvidenceRecord:
    req_id = requirement_id.upper()
    if req_id not in REQUIREMENTS_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot verify unknown requirement '{requirement_id}'. Must be registered in requirements specification.",
        )
    record = legacy_verifier.verify_requirement(req_id)
    return record


@app.post("/api/verify-all", response_model=VerifyAllResponse, tags=["Legacy Compatibility"])
def verify_all_requirements_endpoint() -> VerifyAllResponse:
    records: List[EvidenceRecord] = []
    counts = {
        LegacyVerificationStatus.PASS: 0,
        LegacyVerificationStatus.FAIL: 0,
        LegacyVerificationStatus.BLOCKED: 0,
        LegacyVerificationStatus.UNVERIFIED: 0,
    }
    for req_id in REQUIREMENTS_REGISTRY.keys():
        record = legacy_verifier.verify_requirement(req_id)
        records.append(record)
        counts[record.verdict] += 1

    return VerifyAllResponse(
        total_requirements=len(REQUIREMENTS_REGISTRY),
        passed=counts[LegacyVerificationStatus.PASS],
        failed=counts[LegacyVerificationStatus.FAIL],
        blocked=counts[LegacyVerificationStatus.BLOCKED],
        unverified=counts[LegacyVerificationStatus.UNVERIFIED],
        records=records,
    )


@app.get("/api/evidence", response_model=List[EvidenceRecord], tags=["Legacy Compatibility"])
def list_evidence(
    requirement_id: Optional[str] = Query(None, description="Filter by requirement ID"),
    verdict: Optional[LegacyVerificationStatus] = Query(None, description="Filter by verdict status"),
    limit: int = Query(50, ge=1, le=200),
) -> List[EvidenceRecord]:
    verdict_str = verdict.value if verdict else None
    req_str = requirement_id.upper() if requirement_id else None
    return legacy_evidence_store.list_records(requirement_id=req_str, verdict=verdict_str, limit=limit)


@app.get("/api/evidence/{evidence_id}", response_model=EvidenceRecord, tags=["Legacy Compatibility"])
def get_evidence_detail(evidence_id: str) -> EvidenceRecord:
    record = legacy_evidence_store.get_by_id(evidence_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence record '{evidence_id}' not found.",
        )
    return record
