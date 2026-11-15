"""Ghost Protocol Verification API.

FastAPI backend serving verification execution, requirement specifications,
and tamper-evident evidence queries.
"""

from __future__ import annotations

from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

# Ensure project root is always importable regardless of current working directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.engine.evaluator import VerificationEvaluator
from backend.app.engine.intelligence import (
    ChangeImpactAnalyzer,
    RiskAnalyzer,
    AuditReportGenerator,
)
from backend.benchmarks.harness import BenchmarkHarness, BenchmarkReport
from backend.app.security import (
    ALLOWED_ORIGINS,
    validate_requirement_id,
    validate_run_id,
    validate_evidence_id,
    validate_scenario_id,
    enforce_local_access_control,
)
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

# Secure local CORS policy (no wildcard with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Foundation Storage & Evaluator Engine
db = Database(Path("evidence/evidence.db"))
repository = StorageRepository(db)
evaluator = VerificationEvaluator(repository)
benchmark_harness = BenchmarkHarness()
latest_benchmark_report: Optional[BenchmarkReport] = None

# Intelligence, Risk & Audit Engines
impact_analyzer = ChangeImpactAnalyzer(repository)
risk_analyzer = RiskAnalyzer(repository, impact_analyzer)
audit_generator = AuditReportGenerator(repository, impact_analyzer, risk_analyzer)

# Initialize catalog on startup
catalog_path = Path("requirements/catalog.json")
if catalog_path.exists():
    repository.sync_catalog(catalog_path)

# Legacy compatibility adapters
legacy_evidence_store = EvidenceStore()
legacy_verifier = Verifier(evidence_store=legacy_evidence_store)


# -----------------------------------------------------------------
# System & API v1 Canonical Endpoints
# -----------------------------------------------------------------
@app.get("/", tags=["System"])
def root() -> Dict[str, Any]:
    """Root endpoint welcoming clients and confirming operational health."""
    return {
        "status": "healthy",
        "service": "Ghost Protocol Verification Engine",
        "slogan": "AI says Done. We demand proof.",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
        "api_v1_health": "/api/v1/health",
        "requirements_url": "/api/v1/requirements",
    }


@app.get("/health", tags=["System"])
def health_root() -> Dict[str, Any]:
    """Root operational health endpoint."""
    return {
        "status": "healthy",
        "service": "Ghost Protocol Verification Engine",
        "slogan": "AI says Done. We demand proof.",
        "version": "1.0.0",
    }


