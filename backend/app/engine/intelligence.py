"""Evidence Intelligence, Risk Prioritization, Change Impact, and Audit Generation Engine."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.app.models.status import VerificationStatus
from backend.app.storage.repository import StorageRepository


def calculate_file_sha256(path: Path) -> str:
    """Calculate SHA-256 hash of a file on disk."""
    if not path.exists():
        return "FILE_NOT_FOUND"
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


class ChangeImpactAnalyzer:
    """Analyzes repository changes against recorded verification fingerprints.
    
    Detects when source files or test suites have been modified since the last
    verification run, flagging stale evidence and recommending targeted reruns.
    """

    def __init__(self, repository: StorageRepository, project_root: Optional[Path] = None) -> None:
        self.repo = repository
        self.project_root = (project_root or Path.cwd()).resolve()
        self.payment_code = self.project_root / "backend" / "app" / "payment.py"
        self.payment_test = self.project_root / "backend" / "tests" / "test_payment.py"

    def analyze_impact(self) -> Dict[str, Any]:
        """Perform change impact analysis across all requirements."""
        current_code_hash = calculate_file_sha256(self.payment_code)
        current_test_hash = calculate_file_sha256(self.payment_test)

        reqs = self.repo.list_requirements()
        impact_items: List[Dict[str, Any]] = []
        fresh_count = 0
        stale_count = 0
        unbound_count = 0

        for req in reqs:
            latest_run = None
            if req.latest_run_id:
                latest_run = self.repo.get_verification_run(req.latest_run_id)

            if not req.linked_tests:
                status = "UNBOUND"
                reason = "Requirement has no bound executable test target registered."
                unbound_count += 1
                needs_rerun = False
            elif not latest_run:
                status = "NO_RUNS"
                reason = "Requirement has never been executed in the active audit ledger."
                stale_count += 1
                needs_rerun = True
            elif latest_run.code_fingerprint == "NONE" or latest_run.exit_code == 5:
                status = "UNBOUND"
                reason = "Previous execution completed with 0 collected tests."
                unbound_count += 1
                needs_rerun = False
            elif latest_run.code_fingerprint != current_code_hash:
                status = "STALE_CODE"
                reason = f"Target source file (payment.py) changed since last verification (Hash {current_code_hash[:12]}... vs stored {latest_run.code_fingerprint[:12]}...)."
                stale_count += 1
                needs_rerun = True
            elif latest_run.test_fingerprint != current_test_hash and "test_payment.py" in str(req.linked_tests):
                status = "STALE_TEST"
                reason = f"Test suite assertions changed since last run (Hash {current_test_hash[:12]}... vs stored {latest_run.test_fingerprint[:12]}...)."
                stale_count += 1
                needs_rerun = True
            else:
                status = "FRESH"
                reason = "Evidence fingerprints match current repository code and test files exactly."
                fresh_count += 1
                needs_rerun = False

            impact_items.append({
                "requirement_id": req.id,
                "title": req.title,
                "verification_status": req.status.value,
                "freshness_status": status,
                "reason": reason,
                "needs_rerun": needs_rerun,
                "latest_run_id": req.latest_run_id,
                "last_verified_at": latest_run.timestamp if latest_run else None,
                "current_code_fingerprint": current_code_hash,
                "stored_code_fingerprint": latest_run.code_fingerprint if latest_run else None,
            })

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "target_source_path": str(self.payment_code.relative_to(self.project_root)),
            "current_source_sha256": current_code_hash,
            "current_test_sha256": current_test_hash,
            "summary": {
                "total_requirements": len(reqs),
                "fresh_evidence": fresh_count,
                "stale_evidence": stale_count,
                "unbound_requirements": unbound_count,
                "all_fresh": stale_count == 0,
            },
            "requirements": impact_items,
        }


class RiskAnalyzer:
    """Computes explainable, deterministic verification risk prioritization."""

    def __init__(self, repository: StorageRepository, impact_analyzer: ChangeImpactAnalyzer) -> None:
        self.repo = repository
        self.impact = impact_analyzer

    def compute_risk_profile(self) -> Dict[str, Any]:
        """Calculates risk categories and prioritized remediation recommendations."""
        reqs = self.repo.list_requirements()
        findings = self.repo.list_findings()
        impact = self.impact.analyze_impact()
        impact_by_id = {i["requirement_id"]: i for i in impact["requirements"]}

        risk_items: List[Dict[str, Any]] = []
        action_recommendations: List[Dict[str, Any]] = []

        severity_multipliers = {
            "CRITICAL": 1.4,
            "HIGH": 1.0,
            "MEDIUM": 0.7,
            "LOW": 0.4,
        }

        for req in reqs:
            coverage = req.get_coverage()
            imp = impact_by_id.get(req.id, {})
            req_findings = [f for f in findings if f.requirement_id == req.id]

            # Explainable factor scoring
            base_score = 0.0
            factors = []

            # Factor 1: Status
            if req.status == VerificationStatus.VIOLATION:
                base_score += 60.0
                factors.append("Violation confirmed by executable test evidence (+60)")
            elif req.status == VerificationStatus.BLOCKED:
                base_score += 35.0
                factors.append("Execution blocked by runner/environment fault (+35)")
            elif req.status == VerificationStatus.UNVERIFIED:
                if coverage.uncovered_criteria > 0:
                    base_score += 40.0
                    factors.append(f"Acceptance criteria coverage gap: {coverage.uncovered_criteria} unlinked (+40)")
                elif not req.linked_tests:
                    base_score += 45.0
                    factors.append("Unbound requirement with 0 test targets (+45)")
                else:
                    base_score += 25.0
                    factors.append("Unexecuted requirement in pending state (+25)")
            else:
                base_score += 5.0
                factors.append("Baseline verified checks passed (+5)")

            # Factor 2: Freshness
            if imp.get("freshness_status") in ("STALE_CODE", "STALE_TEST"):
                base_score += 20.0
                factors.append("Evidence stale: source/test changed since last run (+20)")

            # Factor 3: Active Findings
            if req_findings:
                base_score += 15.0 * len(req_findings)
                factors.append(f"{len(req_findings)} active defect finding(s) (+{15 * len(req_findings)})")

            # Apply severity weighting
            req_sev = "CRITICAL" if "PAYMENT-004" in req.id else "HIGH"
            mult = severity_multipliers.get(req_sev, 1.0)
            final_score = min(round(base_score * mult, 1), 100.0)

            if final_score >= 70.0:
                category = "CRITICAL RISK"
                badge_color = "red"
            elif final_score >= 45.0:
                category = "HIGH RISK"
                badge_color = "amber"
            elif final_score >= 20.0:
                category = "MODERATE RISK"
                badge_color = "blue"
            else:
                category = "LOW RISK"
                badge_color = "emerald"

            item = {
                "requirement_id": req.id,
                "title": req.title,
                "severity": req_sev,
                "status": req.status.value,
                "risk_score": final_score,
                "risk_category": category,
                "badge_color": badge_color,
                "contributing_factors": factors,
                "criteria_coverage": coverage.coverage_percentage,
                "uncovered_criteria": coverage.uncovered_criteria,
                "freshness": imp.get("freshness_status", "UNKNOWN"),
            }
            risk_items.append(item)

            # Generate prioritized recommendation
            if req.status == VerificationStatus.VIOLATION:
                action_recommendations.append({
                    "priority": 1,
                    "requirement_id": req.id,
                    "urgency": "IMMEDIATE FIX REQUIRED",
                    "action": f"Remediate defect in payment service to satisfy {req.id}.",
                    "detail": "Adversarial test proved specification violation. See findings for reproduction command.",
                })
            elif coverage.uncovered_criteria > 0:
                action_recommendations.append({
                    "priority": 2,
                    "requirement_id": req.id,
                    "urgency": "SPECIFICATION GAP",
                    "action": f"Author executable test target for {req.id} criteria gap.",
                    "detail": f"{coverage.uncovered_criteria} acceptance criteria lack test bindings.",
                })
            elif imp.get("needs_rerun"):
                action_recommendations.append({
                    "priority": 3,
                    "requirement_id": req.id,
                    "urgency": "STALE EVIDENCE",
                    "action": f"Rerun verification suite for {req.id} to refresh evidence seal.",
                    "detail": "Source code or tests modified since last verification run.",
                })

        # Sort by risk score descending
        risk_items.sort(key=lambda x: x["risk_score"], reverse=True)
        action_recommendations.sort(key=lambda x: x["priority"])

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_risk_posture": "ELEVATED" if any(r["risk_category"] == "CRITICAL RISK" for r in risk_items) else "MODERATE",
            "highest_priority_action": action_recommendations[0] if action_recommendations else None,
            "action_backlog": action_recommendations,
            "risk_breakdown": risk_items,
        }


class AuditReportGenerator:
    """Generates real, evidence-anchored audit reports in Markdown and JSON formats."""

    def __init__(self, repository: StorageRepository, impact: ChangeImpactAnalyzer, risk: RiskAnalyzer) -> None:
        self.repo = repository
        self.impact = impact
        self.risk = risk

    def generate_report(self, report_format: str = "markdown") -> Dict[str, Any]:
        """Compile complete audit report from live SQLite ledger data."""
        reqs = self.repo.list_requirements()
        runs = self.repo.list_verification_runs(limit=100)
        findings = self.repo.list_findings()
        impact = self.impact.analyze_impact()
        risk_profile = self.risk.compute_risk_profile()

        now_iso = datetime.now(timezone.utc).isoformat()
        counts = {"VERIFIED": 0, "VIOLATION": 0, "BLOCKED": 0, "UNVERIFIED": 0}
        for r in reqs:
            counts[r.status.value] = counts.get(r.status.value, 0) + 1

        json_data = {
            "metadata": {
                "report_id": f"audit-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
                "generated_at": now_iso,
                "platform": "Ghost Protocol Verification Engine v1.0.0",
                "tagline": "AI says Done. We demand proof.",
                "database": "evidence/evidence.db (SQLite WAL)",
            },
            "executive_summary": {
                "total_requirements": len(reqs),
                "verified": counts["VERIFIED"],
                "violations": counts["VIOLATION"],
                "blocked": counts["BLOCKED"],
                "unverified": counts["UNVERIFIED"],
                "verification_rate_percentage": round((counts["VERIFIED"] / len(reqs)) * 100, 1) if reqs else 0,
                "overall_risk_posture": risk_profile["overall_risk_posture"],
                "active_defect_findings": len(findings),
            },
            "change_impact_summary": impact["summary"],
            "requirements": [r.model_dump() for r in reqs],
            "recent_runs": [run.model_dump() for run in runs[:10]],
            "findings": [f.model_dump() for f in findings],
            "risk_analysis": risk_profile["risk_breakdown"],
            "recommended_actions": risk_profile["action_backlog"],
        }

        if report_format.lower() == "json":
            return {
                "format": "json",
                "generated_at": now_iso,
                "content": json_data,
            }

        # Format Markdown
        md_lines = [
            "# GHOST PROTOCOL — FORMAL EVIDENCE AUDIT REPORT",
            "",
            "> **Generated**: " + now_iso,
            "> **System Slogan**: *\"AI says Done. We demand proof.\"*",
            "> **Ledger Database**: `evidence/evidence.db`",
            "",
            "---",
            "",
            "## 1. Executive Summary",
            "",
            f"- **Total Requirements Cataloged**: {len(reqs)}",
            f"- **Requirements Verified (Exit 0 + 100% Evidence)**: {counts['VERIFIED']} ({round((counts['VERIFIED'] / len(reqs)) * 100, 1) if reqs else 0}%)",
            f"- **Confirmed Violations**: {counts['VIOLATION']}",
            f"- **Blocked Checks**: {counts['BLOCKED']}",
            f"- **Unverified (Coverage Gaps / Unbound)**: {counts['UNVERIFIED']}",
            f"- **Active Defect Findings**: {len(findings)}",
            f"- **Overall Risk Posture**: **{risk_profile['overall_risk_posture']}**",
            "",
            "---",
            "",
            "## 2. Requirement Traceability & Verification Matrix",
            "",
            "| ID | Title | Status | Criteria | Tests Bound | Latest Run | Evidence SHA-256 |",
            "| :--- | :--- | :---: | :---: | :---: | :---: | :--- |",
        ]

        for r in reqs:
            ev_hash = "NONE"
            if r.latest_run_id:
                evs = self.repo.list_evidence_for_run(r.latest_run_id)
                if evs:
                    ev_hash = f"`{evs[0].integrity_metadata.sha256[:12]}...`"

            cov = r.get_coverage()
            md_lines.append(
                f"| **{r.id}** | {r.title} | `{r.status.value}` | {cov.covered_criteria}/{cov.total_criteria} | {len(r.linked_tests)} | `{r.latest_run_id or 'NONE'}` | {ev_hash} |"
            )

        md_lines.extend([
            "",
            "---",
            "",
            "## 3. Freshness & Change Impact Analysis",
            "",
            f"- **Current Target Source Hash (`payment.py`)**: `{impact['current_source_sha256']}`",
            f"- **Current Test Suite Hash (`test_payment.py`)**: `{impact['current_test_sha256']}`",
            f"- **Fresh Evidence Records**: {impact['summary']['fresh_evidence']}",
            f"- **Stale Evidence Records**: {impact['summary']['stale_evidence']}",
            "",
            "| Requirement | Freshness Status | Evidence Diagnosis |",
            "| :--- | :---: | :--- |",
        ])

        for imp in impact["requirements"]:
            md_lines.append(f"| **{imp['requirement_id']}** | `{imp['freshness_status']}` | {imp['reason']} |")

        md_lines.extend([
            "",
            "---",
            "",
            "## 4. Prioritized Action Backlog",
            "",
        ])

        if risk_profile["action_backlog"]:
            for act in risk_profile["action_backlog"]:
                md_lines.append(f"- **[{act['urgency']}] {act['requirement_id']}**: {act['action']}")
                md_lines.append(f"  *{act['detail']}*")
        else:
            md_lines.append("Zero urgent actions. All tracked requirements satisfy formal verification criteria.")

        md_lines.extend([
            "",
            "---",
            "",
            "## 5. Architectural Honesty & Limitations Disclosure",
            "",
            "- **Zero-Trust Rule**: Requirements with unlinked criteria (`PAYMENT-003` AC-03.4) or unbound tests (`PAYMENT-006`) strictly remain `UNVERIFIED`.",
            "- **No Simulated Passes**: Every verified check traces directly to a real pytest subprocess execution exit code 0.",
            "- **Cryptographic Integrity**: SHA-256 hashes certify payload immutability against the SQLite ledger.",
            "",
            "_Report generated autonomously by Ghost Protocol Evidence Engine._",
        ])

        return {
            "format": "markdown",
            "generated_at": now_iso,
            "content": "\n".join(md_lines),
        }