@app.get("/api/v1/health", tags=["V1 System"])
def health_v1() -> Dict[str, Any]:
    """Operational health and catalog statistics."""
    return {
        "status": "healthy",
        "service": "Ghost Protocol Verification Engine",
        "slogan": "AI says Done. We demand proof.",
        "version": "1.0.0-foundation",
        "active_requirements": repository.count_requirements(),
        "total_verification_runs": repository.count_verification_runs(),
        "total_findings": repository.count_findings(),
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
    clean_id = validate_requirement_id(id)
    req = repository.get_requirement(clean_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{clean_id}' not found in registry.",
        )
    return req


@app.post("/api/v1/verify/{id}", tags=["V1 Verification"])
def verify_requirement_v1(
    id: str,
    _auth: None = Depends(enforce_local_access_control),
) -> Dict[str, Any]:
    """Execute the approved test target for a requirement and capture evidence."""
    clean_id = validate_requirement_id(id)
    try:
        req, run, finding = evaluator.verify_requirement(clean_id)
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
def verify_all_v1(_auth: None = Depends(enforce_local_access_control)) -> Dict[str, Any]:
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
    clean_req_id = validate_requirement_id(requirement_id) if requirement_id else None
    return repository.list_verification_runs(requirement_id=clean_req_id, limit=limit)


@app.get("/api/v1/runs/{run_id}", response_model=VerificationRun, tags=["V1 Runs"])
def get_run_v1(run_id: str) -> VerificationRun:
    """Retrieve details and execution status of a specific verification run."""
    clean_run_id = validate_run_id(run_id)
    run = repository.get_verification_run(clean_run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification run '{clean_run_id}' not found.",
        )
    return run


@app.get("/api/v1/runs/{run_id}/evidence", response_model=List[Evidence], tags=["V1 Runs"])
def get_run_evidence_v1(run_id: str) -> List[Evidence]:
    """Retrieve all evidence artifacts associated with a verification run."""
    clean_run_id = validate_run_id(run_id)
    return repository.list_evidence_for_run(clean_run_id)


@app.post("/api/v1/demonstrate/vulnerable-vs-corrected", tags=["V1 Demonstration"])
def demonstrate_vulnerable_vs_corrected(
    _auth: None = Depends(enforce_local_access_control),
) -> Dict[str, Any]:
    """Executes the ground-truth comparative demonstration for PAYMENT-004."""
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
    clean_ev_id = validate_evidence_id(evidence_id)
    ev = repository.get_evidence(clean_ev_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence artifact '{clean_ev_id}' not found.",
        )
    return ev


@app.get("/api/v1/evidence/{evidence_id}/verify", tags=["V1 Evidence"])
def verify_evidence_integrity_v1(evidence_id: str) -> Dict[str, Any]:
    """Cryptographically verify that an evidence artifact has not been tampered with and traces to a real run."""
    clean_ev_id = validate_evidence_id(evidence_id)
    try:
        return evaluator.verify_evidence_integrity(clean_ev_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@app.get("/api/v1/findings", response_model=List[Finding], tags=["V1 Findings"])
def list_findings_v1(
    requirement_id: Optional[str] = Query(None, description="Filter by requirement ID"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(50, ge=1, le=200),
) -> List[Finding]:
    """Query discovered specification violations and defects."""
    clean_req_id = validate_requirement_id(requirement_id) if requirement_id else None
    return repository.list_findings(requirement_id=clean_req_id, severity=severity, limit=limit)


@app.get("/api/v1/coverage", tags=["V1 Coverage"])
def get_criteria_coverage() -> Dict[str, Any]:
    """Identify acceptance criteria with NO linked executable tests and report verification coverage."""
    return evaluator.analyze_coverage()


@app.get("/api/v1/coverage/{requirement_id}", tags=["V1 Coverage"])
def get_requirement_criteria_coverage(requirement_id: str) -> Dict[str, Any]:
    """Retrieve criteria coverage and identify unverified gaps for a specific requirement."""
    clean_req_id = validate_requirement_id(requirement_id)
    report = evaluator.analyze_coverage(requirement_id=clean_req_id)
    if not report["requirements"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{clean_req_id}' not found.",
        )
    return report["requirements"][0]


@app.get("/api/v1/adversarial-scenarios", tags=["V1 Adversarial"])
def list_adversarial_scenarios(
    requirement_id: Optional[str] = Query(None, description="Filter by requirement ID")
) -> List[Dict[str, Any]]:
    """List explicit edge-case adversarial scenarios and record execution audit history."""
    clean_req_id = validate_requirement_id(requirement_id) if requirement_id else None
    reqs = repository.list_requirements()
    all_scenarios = []
    for r in reqs:
        if clean_req_id and r.id != clean_req_id:
            continue
        for s in r.adversarial_scenarios:
            all_scenarios.append(s.model_dump())
    return all_scenarios


@app.get("/api/v1/scenarios", tags=["V1 Demonstration"])
def list_comparable_scenarios() -> List[Dict[str, Any]]:
    """List available before-and-after comparison scenarios."""
    return [
        {
            "scenario_id": "SCENARIO-PAYMENT-004",
            "requirement_id": "PAYMENT-004",
            "title": "Overdraft Prevention and Balance Preservation",
            "description": "₹15,000 transfer from ₹10,000 balance: vulnerable fixture allows illegal transfer vs corrected engine aborts atomically.",
        }
    ]


@app.post("/api/v1/compare/{scenario_id}", tags=["V1 Demonstration"])
def compare_scenario_endpoint(
    scenario_id: str,
    _auth: None = Depends(enforce_local_access_control),
) -> Dict[str, Any]:
    """Execute a ground-truth before-and-after comparison showing behavior before and after a defect fix."""
    clean_slug = validate_scenario_id(scenario_id)
    try:
        return evaluator.compare_scenario(clean_slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@app.post("/api/v1/benchmark/run", response_model=BenchmarkReport, tags=["V1 Benchmark"])
def run_benchmark_endpoint(
    _auth: None = Depends(enforce_local_access_control),
) -> BenchmarkReport:
    """Execute the independent benchmark harness comparing baseline happy-path tests vs Ghost Protocol against seeded defects."""
    global latest_benchmark_report
    latest_benchmark_report = benchmark_harness.run_benchmark()
    return latest_benchmark_report


@app.get("/api/v1/benchmark/latest", response_model=BenchmarkReport, tags=["V1 Benchmark"])
def get_latest_benchmark_report() -> BenchmarkReport:
    """Retrieve the latest executed benchmark report."""
    global latest_benchmark_report
    if not latest_benchmark_report:
        latest_benchmark_report = benchmark_harness.run_benchmark()
    return latest_benchmark_report


# -----------------------------------------------------------------
# Intelligence, Risk, Change Impact & Audit Endpoints
# -----------------------------------------------------------------
@app.get("/api/v1/impact/analysis", tags=["V1 Intelligence"])
def get_change_impact_analysis() -> Dict[str, Any]:
    """Inspects code/test SHA-256 fingerprints to detect stale evidence and recommend reruns."""
    return impact_analyzer.analyze_impact()


@app.get("/api/v1/risk/analysis", tags=["V1 Intelligence"])
def get_risk_analysis() -> Dict[str, Any]:
    """Computes explainable verification risk scores and prioritized remediation recommendations."""
    return risk_analyzer.compute_risk_profile()


@app.get("/api/v1/audit/report", tags=["V1 Intelligence"])
def get_audit_report(
    format: str = Query("markdown", pattern="^(markdown|json)$", description="Report format (markdown or json)")
) -> Dict[str, Any]:
    """Generates an exportable audit report from live SQLite ledger data."""
    return audit_generator.generate_report(report_format=format)


@app.get("/api/v1/ai-copilot/status", tags=["V1 Copilot"])
def get_copilot_status() -> Dict[str, Any]:
    """Returns honest status of AI-assisted verification proposals."""
    import os
    has_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY"))
    return {
        "status": "active" if has_key else "offline_deterministic",
        "mode": "PROPOSAL_ONLY (NOT PROOF)",
        "message": (
            "Ghost Protocol's core verification engine is 100% deterministic and requires zero external AI APIs. "
            "AI test proposals carry zero evidential weight until executed and proven in the isolated subprocess runner."
        ),
        "external_api_configured": has_key,
    }


@app.get("/api/v1/ai-copilot/proposals/{requirement_id}", tags=["V1 Copilot"])
def get_copilot_proposals(requirement_id: str) -> Dict[str, Any]:
    """Generates candidate test proposals for coverage gaps and edge cases (clearly marked as proposals, not proof)."""
    clean_id = validate_requirement_id(requirement_id)
    req = repository.get_requirement(clean_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{clean_id}' not found.",
        )

    # Deterministic rule-based proposal templates
    proposals = []
    coverage = req.get_coverage()

    for ac in req.acceptance_criteria:
        if not ac.linked_test or not ac.linked_test.strip():
            proposals.append({
                "proposal_id": f"prop-{ac.id.lower()}",
                "criterion_id": ac.id,
                "type": "COVERAGE_GAP_FILL",
                "title": f"Candidate Test for {ac.id}",
                "description": f"Proposed verification check for: {ac.description}",
                "suggested_test_path": f"backend/tests/test_{clean_id.lower().replace('-', '_')}_extended.py::test_{ac.id.lower().replace('-', '_')}_compliance",
                "status": "PROPOSAL_ONLY (NOT EXECUTED)",
                "evidential_weight": "ZERO (Requires human review & execution)",
            })

    if clean_id == "PAYMENT-004":
        proposals.append({
            "proposal_id": "prop-pay4-concurrency",
            "criterion_id": "AC-04.4",
            "type": "ADVERSARIAL_CONCURRENCY",
            "title": "Concurrent Overdraft Race Condition Test",
            "description": "Simulate 5 concurrent ₹8,000 debit attempts from a single ₹10,000 balance to verify thread-safe balance preservation.",
            "suggested_test_path": "backend/tests/test_payment.py::TestPaymentConcurrency::test_concurrent_race_overdraft",
            "status": "PROPOSAL_ONLY (NOT EXECUTED)",
            "evidential_weight": "ZERO (Requires human review & execution)",
        })

    return {
        "requirement_id": clean_id,
        "title": req.title,
        "is_unverified": req.status == VerificationStatus.UNVERIFIED,
        "total_proposals": len(proposals),
        "proposals": proposals,
        "integrity_notice": "AI suggestions are proposals, not proof. No requirement will be marked VERIFIED without passing executable checks.",
    }


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
def verify_requirement_endpoint(
    requirement_id: str,
    _auth: None = Depends(enforce_local_access_control),
) -> EvidenceRecord:
    req_id = requirement_id.upper()
    if req_id not in REQUIREMENTS_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot verify unknown requirement '{requirement_id}'. Must be registered in requirements specification.",
        )
    record = legacy_verifier.verify_requirement(req_id)
    return record


@app.post("/api/verify-all", response_model=VerifyAllResponse, tags=["Legacy Compatibility"])
def verify_all_requirements_endpoint(
    _auth: None = Depends(enforce_local_access_control),
) -> VerifyAllResponse:
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)

